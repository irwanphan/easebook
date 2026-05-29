import { invoke } from "@tauri-apps/api/core";
import type { BackupRow, BackupStatus } from "@/data/backup";

export function backupFolderPath() {
  return invoke<string>("backup_folder_path");
}

export function backupStatus() {
  return invoke<BackupStatus>("backup_status");
}

export function backupCreate(catatan?: string) {
  return invoke<BackupRow>("backup_create", { catatan: catatan ?? null });
}

export function backupList() {
  return invoke<BackupRow[]>("backup_list");
}

export function backupDelete(id: number) {
  return invoke<void>("backup_delete", { id });
}

export function backupRestoreStage(id: number) {
  return invoke<void>("backup_restore_stage", { id });
}

export function backupRestoreCancel() {
  return invoke<void>("backup_restore_cancel");
}
