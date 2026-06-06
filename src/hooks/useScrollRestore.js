import { useEffect } from 'react';

// Module-level map so positions survive re-renders across tab switches
const savedPositions = {};

/**
 * Save and restore window scroll position per key (e.g. route pathname).
 * Call at the top of each tab component with a stable unique key.
 */
export default function useScrollRestore(key) {
  useEffect(() => {
    // Restore saved position for this tab immediately on mount
    const saved = savedPositions[key] ?? 0;
    window.scrollTo({ top: saved, behavior: 'instant' });

    // Save position when leaving this tab
    return () => {
      savedPositions[key] = window.scrollY;
    };
  }, [key]);
}
