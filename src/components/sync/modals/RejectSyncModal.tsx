import { AlertTriangle, Smartphone, Trash2, X } from 'lucide-react';
import React, { useState } from 'react';
import { createPortal } from 'react-dom';

export interface RejectSyncTarget {
  id: string | number;
  itemType?: string;
  filename?: string;
  itemIdentifier?: string;
  title?: string;
  payload?: any;
}

export interface RejectSyncModalProps {
  isOpen: boolean;
  target: RejectSyncTarget | null;
  onClose: () => void;
  onConfirm: (target: RejectSyncTarget, deleteFromMobile: boolean) => Promise<void> | void;
}

export const RejectSyncModal: React.FC<RejectSyncModalProps> = ({
  isOpen,
  target,
  onClose,
  onConfirm,
}) => {
  const [deleteFromMobile, setDeleteFromMobile] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  if (!isOpen || !target) return null;

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      await onConfirm(target, deleteFromMobile);
    } finally {
      setIsProcessing(false);
      onClose();
    }
  };

  const displayName =
    target.title ||
    target.filename ||
    target.itemIdentifier ||
    `Sync Item #${target.id}`;

  const displayType = target.itemType || 'Sync Item';

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-container modal-container-sm"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="modal-header-icon bg-danger-subtle text-danger">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h2 className="modal-title">Reject Sync Item</h2>
              <p className="modal-subtitle">
                Configure item rejection and mobile device pruning
              </p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {/* Item Preview Box */}
          <div className="reject-sync-item-preview">
            <span className="reject-sync-item-label">{displayType}</span>
            <span className="reject-sync-item-name">{displayName}</span>
            <div className="reject-sync-item-meta">
              <span>ID: {String(target.id)}</span>
              {target.itemIdentifier && (
                <span>Ref: {target.itemIdentifier}</span>
              )}
            </div>
          </div>

          <div className="reject-sync-options-list">
            {/* Option A: Delete from Mobile Companion (Recommended) */}
            <div
              className={`reject-sync-option-card ${deleteFromMobile ? 'active' : ''}`}
              onClick={() => setDeleteFromMobile(true)}
            >
              <div className="reject-sync-radio-wrap">
                <div className="reject-sync-radio-circle">
                  {deleteFromMobile && <div className="reject-sync-radio-dot" />}
                </div>
              </div>
              <div className="reject-sync-option-content">
                <div className="reject-sync-option-header">
                  <div className="reject-sync-option-title">
                    <Smartphone size={16} />
                    <span>Delete from Mobile Companion</span>
                  </div>
                  <span className="reject-sync-badge-recommended">Recommended</span>
                </div>
                <p className="reject-sync-option-desc">
                  Records a rejection tombstone. When your mobile companion connects,
                  it will automatically shred any pending payload and purge this item
                  from its encrypted storage cache.
                </p>
              </div>
            </div>

            {/* Option B: Keep on Mobile Device */}
            <div
              className={`reject-sync-option-card ${!deleteFromMobile ? 'active' : ''}`}
              onClick={() => setDeleteFromMobile(false)}
            >
              <div className="reject-sync-radio-wrap">
                <div className="reject-sync-radio-circle">
                  {!deleteFromMobile && <div className="reject-sync-radio-dot" />}
                </div>
              </div>
              <div className="reject-sync-option-content">
                <div className="reject-sync-option-header">
                  <div className="reject-sync-option-title">
                    <span>Keep on Mobile Device</span>
                  </div>
                </div>
                <p className="reject-sync-option-desc">
                  Only removes the item from the desktop inbox queue. The item will
                  remain stored on your mobile companion device.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-danger"
            onClick={handleConfirm}
            disabled={isProcessing}
          >
            <Trash2 size={16} />
            <span>{isProcessing ? 'Rejecting...' : 'Confirm Rejection'}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
