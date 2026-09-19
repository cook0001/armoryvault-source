import { Activity, ExternalLink, Sliders } from 'lucide-react';
import React from 'react';
import packageJson from '../../../package.json';

interface PreferencesSettingsSectionProps {
  onOpenActivityLog?: () => void;
  showTotalSetupValue: boolean;
  onToggleSetupValue: (checked: boolean) => void;
  showCollectionAnalytics: boolean;
  onToggleAnalytics: (checked: boolean) => void;
}

export const PreferencesSettingsSection: React.FC<PreferencesSettingsSectionProps> = ({
  onOpenActivityLog,
  showTotalSetupValue,
  onToggleSetupValue,
  showCollectionAnalytics,
  onToggleAnalytics,
}) => {
  return (
    <>
      <div className="settings-section-card">
        <div className="settings-section-header">
          <Sliders size={18} className="settings-section-icon" />
          <h3 className="settings-section-title">Preferences & Mappings</h3>
        </div>
        <p className="settings-section-desc">
          Manage custom inventory mappings and configure view options.
        </p>

        {onOpenActivityLog && (
          <div className="settings-path-picker-row">
            <button
              type="button"
              className="btn-secondary settings-btn-inner settings-btn-blue"
              onClick={onOpenActivityLog}
            >
              <Activity size={16} />
              <span>Activity Audit Log</span>
            </button>
          </div>
        )}

        <div className="settings-card-tray">
          <label className="settings-checkbox-label">
            <input
              type="checkbox"
              checked={showTotalSetupValue}
              onChange={(e) => onToggleSetupValue(e.target.checked)}
              className="settings-checkbox-input"
            />
            <span>
              Show <strong>Total Setup Value</strong> (Firearm + Mounted Accessories) on Firearm Details
            </span>
          </label>

          <label className="settings-checkbox-label settings-checkbox-divider">
            <input
              type="checkbox"
              checked={showCollectionAnalytics}
              onChange={(e) => onToggleAnalytics(e.target.checked)}
              className="settings-checkbox-input"
            />
            <span>
              Show <strong>Collection Value & Investment Analytics</strong> on Dashboard
            </span>
          </label>
        </div>
      </div>

      {/* App Version & Updates Section */}
      <div className="settings-version-card">
        <div>
          <div className="settings-version-title">
            <span>ArmoryVault</span>
            <span className="settings-version-tag">v{packageJson.version}</span>
          </div>
          <div className="settings-version-desc">
            Tauri Native Desktop Edition &bull; Local Encrypted Storage
          </div>
        </div>
        <button
          type="button"
          className="btn-secondary settings-btn-inner"
          onClick={() => {
            if (window.api && window.api.openUrl) {
              window.api.openUrl('https://github.com/cook0001/ArmoryVault/releases/latest');
            }
          }}
        >
          <ExternalLink size={14} />
          <span>Releases & Updates</span>
        </button>
      </div>
    </>
  );
};
