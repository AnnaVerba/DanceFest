import { useCallback, useRef, useState } from 'react';

export interface ToastItem {
  id: number;
  message: string;
}

export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const showToast = useCallback((message: string) => {
    const id = nextId.current++;
    setToasts((list) => [...list, { id, message }]);
    setTimeout(() => {
      setToasts((list) => list.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return { toasts, showToast };
}
