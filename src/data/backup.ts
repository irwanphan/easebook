/** Satu entri log backup/restore database. */
export type BackupRow = {
  id: number;
  /** "BACKUP" atau "RESTORE". */
  jenis: "BACKUP" | "RESTORE";
  fileName: string;
  filePath: string;
  fileSizeBytes: number;
  catatan: string;
  /** Unix timestamp (detik). */
  createdAt: number;
  /** Khusus jenis BACKUP — true bila file fisik masih ada di disk. */
  fileExists: boolean;
};

/** Status menyeluruh sistem backup. */
export type BackupStatus = {
  backupFolderPath: string;
  dbFilePath: string;
  dbFileSizeBytes: number;
  lastBackupAt: number | null;
  lastBackupFileName: string | null;
  restorePending: boolean;
  restorePendingSource: string | null;
};
