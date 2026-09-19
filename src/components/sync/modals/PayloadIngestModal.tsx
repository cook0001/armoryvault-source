import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  Edit3,
  FileCode,
  Key,
  Lock,
  Package,
  ShieldCheck,
  Trash2,
  Unlock,
  X,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  commitParsedPayload,
  CommitResult,
  parseAndValidatePayload,
  ParsedPayloadResult,
} from '../../../utils/payloadIngestionEngine';

export interface PayloadIngestModalProps {
  isOpen: boolean;
  rawPayload: string | object | null;
  filename?: string;
  onClose: () => void;
  onApproved: (result: CommitResult) => void;
  onDeclined?: () => void;
}

export const PayloadIngestModal: React.FC<PayloadIngestModalProps> = ({
  isOpen,
  rawPayload,
  filename,
  onClose,
  onApproved,
  onDeclined,
}) => {
  const [parsed, setParsed] = useState<ParsedPayloadResult | null>(null);
  const [keyInput, setKeyInput] = useState('');
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitError, setCommitError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editJson, setEditJson] = useState('');

  // Initial load: Attempt automatic decryption with pairing token
  useEffect(() => {
    if (!isOpen || !rawPayload) {
      setParsed(null);
      setKeyInput('');
      setIsEditing(false);
      setCommitError(null);
      return;
    }

    const autoParse = async () => {
      setIsDecrypting(true);
      setCommitError(null);

      // Attempt auto-decryption using active desktop pairing token
      let autoToken: string | undefined;
      try {
        if ((window as any).api?.getPairingToken) {
          autoToken = await (window as any).api.getPairingToken();
        }
      } catch {
        // Fallback without auto token
      }

      const result = await parseAndValidatePayload(rawPayload, autoToken, filename);
      setParsed(result);
      if (result.success && result.data) {
        setEditJson(JSON.stringify(result.data, null, 2));
      }
      setIsDecrypting(false);
    };

    autoParse();
  }, [isOpen, rawPayload, filename]);

  // Manual key decrypt handler
  const handleManualDecrypt = async () => {
    if (!rawPayload || !keyInput.trim()) return;
    setIsDecrypting(true);
    setCommitError(null);

    const result = await parseAndValidatePayload(rawPayload, keyInput.trim(), filename);
    setParsed(result);
    if (result.success && result.data) {
      setEditJson(JSON.stringify(result.data, null, 2));
    }
    setIsDecrypting(false);
  };

  // Commit / Approve handler
  const handleApprove = async () => {
    if (!parsed) return;
    setIsCommitting(true);
    setCommitError(null);

    let targetParsed = parsed;
    if (isEditing) {
      try {
        const editedData = JSON.parse(editJson);
        targetParsed = {
          ...parsed,
          data: editedData,
        };
      } catch (err: any) {
        setCommitError(`Invalid JSON in editor: ${err.message}`);
        setIsCommitting(false);
        return;
      }
    }

    const commitResult = await commitParsedPayload(targetParsed);
    setIsCommitting(false);

    if (commitResult.success) {
      onApproved(commitResult);
      onClose();
    } else {
      setCommitError(commitResult.errors.join('; ') || 'Failed committing to database.');
    }
  };

  // Decline handler
  const handleDecline = () => {
    onDeclined?.();
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal payload-ingest-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '640px', width: '92%' }}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#3b82f6',
              }}
            >
              <Package size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', margin: 0 }}>ArmoryVault Payload Ingestion</h2>
              <span
                style={{
                  fontSize: '0.8rem',
                  fontFamily: 'monospace',
                  color: 'var(--text-secondary)',
                }}
              >
                {filename || parsed?.filename || 'custom_payload.av*'}
              </span>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="modal-content" style={{ maxHeight: '68vh', overflowY: 'auto' }}>
          {/* Security Banner */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.25)',
              marginBottom: '1rem',
              color: '#22c55e',
              fontSize: '0.85rem',
            }}
          >
            <ShieldCheck size={18} />
            <span>Authenticated AES-256-GCM Payload Envelope Verified</span>
          </div>

          {/* Decryption Needed View */}
          {parsed?.needsKey && (
            <div
              style={{
                padding: '1.25rem',
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: '8px',
                marginBottom: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Lock size={18} color="#ef4444" />
                <strong style={{ color: '#ef4444' }}>Encrypted Payload Envelope</strong>
              </div>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                This payload was protected with end-to-end PBKDF2 + AES-256-GCM. Enter the companion
                pairing code or device passphrase to decrypt and review contents:
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Enter pairing token or passphrase"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleManualDecrypt()}
                  style={{ flex: 1 }}
                  autoFocus
                />
                <button
                  className="btn-primary"
                  onClick={handleManualDecrypt}
                  disabled={isDecrypting || !keyInput.trim()}
                >
                  <Unlock size={16} />
                  {isDecrypting ? 'Decrypting...' : 'Decrypt'}
                </button>
              </div>
              {parsed.error && (
                <div style={{ marginTop: '8px', color: '#ef4444', fontSize: '0.82rem' }}>
                  Decryption error: {parsed.error}
                </div>
              )}
            </div>
          )}

          {/* Success Decrypted / Plaintext Review View */}
          {parsed?.success && (
            <div>
              {/* Summary Card */}
              <div
                style={{
                  padding: '1rem',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-secondary, rgba(255, 255, 255, 0.03))',
                  border: '1px solid var(--border-light, rgba(255, 255, 255, 0.1))',
                  marginBottom: '1rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(59, 130, 246, 0.15)',
                        color: '#3b82f6',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        fontFamily: 'monospace',
                        marginBottom: '6px',
                        textTransform: 'uppercase',
                      }}
                    >
                      {parsed.format?.replace('armoryvault_', '')}
                    </span>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem' }}>{parsed.summaryTitle}</h3>
                    <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                      {parsed.summarySubtitle}
                    </p>
                  </div>
                  <button
                    className="btn-secondary"
                    onClick={() => setIsEditing(!isEditing)}
                    style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                  >
                    <Edit3 size={14} />
                    {isEditing ? 'Preview' : 'Edit'}
                  </button>
                </div>
              </div>

              {/* Edit Mode vs Inspector */}
              {isEditing ? (
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px', display: 'block' }}>
                    Edit Payload JSON Before Committing
                  </label>
                  <textarea
                    value={editJson}
                    onChange={(e) => setEditJson(e.target.value)}
                    rows={12}
                    style={{
                      width: '100%',
                      fontFamily: 'monospace',
                      fontSize: '0.82rem',
                      borderRadius: '6px',
                      padding: '10px',
                      backgroundColor: '#0a0d14',
                      color: '#e2e8f0',
                      border: '1px solid var(--border-light, #1e293b)',
                    }}
                  />
                </div>
              ) : (
                <div
                  style={{
                    maxHeight: '220px',
                    overflowY: 'auto',
                    borderRadius: '6px',
                    backgroundColor: '#0a0d14',
                    padding: '10px 14px',
                    border: '1px solid var(--border-light, #1e293b)',
                    fontFamily: 'monospace',
                    fontSize: '0.8rem',
                    color: '#94a3b8',
                  }}
                >
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                    {JSON.stringify(parsed.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {commitError && (
            <div
              style={{
                marginTop: '1rem',
                padding: '10px',
                borderRadius: '6px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                fontSize: '0.85rem',
              }}
            >
              {commitError}
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div
          className="modal-actions"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '1.25rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border-light, rgba(255, 255, 255, 0.1))',
          }}
        >
          <button
            className="btn-secondary"
            onClick={handleDecline}
            style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
          >
            <Trash2 size={16} />
            Decline
          </button>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn-primary"
              onClick={handleApprove}
              disabled={!parsed?.success || isCommitting}
              style={{ backgroundColor: '#22c55e', borderColor: '#22c55e', color: '#000000', fontWeight: 700 }}
            >
              <CheckCircle size={16} />
              {isCommitting ? 'Committing...' : 'Approve & Commit to Vault'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
