import React, { useEffect, useRef } from "react";
import ReactDOM from "react-dom";

/**
 * ModalPortal — renders children directly into document.body via a React Portal.
 *
 * This bypasses the CSS "containing block" issue where ancestor elements using
 * backdrop-filter, transform, perspective, or will-change create a new stacking
 * context that breaks `position: fixed` centering on the viewport.
 *
 * Usage:
 *   <ModalPortal>
 *     <div className="fixed inset-0 ...">...</div>
 *   </ModalPortal>
 */
export default function ModalPortal({ children }: { children: React.ReactNode }) {
  const elRef = useRef<HTMLDivElement | null>(null);

  if (!elRef.current) {
    elRef.current = document.createElement("div");
  }

  useEffect(() => {
    const el = elRef.current!;
    document.body.appendChild(el);
    return () => {
      document.body.removeChild(el);
    };
  }, []);

  return ReactDOM.createPortal(children, elRef.current);
}
