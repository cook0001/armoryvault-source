import { ChevronDown, ChevronUp, Layers } from 'lucide-react';
import React, { useState } from 'react';
import { WidgetVisibilityConfig } from '@/utils/themeEngine';

interface WidgetVisibilityManagerProps {
  widgets: WidgetVisibilityConfig;
  onToggleWidget: (key: keyof WidgetVisibilityConfig) => void;
}

export const WidgetVisibilityManager: React.FC<WidgetVisibilityManagerProps> = ({
  widgets,
  onToggleWidget,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const activeCount = Object.values(widgets).filter(Boolean).length;
  const totalCount = Object.keys(widgets).length;

  return (
    <div className="widget-mgr-card">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="widget-mgr-toggle-btn"
      >
        <div className="widget-mgr-header-left">
          <Layers size={16} className="settings-section-icon" />
          <span className="widget-mgr-title">
            Modular Widget Visibility Manager
          </span>
          <span className="widget-mgr-badge">
            {activeCount} / {totalCount} Active
          </span>
        </div>
        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {isExpanded && (
        <div className="widget-mgr-body">
          {/* Command Bar Metrics */}
          <div>
            <div className="widget-mgr-group-title">
              Command Bar Metrics (Top 5 Stats)
            </div>
            <div className="widget-mgr-grid">
              {[
                { key: 'statFirearms', label: 'Firearms Count' },
                { key: 'statAmmo', label: 'Ammo In Stock' },
                { key: 'statRounds', label: 'Rounds Fired' },
                { key: 'statValuation', label: 'Total Valuation' },
                { key: 'statService', label: 'Maintenance Needed' },
              ].map((w) => {
                const active = widgets[w.key as keyof WidgetVisibilityConfig];
                return (
                  <label key={w.key} className="widget-mgr-label">
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => onToggleWidget(w.key as keyof WidgetVisibilityConfig)}
                      className="widget-mgr-checkbox"
                    />
                    <span>{w.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Sectional Widgets */}
          <div>
            <div className="widget-mgr-group-title">
              Sectional Dashboard Widgets
            </div>
            <div className="widget-mgr-grid">
              {[
                { key: 'collectionAnalytics', label: 'Valuation & Investment Analytics' },
                { key: 'storageOverview', label: 'Safe Storage Capacity Cards' },
                { key: 'storageValuations', label: 'Storage Value Rollup Badges' },
                { key: 'categoryChips', label: 'Quick Category Filter Chips' },
                { key: 'exportBinder', label: 'Export Binder / PDF Button' },
              ].map((w) => {
                const active = widgets[w.key as keyof WidgetVisibilityConfig];
                return (
                  <label key={w.key} className="widget-mgr-label">
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => onToggleWidget(w.key as keyof WidgetVisibilityConfig)}
                      className="widget-mgr-checkbox"
                    />
                    <span>{w.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Firearm Card Micro-Widgets */}
          <div>
            <div className="widget-mgr-group-title">
              Firearm Card Micro-Widgets
            </div>
            <div className="widget-mgr-grid">
              {[
                { key: 'showThumbnails', label: 'Photo Thumbnails' },
                { key: 'wearGauges', label: 'Wear Level & Round Bars' },
                { key: 'mountedAccessories', label: 'Mounted Accessories Badges' },
                { key: 'storageBadges', label: 'Storage Safe Badges' },
                { key: 'telemetryStrip', label: 'Caliber & Round Count Strip' },
              ].map((w) => {
                const active = widgets[w.key as keyof WidgetVisibilityConfig];
                return (
                  <label key={w.key} className="widget-mgr-label">
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => onToggleWidget(w.key as keyof WidgetVisibilityConfig)}
                      className="widget-mgr-checkbox"
                    />
                    <span>{w.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Sub-page Widgets */}
          <div>
            <div className="widget-mgr-group-title">
              Sub-Page Inventory Widgets
            </div>
            <div className="widget-mgr-grid">
              {[
                { key: 'ammoLowStockAlert', label: 'Ammunition Low Stock Alerts' },
                { key: 'ammoValuation', label: 'Ammunition Stock Valuation' },
                { key: 'accessoryValuation', label: 'Accessory Total Valuations' },
              ].map((w) => {
                const active = widgets[w.key as keyof WidgetVisibilityConfig];
                return (
                  <label key={w.key} className="widget-mgr-label">
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => onToggleWidget(w.key as keyof WidgetVisibilityConfig)}
                      className="widget-mgr-checkbox"
                    />
                    <span>{w.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
