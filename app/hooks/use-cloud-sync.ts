import { useState, useCallback, useEffect } from "react";
import { useIsCloudAvailable } from "react-native-cloud-storage";
import { cloudSync, SyncStatus } from "@/services/cloud-sync";

export function useCloudSync() {
  const cloudAvailable = useIsCloudAvailable();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isAvailable: false,
    hasLocalChanges: false,
    hasRemoteChanges: false,
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // 동기화 상태 업데이트
  const updateSyncStatus = useCallback(async () => {
    try {
      const status = await cloudSync.getSyncStatus();
      setSyncStatus(status);
      setSyncError(status.error || null);
    } catch (error) {
      setSyncError(`동기화 상태 확인 실패: ${error}`);
    }
  }, []);

  // 수동 동기화 실행
  const performSync = useCallback(async () => {
    if (isSyncing || !cloudAvailable) return false;

    setIsSyncing(true);
    setSyncError(null);

    try {
      const success = await cloudSync.manualSync();
      if (success) {
        await updateSyncStatus();
      }
      return success;
    } catch (error) {
      setSyncError(`동기화 실패: ${error}`);
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [cloudAvailable, isSyncing, updateSyncStatus]);

  // 업로드 전용
  const uploadToCloud = useCallback(async () => {
    if (isSyncing || !cloudAvailable) return false;

    setIsSyncing(true);
    setSyncError(null);

    try {
      const success = await cloudSync.uploadDatabase();
      if (success) {
        await updateSyncStatus();
      }
      return success;
    } catch (error) {
      setSyncError(`업로드 실패: ${error}`);
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [cloudAvailable, isSyncing, updateSyncStatus]);

  // 다운로드 전용
  const downloadFromCloud = useCallback(async () => {
    if (isSyncing || !cloudAvailable) return false;

    setIsSyncing(true);
    setSyncError(null);

    try {
      const success = await cloudSync.downloadDatabase();
      if (success) {
        await updateSyncStatus();
      }
      return success;
    } catch (error) {
      setSyncError(`다운로드 실패: ${error}`);
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [cloudAvailable, isSyncing, updateSyncStatus]);

  // 자동 동기화 토글
  const toggleAutoSync = useCallback((enable: boolean) => {
    if (enable) {
      cloudSync.startAutoSync();
    } else {
      cloudSync.stopAutoSync();
    }
  }, []);

  // 초기 상태 확인
  useEffect(() => {
    if (cloudAvailable) {
      updateSyncStatus();
    }
  }, [cloudAvailable, updateSyncStatus]);

  return {
    cloudAvailable,
    syncStatus,
    isSyncing,
    syncError,
    performSync,
    uploadToCloud,
    downloadFromCloud,
    toggleAutoSync,
    updateSyncStatus,
  };
}

// 동기화 상태만 모니터링하는 경량 훅
export function useCloudSyncStatus() {
  const cloudAvailable = useIsCloudAvailable();
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);

  useEffect(() => {
    if (!cloudAvailable) return;

    const checkStatus = async () => {
      try {
        const status = await cloudSync.getSyncStatus();
        setSyncStatus(status);
      } catch (error) {
        console.error("동기화 상태 확인 실패:", error);
      }
    };

    // 초기 확인
    checkStatus();

    // 주기적으로 확인 (30초마다)
    const interval = setInterval(checkStatus, 30000);

    return () => clearInterval(interval);
  }, [cloudAvailable]);

  return {
    cloudAvailable,
    syncStatus,
  };
}