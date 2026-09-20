import { Check, Copy, FileText, Lock, ShieldCheck, X } from 'lucide-react';
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { EULA_METADATA, EULA_SECTIONS } from '@/constants/eula';

interface LicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LicenseModal: React.FC<LicenseModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyFullEula = () => {
    const fullText = [
      'ARMORYVAULT END USER LICENSE AGREEMENT (EULA)',
      EULA_METADATA.licenseModel,
      EULA_METADATA.copyright,
      '',
      EULA_METADATA.summary,
      '',
      ...EULA_SECTIONS.map((s) => `${s.title}\n${s.content}\n`),
    ].join('\n');

    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal modal-license-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="license-dialog-title"
      >
        {/* Header */}
        <div className="settings-modal-header">
          <div className="settings-modal-title-wrap">
            <FileText className="settings-modal-icon text-accent" size={24} />
            <div>
              <h2 id="license-dialog-title" className="settings-modal-heading">
                End User License Agreement (EULA)
              </h2>
              <div className="settings-modal-subheading">
                {EULA_METADATA.licenseModel} &bull; {EULA_METADATA.copyright}
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn-icon settings-close-btn"
            onClick={onClose}
            aria-label="Close License Dialog"
          >
            <X size={20} />
          </button>
        </div>

        {/* Highlights Bar */}
        <div className="license-highlight-bar">
          <div className="license-highlight-pill">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>100% Free for Personal Use</span>
          </div>
          <div className="license-highlight-pill">
            <Lock size={14} className="text-cyan-400" />
            <span>Air-Gapped &bull; Zero Telemetry</span>
          </div>
          <div className="license-highlight-pill">
            <ShieldCheck size={14} className="text-blue-400" />
            <span>100% Local Data Ownership</span>
          </div>
        </div>

        {/* Scrollable EULA Body */}
        <div className="license-body-scroll">
          <div className="license-preamble-box">
            <p className="license-preamble-text">{EULA_METADATA.summary}</p>
          </div>

          <div className="license-sections-container">
            {EULA_SECTIONS.map((sec) => (
              <div key={sec.title} className="license-section-block">
                <h4 className="license-section-heading">{sec.title}</h4>
                <p className="license-section-text">{sec.content}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="modal-actions license-footer-actions">
          <button
            type="button"
            className="btn-secondary license-copy-btn"
            onClick={handleCopyFullEula}
          >
            {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
            <span>{copied ? 'Copied Full EULA' : 'Copy Full Agreement'}</span>
          </button>
          <button type="button" className="btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
