import { check, Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { AlertCircle, CheckCircle, Download, Loader2, RefreshCw, Sparkles, X } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  autoCheckOnOpen?: boolean;
}

type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'up-to-date' | 'error';

export const UpdateModal: React.FC<UpdateModalProps> = ({
  isOpen,
  onClose,
  autoCheckOnOpen = true,
}) => {
  const [status, setStatus] = useState<UpdateStatus>('idle');
  const [updateInfo, setUpdateInfo] = useState<Update | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [downloadTotal, setDownloadTotal] = useState<number>(0);

  const checkForUpdates = useCallback(async () => {
    setStatus('checking');
    setErrorMessage(null);
    try {
      const update = await check();
      if (update) {
        setUpdateInfo(update);
        setStatus('available');
      } else {
        setStatus('up-to-date');
      }
    } catch (err: any) {
      console.error('Failed to check for updates:', err);
      setErrorMessage(err?.message || 'Could not reach update server. Check your network connection.');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    if (isOpen && autoCheckOnOpen) {
      checkForUpdates();
    }
  }, [isOpen, autoCheckOnOpen, checkForUpdates]);

  const handleInstall = async () => {
    if (!updateInfo) return;
    setStatus('downloading');
    setDownloadProgress(0);
    setDownloadTotal(0);

    try {
      let downloaded = 0;
      let total = 0;

      await updateInfo.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            total = event.data.contentLength ?? 0;
            setDownloadTotal(total);
            break;
          case 'Progress':
            downloaded += event.data.chunkLength;
            setDownloadProgress(downloaded);
            break;
          case 'Finished':
            break;
        }
      });

      // Relaunch the application into the new version
      await relaunch();
    } catch (err: any) {
      console.error('Failed to download/install update:', err);
      setErrorMessage(err?.message || 'Failed to apply update package.');
      setStatus('error');
    }
  };

  if (!isOpen) return null;

  const percent =
    downloadTotal > 0 ? Math.min(100, Math.round((downloadProgress / downloadTotal) * 100)) : 0;

  return createPortal(
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-container modal-container-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="modal-header-icon-badge">
              <Sparkles size={20} className="text-emerald-400" />
            </div>
            <div>
              <h2 className="modal-title">Software Updates</h2>
              <p className="modal-subtitle">Cryptographically verified OTA update channel</p>
            </div>
          </div>
          <button type="button" className="btn-icon" onClick={onClose} title="Close">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {status === 'checking' && (
            <div className="update-status-box">
              <Loader2 size={36} className="animate-spin text-emerald-400" />
              <p className="update-status-title">Checking for updates...</p>
              <p className="update-status-desc">Querying verified release manifests and signatures</p>
            </div>
          )}

          {status === 'up-to-date' && (
            <div className="update-status-box">
              <CheckCircle size={36} className="text-emerald-400" />
              <p className="update-status-title">ArmoryVault is up to date</p>
              <p className="update-status-desc">
                You are currently running the latest certified release. All signatures and modules are synchronized.
              </p>
            </div>
          )}

          {status === 'available' && updateInfo && (
            <div className="update-available-content">
              <div className="update-badge-row">
                <span className="badge badge-accent">New Version Available</span>
                <span className="update-version-label">v{updateInfo.version}</span>
              </div>
              <p className="update-intro">
                A new version of ArmoryVault is ready to download. Your local database and encryption keys will remain intact.
              </p>

              {updateInfo.body && (
                <div className="update-release-notes">
                  <h4 className="update-notes-title">Release Notes</h4>
                  <div className="update-notes-body">{updateInfo.body}</div>
                </div>
              )}
            </div>
          )}

          {status === 'downloading' && (
            <div className="update-status-box">
              <Download size={36} className="text-emerald-400 animate-bounce" />
              <p className="update-status-title">Downloading Update ({percent}%)</p>
              <div className="update-progress-track">
                <div
                  className="update-progress-bar"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <p className="update-status-desc">
                Applying cryptographic Minisign signature verification and preparing restart...
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="update-status-box">
              <AlertCircle size={36} className="text-rose-400" />
              <p className="update-status-title">Update Check Failed</p>
              <p className="update-status-desc">{errorMessage}</p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {status === 'available' ? (
            <>
              <button type="button" className="btn-secondary" onClick={onClose}>
                Later
              </button>
              <button
                type="button"
                className="btn-primary flex items-center gap-2"
                onClick={handleInstall}
              >
                <Download size={16} />
                <span>Install & Restart</span>
              </button>
            </>
          ) : status === 'downloading' ? (
            <button type="button" className="btn-secondary" disabled>
              Installing...
            </button>
          ) : (
            <>
              <button
                type="button"
                className="btn-secondary flex items-center gap-2"
                onClick={checkForUpdates}
                disabled={status === 'checking'}
              >
                <RefreshCw size={16} className={status === 'checking' ? 'animate-spin' : ''} />
                <span>Check Again</span>
              </button>
              <button type="button" className="btn-primary" onClick={onClose}>
                Done
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
