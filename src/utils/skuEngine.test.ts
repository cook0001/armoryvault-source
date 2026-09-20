import { describe, it, expect, vi } from 'vitest';
import { resolveItemIdentifier, generateSku, ensureItemSku } from './skuEngine';

describe('SKU & Identifier Engine (Mobile/Desktop Sync Scope)', () => {
  describe('resolveItemIdentifier', () => {
    it('prioritizes serial_number when present', () => {
      const item = {
        serial_number: 'SN-998877',
        upc_code: '012345678905',
        sku: 'SKU-ABC-123',
      };
      const result = resolveItemIdentifier(item);
      expect(result.identifier).toBe('SN-998877');
      expect(result.type).toBe('serial');
    });

    it('falls back to upc_code when serial_number is absent', () => {
      const item = {
        upc_code: '012345678905',
        sku: 'SKU-ABC-123',
      };
      const result = resolveItemIdentifier(item);
      expect(result.identifier).toBe('012345678905');
      expect(result.type).toBe('upc');
    });

    it('falls back to upc when upc_code is absent', () => {
      const item = {
        upc: '778899001122',
        sku: 'SKU-ABC-123',
      };
      const result = resolveItemIdentifier(item);
      expect(result.identifier).toBe('778899001122');
      expect(result.type).toBe('upc');
    });

    it('falls back to sku when serial and upc are absent', () => {
      const item = {
        sku: 'SKU-EXISTING-99',
      };
      const result = resolveItemIdentifier(item);
      expect(result.identifier).toBe('SKU-EXISTING-99');
      expect(result.type).toBe('sku');
    });

    it('returns type: none when no identifiers are present', () => {
      const item = {
        brand: 'Federal',
        caliber: '9mm Luger',
      };
      const result = resolveItemIdentifier(item);
      expect(result.identifier).toBeUndefined();
      expect(result.type).toBe('none');
    });
  });

  describe('generateSku', () => {
    it('generates AV-AMMO-* with caliber and alphanumeric random suffix', () => {
      const sku = generateSku('ammo', { caliber: '9mm Luger', brand: 'Federal' });
      expect(sku).toMatch(/^AV-AMMO-9MMLUGER-[A-Z0-9]{6}$/);
    });

    it('generates AV-COMP-* with component type', () => {
      const sku = generateSku('component', { type: 'Primer', manufacturer: 'CCI' });
      expect(sku).toMatch(/^AV-COMP-PRIMER-[A-Z0-9]{6}$/);
    });

    it('generates AV-ACC-* with accessory type', () => {
      const sku = generateSku('accessory', { type: 'Optic', manufacturer: 'Holosun' });
      expect(sku).toMatch(/^AV-ACC-OPTIC-[A-Z0-9]{6}$/);
    });
  });

  describe('ensureItemSku', () => {
    it('auto-generates and registers SKU into SKU manager database if missing', async () => {
      const mockSaveSkus = vi.fn().mockResolvedValue(true);
      const mockApi = {
        saveSkus: mockSaveSkus,
      };

      const item: any = {
        brand: 'Hornady',
        caliber: '6.5 Creedmoor',
        count: 50,
      };

      const { item: updatedItem, sku, wasGenerated } = await ensureItemSku(item, 'ammo', mockApi);
      expect(wasGenerated).toBe(true);
      expect(sku).toMatch(/^AV-AMMO-65CREEDM-[A-Z0-9]{6}$/);
      expect(updatedItem.sku).toBe(sku);
      expect(updatedItem.upc_code).toBe(sku);
      expect(mockSaveSkus).toHaveBeenCalledWith(
        expect.objectContaining({
          [sku]: expect.objectContaining({
            category: 'ammo',
            caliber: '6.5 Creedmoor',
            quantity: 50,
          }),
        })
      );
    });

    it('preserves existing serial or upc and does not overwrite', async () => {
      const mockSaveSkus = vi.fn().mockResolvedValue(true);
      const mockApi = {
        saveSkus: mockSaveSkus,
      };

      const item: any = {
        serial_number: 'SN-PERFECT-1',
        brand: 'Glock',
      };

      const { sku, wasGenerated } = await ensureItemSku(item, 'accessory', mockApi);
      expect(wasGenerated).toBe(false);
      expect(sku).toBe('SN-PERFECT-1');
      expect(item.sku).toBeUndefined();
      expect(mockSaveSkus).not.toHaveBeenCalled();
    });
  });
});
