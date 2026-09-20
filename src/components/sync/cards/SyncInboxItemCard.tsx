import React from 'react';
import type { Ammo, Firearm, ReloadingComponent, SyncItem } from '../../../types';
import { SyncItemAdjustmentCard } from './SyncItemAdjustmentCard';
import { SyncItemFirearmCard } from './SyncItemFirearmCard';
import { SyncItemLogCard } from './SyncItemLogCard';
import { SyncItemMediaCard } from './SyncItemMediaCard';
import { SyncItemSessionCard } from './SyncItemSessionCard';
import { SyncItemPayloadCard } from './SyncItemPayloadCard';
import { SyncItemOpticZeroCard } from './SyncItemOpticZeroCard';

export interface SyncInboxItemCardProps {
  item: SyncItem;
  ammoList: Ammo[];
  firearms: Firearm[];
  componentsList: ReloadingComponent[];
  accessoriesList?: any[];
  isReloadingInstalled: boolean;
  isResolving: boolean;
  onApprove: (item: SyncItem) => void;
  onDelete: (id: number) => void;
  onEditFirearm: (data: any, syncItemId: number, existingFirearmId?: number) => void;
  onResolveAmmo: (upcOrId: string, count: number, syncItemId: number) => void;
  onResolveComponent: (upcOrId: string, count: number, syncItemId: number) => void;
  onResolveUniversal: (item: SyncItem) => void;
  onInstallReloadingModule: () => void;
  getFirearmMaintenanceWarning: (
    firearm: Firearm,
    additionalRounds: number
  ) => {
    taskName: string;
    interval: number;
    projectedRounds: number;
    isOverdue: boolean;
  } | null;
}

export const SyncInboxItemCard: React.FC<SyncInboxItemCardProps> = (props) => {
  const { item, onDelete } = props;

  if (item.type === 'ammo_adjustment' || item.type === 'component_adjustment') {
    return <SyncItemAdjustmentCard {...props} />;
  }

  if (item.type === 'new_firearm' || item.type === 'firearm_update') {
    return (
      <SyncItemFirearmCard
        item={item}
        firearms={props.firearms}
        onApprove={props.onApprove}
        onDelete={props.onDelete}
        onEdit={props.onEditFirearm}
      />
    );
  }

  if (item.type === 'firearm_log' || item.type === 'firearm_maintenance') {
    return (
      <SyncItemLogCard
        item={item}
        firearms={props.firearms}
        onApprove={props.onApprove}
        onDelete={props.onDelete}
      />
    );
  }

  if (item.type === 'universal_scan' || item.type === 'firearm_photo') {
    return (
      <SyncItemMediaCard
        item={item}
        firearms={props.firearms}
        isResolving={props.isResolving}
        onResolveUniversal={props.onResolveUniversal}
        onApprove={props.onApprove}
        onDelete={props.onDelete}
      />
    );
  }

  if (
    item.type === 'range_session' ||
    item.type === 'bill_of_sale_transfer' ||
    item.type === 'chrono_string' ||
    item.type === 'target_analysis'
  ) {
    return (
      <SyncItemSessionCard
        item={item}
        firearms={props.firearms}
        ammoList={props.ammoList}
        onApprove={props.onApprove}
        onDelete={props.onDelete}
        getFirearmMaintenanceWarning={props.getFirearmMaintenanceWarning}
      />
    );
  }

  if (item.type === 'optic_zero_update') {
    return (
      <SyncItemOpticZeroCard
        item={item}
        firearms={props.firearms}
        accessoriesList={props.accessoriesList || []}
        onApprove={props.onApprove}
        onDelete={props.onDelete}
      />
    );
  }

  if (item.type === 'custom_payload') {
    return (
      <SyncItemPayloadCard
        item={item}
        onDelete={props.onDelete}
        onApproveSuccess={() => props.onApprove(item)}
      />
    );
  }

  return (
    <div key={item.id} className="card">
      <p>Unknown event type: {item.type}</p>
      <button className="btn-secondary" onClick={() => onDelete(item.id!)}>
        Dismiss
      </button>
    </div>
  );
};
