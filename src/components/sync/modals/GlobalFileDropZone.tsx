import { FileCode, Package, ShieldCheck, UploadCloud } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { PayloadIngestModal } from './PayloadIngestModal';
import { CommitResult } from '../../../utils/payloadIngestionEngine';

export const GlobalFileDropZone: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [droppedPayload, setDroppedPayload] = useState<string | object | null>(null);
  const [droppedFilename, setDroppedFilename] = useState<string | undefined>(undefined);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Supported ArmoryVault extensions
  const AV_EXTENSIONS = [
    '.avfirearm',
    '.avsession',
    '.avammo',
    '.avcomponent',
    '.avaccessory',
    '.avmaintenance',
    '.avtransfer',
    '.avbundle',
    '.json',
  ];

  useEffect(() => {
    let dragCounter = 0;

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter++;
      if (e.dataTransfer && e.dataTransfer.types.includes('Files')) {
        setIsDragging(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter--;
      if (dragCounter <= 0) {
        setIsDragging(false);
        dragCounter = 0;
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      dragCounter = 0;

      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;

      const file = files[0];
      const lowerName = file.name.toLowerCase();
      const isMatch = AV_EXTENSIONS.some((ext) => lowerName.endsWith(ext));

      if (!isMatch) return;

      try {
        const text = await file.text();
        setDroppedFilename(file.name);
        setDroppedPayload(text);
        setIsModalOpen(true);
      } catch (err) {
        console.error('[GlobalFileDropZone] Failed to read dropped file:', err);
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, []);

  const handleApproved = (result: CommitResult) => {
    setToastMessage(`Successfully ingested ${result.committedCount} item(s) into vault!`);
    setTimeout(() => setToastMessage(null), 4000);
    // Refresh page data if available
    window.dispatchEvent(new CustomEvent('armoryvault:sync-completed'));
  };

  return (
    <>
      {children}

      {/* Visual Drag & Drop HUD Overlay */}
      {isDragging && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(15, 23, 42, 0.88)',
            WebkitBackdropFilter: 'blur(8px)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            border: '3px dashed #3b82f6',
            margin: '8px',
            borderRadius: '16px',
          }}
        >
          <div
            style={{
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '14px',
              padding: '2rem',
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '16px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#3b82f6',
              }}
            >
              <UploadCloud size={32} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.4rem', margin: '0 0 6px 0', color: '#f8fafc' }}>
                Drop ArmoryVault Payload File
              </h2>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>
                Compatible with .avfirearm, .avsession, .avammo, .avcomponent, .avaccessory,
                .avmaintenance, .avtransfer, .avbundle
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9998,
            backgroundColor: '#1e293b',
            color: '#22c55e',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            padding: '12px 18px',
            borderRadius: '8px',
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.9rem',
            fontWeight: 600,
          }}
        >
          <ShieldCheck size={18} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Ingestion Review Modal */}
      <PayloadIngestModal
        isOpen={isModalOpen}
        rawPayload={droppedPayload}
        filename={droppedFilename}
        onClose={() => setIsModalOpen(false)}
        onApproved={handleApproved}
      />
    </>
  );
};
