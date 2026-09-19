import { Key, Lock, Shield } from 'lucide-react';
import React from 'react';

interface SecuritySettingsSectionProps {
  onOpenChangePassword: () => void;
  onOpenRecoveryKey: () => void;
}

export const SecuritySettingsSection: React.FC<SecuritySettingsSectionProps> = ({
  onOpenChangePassword,
  onOpenRecoveryKey,
}) => {
  return (
    <div className="settings-section-card">
      <div className="settings-section-header">
        <Shield size={18} className="settings-section-icon" />
        <h3 className="settings-section-title">Vault Security & Encryption</h3>
      </div>
      <p className="settings-section-desc">
        Update your master password or view and copy your 64-character offline emergency recovery key.
      </p>
      <div className="settings-action-grid">
        <button
          type="button"
          className="btn-secondary settings-btn-inner"
          onClick={onOpenChangePassword}
        >
          <Key size={16} />
          <span>Change Master Password</span>
        </button>
        <button
          type="button"
          className="btn-secondary settings-btn-inner settings-btn-blue"
          onClick={onOpenRecoveryKey}
        >
          <Lock size={16} />
          <span>View Vault Recovery Key</span>
        </button>
      </div>
    </div>
  );
};
