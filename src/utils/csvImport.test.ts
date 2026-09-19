import { describe, expect, it } from 'vitest';
import {
  autoMapHeaders,
  detectDelimiter,
  detectEntityType,
  parseRawCsv,
  resolveAmmoDuplicates,
  resolveFirearmsDuplicates,
  standardizeCondition,
  standardizeDate,
  transformAccessoryRows,
  transformAmmoRows,
  transformComponentRows,
  transformFirearmsRows,
} from './csvImport';

describe('CSV Import Engine (RFC 4180 & Competitor Converters)', () => {
  describe('Delimiter & Tokenizer', () => {
    it('auto-detects commas, tabs, and semicolons', () => {
      expect(detectDelimiter('Make,Model,Serial\nColt,1911,123')).toBe(',');
      expect(detectDelimiter('Make\tModel\tSerial\nColt\t1911\t123')).toBe('\t');
      expect(detectDelimiter('Make;Model;Serial\nColt;1911;123')).toBe(';');
      expect(detectDelimiter('Make|Model|Serial\nColt|1911|123')).toBe('|');
    });

    it('handles UTF-8 BOM, quoted fields, escaped quotes, and embedded commas', () => {
      const csv = `\uFEFF"Manufacturer","Model Name","Notes","Cost"\n"Smith & Wesson","Model 29, .44 Mag","Special ""Dirty Harry"" edition, very clean","$1,450.00"`;
      const parsed = parseRawCsv(csv);

      expect(parsed.headers).toEqual(['Manufacturer', 'Model Name', 'Notes', 'Cost']);
      expect(parsed.rows.length).toBe(1);
      expect(parsed.rows[0][0]).toBe('Smith & Wesson');
      expect(parsed.rows[0][1]).toBe('Model 29, .44 Mag');
      expect(parsed.rows[0][2]).toBe('Special "Dirty Harry" edition, very clean');
      expect(parsed.rows[0][3]).toBe('$1,450.00');
    });

    it('handles multiline fields within quotes', () => {
      const csv = `"Make","Model","Notes"\n"Glock","19","Line 1\nLine 2\nLine 3"`;
      const parsed = parseRawCsv(csv);

      expect(parsed.rows.length).toBe(1);
      expect(parsed.rows[0][2]).toBe('Line 1\nLine 2\nLine 3');
    });
  });

  describe('Entity & Schema Auto-Detection', () => {
    it('detects firearms from GunSafe headers', () => {
      const headers = ['Manufacturer', 'Model', 'Serial', 'Caliber', 'Barrel', 'Action', 'Cost'];
      expect(detectEntityType(headers)).toBe('firearms');
    });

    it('detects ammo from grain/round count headers', () => {
      const headers = ['Caliber', 'Brand', 'Grain Weight', 'Round Count', 'Box Price'];
      expect(detectEntityType(headers)).toBe('ammo');
    });

    it('detects reloading components from powder/primer headers', () => {
      const headers = ['Component Type', 'Manufacturer', 'Powder / Bullet', 'Weight', 'Cost'];
      expect(detectEntityType(headers)).toBe('components');
    });

    it('detects accessories from optic/holster headers', () => {
      const headers = ['Accessory Name', 'Category', 'Optic Type', 'Serial #', 'Value'];
      expect(detectEntityType(headers)).toBe('accessories');
    });
  });

  describe('Competitor Conversions', () => {
    it('converts GunSafe CSV format seamlessly', () => {
      const gunSafeCsv = `Manufacturer,Model,Serial,Caliber,Type,Action,Barrel,Condition,Cost,Acquired Date,Seller\nRuger,10/22,241-99882,.22 LR,Rifle,Semi-Auto,18.5,Excellent,$349.99,05/14/2021,Bass Pro`;
      const parsed = parseRawCsv(gunSafeCsv);
      const mappings = autoMapHeaders(parsed.headers, 'firearms');
      const result = transformFirearmsRows(parsed.rawRows, mappings);

      expect(result.errors).toHaveLength(0);
      expect(result.valid).toHaveLength(1);
      const f = result.valid[0];
      expect(f.make).toBe('Ruger');
      expect(f.model).toBe('10/22');
      expect(f.serial_number).toBe('241-99882');
      expect(f.caliber).toBe('.22 LR');
      expect(f.firearm_type).toBe('Rifle');
      expect(f.action_type).toBe('Semi-Auto');
      expect(f.barrel_length).toBe('18.5');
      expect(f.condition).toBe('Excellent');
      expect(f.purchase_price).toBe(349.99);
      expect(f.purchase_date).toBe('2021-05-14');
      expect(f.purchased_from).toBe('Bass Pro');
    });

    it('converts GunLog / GunLogPro format', () => {
      const gunLogCsv = `Mfg,Model,Serial Number,Caliber,Date Acquired,Price Paid,Remarks\nSig Sauer,P365X,66B129033,9mm Luger,10/30/2022,$599.00,"EDC setup with Wilson grip"`;
      const parsed = parseRawCsv(gunLogCsv);
      const mappings = autoMapHeaders(parsed.headers, 'firearms');
      const result = transformFirearmsRows(parsed.rawRows, mappings);

      expect(result.valid).toHaveLength(1);
      const f = result.valid[0];
      expect(f.make).toBe('Sig Sauer');
      expect(f.model).toBe('P365X');
      expect(f.serial_number).toBe('66B129033');
      expect(f.purchase_price).toBe(599);
      expect(f.purchase_date).toBe('2022-10-30');
      expect(f.notes).toBe('EDC setup with Wilson grip');
    });

    it('converts MyGunDB format', () => {
      const myGunDbCsv = `Manufacturer,Model,Serial Number,Caliber,Type,Action,Date Acquired,Cost,Acquired From,Status\nColt,Python,PY08221,.357 Magnum,Revolver,Double Action,2023-01-15,1299.50,GunBroker,Available`;
      const parsed = parseRawCsv(myGunDbCsv);
      const mappings = autoMapHeaders(parsed.headers, 'firearms');
      const result = transformFirearmsRows(parsed.rawRows, mappings);

      expect(result.valid).toHaveLength(1);
      const f = result.valid[0];
      expect(f.make).toBe('Colt');
      expect(f.model).toBe('Python');
      expect(f.serial_number).toBe('PY08221');
      expect(f.purchase_price).toBe(1299.5);
      expect(f.is_sold).toBe(false);
    });

    it('converts ATF Bound Book / FFL EZ-Check CSV export', () => {
      const boundBookCsv = `Acquisition Date,Acquired From,Manufacturer,Model,Serial Number,Type,Caliber,Disposition Date,Disposition To\n2020-04-12,"Brownells Inc",Springfield,M1A,098765,Rifle,.308 Win,2024-02-01,"John Doe, FFL 1-23-456"`;
      const parsed = parseRawCsv(boundBookCsv);
      const mappings = autoMapHeaders(parsed.headers, 'firearms');
      const result = transformFirearmsRows(parsed.rawRows, mappings);

      expect(result.valid).toHaveLength(1);
      const f = result.valid[0];
      expect(f.make).toBe('Springfield');
      expect(f.model).toBe('M1A');
      expect(f.serial_number).toBe('098765');
      expect(f.purchase_date).toBe('2020-04-12');
      expect(f.purchased_from).toBe('Brownells Inc');
      expect(f.is_sold).toBe(true);
      expect(f.sold_date).toBe('2024-02-01');
      expect(f.sold_to_name).toBe('John Doe, FFL 1-23-456');
    });

    it('converts native ArmoryVault export CSV', () => {
      const armoryVaultCsv = `ID,Make,Model,Serial Number,Caliber,Barrel Length,Action Type,Purchase Date,Purchase Price,Condition,Status,Sold To,Sale Date,Sale Price\n1,"Heckler & Koch","SP5","271-002134","9x19mm","8.9","Roller Delayed","2023-08-11",2799,"New / Unfired","Available","","",""`;
      const parsed = parseRawCsv(armoryVaultCsv);
      const mappings = autoMapHeaders(parsed.headers, 'firearms');
      const result = transformFirearmsRows(parsed.rawRows, mappings);

      expect(result.valid).toHaveLength(1);
      const f = result.valid[0];
      expect(f.make).toBe('Heckler & Koch');
      expect(f.model).toBe('SP5');
      expect(f.serial_number).toBe('271-002134');
      expect(f.caliber).toBe('9x19mm');
      expect(f.purchase_price).toBe(2799);
      expect(f.condition).toBe('New / Unfired');
    });
  });

  describe('Data Normalization', () => {
    it('standardizes dates across multiple formats', () => {
      expect(standardizeDate('2023-11-20')).toBe('2023-11-20');
      expect(standardizeDate('11/20/2023')).toBe('2023-11-20');
      expect(standardizeDate('4/5/22')).toBe('2022-04-05');
      expect(standardizeDate('04-05-2022')).toBe('2022-04-05');
      expect(standardizeDate('')).toBe('');
    });

    it('standardizes conditions', () => {
      expect(standardizeCondition('NIB')).toBe('New / Unfired');
      expect(standardizeCondition('Mint')).toBe('Excellent');
      expect(standardizeCondition('Very Good (VG)')).toBe('Very Good');
      expect(standardizeCondition('Fair condition')).toBe('Fair');
    });
  });

  describe('Ammo, Components, Accessories Transformation', () => {
    it('transforms ammo inventory CSV rows correctly', () => {
      const ammoCsv = `Caliber,Manufacturer,Bullet Type,Grain Weight,Rounds,Box Price\n9mm Luger,Federal,HST,124,500,$24.99`;
      const parsed = parseRawCsv(ammoCsv);
      const mappings = autoMapHeaders(parsed.headers, 'ammo');
      const result = transformAmmoRows(parsed.rawRows, mappings);

      expect(result.valid).toHaveLength(1);
      const a = result.valid[0];
      expect(a.caliber).toBe('9mm Luger');
      expect(a.manufacturer).toBe('Federal');
      expect(a.projectile).toBe('HST');
      expect(a.grain).toBe(124);
      expect(a.count).toBe(500);
    });

    it('transforms reloading component CSV rows', () => {
      const compCsv = `Type,Manufacturer,Model,Quantity,Unit,Cost\nPowder,Hodgdon,Varget,8,lbs,$310.00`;
      const parsed = parseRawCsv(compCsv);
      const mappings = autoMapHeaders(parsed.headers, 'components');
      const result = transformComponentRows(parsed.rawRows, mappings);

      expect(result.valid).toHaveLength(1);
      const c = result.valid[0];
      expect(c.type).toBe('powder');
      expect(c.manufacturer).toBe('Hodgdon');
      expect(c.name).toBe('Varget');
      expect(c.quantity).toBe(8);
      expect(c.weightUnit).toBe('lbs');
      expect(c.cost).toBe(310);
    });

    it('transforms accessories CSV rows', () => {
      const accCsv = `Accessory Name,Category,Manufacturer,Model,Value\nRazor HD Gen III 1-10x,Optic,Vortex,RZR-11002,"$1,999.00"`;
      const parsed = parseRawCsv(accCsv);
      const mappings = autoMapHeaders(parsed.headers, 'accessories');
      const result = transformAccessoryRows(parsed.rawRows, mappings);

      expect(result.valid).toHaveLength(1);
      const acc = result.valid[0];
      expect(acc.model).toBe('RZR-11002');
      expect(acc.manufacturer).toBe('Vortex');
      expect(acc.value).toBe(1999);
    });
  });

  describe('Duplicate Resolution', () => {
    it('skips existing firearms with matching serial numbers when mode is skip', () => {
      const existing: any[] = [{ id: 1, make: 'Glock', model: '19', serial_number: 'ABC1234' }];
      const incoming: any[] = [
        { make: 'Glock', model: '19 Gen 5', serial_number: 'abc1234' },
        { make: 'Sig', model: 'P320', serial_number: 'XYZ9876' },
      ];

      const { toInsert, toUpdate, skippedCount } = resolveFirearmsDuplicates(
        incoming,
        existing,
        'skip'
      );
      expect(skippedCount).toBe(1);
      expect(toUpdate).toHaveLength(0);
      expect(toInsert).toHaveLength(1);
      expect(toInsert[0].serial_number).toBe('XYZ9876');
    });

    it('updates existing firearms when mode is update', () => {
      const existing: any[] = [{ id: 1, make: 'Glock', model: '19', serial_number: 'ABC1234' }];
      const incoming: any[] = [{ make: 'Glock', model: '19 MOS', serial_number: 'ABC1234' }];

      const { toInsert, toUpdate, skippedCount } = resolveFirearmsDuplicates(
        incoming,
        existing,
        'update'
      );
      expect(skippedCount).toBe(0);
      expect(toInsert).toHaveLength(0);
      expect(toUpdate).toHaveLength(1);
      expect(toUpdate[0].existingId).toBe(1);
      expect(toUpdate[0].updatedItem.model).toBe('19 MOS');
    });
  });

  describe('LoadBench Recipe (.loadbench / .ldb) Ingestion', () => {
    it('ingests structured .loadbench recipe JSON and maps all handload attributes', () => {
      const loadbenchJson = JSON.stringify({
        format: 'loadbench_recipe',
        version: '1.0.0',
        metadata: {
          name: '6.5 Creedmoor 140gr Match',
          lot_number: 'LOT-2026-09-A',
          batch_size: 50,
          author: 'Daniel C.',
          target_firearm: 'Tikka T3x TAC A1',
          notes: 'Sub-half-MOA verified'
        },
        cartridge: {
          name: '6.5 Creedmoor',
          coal_in: 2.800,
          brass_manufacturer: 'Lapua',
          brass_firings: 2
        },
        projectile: {
          name: 'ELD Match',
          manufacturer: 'Hornady',
          weight_grains: 140,
          cbto_in: 2.195,
          freebore_jump_in: 0.025
        },
        propellant: {
          name: 'H4350',
          charge_grains: 41.5
        },
        primer: {
          name: 'Federal 210M Large Rifle Match'
        },
        simulated: {
          muzzle_velocity_fps: 2715,
          max_pressure_psi: 58420,
          obt_node: 'Node 4'
        },
        chronograph: {
          measured_average_fps: 2722,
          extreme_spread_fps: 14,
          standard_deviation_fps: 4.8
        },
        economics: {
          cost_per_round_usd: 0.68
        }
      });

      const parsed = parseRawCsv(loadbenchJson);
      expect(detectEntityType(parsed.headers)).toBe('ammo');
      const mappings = autoMapHeaders(parsed.headers, 'ammo');
      const result = transformAmmoRows(parsed.rawRows, mappings);

      expect(result.valid).toHaveLength(1);
      const ammo = result.valid[0];
      expect(ammo.caliber).toBe('6.5 Creedmoor');
      expect(ammo.projectile).toBe('ELD Match');
      expect(ammo.grain).toBe(140);
      expect(ammo.powder).toBe('H4350');
      expect(ammo.powderCharge).toBe(41.5);
      expect(ammo.count).toBe(50);
      expect(ammo.brass).toBe('Lapua (2x fired)');
      expect(ammo.notes).toContain('Lot #LOT-2026-09-A');
      expect(ammo.notes).toContain('Author: Daniel C.');
      expect(ammo.notes).toContain('Rifle: Tikka T3x TAC A1');
      expect(ammo.notes).toContain('Node 4');
      expect(ammo.notes).toContain('Chrono: 2722 fps');
    });
  });
});
