import { useCallback, useEffect, useRef, useState } from 'react';
import './sheetMotion.css';

export default function useSheetMotion(onClose) {
  const [closing, setClosing] = useState(false);
  const timer = useRef(null);
  const callback = useRef(onClose);
  callback.current = onClose;
  useEffect(() => () => clearTimeout(timer.current), []);
  const dismiss = useCallback(afterClose => {
    if (timer.current !== null) return;
    const finish = () => (typeof afterClose === 'function' ? afterClose : callback.current)();
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      finish();
      return;
    }
    setClosing(true);
    timer.current = setTimeout(finish, 280);
  }, []);
  return { closing, dismiss };
}
