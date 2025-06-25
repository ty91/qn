import React, { useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useCloudSync } from "@/hooks/use-cloud-sync";
import { databaseEvents, DATABASE_EVENTS } from "@/services/event-emitter";

export function SyncStatusIndicator() {
  const {
    cloudAvailable,
    syncStatus,
    isSyncing,
    syncError,
    performSync,
  } = useCloudSync();

  useEffect(() => {
    const handleSyncCompleted = (data: { type: string }) => {
      // 동기화 완료 시 사용자에게 알림
      // React Native에서는 토스트 메시지를 직접 구현해야 합니다
      // 여기서는 console.log로 대체합니다
      console.log(`✅ 동기화 완료: ${data.type === 'upload' ? '업로드' : '다운로드'}`);
    };

    const handleSyncFailed = (data: { type: string; error: any }) => {
      console.log(`❌ 동기화 실패: ${data.type === 'upload' ? '업로드' : '다운로드'}`);
    };

    databaseEvents.on(DATABASE_EVENTS.SYNC_COMPLETED, handleSyncCompleted);
    databaseEvents.on(DATABASE_EVENTS.SYNC_FAILED, handleSyncFailed);

    return () => {
      databaseEvents.off(DATABASE_EVENTS.SYNC_COMPLETED, handleSyncCompleted);
      databaseEvents.off(DATABASE_EVENTS.SYNC_FAILED, handleSyncFailed);
    };
  }, []);

  if (!cloudAvailable) {
    return null;
  }

  const getSyncIcon = () => {
    if (isSyncing) {
      return <ActivityIndicator size="small" color="#007AFF" />;
    }
    if (syncError) {
      return <Ionicons name="cloud-offline" size={24} color="#FF3B30" />;
    }
    if (syncStatus.hasLocalChanges || syncStatus.hasRemoteChanges) {
      return <Ionicons name="cloud-upload" size={24} color="#FF9500" />;
    }
    return <Ionicons name="cloud-done" size={24} color="#34C759" />;
  };

  const getSyncStatusText = () => {
    if (isSyncing) {
      return "동기화 중...";
    }
    if (syncError) {
      return "동기화 오류";
    }
    if (syncStatus.hasLocalChanges && syncStatus.hasRemoteChanges) {
      return "충돌 감지됨";
    }
    if (syncStatus.hasLocalChanges) {
      return "업로드 대기 중";
    }
    if (syncStatus.hasRemoteChanges) {
      return "다운로드 가능";
    }
    if (syncStatus.lastSyncTime) {
      const timeDiff = Date.now() - syncStatus.lastSyncTime.getTime();
      const minutes = Math.floor(timeDiff / 60000);
      if (minutes < 1) {
        return "방금 동기화됨";
      }
      if (minutes < 60) {
        return `${minutes}분 전 동기화됨`;
      }
      return "동기화됨";
    }
    return "동기화됨";
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={performSync}
      disabled={isSyncing}
    >
      <View style={styles.content}>
        {getSyncIcon()}
        <Text style={styles.statusText}>{getSyncStatusText()}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    color: "#666",
  },
});