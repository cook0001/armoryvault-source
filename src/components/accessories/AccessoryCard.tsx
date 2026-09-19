import {
  Camera,
  Disc,
  Edit,
  Eye,
  Flashlight,
  Link as LinkIcon,
  Package,
  Shield,
  Target,
  Trash2,
} from 'lucide-react';
import React from 'react';
import {
  ChassisIcon,
  GunBeltIcon,
  HolsterIcon,
  MagazineIcon,
  PicatinnyMountIcon,
  ScopeIcon,
  StockIcon,
  SuppressorIcon,
  TacticalSlingIcon,
} from '../CustomIcons';
import { StorageBadge } from '../StorageBadge';
import { Accessory, Firearm, StorageLocation } from '../../types';
import { formatCurrency, parseCurrency } from '../../utils/currency';
import { getLocalImageUrl } from '../../utils/imageUrl';
import { getItemStorageLocation } from '../../utils/StorageSync';
import { maskValue, ThemeConfig } from '../../utils/themeEngine';

export interface AccessoryCardProps {
  accessory: Accessory;
  firearmsMap: Map<number, Firearm>;
  locations: StorageLocation[];
  themeConfig: ThemeConfig;
  onSelectDetail: (acc: Accessory) => void;
  onEdit: (acc: Accessory) => void;
  onDelete: (id: number) => void;
  onNavigateToFirearm: (firearmId: number) => void;
  onNavigateToStorage: () => void;
}

const getTypeBadgeClass = (type?: string) => {
  switch (type) {
    case 'Optic':
      return 'type-badge-optic';
    case 'Suppressor':
      return 'type-badge-suppressor';
    case 'Light':
      return 'type-badge-light';
    case 'Holster':
      return 'type-badge-holster';
    case 'Mount':
      return 'type-badge-mount';
    case 'Magazine':
      return 'type-badge-magazine';
    case 'Stock':
      return 'type-badge-stock';
    case 'Chassis':
      return 'type-badge-chassis';
    case 'Belt':
      return 'type-badge-belt';
    case 'Sling':
      return 'type-badge-sling';
    default:
      return 'type-badge-default';
  }
};

const renderTypeIcon = (type?: string) => {
  switch (type) {
    case 'Optic':
      return <ScopeIcon size={12} />;
    case 'Suppressor':
      return <SuppressorIcon size={12} />;
    case 'Light':
      return <Flashlight size={12} />;
    case 'Holster':
      return <HolsterIcon size={12} />;
    case 'Mount':
      return <PicatinnyMountIcon size={12} />;
    case 'Sling':
      return <TacticalSlingIcon size={12} />;
    case 'Magazine':
      return <MagazineIcon size={12} />;
    case 'Stock':
      return <StockIcon size={12} />;
    case 'Chassis':
      return <ChassisIcon size={12} />;
    case 'Belt':
      return <GunBeltIcon size={12} />;
    default:
      return <Package size={12} />;
  }
};

export const AccessoryCard: React.FC<AccessoryCardProps> = ({
  accessory,
  firearmsMap,
  locations,
  themeConfig,
  onSelectDetail,
  onEdit,
  onDelete,
  onNavigateToFirearm,
  onNavigateToStorage,
}) => {
  const quantity = accessory.quantity && accessory.quantity > 0 ? accessory.quantity : 1;
  const totalValue = parseCurrency(accessory.value) * quantity;
  const typeClass = getTypeBadgeClass(accessory.type);

  const getMountedFirearmName = (id: number | null) => {
    if (!id) return 'Unknown Firearm';
    const f = firearmsMap.get(id);
    return f ? `${f.make} ${f.model}` : 'Unknown Firearm';
  };

  return (
    <div
      className="card tactical-card accessory-card"
      onClick={() => onSelectDetail(accessory)}
    >
      {/* Header & Badges */}
      <div className="accessory-card-header">
        <div className="accessory-thumbnail-wrap">
          {accessory.photo ? (
            <img
              src={getLocalImageUrl(accessory.photo, true)}
              alt={accessory.model}
              className="accessory-thumbnail-img"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <Camera size={26} className="accessory-thumbnail-placeholder" />
          )}
        </div>

        <div className="accessory-header-info">
          <div className="accessory-badge-row">
            <span className={`accessory-type-badge ${typeClass}`}>
              {renderTypeIcon(accessory.type)}
              <span>{accessory.type}</span>
            </span>

            {accessory.round_count !== undefined && accessory.round_count > 0 && (
              <span className="accessory-rounds-badge">
                <Target size={11} color="#38bdf8" />
                <span>{accessory.round_count.toLocaleString()} rds</span>
              </span>
            )}

            {accessory.is_nfa && (
              <span
                className={`accessory-nfa-badge ${
                  accessory.stamp_status === 'Approved'
                    ? 'accessory-nfa-approved'
                    : 'accessory-nfa-pending'
                }`}
              >
                NFA
              </span>
            )}

            <StorageBadge
              location={getItemStorageLocation('accessory', accessory.id, locations)}
              onClick={(e) => {
                e.stopPropagation();
                onNavigateToStorage();
              }}
              size="sm"
            />
          </div>

          <h3 className="accessory-card-title">
            {quantity > 1 ? `${quantity}x ` : ''}
            {accessory.manufacturer} {accessory.model}
          </h3>

          <div className="accessory-price-row">
            <span className="privacy-mask-val accessory-total-price">
              {maskValue(formatCurrency(totalValue), 'currency', themeConfig.privacyMode)}
            </span>
            {quantity > 1 && (
              <span className="accessory-unit-price-badge">
                ({maskValue(formatCurrency(accessory.value), 'currency', themeConfig.privacyMode)} ea)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Feature & Technical Spec Chips */}
      <div className="accessory-specs-cloud">
        {accessory.magnification && (
          <span className="spec-chip spec-chip-cyan">
            <ScopeIcon size={12} color="#38bdf8" />
            <span>{accessory.magnification}</span>
          </span>
        )}

        {accessory.lumens && (
          <span className="spec-chip spec-chip-yellow">
            <Flashlight size={12} color="#fbbf24" />
            <span>{accessory.lumens.toLocaleString()} lm</span>
          </span>
        )}

        {accessory.ratedCalibers && (
          <span className="spec-chip spec-chip-amber">
            <Shield size={12} color="#f59e0b" />
            <span>{accessory.ratedCalibers}</span>
          </span>
        )}

        {accessory.capacity && (
          <span className="spec-chip spec-chip-purple">
            <Disc size={11} color="#c084fc" />
            <span>
              {accessory.caliber ? `${accessory.caliber} • ` : ''}
              {accessory.capacity}rd
            </span>
          </span>
        )}

        {accessory.actionInlet && (
          <span className="spec-chip spec-chip-cyan">
            <Target size={12} color="#38bdf8" />
            <span>{accessory.actionInlet}</span>
          </span>
        )}

        {accessory.stockType && (
          <span className="spec-chip spec-chip-emerald">
            {accessory.type === 'Chassis' ? (
              <ChassisIcon size={12} color="#10b981" />
            ) : (
              <StockIcon size={12} color="#10b981" />
            )}
            <span>{accessory.stockType}</span>
          </span>
        )}

        {accessory.lengthOfPull && (
          <span className="spec-chip spec-chip-emerald">
            <span>LOP: {accessory.lengthOfPull}</span>
          </span>
        )}

        {accessory.bufferTubeType && (
          <span className="spec-chip spec-chip-blue">
            <span>{accessory.bufferTubeType}</span>
          </span>
        )}

        {accessory.beltType && (
          <span className="spec-chip spec-chip-yellow">
            <GunBeltIcon size={12} color="#eab308" />
            <span>{accessory.beltType}</span>
          </span>
        )}

        {accessory.dropLoopType && (
          <span className="spec-chip spec-chip-amber">
            <GunBeltIcon size={12} color="#f59e0b" />
            <span>{accessory.dropLoopType}</span>
          </span>
        )}

        {accessory.cartridgeLoopCaliber && (
          <span className="spec-chip spec-chip-yellow">
            <GunBeltIcon size={12} color="#fbbf24" />
            <span>
              {accessory.cartridgeLoopCount ? `${accessory.cartridgeLoopCount}x ` : ''}
              {accessory.cartridgeLoopCaliber}
            </span>
          </span>
        )}

        {accessory.beltWidth && (
          <span className="spec-chip spec-chip-cyan">
            <span>Width: {accessory.beltWidth}</span>
          </span>
        )}

        {accessory.supportedModels && !accessory.actionInlet && (
          <span className="spec-chip spec-chip-neutral">
            <span>Fits: {accessory.supportedModels}</span>
          </span>
        )}

        {accessory.serialNumber && (
          <span className="spec-chip spec-chip-mono privacy-mask-serial">
            <span>SN: {maskValue(accessory.serialNumber, 'serial', themeConfig.privacyMode)}</span>
          </span>
        )}
      </div>

      {/* Mounts Allocation Deck */}
      {accessory.mounts && accessory.mounts.length > 0 ? (
        <div className="accessory-mounts-deck">
          {accessory.mounts.map((m, idx) => (
            <div
              key={idx}
              className="accessory-mount-item"
              onClick={(e) => {
                e.stopPropagation();
                if (m.firearmId) onNavigateToFirearm(m.firearmId);
              }}
              title="Click to view mounted firearm details"
            >
              <LinkIcon size={13} color="var(--accent)" />
              <span className="accessory-mount-label">Mounted on:</span>
              <strong className="accessory-mount-target">
                {getMountedFirearmName(m.firearmId)}
              </strong>
              <span className="accessory-mount-qty-pill">Qty: {m.quantity}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="accessory-storage-notice">
          <Package size={13} color="var(--text-muted)" />
          <span>In Storage ({quantity} unmounted)</span>
        </div>
      )}

      {/* Card Action Buttons */}
      <div className="accessory-card-footer">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelectDetail(accessory);
          }}
          className="btn-secondary accessory-btn-detail"
        >
          <Eye size={14} />
          <span>View Details</span>
        </button>

        <div className="accessory-actions-group">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(accessory);
            }}
            className="accessory-btn-edit"
            title="Edit Accessory"
          >
            <Edit size={15} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(accessory.id!);
            }}
            className="accessory-btn-delete"
            title="Delete Accessory"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};
