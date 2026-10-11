import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
export default function Dialog({ title, onClose, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const trigger = document.activeElement;
    const d = ref.current;
    d.showModal();
    return () => {
      d.close();
      trigger?.focus?.();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="v2-dialog"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) {
          const r = ref.current.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
      aria-labelledby="v2-dialog-title"
    >
      <div className="v2-dialog-head">
        <h2 id="v2-dialog-title">{title}</h2>
        <button onClick={onClose} aria-label="Close panel">
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
