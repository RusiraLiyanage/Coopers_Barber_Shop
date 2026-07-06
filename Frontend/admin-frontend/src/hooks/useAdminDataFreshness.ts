import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { getAdminDataVersion } from '../lib/api';
import { getRuntimeConfigValue } from '../lib/runtimeConfig';

const ADMIN_REALTIME_URL = getRuntimeConfigValue('VITE_ADMIN_REALTIME_URL');
const ADMIN_DATA_CHANGED_EVENT = 'admin.data.changed';
const LOCAL_CHANGE_SUPPRESSION_MS = 6_000;

type AdminDataChangedPayload = {
  version: string;
  reason: string;
};

function isNewerVersion(candidateVersion: string, currentVersion: string) {
  return Date.parse(candidateVersion) > Date.parse(currentVersion);
}

function isAdminDataChangedPayload(
  value: unknown,
): value is AdminDataChangedPayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    'version' in value &&
    typeof (value as { version?: unknown }).version === 'string'
  );
}

export function useAdminDataFreshness() {
  const currentVersionRef = useRef<string | null>(null);
  const latestSeenVersionRef = useRef<string | null>(null);
  const suppressFreshDataNoticeUntilRef = useRef(0);
  const [hasFreshData, setHasFreshData] = useState(false);

  const refreshKnownVersion = useCallback(async () => {
    const response = await getAdminDataVersion();

    currentVersionRef.current = response.version;
    latestSeenVersionRef.current = response.version;
    setHasFreshData(false);
  }, []);

  const markLocalDataChangePending = useCallback(() => {
    suppressFreshDataNoticeUntilRef.current =
      Date.now() + LOCAL_CHANGE_SUPPRESSION_MS;
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

    if (Date.now() <= suppressFreshDataNoticeUntilRef.current) {
      currentVersionRef.current = response.version;
      setHasFreshData(false);
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

  const handleRealtimeDataChanged = useCallback((payload: unknown) => {
    if (!isAdminDataChangedPayload(payload)) {
      return;
    }

    const currentVersion = currentVersionRef.current;
    latestSeenVersionRef.current = payload.version;

    if (!currentVersion) {
      currentVersionRef.current = payload.version;
      return;
    }

    if (Date.now() <= suppressFreshDataNoticeUntilRef.current) {
      currentVersionRef.current = payload.version;
      setHasFreshData(false);
      return;
    }

    if (isNewerVersion(payload.version, currentVersion)) {
      setHasFreshData(true);
    }
  }, []);

  useEffect(() => {
    if (!ADMIN_REALTIME_URL) {
      return;
    }

    const socket: Socket = io(ADMIN_REALTIME_URL, {
      transports: ['websocket'],
      withCredentials: true,
    });

    socket.on(ADMIN_DATA_CHANGED_EVENT, handleRealtimeDataChanged);

    return () => {
      socket.off(ADMIN_DATA_CHANGED_EVENT, handleRealtimeDataChanged);
      socket.disconnect();
    };
  }, [handleRealtimeDataChanged]);

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

    document.addEventListener('visibilitychange', checkWhenVisible);

    return () => {
      isActive = false;
      document.removeEventListener('visibilitychange', checkWhenVisible);
    };
  }, [checkForFreshData, hasFreshData]);

  return {
    hasFreshData,
    dismissFreshDataNotice,
    refreshKnownVersion,
    markLocalDataChangePending,
  };
}
