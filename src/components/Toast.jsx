import { useEffect, useState } from 'react';

let toastCounter = 0;

export function useToast() {
  const [toasts, setToasts] = useState([]);

  function addToast(type, message, duration = 3500) {
    const id = ++toastCounter;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }

  return { toasts, addToast };
}

export default function ToastContainer({ toasts }) {
  if (!toasts.length) return null;
  return (
    <div className="toast-container" role="status" aria-live="polite">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
