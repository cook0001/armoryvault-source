/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import { parseBarcodeData } from './BarcodeEngine';

describe('BarcodeEngine', () => {
  it('should correctly classify a known ammunition UPC', () => {
    const mockAmmoItem = {
      title: 'Winchester 9mm Luger 115 Grain FMJ 50 Rounds',
      brand: 'Winchester',
      description: '9mm target ammunition full metal jacket',
      offers: [{ price: '15.99', title: 'Winchester 9mm' }],
    };

    const result = parseBarcodeData(mockAmmoItem, []);
    expect(result.category).toBe('ammo');
    expect(result.parsedAmmo?.caliber).toBe('9mm Luger');
    expect(result.parsedAmmo?.grain).toBe(115);
    expect(result.parsedAmmo?.count).toBe(50);
    expect(result.foundCost).toBe(15.99);
  });

  it('should correctly classify a reloading powder UPC', () => {
    const mockPowderItem = {
      title: 'Hodgdon Varget Smokeless Powder 1 lb',
      brand: 'Hodgdon',
      description: 'Extruded rifle powder',
      offers: [{ price: '45.00', title: 'Hodgdon Varget 1 LB' }],
    };

    const result = parseBarcodeData(mockPowderItem, []);
    expect(result.category).toBe('component');
    expect(result.parsedComponent?.type).toBe('Powder');
    expect(result.parsedComponent?.weightUnit).toBe('lbs');
    expect(result.foundCost).toBe(45.0);
  });

  it('should correctly classify a primer UPC', () => {
    const mockPrimerItem = {
      title: 'CCI Small Rifle Primers #400 Box of 1000',
      brand: 'CCI',
      description: 'Standard small rifle primers',
      offers: [{ price: '85.50', title: 'CCI 400 SRP' }],
    };

    const result = parseBarcodeData(mockPrimerItem, []);
    expect(result.category).toBe('component');
    expect(result.parsedComponent?.type).toBe('Primer');
    expect(result.parsedComponent?.primerType).toBe('Small Rifle');
    expect(result.parsedComponent?.quantity).toBe(1000);
  });

  it('should correctly classify an accessory (optic) UPC', () => {
    const mockOpticItem = {
      title: 'Vortex Optics Crossfire II 2-7x32 Riflescope',
      brand: 'Vortex',
      description: 'Second focal plane V-Plex reticle optic',
      offers: [{ price: '129.99', title: 'Vortex Crossfire II Scope' }],
    };

    const result = parseBarcodeData(mockOpticItem, []);
    expect(result.category).toBe('accessory');
    expect(result.parsedAccessory?.type).toBe('Optic');
  });

  it('should correctly parse bulk 1,400 round bucket ammo UPC (047700415208)', () => {
    const mockRemingtonBucket = {
      title: 'Remington Golden Bullet .22 LR 36 Grain PHP 1,400 Rounds Bucket O Bullets',
      brand: 'Remington',
      description: 'High velocity 22 Long Rifle 36gr plated hollow point ammo 1,400 RD bucket',
      offers: [{ price: '89.99', title: 'Remington 22 LR 1,400 Rd' }],
    };

    const result = parseBarcodeData(mockRemingtonBucket, []);
    expect(result.category).toBe('ammo');
    expect(result.parsedAmmo?.manufacturer).toBe('Remington');
    expect(result.parsedAmmo?.caliber).toBe('.22 LR');
    expect(result.parsedAmmo?.grain).toBe(36);
    expect(result.parsedAmmo?.projectile).toBe('PHP');
    expect(result.parsedAmmo?.count).toBe(1400);
    expect(result.foundCost).toBe(89.99);
  });

  it('should correctly parse 1400 RD without comma', () => {
    const mockRemingtonItem = {
      title: 'Remington 21231 22 LR 36 GR PHP 1400 RD',
      brand: 'Remington',
      description: 'Plated Hollow Point 22LR 1400 rounds',
      offers: [],
    };

    const result = parseBarcodeData(mockRemingtonItem, []);
    expect(result.category).toBe('ammo');
    expect(result.parsedAmmo?.caliber).toBe('.22 LR');
    expect(result.parsedAmmo?.count).toBe(1400);
  });

  it('should correctly classify and extract proprietary bullet types (Hornady ELD-X, Federal HST, Barnes TTSX, Speer Gold Dot)', () => {
    // 1. Hornady ELD-X 6.5 Creedmoor
    const eldxItem = {
      title: 'Hornady Precision Hunter 6.5 Creedmoor 143 Grain ELD-X 20 Rounds',
      brand: 'Hornady',
      description: 'Extremely Low Drag expanding match hunting ammunition',
      offers: [{ price: '42.99', title: 'Hornady 6.5 Creedmoor ELD-X' }],
    };
    const eldxResult = parseBarcodeData(eldxItem, []);
    expect(eldxResult.category).toBe('ammo');
    expect(eldxResult.parsedAmmo?.projectile).toBe('ELD-X');
    expect(eldxResult.parsedAmmo?.caliber).toBe('6.5 Creedmoor');
    expect(eldxResult.parsedAmmo?.grain).toBe(143);

    // 2. Federal HST 9mm Luger
    const hstItem = {
      title: 'Federal Premium Law Enforcement 9mm Luger 124 Grain HST Tactical JHP 50 Rounds',
      brand: 'Federal',
      description: 'Law enforcement tactical expanding hollow point ammunition',
      offers: [{ price: '34.99', title: 'Federal HST 9mm 124gr' }],
    };
    const hstResult = parseBarcodeData(hstItem, []);
    expect(hstResult.category).toBe('ammo');
    expect(hstResult.parsedAmmo?.projectile).toBe('HST');
    expect(hstResult.parsedAmmo?.caliber).toBe('9mm Luger');
    expect(hstResult.parsedAmmo?.count).toBe(50);

    // 3. Barnes TTSX Bullets (Reloading Component)
    const ttsxComponent = {
      title: 'Barnes Tipped Triple-Shock X (TTSX) Bullets .308 Caliber 168 Grain 50 Count',
      brand: 'Barnes',
      description: 'Lead-free copper hunting projectiles',
      offers: [{ price: '48.00', title: 'Barnes .308 TTSX 168gr' }],
    };
    const ttsxResult = parseBarcodeData(ttsxComponent, []);
    expect(ttsxResult.category).toBe('component');
    expect(ttsxResult.parsedComponent?.bulletType).toBe('TTSX');
    expect(ttsxResult.parsedComponent?.caliber).toBe('.308 / 30 Cal');
    expect(ttsxResult.parsedComponent?.grain).toBe(168);
    expect(ttsxResult.parsedComponent?.quantity).toBe(50);

    // 4. Speer Gold Dot 45 ACP
    const goldDotItem = {
      title: 'Speer Gold Dot Personal Protection .45 ACP 230 Grain 20 Rounds',
      brand: 'Speer',
      description: 'Uni-Cor bonded core handgun defense ammunition',
      offers: [{ price: '28.50', title: 'Speer Gold Dot 45 Auto' }],
    };
    const gdResult = parseBarcodeData(goldDotItem, []);
    expect(gdResult.category).toBe('ammo');
    expect(gdResult.parsedAmmo?.projectile).toBe('Gold Dot');
    expect(gdResult.parsedAmmo?.caliber).toBe('.45 ACP');
  });

  it('should correctly classify precision rifle chassis (MDT ACC Elite Rem 700 SA)', () => {
    const mockChassisItem = {
      title: 'MDT ACC Elite Chassis System Remington 700 Short Action AICS Magazine Compatible',
      brand: 'MDT',
      description: 'Precision rifle chassis with full ARCA rail and M-LOK forend',
      offers: [{ price: '1299.99', title: 'MDT ACC Elite Chassis' }],
    };

    const result = parseBarcodeData(mockChassisItem, []);
    expect(result.category).toBe('accessory');
    expect(result.parsedAccessory?.type).toBe('Chassis');
    expect(result.parsedAccessory?.stockType).toBe('Precision Rifle Chassis');
    expect(result.parsedAccessory?.actionInlet).toBe('Remington 700 Short Action');
    expect(result.parsedAccessory?.magCompatibility).toBe('AICS / AW Detachable Box');
    expect(result.foundCost).toBe(1299.99);
  });

  it('should correctly classify AR-15 carbine stock (Magpul CTR Mil-Spec)', () => {
    const mockStockItem = {
      title: 'Magpul CTR Carbine Stock Mil-Spec AR-15 Buttstock',
      brand: 'Magpul',
      description: 'Adjustable buttstock for AR-15/M4 carbine buffer tubes',
      offers: [{ price: '59.95', title: 'Magpul CTR Stock' }],
    };

    const result = parseBarcodeData(mockStockItem, []);
    expect(result.category).toBe('accessory');
    expect(result.parsedAccessory?.type).toBe('Stock');
    expect(result.parsedAccessory?.stockType).toBe('Adjustable Carbine Stock');
    expect(result.parsedAccessory?.actionInlet).toBe('AR-15 / M4 / M16');
    expect(result.parsedAccessory?.bufferTubeType).toBe('Mil-Spec Buffer Tube (1.14" OD)');
  });

  it('should correctly classify Thompson/Center Encore Pro Hunter FlexTech stock', () => {
    const mockTcEncoreItem = {
      title: 'Thompson/Center Encore Pro Hunter FlexTech Stock Synthetic Black',
      brand: 'Thompson Center',
      description: 'Recoil reducing buttstock for T/C Encore and Pro Hunter frames',
      offers: [{ price: '119.00', title: 'TC Encore Flextech Stock' }],
    };

    const result = parseBarcodeData(mockTcEncoreItem, []);
    expect(result.category).toBe('accessory');
    expect(result.parsedAccessory?.type).toBe('Stock');
    expect(result.parsedAccessory?.stockType).toBe('T/C Rifle Buttstock');
    expect(result.parsedAccessory?.actionInlet).toBe(
      'Thompson/Center Encore / Pro Hunter / Endeavor'
    );
    expect(result.parsedAccessory?.bufferTubeType).toBe('T/C Encore Frame Bolt Interface');
  });

  it('should correctly classify Thompson/Center Contender Pachmayr Decelerator grip', () => {
    const mockTcContenderItem = {
      title: 'Pachmayr Decelerator Pistol Grip for T/C Contender G1 Frame',
      brand: 'Pachmayr',
      description: 'Rubber recoil absorption grip for Thompson Center Contender',
      offers: [{ price: '49.95', title: 'Pachmayr Contender Grip' }],
    };

    const result = parseBarcodeData(mockTcContenderItem, []);
    expect(result.category).toBe('accessory');
    expect(result.parsedAccessory?.type).toBe('Stock');
    expect(result.parsedAccessory?.stockType).toBe('T/C Pistol Grip / Adapter');
    expect(result.parsedAccessory?.actionInlet).toBe(
      'Thompson/Center Contender (G1 / Armor Alloy)'
    );
    expect(result.parsedAccessory?.bufferTubeType).toBe('T/C Contender (G1) Frame Interface');
  });

  it('should correctly classify Thompson/Center G2 Contender / SSK-50 Sharps Bros 1913 adapter', () => {
    const mockTcG2Item = {
      title: 'Sharps Bros G2 Contender SSK-50 Grip Chassis 1913 Picatinny Stock Adapter',
      brand: 'Sharps Bros',
      description: 'Grip adapter for T/C G2 Contender and SSK-50 receivers with rear 1913 rail',
      offers: [{ price: '145.00', title: 'Sharps Bros G2 1913 Grip' }],
    };

    const result = parseBarcodeData(mockTcG2Item, []);
    expect(result.category).toBe('accessory');
    expect(result.parsedAccessory?.actionInlet).toBe('Thompson/Center G2 Contender / SSK-50');
    expect(result.parsedAccessory?.bufferTubeType).toBe('T/C G2 / SSK-50 Frame Interface');
  });

  it('should correctly classify The Hunter Company Buscadero Drop Belt with cartridge loops', () => {
    const mockHunterBeltItem = {
      title: 'The Hunter Company 150 Series Buscadero Drop Belt 45 Colt 25 Loops Chestnut',
      brand: 'The Hunter Company',
      description:
        'Single right drop western gun belt with 25 sewn ammo loops for 45 Colt and 1060 series holster slot 3.0 inch',
      offers: [{ price: '89.99', title: 'Hunter 150 Buscadero Belt' }],
    };

    const result = parseBarcodeData(mockHunterBeltItem, []);
    expect(result.category).toBe('accessory');
    expect(result.parsedAccessory?.type).toBe('Belt');
    expect(result.parsedAccessory?.beltType).toBe('Western Buscadero Drop Belt (Single/Double)');
    expect(result.parsedAccessory?.dropLoopType).toBe('Single Drop (Right-Hand Strong Side)');
    expect(result.parsedAccessory?.cartridgeLoopCaliber).toBe(
      '.44 Special / .44 Magnum / .45 Colt'
    );
    expect(result.parsedAccessory?.cartridgeLoopCount).toBe(25);
    expect(result.parsedAccessory?.beltWidth).toBe('2.75" - 3.0" (Western Buscadero Drop Belt)');
  });

  it('should correctly classify Blue Alpha 1.75" Battle Belt Lite with Tegris core and Cobra buckle', () => {
    const mockBattleBeltItem = {
      title: 'Blue Alpha 1.75" Battle Belt Lite Multicam with AustriAlpin Cobra Buckle',
      brand: 'Blue Alpha',
      description:
        'Two-piece tactical battle belt with laser-cut MOLLE slots and Tegris composite core 1.75 inch',
      offers: [{ price: '144.00', title: 'Blue Alpha Battle Belt Lite' }],
    };

    const result = parseBarcodeData(mockBattleBeltItem, []);
    expect(result.category).toBe('accessory');
    expect(result.parsedAccessory?.type).toBe('Belt');
    expect(result.parsedAccessory?.beltType).toBe('Two-Piece MOLLE Battle Belt');
    expect(result.parsedAccessory?.beltWidth).toBe('1.75" (Tactical / Battle Belt / Riggers)');
    expect(result.parsedAccessory?.buckleType).toBe('AustriAlpin Cobra Quick-Release');
    expect(result.parsedAccessory?.stiffenerCore).toBe('Tegris / Curv Thermoplastic Composite');
    expect(result.parsedAccessory?.attachmentSystem).toBe('Laser-Cut Micro-MOLLE / PALS Slots');
  });

  it('should correctly classify Kore Essentials EDC Ratchet Gun Belt', () => {
    const mockKoreBeltItem = {
      title: 'Kore Essentials X5 Tactical EDC Ratchet Gun Belt 1.5" Black Power-Core',
      brand: 'Kore Essentials',
      description:
        'Everyday concealed carry ratchet gun belt with reinforced Power-Core stiffener and micro-adjustable track 1.5 inch',
      offers: [{ price: '64.95', title: 'Kore X5 Gun Belt' }],
    };

    const result = parseBarcodeData(mockKoreBeltItem, []);
    expect(result.category).toBe('accessory');
    expect(result.parsedAccessory?.type).toBe('Belt');
    expect(result.parsedAccessory?.beltType).toBe('EDC Concealed Carry Ratchet Belt');
    expect(result.parsedAccessory?.beltWidth).toBe('1.5" (Standard EDC / Concealed Carry)');
    expect(result.parsedAccessory?.buckleType).toBe(
      'Micro-Adjustable Ratchet / Track (1/4" Steps)'
    );
    expect(result.parsedAccessory?.stiffenerCore).toBe('Reinforced Polymer (Power-Core / HDPE)');
  });

  it('should fallback to unknown if the text contains no definitive keywords', () => {
    const mockUnknownItem = {
      title: 'Generic Metal Box',
      brand: 'Unknown',
      description: 'A box made of metal',
      offers: [],
    };

    const result = parseBarcodeData(mockUnknownItem, []);
    expect(result.category).toBe('unknown');
  });

  it('should correctly ingest a LoadBench / ArmoryVault Handload QR JSON string', () => {
    const qrPayload = JSON.stringify({
      app: 'ArmoryVault',
      source: 'LoadBench',
      type: 'handload',
      cal: '6.5 Creedmoor',
      bullet: '140gr ELD Match',
      grain: 140,
      powder: 'Hodgdon Varget 41.5gr',
      powder_name: 'Varget',
      powder_charge: 41.5,
      primer: 'CCI 450 Small Rifle Magnum',
      fps: 2710,
      psi: 57200,
      lot: 'LB-829103',
      count: 50,
      coal: 2.8,
      cbto: 2.195,
      jump: 0.02,
      notes: 'Match Target Load',
    });

    const result = parseBarcodeData(qrPayload, []);
    expect(result.category).toBe('ammo');
    expect(result.parsedAmmo?.type).toBe('handload');
    expect(result.parsedAmmo?.caliber).toBe('6.5 Creedmoor');
    expect(result.parsedAmmo?.grain).toBe(140);
    expect(result.parsedAmmo?.projectile).toBe('140gr ELD Match');
    expect(result.parsedAmmo?.powder).toBe('Varget');
    expect(result.parsedAmmo?.powderCharge).toBe(41.5);
    expect(result.parsedAmmo?.primer).toBe('CCI 450 Small Rifle Magnum');
    expect(result.parsedAmmo?.count).toBe(50);
    expect(result.parsedAmmo?.oal).toBe(2.8);
    expect(result.parsedAmmo?.upc_code).toBe('LB-829103');
    expect(result.parsedAmmo?.notes).toContain('Lot #LB-829103');
    expect(result.parsedAmmo?.notes).toContain('2710 fps');
    expect(result.parsedAmmo?.notes).toContain('57200 psi');
    expect(result.parsedAmmo?.notes).toContain('CBTO: 2.195"');
  });

  it('should correctly ingest a LoadBench .load project object', () => {
    const loadProject = {
      app: 'LoadBench',
      version: '1.0.0',
      format: 'load_project',
      cartridge: { name: '.308 Winchester', coal_in: 2.81 },
      projectile: { name: '168gr Sierra MatchKing', weight_grains: 168 },
      propellant: { name: 'IMR 4064' },
      chargeGrains: 42.0,
      primer: { name: 'Federal 210M Gold Medal' },
      simulated: {
        muzzleVelocityFps: 2650,
        maxPressurePsi: 58000,
      },
      notes: 'Benchrest load',
    };

    const result = parseBarcodeData(loadProject, []);
    expect(result.category).toBe('ammo');
    expect(result.parsedAmmo?.type).toBe('handload');
    expect(result.parsedAmmo?.caliber).toBe('.308 Winchester');
    expect(result.parsedAmmo?.grain).toBe(168);
    expect(result.parsedAmmo?.projectile).toBe('168gr Sierra MatchKing');
    expect(result.parsedAmmo?.powder).toBe('IMR 4064');
    expect(result.parsedAmmo?.powderCharge).toBe(42.0);
    expect(result.parsedAmmo?.primer).toBe('Federal 210M Gold Medal');
    expect(result.parsedAmmo?.oal).toBe(2.81);
    expect(result.parsedAmmo?.notes).toContain('2650 fps');
    expect(result.parsedAmmo?.notes).toContain('58000 psi');
  });
});
