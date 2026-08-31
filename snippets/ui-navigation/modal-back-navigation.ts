/**
 * PATTERN: useModalBackNavigation Hook (Android Back Gesture & PopState Trapping)
 * STACK: React, Web History API, Mobile Android & PWA
 * 
 * PROBLEM:
 * In SPAs and PWAs, pressing hardware Back or Android back gesture navigates back in
 * browser history and closes the app if a modal or sidebar is open.
 * 
 * SOLUTION:
 * Pushes a synthetic history entry when overlay opens and traps popstate to close the modal.
 */

import { useEffect, useRef } from 'react';

interface OverlayState {
  isOpen: boolean;
  close: () => void;
}

export function useModalBackNavigation(overlays: OverlayState[]) {
  const isPushedRef = useRef(false);
  const anyOpen = overlays.some((o) => o.isOpen);

  useEffect(() => {
    if (anyOpen && !isPushedRef.current) {
      window.history.pushState({ appOverlay: true }, '');
      isPushedRef.current = true;
    } else if (!anyOpen && isPushedRef.current) {
      isPushedRef.current = false;
      if (window.history.state?.appOverlay) {
        window.history.back();
      }
    }
  }, [anyOpen]);

  useEffect(() => {
    const handlePopState = () => {
      if (isPushedRef.current) {
        isPushedRef.current = false;
        overlays.forEach((o) => {
          if (o.isOpen) o.close();
        });
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [overlays]);
}
