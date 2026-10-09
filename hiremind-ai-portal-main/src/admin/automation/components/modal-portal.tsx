import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Renders a dialog directly under <body>. Dialogs used to render inside the
 * page tree, where animated / blurred ancestors make `position: fixed` behave
 * like `absolute`. On long lists that opened the dialog in the middle of the
 * (tall) page instead of the visible screen. A portal always anchors it to
 * the viewport. Also locks the page scroll behind the dialog.
 */
export function ModalPortal({ children }: { children: ReactNode }) {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}
