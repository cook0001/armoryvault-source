import { CheckCircle, DownloadCloud, FolderOpen, HardDrive, UploadCloud } from 'lucide-react';
import React from 'react';

interface BackupSettingsSectionProps {
  backupPath: string | null;
  onSelectBackup: () => void | Promise<void>;
  onCreateZipBackup: () => void | Promise<void>;
  onRestoreBackup: () => void | Promise<void>;
}

export const BackupSettingsSection: React.FC<BackupSettingsSectionProps> = ({
  backupPath,
  onSelectBackup,
  onCreateZipBackup,
  onRestoreBackup,
}) => {
  return (
    <div className="settings-section-card">
      <div className="settings-section-header">
        <HardDrive size={18} className="settings-section-icon" />
        <h3 className="settings-section-title">Backups & Redundancy</h3>
      </div>
      <p className="settings-section-desc">
        Keep your encrypted inventory safe across external drives or cloud sync folders (e.g. Dropbox, OneDrive).
      </p>

      <div className="settings-path-picker-row">
        <div className={`settings-path-display ${backupPath ? 'active' : 'empty'}`}>
          {backupPath || 'No auto-backup folder configured.'}
        </div>
        <button
          type="button"
          className="btn-secondary settings-folder-btn"
          onClick={onSelectBackup}
        >
          <FolderOpen size={16} />
          <span>Choose Folder...</span>
        </button>
      </div>

      {backupPath && (
        <div className="settings-status-note success">
          <CheckCircle size={14} />
          <span>Auto-rotates up to 5 date-stamped encrypted vault backups in this folder.</span>
        </div>
      )}

      <div className="settings-action-grid bordered">
        <button
          type="button"
          className="btn-primary settings-btn-inner settings-btn-success"
          onClick={onCreateZipBackup}
        >
          <DownloadCloud size={16} />
          <span>Create Full .zip Archive</span>
        </button>
        <button
          type="button"
          className="btn-secondary settings-btn-inner settings-btn-accent-border"
          onClick={onRestoreBackup}
          title="Restore or import database from an encrypted vault (.enc), full archive (.zip), SQLite database (.sqlite, .db), or JSON export (.json)"
        >
          <UploadCloud size={16} />
          <span>Restore / Import Database (.enc, .zip, .sqlite, .json)</span>
        </button>
      </div>
    </div>
  );
};
