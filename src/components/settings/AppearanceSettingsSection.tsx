import { Check, Eye, EyeOff, Palette, RotateCcw } from 'lucide-react';
import React from 'react';
import {
  ACCENT_PRESETS,
  CanvasStyle,
  CornerRadius,
  FontFamily,
  FontScale,
  ThemeAccent,
  ThemeConfig,
  UiDensity,
  WidgetVisibilityConfig,
} from '@/utils/themeEngine';
import { WidgetVisibilityManager } from './WidgetVisibilityManager';

interface AppearanceSettingsSectionProps {
  theme: ThemeConfig;
  customColor: string;
  onCustomColorChange: (color: string) => void;
  onAccentChange: (accent: ThemeAccent, customHex?: string) => void;
  onCanvasChange: (canvas: CanvasStyle) => void;
  onDensityChange: (density: UiDensity) => void;
  onRadiusChange: (radius: CornerRadius) => void;
  onFontChange: (font: FontFamily) => void;
  onFontScaleChange: (fontScale: FontScale) => void;
  onStartupRouteChange: (startupRoute: string) => void;
  onPrivacyToggle: () => void;
  onResetTheme: () => void;
  onWidgetToggle: (key: keyof WidgetVisibilityConfig) => void;
}

export const AppearanceSettingsSection: React.FC<AppearanceSettingsSectionProps> = ({
  theme,
  customColor,
  onCustomColorChange,
  onAccentChange,
  onCanvasChange,
  onDensityChange,
  onRadiusChange,
  onFontChange,
  onFontScaleChange,
  onStartupRouteChange,
  onPrivacyToggle,
  onResetTheme,
  onWidgetToggle,
}) => {
  return (
    <div className="settings-section-card">
      <div className="settings-section-title-row">
        <div className="settings-section-header">
          <Palette size={18} className="settings-section-icon" />
          <h3 className="settings-section-title">
            Appearance & Personalization
          </h3>
        </div>
        <button
          type="button"
          className="btn-secondary settings-reset-defaults-btn"
          onClick={onResetTheme}
          title="Reset all themes, typography, density, and widget settings to defaults"
        >
          <RotateCcw size={13} />
          <span>Reset Defaults</span>
        </button>
      </div>
      <p className="settings-section-desc">
        Configure tactical accent palettes, OLED/ambient canvas backgrounds, interface density,
        typography, discretion mode, and modular widget visibility.
      </p>

      {/* 1. Tactical Color Themes */}
      <div className="settings-sub-group">
        <div className="settings-group-label">
          Tactical Accent Palettes
        </div>
        <div className="settings-palettes-grid">
          {Object.values(ACCENT_PRESETS).map((preset) => {
            const isSelected = theme.accent === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onAccentChange(preset.id)}
                className={`settings-palette-item ${isSelected ? 'active' : ''}`}
                style={{
                  borderColor: isSelected ? preset.primary : undefined,
                  boxShadow: isSelected ? `0 0 10px ${preset.glow}` : undefined,
                }}
              >
                <span
                  className="settings-palette-swatch"
                  style={{
                    backgroundColor: preset.primary,
                    boxShadow: `0 0 6px ${preset.primary}`,
                  }}
                />
                <span className="settings-palette-name">
                  {preset.name}
                </span>
                {isSelected && <Check size={13} style={{ color: preset.primary }} />}
              </button>
            );
          })}
        </div>

        {/* Custom Hex Accent Row */}
        <div className={`settings-hex-row ${theme.accent === 'custom' ? 'active' : ''}`}>
          <input
            type="color"
            value={customColor}
            onChange={(e) => {
              onCustomColorChange(e.target.value);
              onAccentChange('custom', e.target.value);
            }}
            className="settings-hex-color-picker"
            title="Choose custom hex accent color"
          />
          <div className="settings-hex-text-col">
            <span className="settings-hex-title">
              Custom Accent Color
            </span>
            <span className="settings-hex-subtitle">
              Personalize with any custom RGB / Hex value
            </span>
          </div>
          <input
            type="text"
            value={customColor}
            onChange={(e) => {
              const val = e.target.value;
              onCustomColorChange(val);
              if (/^#([0-9A-F]{3}){1,2}$/i.test(val)) {
                onAccentChange('custom', val);
              }
            }}
            placeholder="#3b82f6"
            className="settings-hex-input"
          />
          {theme.accent === 'custom' && (
            <span className="settings-active-badge">
              Active
            </span>
          )}
        </div>
      </div>

      {/* 2. Canvas Background Style */}
      <div className="settings-sub-group">
        <div className="settings-group-label">
          Canvas Background Style
        </div>
        <div className="settings-canvas-grid">
          {[
            { id: 'mesh', label: 'Tactical Mesh', desc: 'Radial Glow' },
            { id: 'oled', label: 'OLED Pure Black', desc: '#000000 True' },
            { id: 'navy', label: 'Midnight Navy', desc: 'Deep Submarine' },
            { id: 'flat', label: 'Flat Slate', desc: 'Matte Clean' },
          ].map((canvasOpt) => {
            const isSelected = theme.canvas === canvasOpt.id;
            return (
              <button
                key={canvasOpt.id}
                type="button"
                onClick={() => onCanvasChange(canvasOpt.id as CanvasStyle)}
                className={`settings-canvas-btn ${isSelected ? 'active' : ''}`}
              >
                <span className="settings-canvas-label">
                  {canvasOpt.label}
                </span>
                <span className="settings-canvas-desc">{canvasOpt.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Interface Density & Corner Geometry */}
      <div className="settings-two-col-grid">
        {/* Density */}
        <div>
          <div className="settings-group-label">
            UI Spacing & Density
          </div>
          <div className="settings-pill-row">
            {[
              { id: 'compact', label: 'Compact' },
              { id: 'comfortable', label: 'Balanced' },
              { id: 'spacious', label: 'Spacious' },
            ].map((d) => {
              const isSelected = theme.density === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => onDensityChange(d.id as UiDensity)}
                  className={`settings-pill-option ${isSelected ? 'active' : ''}`}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Corner Geometry */}
        <div>
          <div className="settings-group-label">
            Corner Geometry
          </div>
          <div className="settings-pill-row">
            {[
              { id: 'sharp', label: 'Tactical (3px)' },
              { id: 'modern', label: 'Modern (14px)' },
              { id: 'pill', label: 'Pill (24px)' },
            ].map((r) => {
              const isSelected = theme.radius === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => onRadiusChange(r.id as CornerRadius)}
                  className={`settings-pill-option ${isSelected ? 'active' : ''}`}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Typography & Font Scale */}
      <div className="settings-two-col-grid">
        {/* Font Family */}
        <div>
          <div className="settings-group-label">
            Typography Family
          </div>
          <div className="settings-pill-row">
            {[
              { id: 'sans', label: 'Inter Sans' },
              { id: 'mono', label: 'Milspec HUD' },
              { id: 'system', label: 'Native OS' },
            ].map((f) => {
              const isSelected = theme.font === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => onFontChange(f.id as FontFamily)}
                  className={`settings-pill-option ${isSelected ? 'active' : ''}`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Font Scale */}
        <div>
          <div className="settings-group-label">
            Font Scale
          </div>
          <div className="settings-pill-row">
            {[
              { id: 'compact', label: 'Compact 90%' },
              { id: 'standard', label: 'Standard 100%' },
              { id: 'large', label: 'Comfort 112%' },
            ].map((s) => {
              const isSelected = theme.fontScale === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onFontScaleChange(s.id as FontScale)}
                  className={`settings-pill-option ${isSelected ? 'active' : ''}`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 5. Default Startup Route */}
      <div className="settings-sub-group">
        <div className="settings-group-label">
          Default Screen on Vault Unlock
        </div>
        <select
          value={theme.startupRoute}
          onChange={(e) => onStartupRouteChange(e.target.value)}
          className="settings-select-field"
        >
          <option value="/">Dashboard & Firearms Collection</option>
          <option value="/ammo">Ammunition Stockpile</option>
          <option value="/components">Reloading Bench & Components</option>
          <option value="/accessories">Optics, Accessories & Gear</option>
          <option value="/bound-book">ATF Bound Book (Compliance)</option>
          <option value="/maintenance">Maintenance & Service Logs</option>
          <option value="/storage">Storage & Safe Organizer</option>
          <option value="/load-development">Load Development</option>
          <option value="/ballistics">Ballistics Calculator</option>
          <option value="/nfa-tracker">NFA / Tax Stamp Tracker</option>
        </select>
      </div>

      {/* 6. Discretion / Privacy Shield Mode */}
      <div className="settings-privacy-card">
        <div className="settings-privacy-left">
          {theme.privacyMode ? (
            <EyeOff size={20} className="settings-modal-icon" />
          ) : (
            <Eye size={20} className="text-secondary" />
          )}
          <div>
            <div className="settings-privacy-title">
              Discretion Shield (Privacy Mode)
            </div>
            <div className="settings-privacy-desc">
              Masks serial numbers (SN••••21), total purchase investments, and safe names for
              screen-shares or range demonstrations.
            </div>
          </div>
        </div>
        <button
          type="button"
          className={`settings-privacy-btn ${theme.privacyMode ? 'btn-primary' : 'btn-secondary'}`}
          onClick={onPrivacyToggle}
        >
          {theme.privacyMode ? 'Shield Enabled' : 'Enable Shield'}
        </button>
      </div>

      {/* 7. Modular Widget Visibility Manager (Collapsible) */}
      <WidgetVisibilityManager widgets={theme.widgets} onToggleWidget={onWidgetToggle} />
    </div>
  );
};
