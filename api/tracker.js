import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// In-memory rate limiting map (IP -> { count, startTime })
const rateLimitMap = new Map();

// Cached database client to prevent re-authenticating on every poll
let cachedDbClient = null;
let cachedDbExpiry = 0;

// Helper to parse cookies from header
function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(';').forEach(c => {
    const [key, ...v] = c.trim().split('=');
    if (key) cookies[key] = decodeURIComponent(v.join('='));
  });
  return cookies;
}

// Generate HMAC signing secret derived from master sync key
function getCookieSecret(syncKey) {
  return crypto.createHmac('sha256', syncKey).update('mint-tracker-device-cookie-v1').digest('hex');
}

// Create a cryptographically signed device authorization token
function createSignedToken(syncKey) {
  const cookieSecret = getCookieSecret(syncKey);
  const timestamp = Date.now().toString();
  const nonce = crypto.randomBytes(16).toString('hex');
  const payload = `${timestamp}.${nonce}`;
  const sig = crypto.createHmac('sha256', cookieSecret).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

// Verify a signed device token
function verifySignedToken(token, syncKey) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [timestampStr, nonce, sig] = parts;
  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) return false;

  // Max cookie validity: 365 days
  const maxAgeMs = 365 * 24 * 60 * 60 * 1000;
  if (Date.now() - timestamp > maxAgeMs) return false;

  const cookieSecret = getCookieSecret(syncKey);
  const payload = `${timestampStr}.${nonce}`;
  const expectedSig = crypto.createHmac('sha256', cookieSecret).update(payload).digest('hex');

  try {
    const sigBuf = Buffer.from(sig, 'hex');
    const expBuf = Buffer.from(expectedSig, 'hex');
    if (sigBuf.length !== expBuf.length) return false;
    return crypto.timingSafeEqual(sigBuf, expBuf);
  } catch {
    return false;
  }
}

// Timing-safe comparison of provided sync key
function timingSafeCompare(a, b) {
  if (!a || !b) return false;
  try {
    const bufA = Buffer.from(String(a));
    const bufB = Buffer.from(String(b));
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

// Validate habit tracker payload structure
function validateTrackerData(data) {
  if (!data || typeof data !== 'object') return false;
  if (!Array.isArray(data.habits)) return false;
  for (const h of data.habits) {
    if (!h || typeof h.id !== 'string' || typeof h.name !== 'string') {
      return false;
    }
  }
  if (data.completions && typeof data.completions !== 'object') {
    return false;
  }
  return true;
}

// Helper to safely read request body if not already parsed
async function getRequestBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return null; }
  }
  return new Promise((resolve) => {
    let bodyStr = '';
    req.on('data', chunk => { bodyStr += chunk; });
    req.on('end', () => {
      try {
        resolve(bodyStr ? JSON.parse(bodyStr) : {});
      } catch {
        resolve(null);
      }
    });
    req.on('error', () => resolve(null));
  });
}

// Get Supabase database client: handles both service_role access and scoped authenticated user sessions
async function getSupabaseDbClient(supabaseUrl, serviceKey, trackerUserId, anonKey) {
  if (cachedDbClient && Date.now() < cachedDbExpiry - 5 * 60 * 1000) {
    return cachedDbClient;
  }

  // Probe with direct service_role client
  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: probeError } = await adminClient
    .from('habit_tracker_data')
    .select('user_id')
    .eq('user_id', trackerUserId)
    .limit(1);

  if (!probeError) {
    cachedDbClient = adminClient;
    cachedDbExpiry = Date.now() + 24 * 60 * 60 * 1000;
    return adminClient;
  }

  // If table privileges are granted exclusively to 'authenticated' role (Postgres 42501)
  if (probeError.code === '42501') {
    console.log('[API Tracker] Table requires authenticated role; minting scoped session for user UUID...');
    const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(trackerUserId);
    if (userError || !userData?.user?.email) {
      throw new Error(`Owner account lookup failed: ${userError?.message || 'User UUID not found in Auth'}`);
    }

    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: userData.user.email,
    });

    if (linkError || !linkData?.properties?.hashed_token) {
      throw new Error(`Failed to generate scoped session link: ${linkError?.message}`);
    }

    const publicAnonKey = anonKey || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
    if (!publicAnonKey) {
      throw new Error('SUPABASE_ANON_KEY is required to complete authenticated session handshake.');
    }

    const authHelper = createClient(supabaseUrl, publicAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: sessionData, error: verifyError } = await authHelper.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: 'magiclink',
    });

    if (verifyError || !sessionData?.session?.access_token) {
      throw new Error(`Failed to verify session token: ${verifyError?.message}`);
    }

    const accessToken = sessionData.session.access_token;
    const scopedUserClient = createClient(supabaseUrl, publicAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    });

    cachedDbClient = scopedUserClient;
    cachedDbExpiry = Date.now() + 50 * 60 * 1000; // Cache for 50 minutes
    return scopedUserClient;
  }

  throw new Error(`Supabase probe query failed: [${probeError.code}] ${probeError.message}`);
}

// Main API Handler
export default async function handler(req, res) {
  const isHttps = req.headers['x-forwarded-proto'] === 'https' || req.headers.host?.includes('vercel.app');

  // Method check
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'GET, POST, OPTIONS');
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST, OPTIONS');
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  // Rate Limiting (60 requests/minute per client IP)
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  const rateLimitWindow = 60 * 1000;
  let clientRecord = rateLimitMap.get(clientIp);

  if (!clientRecord || now - clientRecord.startTime > rateLimitWindow) {
    clientRecord = { count: 1, startTime: now };
    rateLimitMap.set(clientIp, clientRecord);
  } else {
    clientRecord.count++;
    if (clientRecord.count > 60) {
      res.statusCode = 429;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Too many requests. Please wait a moment.' }));
      return;
    }
  }

  // Parse URL & Query
  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const action = urlObj.searchParams.get('action');

  // Read server configuration
  const syncKey = process.env.SYNC_DEVICE_KEY;
  const rawUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const trackerUserId = process.env.TRACKER_USER_ID;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!syncKey) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Server configuration error: SYNC_DEVICE_KEY is not configured.' }));
    return;
  }

  // ── ACTION: Link Device (Authorize and set HttpOnly Cookie) ────────────────
  if (action === 'link' || (req.method === 'POST' && urlObj.pathname.endsWith('/link'))) {
    const body = await getRequestBody(req);
    const providedKey = body?.syncKey || req.headers['x-sync-key'];

    if (!timingSafeCompare(providedKey, syncKey)) {
      await new Promise(r => setTimeout(r, 400));
      res.statusCode = 401;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Invalid device authorization credential.' }));
      return;
    }

    // Generate signed token and set Secure, HttpOnly cookie
    const token = createSignedToken(syncKey);
    const cookieHeader = [
      `device_auth_token=${token}`,
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      'Max-Age=31536000', // 1 year
    ];
    if (isHttps) {
      cookieHeader.push('Secure');
    }

    res.setHeader('Set-Cookie', cookieHeader.join('; '));
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, authorized: true }));
    return;
  }

  // ── AUTHENTICATION: Check HttpOnly device_auth_token Cookie ─────────────────
  const cookies = parseCookies(req.headers.cookie);
  const tokenFromCookie = cookies.device_auth_token;
  const isAuthorized = verifySignedToken(tokenFromCookie, syncKey);

  // ── ACTION: Check Authorization Status ─────────────────────────────────────
  if (action === 'status') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ authorized: isAuthorized }));
    return;
  }

  if (!isAuthorized) {
    res.statusCode = 401;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Unauthorized device. Please link this device once.' }));
    return;
  }

  // Verify Supabase Server Configuration
  if (!supabaseUrl || !serviceKey || !trackerUserId) {
    const missing = [];
    if (!supabaseUrl) missing.push('SUPABASE_URL');
    if (!serviceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
    if (!trackerUserId) missing.push('TRACKER_USER_ID');
    console.error('[API Tracker Configuration Missing]:', missing.join(', '));
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      error: `Server database configuration missing: ${missing.join(', ')}.`,
    }));
    return;
  }

  // Obtain Database Client
  let supabase;
  try {
    supabase = await getSupabaseDbClient(supabaseUrl, serviceKey, trackerUserId, anonKey);
  } catch (err) {
    console.error('[API Tracker Client Error]:', err.message);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: err.message || 'Database client initialization failed.' }));
    return;
  }

  // ── GET: Read Tracker Data ──────────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('habit_tracker_data')
        .select('tracker_data, updated_at')
        .eq('user_id', trackerUserId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('[API Tracker Read Error]: Code:', error.code, 'Message:', error.message);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Failed to read cloud habit tracker data.' }));
        return;
      }

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        tracker_data: data?.tracker_data || null,
        updated_at: data?.updated_at || null,
      }));
    } catch (err) {
      console.error('[API Tracker Read Exception]:', err.message);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Internal server error reading tracker data.' }));
    }
    return;
  }

  // ── POST: Save Tracker Data ─────────────────────────────────────────────────
  if (req.method === 'POST') {
    try {
      const body = await getRequestBody(req);
      const trackerData = body?.tracker_data;

      if (!validateTrackerData(trackerData)) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Invalid tracker data format.' }));
        return;
      }

      const nowIso = new Date().toISOString();
      const { error } = await supabase
        .from('habit_tracker_data')
        .upsert({
          user_id: trackerUserId,
          tracker_data: trackerData,
          updated_at: nowIso,
        }, { onConflict: 'user_id' });

      if (error) {
        console.error('[API Tracker Write Error]: Code:', error.code, 'Message:', error.message);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Failed to save tracker data to database.' }));
        return;
      }

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: true, updated_at: nowIso }));
    } catch (err) {
      console.error('[API Tracker Write Exception]:', err.message);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Internal server error saving tracker data.' }));
    }
  }
}
