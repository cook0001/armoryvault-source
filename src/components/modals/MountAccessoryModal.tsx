import { CheckCircle, Link as LinkIcon, Package, PlusCircle, Search, X } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Accessory, AccessoryMount, Firearm } from '@/types';
import { MountAccessoryItem } from './mount-accessory/MountAccessoryItem';

export interface MountAccessoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetFirearm: Firearm | null;
  allAccessories: Accessory[];
  allFirearms: Firearm[];
  onMountChanged: () => void;
  onOpenCreateNew?: () => void;
}

const CATEGORIES = [
  'All',
  'Optic',
  'Suppressor',
  'Light',
  'Magazine',
  'Stock',
  'Chassis',
  'Belt',
  'Holster',
  'Mount',
  'Sling',
  'Other',
] as const;

export const MountAccessoryModal: React.FC<MountAccessoryModalProps> = ({
  isOpen,
  onClose,
  targetFirearm,
  allAccessories,
  allFirearms,
  onMountChanged,
  onOpenCreateNew,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unmounted' | 'mounted_here'>('all');
  const [quantitiesToMount, setQuantitiesToMount] = useState<Record<number, number>>({});
  const [isProcessing, setIsProcessing] = useState<number | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<{
    message: string;
    type: 'success' | 'info';
  } | null>(null);

  const firearmId = targetFirearm?.id ? Number(targetFirearm.id) : null;

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setFeedbackToast({ message, type });
    setTimeout(() => {
      setFeedbackToast(null);
    }, 2800);
  };

  const getMountedFirearmNames = (acc: Accessory) => {
    if (!acc.mounts || acc.mounts.length === 0) return [];
    return acc.mounts
      .map((m) => {
        const found = allFirearms.find((f) => f.id === m.firearmId);
        return found ? `${found.make} ${found.model}` : `Firearm #${m.firearmId}`;
      })
      .filter(Boolean);
  };

  const filteredAccessories = useMemo(() => {
    return allAccessories.filter((acc) => {
      // Category filter
      if (selectedCategory !== 'All' && acc.type !== selectedCategory) {
        return false;
      }

      const isMountedHere = acc.mounts?.some((m) => m.firearmId === firearmId);
      const isUnmounted = !acc.mounts || acc.mounts.length === 0;

      // Status filter
      if (statusFilter === 'unmounted' && !isUnmounted) return false;
      if (statusFilter === 'mounted_here' && !isMountedHere) return false;

      // Search term filter
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      const matchName = `${acc.manufacturer} ${acc.model}`.toLowerCase();
      const matchSerial = (acc.serialNumber || '').toLowerCase();
      const matchUpc = (acc.upc_code || '').toLowerCase();
      const matchNotes = (acc.notes || '').toLowerCase();
      const matchCaliber = (acc.caliber || acc.ratedCalibers || '').toLowerCase();

      return (
        matchName.includes(q) ||
        matchSerial.includes(q) ||
        matchUpc.includes(q) ||
        matchNotes.includes(q) ||
        matchCaliber.includes(q)
      );
    });
  }, [allAccessories, selectedCategory, statusFilter, searchTerm, firearmId]);

  const handleMount = async (acc: Accessory, overrideQty?: number) => {
    if (!firearmId || !window.api?.updateAccessory) return;
    setIsProcessing(acc.id || null);

    try {
      const currentMounts = acc.mounts ? [...acc.mounts] : [];
      const existingMountIdx = currentMounts.findIndex((m) => m.firearmId === firearmId);
      const chosenQty = overrideQty || quantitiesToMount[acc.id!] || 1;

      let updatedMounts: AccessoryMount[];
      if (existingMountIdx >= 0) {
        updatedMounts = currentMounts.map((m, idx) =>
          idx === existingMountIdx ? { ...m, quantity: chosenQty } : m
        );
      } else {
        updatedMounts = [...currentMounts, { firearmId, quantity: chosenQty }];
      }

      const updatedAcc: Accessory = {
        ...acc,
        mounts: updatedMounts,
      };

      await window.api.updateAccessory(acc.id!, updatedAcc);
      onMountChanged();
      showToast(
        `Mounted ${acc.manufacturer} ${acc.model} to ${targetFirearm?.make} ${targetFirearm?.model}!`,
        'success'
      );
    } catch (err: any) {
      console.error('Failed to mount accessory:', err);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleUnmount = async (acc: Accessory) => {
    if (!firearmId || !window.api?.updateAccessory) return;
    setIsProcessing(acc.id || null);

    try {
      const currentMounts = acc.mounts || [];
      const updatedMounts = currentMounts.filter((m) => m.firearmId !== firearmId);

      const updatedAcc: Accessory = {
        ...acc,
        mounts: updatedMounts,
      };

      await window.api.updateAccessory(acc.id!, updatedAcc);
      onMountChanged();
      showToast(
        `Detached ${acc.manufacturer} ${acc.model} from ${targetFirearm?.make} ${targetFirearm?.model}.`,
        'info'
      );
    } catch (err: any) {
      console.error('Failed to unmount accessory:', err);
    } finally {
      setIsProcessing(null);
    }
  };

  if (!isOpen || !targetFirearm) return null;

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container mount-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header mount-modal-header-bg">
          <div className="flex items-center gap-3">
            <div className="mount-icon-badge">
              <LinkIcon size={20} color="#38bdf8" />
            </div>
            <div>
              <h2 className="modal-title">Mount Accessory to Firearm</h2>
              <p className="mount-target-sub">
                Target:{' '}
                <strong className="text-sky-400">
                  {targetFirearm.make} {targetFirearm.model}
                </strong>{' '}
                {targetFirearm.caliber ? `(${targetFirearm.caliber})` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenCreateNew && (
              <button
                type="button"
                className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3"
                onClick={() => {
                  onClose();
                  onOpenCreateNew();
                }}
              >
                <PlusCircle size={15} /> + Create New Accessory
              </button>
            )}
            <button
              type="button"
              className="btn-icon"
              onClick={onClose}
              title="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Feedback Toast Banner */}
        {feedbackToast && (
          <div className={`mount-toast-banner ${feedbackToast.type}`}>
            <CheckCircle size={16} />
            <span>{feedbackToast.message}</span>
          </div>
        )}

        {/* Controls: Search, Category Chips & Status Filter */}
        <div className="mount-controls-tray">
          {/* Search Bar & Status Tabs */}
          <div className="flex gap-3 flex-wrap">
            <div className="mount-search-wrap">
              <Search size={16} className="mount-search-icon" />
              <input
                type="text"
                className="form-input mount-search-input"
                placeholder="Search by manufacturer, model, serial #, caliber..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="mount-search-clear"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Status Filter Buttons */}
            <div className="mount-status-group">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`mount-status-btn ${statusFilter === 'all' ? 'active-all' : ''}`}
              >
                All ({allAccessories.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('unmounted')}
                className={`mount-status-btn ${statusFilter === 'unmounted' ? 'active-unmounted' : ''}`}
              >
                Available / Unmounted (
                {allAccessories.filter((a) => !a.mounts || a.mounts.length === 0).length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('mounted_here')}
                className={`mount-status-btn ${statusFilter === 'mounted_here' ? 'active-mounted' : ''}`}
              >
                Mounted Here (
                {
                  allAccessories.filter((a) => a.mounts?.some((m) => m.firearmId === firearmId))
                    .length
                }
                )
              </button>
            </div>
          </div>

          {/* Category Filter Chips */}
          <div className="mount-cat-chips">
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat;
              const count =
                cat === 'All'
                  ? allAccessories.length
                  : allAccessories.filter((a) => a.type === cat).length;

              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`mount-cat-chip ${isSelected ? 'active' : ''}`}
                >
                  <span>{cat}</span>
                  <span className="mount-cat-count">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Accessory Grid */}
        <div className="modal-body flex flex-col gap-3">
          {filteredAccessories.length > 0 ? (
            filteredAccessories.map((acc) => {
              const mountedFirearms = getMountedFirearmNames(acc);
              const currentMountHere = acc.mounts?.find((m) => m.firearmId === firearmId);
              const isMountedHere = acc.mounts?.some((m) => m.firearmId === firearmId);
              const currentlyMountedHereQty = currentMountHere?.quantity || 1;
              const selectedQty =
                quantitiesToMount[acc.id!] !== undefined
                  ? quantitiesToMount[acc.id!]
                  : isMountedHere
                    ? currentlyMountedHereQty
                    : 1;

              return (
                <MountAccessoryItem
                  key={acc.id}
                  acc={acc}
                  firearmId={firearmId}
                  targetFirearm={targetFirearm}
                  mountedFirearms={mountedFirearms}
                  selectedQty={selectedQty}
                  isItemBusy={isProcessing === acc.id}
                  onQuantityChange={(val) =>
                    setQuantitiesToMount((prev) => ({ ...prev, [acc.id!]: val }))
                  }
                  onMount={() => handleMount(acc, selectedQty)}
                  onUnmount={() => handleUnmount(acc)}
                />
              );
            })
          ) : (
            <div className="text-center py-12 px-6 bg-black/20 rounded-xl border border-dashed border-white/10">
              <Package
                size={36}
                className="text-slate-500 mx-auto opacity-50 mb-2"
              />
              <p className="text-slate-200 font-semibold mb-1">
                No matching accessories found
              </p>
              <p className="text-slate-400 text-sm mb-4">
                {searchTerm
                  ? `No accessories matched "${searchTerm}". Try a different filter or search term.`
                  : 'You have no accessories in inventory under this category.'}
              </p>
              {onOpenCreateNew && (
                <button
                  type="button"
                  className="btn-primary text-sm inline-flex items-center gap-2 py-2 px-4"
                  onClick={() => {
                    onClose();
                    onOpenCreateNew();
                  }}
                >
                  <PlusCircle size={16} /> + Add New Accessory to Inventory
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer justify-between">
          <div className="text-xs text-slate-400">
            Showing <strong>{filteredAccessories.length}</strong> of{' '}
            <strong>{allAccessories.length}</strong> total accessories in your vault.
          </div>
          <button
            type="button"
            className="btn-secondary py-1.5 px-5 text-sm"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
