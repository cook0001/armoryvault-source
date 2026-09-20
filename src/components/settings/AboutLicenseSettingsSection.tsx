import { FileText, Lock, ShieldCheck } from 'lucide-react';
import React from 'react';
import { EULA_METADATA } from '@/constants/eula';

interface AboutLicenseSettingsSectionProps {
  onOpenLicenseModal: () => void;
}

export const AboutLicenseSettingsSection: React.FC<AboutLicenseSettingsSectionProps> = ({
  onOpenLicenseModal,
}) => {
  return (
    <div className="settings-section-card">
      <div className="settings-section-header">
        <ShieldCheck size={18} className="settings-section-icon" />
        <h3 className="settings-section-title">Legal, Licensing & Data Sovereignty</h3>
      </div>
      <p className="settings-section-desc">
        ArmoryVault is proprietary freeware provided free of charge for personal firearms inventory, reloading management, and ballistics calculations. Your database is encrypted locally and remains 100% your private property.
      </p>

      <div className="settings-about-metadata-card">
        <div className="settings-about-row">
          <span className="settings-about-label">Distribution Model:</span>
          <span className="badge badge-accent">Proprietary Freeware</span>
        </div>
        <div className="settings-about-row">
          <span className="settings-about-label">Personal Use:</span>
          <span className="settings-about-val-green">100% Free of Charge</span>
        </div>
        <div className="settings-about-row">
          <span className="settings-about-label">Privacy Standard:</span>
          <span className="settings-about-val-cyan">Air-Gapped &bull; Zero Telemetry</span>
        </div>
        <div className="settings-about-row">
          <span className="settings-about-label">Copyright:</span>
          <span className="settings-about-val-muted">{EULA_METADATA.copyright}</span>
        </div>
      </div>

      <div className="settings-action-grid">
        <button
          type="button"
          className="btn-secondary settings-btn-inner"
          onClick={onOpenLicenseModal}
        >
          <FileText size={16} />
          <span>View License Agreement (EULA)</span>
        </button>
      </div>
    </div>
  );
};
