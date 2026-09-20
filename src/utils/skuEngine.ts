import type { CustomSkuDatabase, CustomSkuItem } from '../types';

export type SkuCategory = 'ammo' | 'component' | 'accessory';

export interface ResolvedIdentifier {
  identifier?: string;
  type: 'serial' | 'upc' | 'sku' | 'none';
}

/**
 * Resolves the primary identifier of an item in priority order:
 * 1. Serial Number
 * 2. UPC / Barcode
 * 3. SKU
 */
export function resolveItemIdentifier(item: any): ResolvedIdentifier {
  if (!item || typeof item !== 'object') {
    return { type: 'none' };
  }

  const serial = item.serial_number || item.serialNumber;
  if (serial && typeof serial === 'string' && serial.trim().length > 0) {
    return { identifier: serial.trim(), type: 'serial' };
  }

  const upc = item.upc || item.upc_code || item.upcOrId;
  if (upc && typeof upc === 'string' && upc.trim().length > 0) {
    return { identifier: upc.trim(), type: 'upc' };
  }

  const sku = item.sku;
  if (sku && typeof sku === 'string' && sku.trim().length > 0) {
    return { identifier: sku.trim(), type: 'sku' };
  }

  return { type: 'none' };
}

/**
 * Generates a standardized ArmoryVault SKU string:
 * - Ammo: AV-AMMO-<CALIBER>-<RANDOM_HEX>
 * - Component: AV-COMP-<TYPE>-<RANDOM_HEX>
 * - Accessory: AV-ACC-<CATEGORY>-<RANDOM_HEX>
 */
export function generateSku(category: SkuCategory, details?: any): string {
  const randHex = Math.random().toString(36).substring(2, 8).toUpperCase();

  switch (category) {
    case 'ammo': {
      const cal = (details?.caliber || 'AMMO')
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase()
        .slice(0, 8);
      return `AV-AMMO-${cal || 'BULK'}-${randHex}`;
    }
    case 'component': {
      const type = (details?.type || details?.componentType || 'COMP')
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase()
        .slice(0, 8);
      return `AV-COMP-${type || 'MAT'}-${randHex}`;
    }
    case 'accessory':
    default: {
      const cat = (details?.category || details?.type || 'ACC')
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase()
        .slice(0, 8);
      return `AV-ACC-${cat || 'GEAR'}-${randHex}`;
    }
  }
}

/**
 * Ensures an item has an identifier. If none exists (no serial, UPC, or SKU),
 * auto-generates a standardized SKU, attaches it to the item, and registers it
 * in the SKU Manager database.
 */
export async function ensureItemSku(
  item: any,
  category: SkuCategory,
  api?: any
): Promise<{ item: any; sku: string; wasGenerated: boolean }> {
  const resolved = resolveItemIdentifier(item);

  if (resolved.identifier) {
    return { item, sku: resolved.identifier, wasGenerated: false };
  }

  // Auto-generate standardized SKU
  const newSku = generateSku(category, item);
  item.sku = newSku;
  if (!item.upc_code && !item.upc) {
    item.upc_code = newSku;
  }

  // Register SKU into SKU Manager catalog in SQLite database
  if (api && typeof api.saveSkus === 'function') {
    try {
      const skuData: CustomSkuItem = {
        category,
        name:
          item.name ||
          `${item.manufacturer || item.brand || ''} ${item.model || item.caliber || item.type || ''}`.trim() ||
          `Item (${newSku})`,
        manufacturer: item.manufacturer || item.brand,
        caliber: item.caliber,
        grain: item.grain,
        bulletType: item.bullet_type || item.bulletType,
        componentType: item.type || item.componentType,
        quantity: item.count || item.quantity,
      };

      const skuCatalog: CustomSkuDatabase = {
        [newSku]: skuData,
      };

      await api.saveSkus(skuCatalog);
    } catch (err) {
      console.warn('[SkuEngine] Failed registering auto-generated SKU in SKU manager:', err);
    }
  }

  return { item, sku: newSku, wasGenerated: true };
}
