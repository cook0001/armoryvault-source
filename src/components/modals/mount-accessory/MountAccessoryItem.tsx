import {
  ArrowRightLeft,
  Check,
  CheckCircle,
  Flashlight,
  Link as LinkIcon,
  Package,
  Shield,
  Target,
  Unlink,
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
} from '@/components/CustomIcons';
import { Accessory, Firearm } from '@/types';
import { formatCurrency } from '@/utils/currency';
import { getLocalImageUrl } from '@/utils/imageUrl';

export interface MountAccessoryItemProps {
  acc: Accessory;
  firearmId: number | null;
  targetFirearm: Firearm;
  mountedFirearms: string[];
  selectedQty: number;
  isItemBusy: boolean;
  onQuantityChange: (qty: number) => void;
  onMount: () => void;
  onUnmount: () => void;
}

export const renderAccessoryIcon = (type: string) => {
  switch (type) {
    case 'Optic':
      return <ScopeIcon size={20} color="#38bdf8" />;
    case 'Suppressor':
      return <SuppressorIcon size={20} color="#f59e0b" />;
    case 'Light':
      return <Flashlight size={20} color="#fbbf24" />;
    case 'Magazine':
      return <MagazineIcon size={20} color="#c084fc" />;
    case 'Stock':
      return <StockIcon size={20} color="#10b981" />;
    case 'Chassis':
      return <ChassisIcon size={20} color="#06b6d4" />;
    case 'Belt':
      return <GunBeltIcon size={20} color="#eab308" />;
    case 'Holster':
      return <HolsterIcon size={20} color="#34d399" />;
    case 'Mount':
      return <PicatinnyMountIcon size={20} color="#60a5fa" />;
    case 'Sling':
      return <TacticalSlingIcon size={20} color="#ec4899" />;
    default:
      return <Package size={20} color="var(--text-secondary)" />;
  }
};

export const MountAccessoryItem: React.FC<MountAccessoryItemProps> = ({
  acc,
  firearmId,
  targetFirearm,
  mountedFirearms,
  selectedQty,
  isItemBusy,
  onQuantityChange,
  onMount,
  onUnmount,
}) => {
  const isMountedHere = acc.mounts?.some((m) => m.firearmId === firearmId);
  const currentMountHere = acc.mounts?.find((m) => m.firearmId === firearmId);
  const isMountedElsewhere = !isMountedHere && mountedFirearms.length > 0;

  const totalQty = acc.quantity || 1;
  const currentlyMountedHereQty = currentMountHere?.quantity || 1;

  return (
    <div className={`mount-item-card ${isMountedHere ? 'mounted' : ''}`}>
      {/* Left: Thumbnail & Core Info */}
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {/* Thumbnail */}
        <div className="mount-thumb-wrap">
          {acc.photo ? (
            <img
              src={getLocalImageUrl(acc.photo, true)}
              alt={acc.model}
              className="mount-thumb-img"
              loading="lazy"
              decoding="async"
            />
          ) : (
            renderAccessoryIcon(acc.type)
          )}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`badge type-badge-${acc.type.toLowerCase()}`}>
              {acc.type}
            </span>

            {/* Status Badges */}
            {isMountedHere ? (
              <span className="mount-badge-mounted">
                <CheckCircle size={10} color="#c084fc" />
                <span>Mounted to this Firearm ({currentlyMountedHereQty}x)</span>
              </span>
            ) : isMountedElsewhere ? (
              <span className="mount-badge-elsewhere">
                <LinkIcon size={10} color="#f59e0b" />
                <span>Mounted on: {mountedFirearms.join(', ')}</span>
              </span>
            ) : (
              <span className="mount-badge-available">
                <Shield size={10} color="#4ade80" />
                <span>Available / In Storage</span>
              </span>
            )}

            {acc.round_count !== undefined && acc.round_count > 0 && (
              <span className="mount-badge-rounds">
                <Target size={10} color="#38bdf8" />
                <span>{acc.round_count.toLocaleString()} rds</span>
              </span>
            )}
          </div>

          {/* Name */}
          <div className="mount-item-name">
            {totalQty > 1 ? `${totalQty}x ` : ''}
            {acc.manufacturer} {acc.model}
          </div>

          {/* Specs snippet */}
          <div className="mount-item-specs">
            {acc.value != null && (
              <span className="text-emerald-400 font-semibold">
                {formatCurrency(acc.value)}
              </span>
            )}
            {acc.magnification && <span>Magnification: {acc.magnification}</span>}
            {acc.lumens && <span>{acc.lumens} Lumens</span>}
            {acc.caliber && <span>Caliber: {acc.caliber}</span>}
            {acc.capacity && <span>Capacity: {acc.capacity}rd</span>}
            {acc.actionInlet && <span>Inlet: {acc.actionInlet}</span>}
            {acc.stockType && <span>Type: {acc.stockType}</span>}
            {acc.lengthOfPull && <span>LOP: {acc.lengthOfPull}</span>}
            {acc.beltType && <span>Belt: {acc.beltType}</span>}
            {acc.beltWidth && <span>Width: {acc.beltWidth}</span>}
            {acc.cartridgeLoopCaliber && (
              <span>
                Loops: {acc.cartridgeLoopCount ? `${acc.cartridgeLoopCount}x ` : ''}
                {acc.cartridgeLoopCaliber}
              </span>
            )}
            {acc.serialNumber && <span>SN: {acc.serialNumber}</span>}
          </div>
        </div>
      </div>

      {/* Right: Actions & Quantity Stepper */}
      <div className="mount-action-tray">
        {/* Quantity Selector if multi-quantity */}
        {totalQty > 1 && (
          <div className="flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded border border-white/10">
            <span className="text-xs text-slate-400">Qty:</span>
            <input
              type="number"
              min="1"
              max={totalQty}
              value={selectedQty}
              onChange={(e) => {
                const val = Math.max(1, Math.min(totalQty, parseInt(e.target.value) || 1));
                onQuantityChange(val);
              }}
              className="form-input mount-qty-input"
              disabled={isItemBusy}
            />
            <span className="text-xs text-slate-400">/ {totalQty}</span>
          </div>
        )}

        {/* Action Buttons */}
        {isMountedHere ? (
          <div className="flex gap-2">
            {totalQty > 1 && selectedQty !== currentlyMountedHereQty && (
              <button
                type="button"
                className="btn-primary text-xs flex items-center gap-1 py-1.5 px-3"
                onClick={onMount}
                disabled={isItemBusy}
              >
                <Check size={13} /> Update Qty
              </button>
            )}
            <button
              type="button"
              className="btn-secondary text-xs text-red-400 border-red-500/30 hover:border-red-500/60 flex items-center gap-1 py-1.5 px-3"
              onClick={onUnmount}
              disabled={isItemBusy}
            >
              <Unlink size={13} /> Unmount
            </button>
          </div>
        ) : isMountedElsewhere ? (
          <button
            type="button"
            className="btn-secondary text-xs text-amber-400 border-amber-500/35 hover:border-amber-500/60 flex items-center gap-1.5 py-1.5 px-3"
            onClick={onMount}
            disabled={isItemBusy}
          >
            <ArrowRightLeft size={13} /> Transfer &amp; Mount
          </button>
        ) : (
          <button
            type="button"
            className="btn-primary text-xs flex items-center gap-1.5 py-1.5 px-3"
            onClick={onMount}
            disabled={isItemBusy}
          >
            <LinkIcon size={13} /> Mount to Firearm
          </button>
        )}
      </div>
    </div>
  );
};
