import { Settings } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CanvasStyle,
  CornerRadius,
  FontFamily,
  FontScale,
  getStoredTheme,
  resetThemeToDefault,
  saveTheme,
  ThemeAccent,
  ThemeConfig,
  UiDensity,
  WidgetVisibilityConfig,
} from '@/utils/themeEngine';
import {
  AboutLicenseSettingsSection,
  AppearanceSettingsSection,
  BackupSettingsSection,
  PreferencesSettingsSection,
  ReportsSettingsSection,
  SecuritySettingsSection,
} from '../settings';
import { CsvImportModal } from './CsvImportModal';
import { LicenseModal } from './LicenseModal';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLockVault?: () => void;
  onOpenSkuManager?: () => void;
  onOpenChangePassword: () => void;
  onOpenRecoveryKey: () => void;
  onOpenActivityLog?: () => void;
  onSettingsSaved?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = React.memo(
  ({
    isOpen,
    onClose,
    onLockVault,
    onOpenSkuManager: _onOpenSkuManager,
    onOpenChangePassword,
    onOpenRecoveryKey,
    onOpenActivityLog,
    onSettingsSaved,
  }) => {
    const [backupPath, setBackupPath] = useState<string | null>(null);
    const [showTotalSetupValue, setShowTotalSetupValue] = useState(false);
    const [showCollectionAnalytics, setShowCollectionAnalytics] = useState(false);
    const [isCsvImportOpen, setIsCsvImportOpen] = useState(false);
    const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);
    const [theme, setTheme] = useState<ThemeConfig>(() => getStoredTheme());
    const [customColor, setCustomColor] = useState<string>(
      () => theme.customAccentColor || '#3b82f6'
    );

    const loadSettings = useCallback(async () => {
      try {
        const [path, showSetupValue, showAnalytics] = await Promise.all([
          window.api?.getBackupFolder ? window.api.getBackupFolder() : Promise.resolve(null),
          window.api?.getConfig
            ? window.api.getConfig('showTotalSetupValue')
            : Promise.resolve(false),
          window.api?.getConfig
            ? window.api.getConfig('showCollectionAnalytics')
            : Promise.resolve(false),
        ]);
        if (path !== undefined) setBackupPath(path);
        setShowTotalSetupValue(!!showSetupValue);
        const storedTheme = getStoredTheme();
        setTheme(storedTheme);
        setCustomColor(storedTheme.customAccentColor || '#3b82f6');
        setShowCollectionAnalytics(
          showAnalytics !== undefined ? !!showAnalytics : !!storedTheme.widgets.collectionAnalytics
        );
      } catch (e) {
        console.error('Failed to load settings:', e);
      }
    }, []);

    useEffect(() => {
      if (isOpen) {
        loadSettings();
      }
    }, [isOpen, loadSettings]);

    useEffect(() => {
      const handleThemeChange = (e: Event) => {
        const custom = e as CustomEvent<ThemeConfig>;
        if (custom.detail) {
          setTheme(custom.detail);
          setCustomColor(custom.detail.customAccentColor || '#3b82f6');
          setShowCollectionAnalytics(!!custom.detail.widgets.collectionAnalytics);
        }
      };
      window.addEventListener('armoryvault-theme-change', handleThemeChange);
      return () => window.removeEventListener('armoryvault-theme-change', handleThemeChange);
    }, []);

    const handleAccentChange = (accent: ThemeAccent, customHex?: string) => {
      const updated: Partial<ThemeConfig> = {
        accent,
        ...(customHex ? { customAccentColor: customHex } : {}),
      };
      setTheme((prev) => ({ ...prev, ...updated }));
      saveTheme(updated);
    };

    const handleCanvasChange = (canvas: CanvasStyle) => {
      setTheme((prev) => ({ ...prev, canvas }));
      saveTheme({ canvas });
    };

    const handleDensityChange = (density: UiDensity) => {
      setTheme((prev) => ({ ...prev, density }));
      saveTheme({ density });
    };

    const handleRadiusChange = (radius: CornerRadius) => {
      setTheme((prev) => ({ ...prev, radius }));
      saveTheme({ radius });
    };

    const handleFontChange = (font: FontFamily) => {
      setTheme((prev) => ({ ...prev, font }));
      saveTheme({ font });
    };

    const handleFontScaleChange = (fontScale: FontScale) => {
      setTheme((prev) => ({ ...prev, fontScale }));
      saveTheme({ fontScale });
    };

    const handleStartupRouteChange = (startupRoute: string) => {
      setTheme((prev) => ({ ...prev, startupRoute }));
      saveTheme({ startupRoute });
    };

    const handlePrivacyToggle = () => {
      const next = !theme.privacyMode;
      setTheme((prev) => ({ ...prev, privacyMode: next }));
      saveTheme({ privacyMode: next });
    };

    const handleWidgetToggle = (key: keyof WidgetVisibilityConfig) => {
      const updatedWidgets = {
        ...theme.widgets,
        [key]: !theme.widgets[key],
      };
      setTheme((prev) => ({ ...prev, widgets: updatedWidgets }));
      if (key === 'collectionAnalytics') {
        setShowCollectionAnalytics(updatedWidgets.collectionAnalytics);
      }
      saveTheme({ widgets: updatedWidgets });
    };

    const handleResetTheme = async () => {
      if (
        window.confirm(
          'Reset all appearance themes, UI density, typography, and widget preferences to default settings?'
        )
      ) {
        const fresh = await resetThemeToDefault();
        setTheme(fresh);
        setCustomColor(fresh.customAccentColor || '#3b82f6');
        setShowCollectionAnalytics(!!fresh.widgets.collectionAnalytics);
      }
    };

    const handleSelectBackup = async () => {
      if (window.api && window.api.selectBackupFolder) {
        const path = await window.api.selectBackupFolder();
        if (path) setBackupPath(path);
      }
    };

    const handleCreateZipBackup = async () => {
      if (window.api && window.api.createZipBackup) {
        try {
          const res: any = await window.api.createZipBackup();
          if (res === true || (res && res.success)) {
            alert('Full archive backup (.zip) successfully created!');
          } else if (res && res.canceled) {
            // User canceled file dialog
          } else {
            const detail = res && res.error ? `: ${res.error}` : '';
            alert(`Failed to create full zip archive${detail}`);
          }
        } catch (e: any) {
          console.error('Create zip backup error:', e);
          alert(`Failed to create full zip archive: ${e?.message || 'Unknown error'}`);
        }
      }
    };

    const handleRestoreBackup = async () => {
      if (!window.api || !window.api.restoreBackup) return;

      const confirmed = window.confirm(
        'Are you sure you want to restore or import a database?\n\n' +
          'This will import from your selected backup or database file (.enc, .zip, .sqlite, .db, .json, .bak).\n\n' +
          'A safety copy of your current database will be created automatically before importing.'
      );
      if (!confirmed) return;

      try {
        const res = await window.api.restoreBackup();
        if (res.canceled) return;

        if (res.success) {
          if (res.requiresRelogin) {
            alert(
              res.message ||
                'Database restored successfully!\n\nThe restored database was created with a different password or encryption key. The vault will now lock so you can log in.'
            );
            if (onLockVault) {
              onLockVault();
            } else if (window.api.lockVault) {
              await window.api.lockVault();
            }
            onClose();
          } else {
            alert(res.message || 'Database successfully imported into active vault!');
            onClose();
            if (onSettingsSaved) onSettingsSaved();
            window.location.reload();
          }
        } else {
          alert(`Failed to import database: ${res.error || 'Unknown error'}`);
        }
      } catch (e: any) {
        console.error('Error importing database:', e);
        alert(`An error occurred while importing the database: ${e.message || e}`);
      }
    };

    if (!isOpen) return null;

    return createPortal(
      <>
        <div
          className="modal-overlay"
          onClick={onClose}
        >
          <div
            className="modal modal-settings-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="settings-modal-header">
              <div className="settings-modal-title-wrap">
                <Settings className="settings-modal-icon text-accent" size={24} />
                <div>
                  <h2 className="settings-modal-heading">
                    Settings & Preferences
                  </h2>
                  <div className="settings-modal-subheading">
                    Security, automated backups, tactical themes, and vault configuration.
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="btn-icon settings-close-btn"
                onClick={onClose}
              >
                &times;
              </button>
            </div>

            <div className="settings-sections-list">
              {/* Backups & Redundancy Section */}
              <BackupSettingsSection
                backupPath={backupPath}
                onSelectBackup={handleSelectBackup}
                onCreateZipBackup={handleCreateZipBackup}
                onRestoreBackup={handleRestoreBackup}
              />

              {/* Reports & Export Section */}
              <ReportsSettingsSection onOpenCsvImport={() => setIsCsvImportOpen(true)} />

              {/* Vault Security & Password Section */}
              <SecuritySettingsSection
                onOpenChangePassword={onOpenChangePassword}
                onOpenRecoveryKey={onOpenRecoveryKey}
              />

              {/* Appearance & Personalization Section */}
              <AppearanceSettingsSection
                theme={theme}
                customColor={customColor}
                onCustomColorChange={setCustomColor}
                onAccentChange={handleAccentChange}
                onCanvasChange={handleCanvasChange}
                onDensityChange={handleDensityChange}
                onRadiusChange={handleRadiusChange}
                onFontChange={handleFontChange}
                onFontScaleChange={handleFontScaleChange}
                onStartupRouteChange={handleStartupRouteChange}
                onPrivacyToggle={handlePrivacyToggle}
                onResetTheme={handleResetTheme}
                onWidgetToggle={handleWidgetToggle}
              />

              {/* Preferences & Mappings Section */}
              <PreferencesSettingsSection
                onOpenActivityLog={onOpenActivityLog}
                showTotalSetupValue={showTotalSetupValue}
                onToggleSetupValue={async (checked) => {
                  setShowTotalSetupValue(checked);
                  if (window.api && window.api.setConfig) {
                    await window.api.setConfig('showTotalSetupValue', checked);
                  }
                }}
                showCollectionAnalytics={showCollectionAnalytics}
                onToggleAnalytics={(checked) => {
                  setShowCollectionAnalytics(checked);
                  handleWidgetToggle('collectionAnalytics');
                }}
              />

              {/* Legal, Licensing & Data Sovereignty Section */}
              <AboutLicenseSettingsSection
                onOpenLicenseModal={() => setIsLicenseModalOpen(true)}
              />
            </div>

            <div className="modal-actions settings-footer-actions">
              <button type="button" className="btn-primary settings-done-btn" onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        </div>
        {isCsvImportOpen && (
          <CsvImportModal
            isOpen={isCsvImportOpen}
            onClose={() => setIsCsvImportOpen(false)}
            onImportComplete={() => {
              if (onSettingsSaved) onSettingsSaved();
            }}
          />
        )}
        {isLicenseModalOpen && (
          <LicenseModal
            isOpen={isLicenseModalOpen}
            onClose={() => setIsLicenseModalOpen(false)}
          />
        )}
      </>,
      document.body
    );
  }
);
