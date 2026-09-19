import {
  CheckCircle,
  FileCode,
  Lock,
  Package,
  ShieldCheck,
  Smartphone,
  Trash2,
} from 'lucide-react';
import React, { useState } from 'react';
import { SyncItem } from '../../../types';
import { CommitResult } from '../../../utils/payloadIngestionEngine';
import { PayloadIngestModal } from '../modals/PayloadIngestModal';

export interface SyncItemPayloadCardProps {
  item: SyncItem;
  onDelete: (id: number) => void;
  onApproveSuccess?: () => void;
}

export const SyncItemPayloadCard: React.FC<SyncItemPayloadCardProps> = ({
  item,
  onDelete,
  onApproveSuccess,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filename = item.custom_payload_filename || 'custom_payload.av*';
  const extension =
    item.custom_payload_extension ||
    (filename.lastIndexOf('.') !== -1 ? filename.substring(filename.lastIndexOf('.')) : '.avpayload');
  const envelope = item.custom_payload_envelope || item.data || item;
  const deviceName = item.device || 'Mobile Companion';
  const timestampStr = item.timestamp
    ? new Date(item.timestamp).toLocaleString()
    : 'Recently';

  const getExtensionColor = (ext: string) => {
    switch (ext.toLowerCase()) {
      case '.avfirearm':
        return '#3b82f6';
      case '.avsession':
        return '#10b981';
      case '.avammo':
        return '#f59e0b';
      case '.avcomponent':
        return '#8b5cf6';
      case '.avaccessory':
        return '#06b6d4';
      case '.avmaintenance':
        return '#ec4899';
      case '.avtransfer':
        return '#eab308';
      case '.avbundle':
        return '#f97316';
      default:
        return '#64748b';
    }
  };

  const badgeColor = getExtensionColor(extension);

  const handleApproved = (result: CommitResult) => {
    if (item.id !== undefined) {
      onDelete(item.id);
    }
    onApproveSuccess?.();
    window.dispatchEvent(new CustomEvent('armoryvault:sync-completed'));
  };

  return (
    <>
      <div
        className="card sync-item-payload-card"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1.25rem 1.5rem',
          gap: '1.25rem',
          borderLeft: `4px solid ${badgeColor}`,
        }}
      >
        {/* Left icon & details */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              backgroundColor: `${badgeColor}18`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: badgeColor,
            }}
          >
            <Package size={22} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: '4px',
                  backgroundColor: `${badgeColor}22`,
                  color: badgeColor,
                  fontSize: '0.75rem',
                  fontFamily: 'monospace',
                  fontWeight: 700,
                }}
              >
                {extension}
              </span>
              <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>
                {filename}
              </strong>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '0.82rem',
                color: 'var(--text-secondary)',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Smartphone size={13} />
                {deviceName}
              </span>
              <span>•</span>
              <span>{timestampStr}</span>
              <span>•</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#22c55e' }}>
                <ShieldCheck size={13} />
                Encrypted AES-256-GCM
              </span>
            </div>
          </div>
        </div>

        {/* Right actions */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            className="btn-secondary"
            onClick={() => item.id !== undefined && onDelete(item.id)}
            style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
            title="Decline and discard"
          >
            <Trash2 size={16} /> Decline
          </button>
          <button
            className="btn-primary"
            onClick={() => setIsModalOpen(true)}
            style={{ backgroundColor: badgeColor, borderColor: badgeColor, color: '#ffffff' }}
          >
            <CheckCircle size={16} /> Inspect &amp; Ingest
          </button>
        </div>
      </div>

      <PayloadIngestModal
        isOpen={isModalOpen}
        rawPayload={envelope}
        filename={filename}
        onClose={() => setIsModalOpen(false)}
        onApproved={handleApproved}
        onDeclined={() => item.id !== undefined && onDelete(item.id)}
      />
    </>
  );
};
