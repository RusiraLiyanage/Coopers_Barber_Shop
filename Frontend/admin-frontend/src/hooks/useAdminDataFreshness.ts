import { useCallback, useEffect, useRef, useState } from 'react';
import { getAdminDataVersion } from '../lib/api';

const ADMIN_DATA_FRESHNESS_POLL_MS = 45_000;

function isNewerVersion(candidateVersion: string, currentVersion: string) {
  return Date.parse(candidateVersion) > Date.parse(currentVersion);
}

export function useAdminDataFreshness() {
  const currentVersionRef = useRef<string | null>(null);
  const latestSeenVersionRef = useRef<string | null>(null);
  const [hasFreshData, setHasFreshData] = useState(false);

  const refreshKnownVersion = useCallback(async () => {
    const response = await getAdminDataVersion();

    currentVersionRef.current = response.version;
    latestSeenVersionRef.current = response.version;
    setHasFreshData(false);
  }, []);

  const checkForFreshData = useCallback(async () => {
    const response = await getAdminDataVersion();
    const currentVersion = currentVersionRef.current;

    latestSeenVersionRef.current = response.version;

    if (!currentVersion) {
      currentVersionRef.current = response.version;
      return;
    }

    if (isNewerVersion(response.version, currentVersion)) {
      setHasFreshData(true);
    }
  }, []);

  const dismissFreshDataNotice = useCallback(() => {
    currentVersionRef.current =
      latestSeenVersionRef.current ?? currentVersionRef.current;
    setHasFreshData(false);
  }, []);

  useEffect(() => {
    let isActive = true;

    const checkWhenVisible = () => {
      if (
        !isActive ||
        document.visibilityState !== 'visible' ||
        hasFreshData
      ) {
        return;
      }

      void checkForFreshData().catch(() => undefined);
    };

    checkWhenVisible();

    const intervalId = window.setInterval(
      checkWhenVisible,
      ADMIN_DATA_FRESHNESS_POLL_MS,
    );

    document.addEventListener('visibilitychange', checkWhenVisible);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', checkWhenVisible);
    };
  }, [checkForFreshData, hasFreshData]);

  return {
    hasFreshData,
    dismissFreshDataNotice,
    refreshKnownVersion,
  };
}
