import { CheckCircle, Crosshair, Trash2 } from 'lucide-react';
import React from 'react';
import type { Firearm, SyncItem } from '../../../types';

export interface SyncItemOpticZeroCardProps {
  item: SyncItem;
  firearms: Firearm[];
  accessoriesList: any[];
  onApprove: (item: SyncItem) => void;
  onDelete: (id: number) => void;
}

export const SyncItemOpticZeroCard: React.FC<SyncItemOpticZeroCardProps> = ({
  item,
  firearms,
  accessoriesList,
  onApprove,
  onDelete,
}) => {
  const data = (item as any).data || item;
  const opticId = data.optic_id || data.opticId || (item as any).optic_id || (item as any).opticId;
  const opticName =
    data.optic_name ||
    data.opticName ||
    data.name ||
    (item as any).optic_name ||
    (item as any).opticName ||
    'Optic';

  const firearmId = Number(
    data.firearm_id || data.firearmId || (item as any).firearm_id || (item as any).firearmId
  );
  const matchedFirearm = firearmId ? firearms.find((f) => f.id === firearmId) : null;

  const matchedAccessory = accessoriesList.find(
    (a) =>
      (opticId && String(a.id) === String(opticId)) ||
      (data.serialNumber &&
        a.serialNumber &&
        a.serialNumber.toLowerCase() === data.serialNumber.toLowerCase()) ||
      (a.name && opticName && a.name.toLowerCase() === opticName.toLowerCase()) ||
      (a.model && opticName && a.model.toLowerCase() === opticName.toLowerCase())
  );

  const zeroDistance =
    data.zero_distance_yards ||
    data.zero_distance ||
    data.zeroDistance ||
    (item as any).zero_distance_yards ||
    (item as any).zero_distance ||
    100;

  const clickValue =
    data.click_value || data.clickValue || (item as any).click_value || '1/4 MOA';

  const elevationClicks =
    data.elevation_clicks ?? data.elevationClicks ?? (item as any).elevation_clicks;

  const windageClicks =
    data.windage_clicks ?? data.windageClicks ?? (item as any).windage_clicks;

  const dateStr =
    data.date ||
    data.last_zero_date ||
    (item.timestamp ? new Date(item.timestamp).toLocaleDateString() : 'Recent');

  const notes = data.notes || (item as any).notes || '';

  return (
    <div key={item.id} className="card sync-item-optic-card">
      <div className="sync-item-optic-content">
        <div className="sync-item-optic-badge-row">
          <span className="sync-item-optic-tag">Optic Zero Update</span>
          <span className="sync-item-optic-date">{dateStr}</span>
        </div>

        <div className="sync-item-optic-details">
          <h3 className="sync-item-optic-title">
            <Crosshair size={18} className="sync-item-optic-icon" />
            {matchedAccessory
              ? `${matchedAccessory.manufacturer || ''} ${matchedAccessory.model || matchedAccessory.name || opticName}`.trim()
              : opticName}
            {matchedFirearm && (
              <span className="sync-item-optic-firearm-link">
                (Mounted on {matchedFirearm.make} {matchedFirearm.model})
              </span>
            )}
          </h3>

          <div className="sync-item-optic-meta-grid">
            <div className="sync-item-optic-meta-col">
              <span className="sync-item-optic-meta-label">Zero Distance:</span>
              <strong className="sync-item-optic-meta-value">{zeroDistance} yds</strong>
            </div>

            <div className="sync-item-optic-meta-col">
              <span className="sync-item-optic-meta-label">Click Value:</span>
              <strong className="sync-item-optic-meta-value">{clickValue}</strong>
            </div>

            {elevationClicks !== undefined && (
              <div className="sync-item-optic-meta-col">
                <span className="sync-item-optic-meta-label">Elevation:</span>
                <strong className="sync-item-optic-meta-value">
                  {elevationClicks > 0 ? `+${elevationClicks}` : elevationClicks} clicks
                </strong>
              </div>
            )}

            {windageClicks !== undefined && (
              <div className="sync-item-optic-meta-col">
                <span className="sync-item-optic-meta-label">Windage:</span>
                <strong className="sync-item-optic-meta-value">
                  {windageClicks > 0 ? `+${windageClicks}` : windageClicks} clicks
                </strong>
              </div>
            )}
          </div>

          {notes && <p className="sync-item-optic-notes">{notes}</p>}
        </div>
      </div>

      <div className="sync-item-optic-actions">
        <button
          className="btn-primary sync-item-optic-approve-btn"
          onClick={() => onApprove(item)}
        >
          <CheckCircle size={16} /> Approve &amp; Update
        </button>
        <button
          className="btn-icon sync-item-optic-delete-btn"
          onClick={() => onDelete(item.id!)}
          title="Decline / Delete"
        >
          <Trash2 size={20} />
        </button>
      </div>
    </div>
  );
};
