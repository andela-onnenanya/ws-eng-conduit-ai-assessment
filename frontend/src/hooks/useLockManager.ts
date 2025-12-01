import { useEffect, useRef, useState } from 'react';
import { acquireLock, releaseLock, heartbeatLock, checkLock } from '../services/conduit';
import { useStore } from '../state/storeHooks';

export function useLockManager(slug: string): {
  hasLock: boolean;
  lockError: string | null;
  lockedBy: string | null;
} {
  const [hasLock, setHasLock] = useState(false);
  const [lockError, setLockError] = useState<string | null>(null);
  const [lockedBy, setLockedBy] = useState<string | null>(null);

  const hasLockRef = useRef(hasLock);
  hasLockRef.current = hasLock;

  const currentUser = useStore(({ app }) => app.user);
  const currentUsername = currentUser?.username ?? null;

  useEffect(() => {
    let mounted = true;
    let intervalId: number | null = null;
    let verifyIntervalId: number | null = null;

    async function init() {
      console.log('[Lock] Checking lock for slug:', slug, 'currentUsername:', currentUsername);
      try {
        // First check if someone else already holds the lock
        const status = await checkLock(slug);
        if (!mounted) return;
        console.log('[Lock] Pre-check result:', status);

        if (status.locked && status.lockedBy && status.lockedBy !== currentUsername) {
          console.log('[Lock] Lock held by another user:', status.lockedBy, 'current user:', currentUsername);
          setHasLock(false);
          setLockError(`This article is currently being edited by ${status.lockedBy}.`);
          setLockedBy(status.lockedBy);
          return;
        }

        // Try to acquire the lock
        const res = await acquireLock(slug);
        if (!mounted) return;
        console.log('[Lock] Acquire result:', res);

        if (res.success) {
          console.log('[Lock] Lock acquired successfully!');
          setHasLock(true);
          setLockError(null);
          setLockedBy(null);
        } else {
          setHasLock(false);
          setLockError(`This article is currently being edited by ${res.lockedBy ?? 'another user'}.`);
          setLockedBy(res.lockedBy ?? null);
          return;
        }
      } catch {
        if (!mounted) return;
        setHasLock(false);
        setLockError('Failed to acquire edit lock. Please try again.');
      }

      // Double-check ownership once after acquisition
      try {
        if (hasLockRef.current) {
          const statusNow = await checkLock(slug);
          if (!(statusNow.locked && statusNow.lockedBy === currentUsername)) {
            setHasLock(false);
            setLockError(`This article is currently being edited by ${statusNow.lockedBy ?? 'another user'}.`);
            setLockedBy(statusNow.lockedBy ?? null);
          }
        }
      } catch {
        // ignore one-off verification failure
      }

      // Heartbeat every 30 seconds while we have the lock
      intervalId = window.setInterval(async () => {
        try {
          if (!hasLockRef.current) return;
          const hb = await heartbeatLock(slug);
          if (!hb.success) {
            setHasLock(false);
            setLockedBy(null);
            setLockError('Lost the edit lock. Please reload the page.');
          }
        } catch {
          // ignore transient heartbeat failures
        }
      }, 30000);

      // Periodically re-check lock ownership (defensive)
      verifyIntervalId = window.setInterval(async () => {
        try {
          if (!hasLockRef.current) return;
          const status = await checkLock(slug);
          if (!status.locked || (status.lockedBy && status.lockedBy !== currentUsername)) {
            setHasLock(false);
            setLockedBy(status.lockedBy ?? null);
            setLockError(
              status.lockedBy
                ? `This article is currently being edited by ${status.lockedBy}.`
                : 'Lost the edit lock. Please reload the page.',
            );
          }
        } catch {
          // ignore transient check failures
        }
      }, 5000);
    }

    const beforeUnload = () => {
      try {
        if (hasLockRef.current) {
          // Fire-and-forget release; may be cancelled by the browser, but best-effort
          void releaseLock(slug);
        }
      } catch {
        // ignore
      }
    };

    void init();
    window.addEventListener('beforeunload', beforeUnload);

    return () => {
      mounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
      if (verifyIntervalId) {
        clearInterval(verifyIntervalId);
      }
      window.removeEventListener('beforeunload', beforeUnload);
      try {
        if (hasLockRef.current) {
          void releaseLock(slug);
        }
      } catch {
        // ignore
      }
    };
  }, [slug, currentUsername]);

  return { hasLock, lockError, lockedBy };
}
