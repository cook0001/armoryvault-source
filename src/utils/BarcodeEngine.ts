import { Accessory, Ammo, ReloadingComponent } from '../types';
import { escapeRegExp } from './caliberHelpers';

export interface ParsedBarcodeResult {
  category: 'ammo' | 'component' | 'accessory' | 'unknown';
  item: any;
  bestTitle: string;
  foundCost?: number;

  parsedAmmo?: Partial<Ammo> & { boxPrice?: number };
  parsedComponent?: Partial<ReloadingComponent>;
  parsedAccessory?: Partial<Accessory>;
}

export const decodeHTMLEntities = (text: string | undefined): string => {
  if (!text) return '';
  const doc = new DOMParser().parseFromString(text, 'text/html');
  return doc.documentElement.textContent || text;
};

export const parseBarcodeData = (item: any, ammoList: Ammo[] = []): ParsedBarcodeResult => {
  if (!item) {
    return { category: 'unknown', item, bestTitle: '' };
  }

  // 0. Detect LoadBench / ArmoryVault Handload Payloads (Direct QR Scan, JSON payload or .load file)
  let rawJsonObj: any = null;
  if (typeof item === 'string') {
    const trimmed = item.trim();
    if (trimmed.startsWith('{') && (trimmed.includes('handload') || trimmed.includes('LoadBench') || trimmed.includes('ArmoryVault'))) {
      try {
        rawJsonObj = JSON.parse(trimmed);
      } catch {}
    }
  } else if (typeof item === 'object') {
    if (
      item.type === 'handload' ||
      item.source === 'LoadBench' ||
      item.app === 'ArmoryVault' ||
      item.format === 'load_project' ||
      item.format === 'loadbench_recipe'
    ) {
      rawJsonObj = item;
    } else if (typeof item.title === 'string' && item.title.trim().startsWith('{')) {
      try {
        rawJsonObj = JSON.parse(item.title.trim());
      } catch {}
    } else if (typeof item.upc === 'string' && item.upc.trim().startsWith('{')) {
      try {
        rawJsonObj = JSON.parse(item.upc.trim());
      } catch {}
    } else if (typeof item.upcOrId === 'string' && item.upcOrId.trim().startsWith('{')) {
      try {
        rawJsonObj = JSON.parse(item.upcOrId.trim());
      } catch {}
    }
  }

  if (
    rawJsonObj &&
    (rawJsonObj.type === 'handload' ||
      rawJsonObj.source === 'LoadBench' ||
      rawJsonObj.app === 'ArmoryVault' ||
      rawJsonObj.format === 'load_project' ||
      rawJsonObj.format === 'loadbench_recipe')
  ) {
    const cal = rawJsonObj.cal || rawJsonObj.caliber || rawJsonObj.cartridge?.name || rawJsonObj.cartridge || '';
    const bullet = rawJsonObj.bullet || rawJsonObj.projectile?.name || rawJsonObj.projectile || '';
    const grainNum = rawJsonObj.grain || rawJsonObj.projectile?.weight_grains || (bullet ? parseInt(bullet) || undefined : undefined);
    const powder = rawJsonObj.powder_name || rawJsonObj.propellant?.name || rawJsonObj.powder || '';
    const chargeNum =
      rawJsonObj.powder_charge ||
      rawJsonObj.chargeGrains ||
      rawJsonObj.charge_grains ||
      rawJsonObj.propellant?.charge_grains ||
      (rawJsonObj.powder ? parseFloat(rawJsonObj.powder.match(/([\d.]+)\s*gr/i)?.[1] || '') || undefined : undefined);
    const primer = rawJsonObj.primer?.name || rawJsonObj.primer || '';
    const lot =
      rawJsonObj.metadata?.lot_number ||
      rawJsonObj.lot ||
      rawJsonObj.lotNumber ||
      (rawJsonObj.upc && !rawJsonObj.upc.startsWith('{') ? rawJsonObj.upc : undefined);
    const count = rawJsonObj.metadata?.batch_size || rawJsonObj.count || rawJsonObj.quantity || 50;
    const coal = rawJsonObj.coal || rawJsonObj.oal || rawJsonObj.cartridge?.coal_in || undefined;
    const cbto = rawJsonObj.projectile?.cbto_in || rawJsonObj.cbto;
    const jump = rawJsonObj.projectile?.freebore_jump_in !== undefined ? rawJsonObj.projectile.freebore_jump_in : rawJsonObj.jump;
    const fps = rawJsonObj.simulated?.muzzle_velocity_fps || rawJsonObj.simulated?.muzzleVelocityFps || rawJsonObj.fps;
    const psi = rawJsonObj.simulated?.max_pressure_psi || rawJsonObj.simulated?.maxPressurePsi || rawJsonObj.psi;
    const obtNode = rawJsonObj.simulated?.obt_node ? `Node: ${rawJsonObj.simulated.obt_node}` : '';
    const author = rawJsonObj.metadata?.author ? `Author: ${rawJsonObj.metadata.author}` : '';
    const targetRifle = rawJsonObj.metadata?.target_firearm ? `Rifle: ${rawJsonObj.metadata.target_firearm}` : '';
    const chrono = rawJsonObj.chronograph?.measured_average_fps
      ? `Chrono: ${rawJsonObj.chronograph.measured_average_fps} fps (SD ${rawJsonObj.chronograph.standard_deviation_fps || 0})`
      : '';

    const noteParts = [
      lot ? `Lot #${lot}` : '',
      author,
      targetRifle,
      fps ? `${fps} fps` : '',
      psi ? `${psi} psi` : '',
      obtNode,
      chrono,
      cbto ? `CBTO: ${cbto}"` : '',
      jump !== undefined ? `Jump: ${jump}"` : '',
      rawJsonObj.metadata?.notes || rawJsonObj.notes || ''
    ].filter(Boolean);

    const titleParts = [rawJsonObj.metadata?.name || '', cal, bullet, powder ? `(${powder})` : ''].filter(Boolean);
    const bestTitle = rawJsonObj.metadata?.name || (titleParts.length > 0 ? titleParts.join(' ') : 'LoadBench Custom Handload');

    return {
      category: 'ammo',
      item,
      bestTitle,
      foundCost: (rawJsonObj.economics?.cost_per_round_usd || rawJsonObj.costPerRound)
        ? Number(rawJsonObj.economics?.cost_per_round_usd || rawJsonObj.costPerRound)
        : undefined,
      parsedAmmo: {
        type: 'handload',
        caliber: String(cal),
        grain: grainNum,
        projectile: String(bullet),
        powder: String(powder),
        powderCharge: chargeNum,
        primer: String(primer),
        oal: coal ? Number(coal) : undefined,
        count: Number(count) || 50,
        notes: noteParts.join(' • '),
        upc_code: lot ? String(lot) : (typeof item === 'string' ? '' : (item.upc && !item.upc.startsWith('{') ? String(item.upc) : '')),
        manufacturer: rawJsonObj.format === 'loadbench_recipe' ? 'LoadBench' : 'Handload',
      }
    };
  }

  let foundName = item.title || '';
  if (item.offers && item.offers.length > 0) {
    const titles = [item.title, ...item.offers.map((o: any) => decodeHTMLEntities(o.title))].filter(
      (t) => typeof t === 'string' && t.trim().length > 0
    );
    titles.sort((a, b) => b.length - a.length);
    const bestTitle = titles.find((t) => t.length < 120 && /[a-zA-Z]/.test(t));
    if (bestTitle) foundName = bestTitle;
  }

  const decodedTitle = decodeHTMLEntities(foundName);
  const rawBrand = decodeHTMLEntities(item.brand);
  const decodedDesc = decodeHTMLEntities(item.description);
  const offersText = (item.offers || []).map((o: any) => decodeHTMLEntities(o.title)).join(' ');
  let combinedText = (
    decodedTitle +
    ' ' +
    rawBrand +
    ' ' +
    decodedDesc +
    ' ' +
    offersText
  ).toUpperCase();

  // Fix common abbreviations
  combinedText = combinedText.replace(/\bHODG\b/g, 'HODGDON');

  let foundCost: number | undefined;

  // 1. Prefer median price from active offers (most accurate and current)
  if (item.offers && item.offers.length > 0) {
    const validPrices = item.offers
      .map((o: any) => parseFloat(o.price))
      .filter((p: number) => !isNaN(p) && p > 0);
    if (validPrices.length > 0) {
      validPrices.sort((a: number, b: number) => a - b);
      foundCost = parseFloat(validPrices[Math.floor(validPrices.length / 2)].toFixed(2));
    }
  }

  // 2. Fallback to historical records
  if (!foundCost && item.highest_recorded_price && item.lowest_recorded_price) {
    const high = parseFloat(item.highest_recorded_price);
    const low = parseFloat(item.lowest_recorded_price);
    if (high > 0 && low > 0) {
      // If the lowest price is suspiciously low compared to highest (e.g. $2 vs $40), ignore it as a glitch
      if (high / low > 4) foundCost = parseFloat(high.toFixed(2));
      else foundCost = parseFloat(((high + low) / 2).toFixed(2));
    }
  } else if (!foundCost && item.lowest_recorded_price && item.lowest_recorded_price > 0) {
    foundCost = parseFloat(item.lowest_recorded_price.toFixed(2));
  }

  // Detect Category using Heuristics
  let category: 'ammo' | 'component' | 'accessory' | 'unknown' = 'unknown';

  const ammoMatches =
    combinedText.match(/\b(?:AMMO|AMMUNITION|ROUNDS|RDS|ROUND|RD|CARTRIDGES)\b/g) || [];
  const componentMatches =
    combinedText.match(
      /\b(?:POWDER|SMOKELESS|PROPELLANT|HODGDON|IMR|ALLIANT|VIHTAVUORI|ACCURATE|RAMSHOT|SHOOTERS WORLD|VARGET|TITEGROUP|BULLSEYE|AUTOCOMP|W231|W296|1\s*LB|4\s*LB|8\s*LB|1LB|4LB|8LB|POUND|PRIMER|PRIMERS|SRP|LRP|SPP|LPP|SRM|LRM|SPM|LPM|WSR|WLR|WSP|WLP|BRASS|CASES|HULL|HULLS|PROJECTILE|PROJECTILES|BULLET|BULLETS)\b/g
    ) || [];
  const projectileMatches =
    combinedText.match(
      /\b(?:FMJ|FMJBT|HP|JHP|BTHP|HPBT|XTP|SST|V-MAX|VMAX|A-MAX|AMAX|LRN|TSX|TTSX|LRX|TAC-TX|ELD-X|ELD|ELD MATCH|SMK|TMK|TGK|MATCHKING|GAMEKING|BLITZKING|ACCUBOND|PARTITION|GOLD DOT|HST|HYDRA-SHOK|HYDRASHOK|CORE-LOKT|CORELOKT|GOLDEN SABER|SILVERTIP|DEFENDER|FUSION|SYNTECH|TERMINAL ASCENT|TROPHY BONDED|INTERLOCK|INTERBOND|BALLISTIC TIP|SCENAR|ORYX|ECOSTRIKE|TIPSTRIKE|BONDSTRIKE|XTREME PENETRATOR|XTREME DEFENDER|HONEYBADGER|V-CROWN|VCROWN|SCHP|MONOFLEX|FLEXLOCK|SUB-X|VARMINT GRENADE|E-TIP|ETIP|RDF|CUSTOM COMPETITION|PUNCH|PHP|CPHP)\b/g
    ) || [];
  const accessoryMatches =
    combinedText.match(
      /\b(?:OPTIC|SCOPE|RED DOT|HOLSTER|SUPPRESSOR|SILENCER|SLING|MAGAZINE|MAG|MOUNT|LIGHT|FLASHLIGHT|STOCK|BUTTSTOCK|CHASSIS|BRACE|PISTOL BRACE|SBA3|SBA4|SBA5|SOPMOD|CTR|PRS|B5 BRAVO|LUTH-AR|MCMILLAN|MANNERS|BOYDS|PACHMAYR|FLEXTECH|PRO HUNTER|ENCORE|CONTENDER|G2 CONTENDER|SSK-50|SHARPS BROS|HAUSOFARMS|CHOATE|ORYX|ACC ELITE|GUN BELT|BATTLE BELT|EDC BELT|DUTY BELT|DROP BELT|CARTRIDGE BELT|BANDOLIER|BUSCADERO|HUNTER COMPANY|THE HUNTER COMPANY|TRIPLE K|EL PASO SADDLERY|KIRKPATRICK|KORE|NEXBELT|BLUE ALPHA|AWS SMU|RONIN|SENSHI|FERRO BISON|TENICOR|SAFARILAND ELS|DAA LYNX|DOUBLE ALPHA|BIGFOOT|DALTECH|SUPERBIO)\b/g
    ) || [];

  let scoreAmmo = ammoMatches.length * 3;
  let scoreComponent = componentMatches.length * 3;
  const scoreAccessory = accessoryMatches.length * 3;

  if (projectileMatches.length > 0) {
    if (
      combinedText.match(/\b(?:BULLET|BULLETS|PROJECTILE|PROJECTILES|HEADS|UNLOADED)\b/) &&
      !combinedText.match(/\b(?:AMMO|AMMUNITION|ROUNDS|RDS)\b/)
    ) {
      scoreComponent += projectileMatches.length * 2;
    } else {
      scoreAmmo += projectileMatches.length * 2;
    }
  }

  if (
    combinedText.match(/\b(?:FMJ|JHP|PHP|SP|HP)\b/) &&
    combinedText.match(/\b(?:9MM|45 ACP|5\.56|223 REM|22 LR)\b/)
  ) {
    if (
      combinedText.match(/\b(?:BULLET|BULLETS|PROJECTILE|PROJECTILES)\b/) &&
      !combinedText.match(/\b(?:AMMO|ROUNDS|RDS)\b/)
    )
      scoreComponent += 1;
    else scoreAmmo += 1;
  }
  if (
    combinedText.includes('GRAIN') &&
    combinedText.includes('PACKED PER') &&
    !combinedText.includes('AMMO')
  )
    scoreComponent += 2;

  if (scoreAccessory > scoreAmmo && scoreAccessory > scoreComponent) category = 'accessory';
  else if (scoreComponent > scoreAmmo && scoreComponent > scoreAccessory) category = 'component';
  else if (scoreAmmo > scoreComponent && scoreAmmo > scoreAccessory) category = 'ammo';
  else if (scoreAmmo > 0 && scoreComponent === 0 && scoreAccessory === 0) category = 'ammo';
  else if (scoreComponent > 0 && scoreAmmo === 0 && scoreAccessory === 0) category = 'component';
  else if (scoreAccessory > 0 && scoreAmmo === 0 && scoreComponent === 0) category = 'accessory';
  // Default to Ammo if completely unsure but has valid price
  else if (category === 'unknown' && foundCost && foundCost > 5 && foundCost < 100)
    category = 'ammo';

  const result: ParsedBarcodeResult = {
    category,
    item,
    bestTitle: decodedTitle,
    foundCost,
  };

  // Decode Brand properly
  let decodedBrand = rawBrand;
  if (rawBrand && rawBrand.toLowerCase().trim() !== 'brand') {
    const lowerRaw = rawBrand.toLowerCase().trim();
    const ignoredDistributors = [
      'sports south',
      'sports south llc',
      'davidsons',
      'lipseys',
      'zanders',
      'rsr group',
      'chatillon',
    ];
    if (ignoredDistributors.includes(lowerRaw)) {
      decodedBrand = '';
    } else {
      const existingMatch = ammoList.find(
        (a) => (a.manufacturer || '').toLowerCase().trim() === lowerRaw
      );
      if (existingMatch && existingMatch.manufacturer) {
        decodedBrand = existingMatch.manufacturer;
      } else if (rawBrand === rawBrand.toUpperCase() && rawBrand.length > 4) {
        decodedBrand = rawBrand
          .split(' ')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ');
      }
    }
  } else {
    decodedBrand = '';
  }

  if (!decodedBrand) {
    const uniqueMakes = Array.from(
      new Set(ammoList.map((a) => a.manufacturer).filter(Boolean))
    ) as string[];
    let earliestIndex = -1;
    let earliestMake = '';
    const checkMakes = (makesList: string[]) => {
      for (const make of makesList) {
        const regex = new RegExp(`\\b${escapeRegExp(make)}\\b`, 'i');
        const match = combinedText.match(regex);
        if (match && match.index !== undefined) {
          if (earliestIndex === -1 || match.index < earliestIndex) {
            if (
              earliestIndex !== -1 &&
              match.index === earliestIndex &&
              make.length > earliestMake.length
            ) {
              earliestMake = make;
            } else if (earliestIndex === -1 || match.index < earliestIndex) {
              earliestIndex = match.index;
              earliestMake = make;
            }
          }
        }
      }
    };
    checkMakes(uniqueMakes);
    if (!earliestMake) {
      const commonMakes = [
        'CCI',
        'Winchester',
        'Federal',
        'Remington',
        'Hornady',
        'PMC',
        'Fiocchi',
        'Sellier & Bellot',
        'Magtech',
        'Blazer',
        'Aguila',
        'PPU',
        'Sig Sauer',
        'Hodgdon',
        'IMR',
        'Alliant',
        'Vihtavuori',
        'Accurate',
        'Ramshot',
        'Shooters World',
        'Norma',
      ];
      checkMakes(commonMakes);
    }
    if (earliestMake) decodedBrand = earliestMake;
  }

  // Common extractions
  let grain: number | undefined;
  const grainMatch = combinedText.match(/(\d+(?:\.\d+)?)\s*(?:GR\b|GRAIN)/);
  if (grainMatch) grain = parseFloat(grainMatch[1]);

  let count: number | undefined;
  const qtyMatch =
    combinedText.match(/(?:UNITS PER BOX|QTY|QUANTITY|COUNT)[\s:]*(\d{1,3}(?:,\d{3})+|\d+)/i) ||
    combinedText.match(
      /(\d{1,3}(?:,\d{3})+|\d+)\s*[-/]?\s*(?:ROUNDS|RDS|ROUND|RD|PACK|PK|PER BOX|CT|COUNT|PCS|PIECES|BUCKET|TUB|BX)\b/i
    ) ||
    combinedText.match(/PACKED PER (\d{1,3}(?:,\d{3})+|\d+)/i);
  let textForCaliber = combinedText;
  if (qtyMatch) {
    count = parseInt(qtyMatch[1].replace(/,/g, ''), 10);
    textForCaliber = combinedText.replace(qtyMatch[0], '');
  }

  if (category === 'accessory') {
    let type: Accessory['type'] = 'Other';
    let stockType: string | undefined;
    let actionInlet: string | undefined;
    let bufferTubeType: string | undefined;
    let tcForendSpacing: string | undefined;
    let magCompatibility: string | undefined;
    let beltType: string | undefined;
    let dropLoopType: string | undefined;
    let cartridgeLoopCaliber: string | undefined;
    let cartridgeLoopCount: number | undefined;
    let beltWidth: string | undefined;
    let buckleType: string | undefined;
    let stiffenerCore: string | undefined;
    let attachmentSystem: string | undefined;

    if (
      combinedText.match(
        /\b(?:GUN BELT|BATTLE BELT|EDC BELT|DUTY BELT|DROP BELT|CARTRIDGE BELT|BANDOLIER|BUSCADERO|HUNTER COMPANY|THE HUNTER COMPANY|TRIPLE K|EL PASO SADDLERY|KIRKPATRICK|KORE|NEXBELT|BLUE ALPHA|AWS SMU|RONIN SENSHI|FERRO BISON|TENICOR ZERO|DAA LYNX|DALTECH|BIGFOOT|SUPERBIO)\b/
      )
    ) {
      type = 'Belt';
      if (combinedText.match(/\b(?:BUSCADERO|DROP BELT|HUNTER 150|HUNTER 155|WYOMING)\b/)) {
        beltType = 'Western Buscadero Drop Belt (Single/Double)';
        dropLoopType = 'Single Drop (Right-Hand Strong Side)';
        beltWidth = '2.75" - 3.0" (Western Buscadero Drop Belt)';
        attachmentSystem = 'Integrated Western Drop Slot (Hunter 1060/1100/2200 Holsters)';
      } else if (
        combinedText.match(/\b(?:CARTRIDGE BELT|AMMO BELT|HUNTER 158|DELUXE CARTRIDGE)\b/)
      ) {
        beltType = 'Straight Western Cartridge Belt';
        beltWidth = '2.0" (Heavy Duty / Western Cartridge)';
      } else if (combinedText.match(/\b(?:BANDOLIER)\b/)) {
        beltType = 'Cross-Chest Bandolier / Cartridge Belt';
      } else if (combinedText.match(/\b(?:MONEY BELT|PRAIRIE BELT)\b/)) {
        beltType = 'Folded Leather Money Belt / Prairie Belt';
      } else if (
        combinedText.match(
          /\b(?:BATTLE BELT|SMU|SENSHI|BISON|MOLLE BELT|TWO-PIECE|BATTLE BELT LITE)\b/
        )
      ) {
        beltType = 'Two-Piece MOLLE Battle Belt';
        beltWidth = '1.75" (Tactical / Battle Belt / Riggers)';
        attachmentSystem = 'Laser-Cut Micro-MOLLE / PALS Slots';
      } else if (
        combinedText.match(/\b(?:RATCHET|KORE|NEXBELT|TRACK BELT|X-SERIES|TITAN|SUPREME)\b/)
      ) {
        beltType = 'EDC Concealed Carry Ratchet Belt';
        beltWidth = '1.5" (Standard EDC / Concealed Carry)';
        buckleType = 'Micro-Adjustable Ratchet / Track (1/4" Steps)';
      } else if (combinedText.match(/\b(?:TENICOR|ZERO BELT|LOW PROFILE)\b/)) {
        beltType = 'Low-Profile EDC Nylon Belt';
        beltWidth = '1.5" (Standard EDC / Concealed Carry)';
      } else if (combinedText.match(/\b(?:STEEL CORE|DALTECH|BIGFOOT|BULLHIDE|BRIDLE)\b/)) {
        beltType = 'Reinforced Leather Gun Belt (Steel/Poly Core)';
        beltWidth = '1.5" (Standard EDC / Concealed Carry)';
        stiffenerCore = 'Dual-Layer Spring Steel Core';
      } else if (combinedText.match(/\b(?:LYNX|ELS|COMPETITION|CR SPEED|DOUBLE ALPHA)\b/)) {
        beltType = 'Competition Rig (USPSA / IPSC / 3-Gun)';
      } else if (combinedText.match(/\b(?:DUTY BELT|MODEL 7920|ACCUMOLD)\b/)) {
        beltType = 'Duty / Law Enforcement Belt';
        beltWidth = '2.25" (Standard Duty / Police / LE)';
      }

      // Drop orientation heuristics
      if (combinedText.match(/\b(?:DOUBLE DROP)\b/))
        dropLoopType = 'Double Drop (Dual Strong / Cross Draw)';
      else if (combinedText.match(/\b(?:LEFT DROP|LEFT HAND|LH)\b/))
        dropLoopType = 'Single Drop (Left-Hand Strong Side)';

      // Cartridge loops heuristics
      if (combinedText.match(/\b(?:45 COLT|\.45 COLT|44 MAG|\.44 MAG|44-40|45-70)\b/)) {
        cartridgeLoopCaliber = '.44 Special / .44 Magnum / .45 Colt';
      } else if (combinedText.match(/\b(?:38 SPEC|38 SPECIAL|\.38|357 MAG|\.357)\b/)) {
        cartridgeLoopCaliber = '.38 Special / .357 Magnum';
      } else if (combinedText.match(/\b(?:22 LR|\.22 LR|22 WMR)\b/)) {
        cartridgeLoopCaliber = '.22 LR / .22 WMR';
      } else if (combinedText.match(/\b(?:12 GA|12 GAUGE|20 GA|20 GAUGE|SHOTSHELL)\b/)) {
        cartridgeLoopCaliber = '12 Gauge / 20 Gauge Shotshells';
      }

      const loopMatch = combinedText.match(/(\d+)\s*(?:LOOPS|LOOP|RDS|ROUNDS|ROUND)/);
      if (loopMatch && parseInt(loopMatch[1]) > 0) {
        cartridgeLoopCount = parseInt(loopMatch[1]);
      } else if (combinedText.match(/\b(?:HUNTER 150|HUNTER 155|HUNTER 158|WYOMING)\b/)) {
        cartridgeLoopCount = 25;
      }

      // Buckle heuristics
      if (combinedText.match(/\b(?:COBRA|AUSTRIALPIN)\b/))
        buckleType = 'AustriAlpin Cobra Quick-Release';
      else if (combinedText.match(/\b(?:RATCHET|TRACK)\b/))
        buckleType = 'Micro-Adjustable Ratchet / Track (1/4" Steps)';
      else if (combinedText.match(/\b(?:ROLLER BUCKLE)\b/))
        buckleType = 'Classic Dual-Prong Roller Buckle';
      else if (combinedText.match(/\b(?:NICKEL BUCKLE|BRASS BUCKLE|CLIPPED)\b/))
        buckleType = 'Classic Western Clipped-Corner / Nickel Buckle';

      // Stiffener heuristics
      if (combinedText.match(/\b(?:TEGRIS|CURV)\b/))
        stiffenerCore = 'Tegris / Curv Thermoplastic Composite';
      else if (combinedText.match(/\b(?:POWER-CORE|POWER CORE|HDPE)\b/))
        stiffenerCore = 'Reinforced Polymer (Power-Core / HDPE)';
      else if (combinedText.match(/\b(?:SPRING STEEL|STEEL CORE)\b/))
        stiffenerCore = 'Dual-Layer Spring Steel Core';
      else if (combinedText.match(/\b(?:SCUBA|TYPE 13)\b/))
        stiffenerCore = 'Double-Layer Scuba Webbing';

      // Width heuristics
      if (combinedText.match(/\b(?:1\.5"|1\.5 INCH|1\.5 IN)\b/))
        beltWidth = '1.5" (Standard EDC / Concealed Carry)';
      else if (combinedText.match(/\b(?:1\.75"|1\.75 INCH|1\.75 IN)\b/))
        beltWidth = '1.75" (Tactical / Battle Belt / Riggers)';
      else if (combinedText.match(/\b(?:2\.0"|2"|2 INCH|2 IN)\b/))
        beltWidth = '2.0" (Heavy Duty / Western Cartridge)';
      else if (combinedText.match(/\b(?:2\.25"|2\.25 INCH)\b/))
        beltWidth = '2.25" (Standard Duty / Police / LE)';
      else if (combinedText.match(/\b(?:3\.0"|3"|3 INCH|2\.75")\b/))
        beltWidth = '2.75" - 3.0" (Western Buscadero Drop Belt)';
    } else if (
      combinedText.match(
        /\b(?:CHASSIS|CHASSIS SYSTEM|ORYX|ACC ELITE|XRS CHASSIS|BRAVO CHASSIS|PRO 700|BA COMP)\b/
      )
    ) {
      type = 'Chassis';
      stockType = 'Precision Rifle Chassis';
    } else if (
      combinedText.match(
        /\b(?:STOCK|BUTTSTOCK|BRACE|PISTOL BRACE|SBA3|SBA4|SBA5|SOPMOD|B5 BRAVO|CTR|PRS|LUTH-AR|STR|MOE SL|MAGPUL HUNTER|FLEXTECH|PACHMAYR|CHOATE|BOYDS)\b/
      )
    ) {
      type = 'Stock';
      if (combinedText.match(/\b(?:SBA3|SBA4|SBA5|PISTOL BRACE|BRACE|TAILHOOK)\b/))
        stockType = 'Pistol Stabilizing Brace';
      else if (combinedText.match(/\b(?:PRS|SRS|DMR|MBA-1)\b/))
        stockType = 'Precision PRS / DMR Stock';
      else if (combinedText.match(/\b(?:CTR|BRAVO|SOPMOD|MOE SL|CARBINE STOCK)\b/))
        stockType = 'Adjustable Carbine Stock';
      else if (combinedText.match(/\b(?:FLEXTECH|PRO HUNTER)\b/)) stockType = 'T/C Rifle Buttstock';
      else if (combinedText.match(/\b(?:PACHMAYR|DECELERATOR|GRIPPER)\b/))
        stockType = 'T/C Pistol Grip / Adapter';
    } else if (combinedText.match(/\b(?:OPTIC|SCOPE|RED DOT)\b/)) type = 'Optic';
    else if (combinedText.match(/\b(?:SUPPRESSOR|SILENCER)\b/)) type = 'Suppressor';
    else if (combinedText.match(/\b(?:LIGHT|FLASHLIGHT)\b/)) type = 'Light';
    else if (combinedText.match(/\b(?:HOLSTER)\b/)) type = 'Holster';
    else if (combinedText.match(/\b(?:MOUNT)\b/)) type = 'Mount';
    else if (combinedText.match(/\b(?:SLING)\b/)) type = 'Sling';
    else if (combinedText.match(/\b(?:MAGAZINE|MAG)\b/)) type = 'Magazine';

    // Heuristics for Inlet & T/C compatibility
    if (combinedText.match(/\b(?:ENCORE|PRO HUNTER|ENDEAVOR)\b/)) {
      actionInlet = 'Thompson/Center Encore / Pro Hunter / Endeavor';
      bufferTubeType = 'T/C Encore Frame Bolt Interface';
    } else if (combinedText.match(/\b(?:G2 CONTENDER|SSK-50|SSK50)\b/)) {
      actionInlet = 'Thompson/Center G2 Contender / SSK-50';
      bufferTubeType = 'T/C G2 / SSK-50 Frame Interface';
    } else if (combinedText.match(/\b(?:CONTENDER)\b/)) {
      actionInlet = 'Thompson/Center Contender (G1 / Armor Alloy)';
      bufferTubeType = 'T/C Contender (G1) Frame Interface';
    } else if (
      combinedText.match(
        /\b(?:REM 700 SA|REMINGTON 700 SA|REM 700 SHORT|REMINGTON 700 SHORT ACTION)\b/
      )
    ) {
      actionInlet = 'Remington 700 Short Action';
    } else if (
      combinedText.match(
        /\b(?:REM 700 LA|REMINGTON 700 LA|REM 700 LONG|REMINGTON 700 LONG ACTION)\b/
      )
    ) {
      actionInlet = 'Remington 700 Long Action';
    } else if (combinedText.match(/\b(?:TIKKA T3|TIKKA T3X)\b/)) {
      actionInlet = 'Tikka T3 / T3x';
    } else if (combinedText.match(/\b(?:SAVAGE 110|SAVAGE 10)\b/)) {
      actionInlet = 'Savage 10 / 110 (Short Action)';
    } else if (combinedText.match(/\b(?:AR-15|AR15|M4)\b/)) {
      actionInlet = 'AR-15 / M4 / M16';
      bufferTubeType = 'Mil-Spec Buffer Tube (1.14" OD)';
    } else if (combinedText.match(/\b(?:RUGER 10\/22|10\/22|10-22)\b/)) {
      actionInlet = 'Ruger 10/22';
    }

    if (combinedText.match(/\b(?:AICS|AICS MAG|AICS PATTERN)\b/)) {
      magCompatibility = 'AICS / AW Detachable Box';
    }

    result.parsedAccessory = {
      manufacturer: decodedBrand,
      model: decodedTitle,
      type,
      stockType,
      actionInlet,
      bufferTubeType,
      tcForendSpacing,
      magCompatibility,
      beltType,
      dropLoopType,
      cartridgeLoopCaliber,
      cartridgeLoopCount,
      beltWidth,
      buckleType,
      stiffenerCore,
      attachmentSystem,
      value: foundCost,
    };
  } else if (category === 'component') {
    let type: ReloadingComponent['type'] | undefined;
    let caliber: string | undefined;
    let weightUnit: 'lbs' | 'oz' | undefined;
    let primerType: string | undefined;
    let isMagnumPrimer: boolean | undefined;
    let bulletType: string | undefined;

    if (
      combinedText.match(
        /\b(?:POWDER|SMOKELESS|PROPELLANT|HODGDON|IMR|ALLIANT|VIHTAVUORI|ACCURATE|RAMSHOT|SHOOTERS WORLD|NORMA|VARGET|TITEGROUP|BULLSEYE|RELOADER|CFE|AUTOCOMP|W231|W296|1\s*LB|4\s*LB|8\s*LB|1LB|4LB|8LB|POUND)\b/
      )
    )
      type = 'Powder';
    else if (
      combinedText.match(/\b(?:PRIMER|PRIMERS|SRP|LRP|SPP|LPP|SRM|LRM|SPM|LPM|WSR|WLR|WSP|WLP)\b/)
    )
      type = 'Primer';
    else if (combinedText.match(/\b(?:BRASS|CASE|CASES|HULL|HULLS)\b/)) type = 'Brass';
    else if (
      combinedText.match(
        /\b(?:BULLET|BULLETS|PROJECTILE|PROJECTILES|HEADS|FMJ|FMJBT|HP|JHP|BTHP|HPBT|XTP|SST|TSX|TTSX|LRX|TAC-TX|ELD-X|ELD|ELD MATCH|SMK|TMK|TGK|MATCHKING|GAMEKING|BLITZKING|ACCUBOND|PARTITION|GOLD DOT|HST|HYDRA-SHOK|CORE-LOKT|GOLDEN SABER|SILVERTIP|FUSION|SYNTECH|SCENAR|ORYX|XTREME PENETRATOR|XTREME DEFENDER|V-CROWN|SCHP|MONOFLEX|FLEXLOCK|SUB-X|VARMINT GRENADE|E-TIP|RDF|CUSTOM COMPETITION)\b/
      )
    )
      type = 'Bullet';

    if (type === 'Powder' || combinedText.match(/\b(?:8\s*LB|1\s*LB|POUND)\b/)) {
      if (combinedText.match(/\b(?:8\s*LB|8LB)\b/)) weightUnit = 'lbs';
      else if (combinedText.match(/\b(?:1\s*LB|1LB|POUND)\b/)) weightUnit = 'lbs';
      else if (combinedText.match(/\b(?:OZ|OUNCE)\b/)) weightUnit = 'oz';
      else if (type === 'Powder') weightUnit = 'lbs'; // Default to lbs for powder

      if (weightUnit === 'lbs' || weightUnit === 'oz') type = type || 'Powder';
    }

    if (type === 'Primer') {
      if (combinedText.match(/\b(?:MAGNUM|MAG|SRM|LRM|SPM|LPM)\b/)) isMagnumPrimer = true;
      if (combinedText.match(/\b(?:SMALL RIFLE|SRP|WSR)\b/)) primerType = 'Small Rifle';
      else if (combinedText.match(/\b(?:LARGE RIFLE|LRP|WLR)\b/)) primerType = 'Large Rifle';
      else if (combinedText.match(/\b(?:SMALL PISTOL|SPP|WSP)\b/)) primerType = 'Small Pistol';
      else if (combinedText.match(/\b(?:LARGE PISTOL|LPP|WLP)\b/)) primerType = 'Large Pistol';
      else if (combinedText.match(/\b(?:209|SHOTGUN)\b/)) primerType = '209 Shotgun';
    }

    if (type === 'Bullet' || type === 'Brass') {
      if (combinedText.match(/30\s*CAL|\.308/)) caliber = '.308 / 30 Cal';
      else if (combinedText.match(/6MM|\.243/)) caliber = '.243 / 6mm';
      else if (combinedText.match(/6\.5MM|\.264|6\.5\s*CREEDMOOR/)) caliber = '.264 / 6.5mm';
      else if (combinedText.match(/7MM|\.284/)) caliber = '.284 / 7mm';
      else if (combinedText.match(/\.270/)) caliber = '.270 Caliber';
      else if (combinedText.match(/\.224|22\s*CAL|\.223|5\.56/)) caliber = '.224 / 22 Cal';
      else if (combinedText.match(/9MM|\.355/)) caliber = '9mm / .355';
      else if (combinedText.match(/\.357|\.38\s*CAL/)) caliber = '.357 / .38 Cal';
      else if (combinedText.match(/\.458|\.45-70/)) caliber = '.458 / 45-70';
      else if (combinedText.match(/\.452|\.45\s*COLT|\.45\s*LONG\s*COLT/))
        caliber = '.452 / 45 Colt';
      else if (combinedText.match(/\.451|\.45\s*ACP|\.45\s*AUTO/)) caliber = '.451 / 45 Auto';
      else if (combinedText.match(/\.45\s*CAL/)) caliber = '.45 Caliber';
      else if (combinedText.match(/\.44\s*MAG|\.44\s*SPL|\.44\s*CAL|\.430/))
        caliber = '.430 / 44 Cal';
      else if (combinedText.match(/10MM|\.400/)) caliber = '10mm / .400';
    } else {
      const calibers = [
        { match: '9MM', val: '9mm Luger' },
        { match: '.223', val: '.223 Rem' },
        { match: '5.56', val: '5.56 NATO' },
        { match: '.308', val: '.308 Win' },
        { match: '7.62', val: '7.62x51' },
        { match: '300 BLK', val: '.300 Blackout' },
        { match: '.45 ACP', val: '.45 ACP' },
        { match: '10MM', val: '10mm Auto' },
        { match: '.380', val: '.380 ACP' },
        { match: '6.5 CREEDMOOR', val: '6.5 Creedmoor' },
        { match: '12 GA', val: '12 Gauge' },
        { match: '.243', val: '.243 Win' },
      ];
      for (const c of calibers) {
        if (combinedText.includes(c.match)) {
          caliber = c.val;
          break;
        }
      }
    }

    const bTypes = [
      'ELD Match',
      'ELD-X',
      'MatchKing',
      'Tipped MatchKing',
      'GameKing',
      'GameChanger',
      'BlitzKing',
      'Pro-Hunter',
      'AccuBond Long Range',
      'AccuBond',
      'Ballistic Silvertip',
      'Ballistic Tip',
      'Custom Competition',
      'E-Tip',
      'Varmageddon',
      'Gold Dot G2',
      'Gold Dot',
      'Grand Slam',
      'DeepCurl',
      'Hot-Cor',
      'TNT',
      'TTSX',
      'TSX',
      'LRX',
      'TAC-TX',
      'TAC-X',
      'TAC-XP',
      'Varmint Grenade',
      'Critical Defense',
      'Critical Duty',
      'FlexLock',
      'FTX',
      'V-Max',
      'A-Max',
      'XTP Mag',
      'XTP',
      'SST',
      'MonoFlex',
      'Sub-X',
      'InterLock',
      'InterBond',
      'Hydra-Shok Deep',
      'Hydra-Shok',
      'HST',
      'Punch',
      'Syntech',
      'Terminal Ascent',
      'Trophy Bonded',
      'Trophy Copper',
      'Edge TLR',
      'Guard Dog',
      'Power-Shok',
      'HammerDown',
      'Fusion',
      'Core-Lokt Tipped',
      'Core-Lokt',
      'Golden Saber',
      'AccuTip',
      'Premier Match',
      'Ranger T-Series',
      'Ranger T',
      'Defender',
      'Power-Point',
      'Deer Season XP',
      'Extreme Point',
      'Copper Impact',
      'Silvertip',
      'Hybrid Target',
      'Hybrid OTM',
      'Elite Hunter',
      'Classic Hunter',
      'VLD',
      'Scenar-L',
      'Scenar',
      'Naturalis',
      'Mega',
      'Oryx',
      'Tipstrike',
      'Ecostrike',
      'Bondstrike',
      'Vulkan',
      'Xtreme Penetrator',
      'Xtreme Defender',
      'Controlled Chaos',
      'Maximum Expansion',
      'HoneyBadger',
      'TUI',
      'V-Crown',
      'SCHP',
      'Scirocco II',
      'Scirocco',
      'A-Frame',
      'FMJBT',
      'BTHP',
      'HPBT',
      'OTM',
      'FMJ',
      'JHP',
      'PHP',
      'CPHP',
      'CPRN',
      'TMJ',
      'JSP',
      'SJHP',
      'SJSP',
      'SP',
      'HP',
      'LRN',
      'LSWC',
      'SWC',
      'WC',
      'LFN',
      'RNFP',
      'FP',
      'FN',
      'Frangible',
      'Subsonic',
      'Tracer',
      'Green Tip',
      'Black Tip',
    ];
    for (const bt of bTypes) {
      const displayBt = bt === 'HPBT' ? 'BTHP' : bt;
      const regex = new RegExp(`\\b${escapeRegExp(bt)}\\b`, 'i');
      if (regex.test(combinedText) || (bt === 'SP' && combinedText.includes('SPIRE POINT'))) {
        bulletType = displayBt;
        break;
      }
    }

    // Guess default quantities for components if not explicitly found
    let finalCount = count;
    if (!finalCount) {
      if (type === 'Powder') finalCount = 1;
      else if (type === 'Primer') {
        if (combinedText.match(/\b100\b/)) finalCount = 100;
        else if (combinedText.match(/\b5000\b/)) finalCount = 5000;
        else finalCount = 1000; // Default to standard brick
      } else if (type === 'Bullet' || type === 'Brass') {
        if (combinedText.match(/\b(?:100|250|500|1000)\b/)) {
          const match = combinedText.match(/\b(100|250|500|1000)\b/);
          if (match) finalCount = parseInt(match[1]);
        }
      }
    }

    let cleanName = decodedTitle
      .replace(/\b\d{6,}\b/g, '') // Remove long UPCs/SKUs
      .replace(/\b(?:\d+-)+\d+\b/g, '') // Remove part numbers with dashes
      .replace(/\b(?:Reloading|Component|Components|Rfl Powder|Powder)\b/gi, '') // Remove redundant keywords
      .replace(
        /\b(?:Sports South|Sports South Llc|Davidsons|Lipseys|Zanders|RSR Group|Llc|Inc)\b/gi,
        ''
      ) // Remove distributors from title
      .replace(/\bHodg\b/gi, 'Hodgdon')
      .replace(/\s{2,}/g, ' ')
      .trim();

    // Capitalize manufacturer if present in name (e.g. Cci -> CCI)
    if (decodedBrand) {
      const brandRegex = new RegExp(`\\b${escapeRegExp(decodedBrand)}\\b`, 'i');
      cleanName = cleanName.replace(brandRegex, decodedBrand);
    }

    result.parsedComponent = {
      type: type || 'Powder',
      manufacturer: decodedBrand,
      name: cleanName,
      caliber,
      grain,
      weightUnit,
      primerType,
      isMagnumPrimer,
      bulletType,
      quantity: finalCount,
      cost: foundCost,
    };
  } else if (category === 'ammo') {
    let caliber: string | undefined;
    let projectile: string | undefined;

    const uniqueCalibers = Array.from(
      new Set(ammoList.map((a) => a.caliber).filter(Boolean))
    ) as string[];
    const defaultCalibers = [
      '.22 LR',
      '.22 Long Rifle',
      '.22 WMR',
      '.17 HMR',
      '9mm Luger',
      '9mm',
      '5.56 NATO',
      '.223 Rem',
      '.308 Win',
      '7.62x39',
      '7.62x51',
      '.45 ACP',
      '.40 S&W',
      '.380 ACP',
      '10mm Auto',
      '.38 Special',
      '.357 Magnum',
      '.44 Magnum',
      '.45 Colt',
      '6.5 Creedmoor',
      '.30-06 Springfield',
      '.300 Blackout',
      '.30-30 Win',
      '.270 Win',
      '7mm Rem Mag',
      '.300 Win Mag',
      '12 Gauge',
      '20 Gauge',
      '16 Gauge',
      '28 Gauge',
      '.410 Bore',
    ];
    const allCalibers = Array.from(new Set([...uniqueCalibers, ...defaultCalibers]));
    allCalibers.sort((a, b) => b.length - a.length);
    for (const cal of allCalibers) {
      const rawCal = cal.startsWith('.') ? cal.slice(1) : cal;
      const flexibleCal = '(?:\\.)?' + rawCal.split('').map(escapeRegExp).join('\\s*');
      const regex = new RegExp(`(?:^|\\W|_)${flexibleCal}(?:\\W|_|$)`, 'i');
      if (regex.test(textForCaliber)) {
        caliber = cal === '.22 Long Rifle' ? '.22 LR' : cal;
        break;
      }
    }

    const uniqueProjectiles = Array.from(
      new Set(ammoList.map((a) => a.projectile).filter(Boolean))
    ) as string[];
    uniqueProjectiles.sort((a, b) => b.length - a.length);
    for (const proj of uniqueProjectiles) {
      const regex = new RegExp(`\\b${escapeRegExp(proj)}\\b`, 'i');
      if (regex.test(combinedText)) {
        projectile = proj;
        break;
      }
    }
    if (!projectile) {
      const commonProjectiles = [
        'ELD Match',
        'ELD-X',
        'MatchKing',
        'Tipped MatchKing',
        'GameKing',
        'GameChanger',
        'BlitzKing',
        'Pro-Hunter',
        'AccuBond Long Range',
        'AccuBond',
        'Ballistic Silvertip',
        'Ballistic Tip',
        'Custom Competition',
        'E-Tip',
        'Varmageddon',
        'Gold Dot G2',
        'Gold Dot',
        'Grand Slam',
        'DeepCurl',
        'Hot-Cor',
        'TNT',
        'TTSX',
        'TSX',
        'LRX',
        'TAC-TX',
        'TAC-X',
        'TAC-XP',
        'Varmint Grenade',
        'Critical Defense',
        'Critical Duty',
        'FlexLock',
        'FTX',
        'V-Max',
        'A-Max',
        'XTP Mag',
        'XTP',
        'SST',
        'MonoFlex',
        'Sub-X',
        'InterLock',
        'InterBond',
        'Hydra-Shok Deep',
        'Hydra-Shok',
        'HST',
        'Punch',
        'Syntech',
        'Terminal Ascent',
        'Trophy Bonded',
        'Trophy Copper',
        'Edge TLR',
        'Guard Dog',
        'Power-Shok',
        'HammerDown',
        'Fusion',
        'Core-Lokt Tipped',
        'Core-Lokt',
        'Golden Saber',
        'AccuTip',
        'Premier Match',
        'Ranger T-Series',
        'Ranger T',
        'Defender',
        'Power-Point',
        'Deer Season XP',
        'Extreme Point',
        'Copper Impact',
        'Silvertip',
        'Hybrid Target',
        'Hybrid OTM',
        'Elite Hunter',
        'Classic Hunter',
        'VLD',
        'Scenar-L',
        'Scenar',
        'Naturalis',
        'Mega',
        'Oryx',
        'Tipstrike',
        'Ecostrike',
        'Bondstrike',
        'Vulkan',
        'Xtreme Penetrator',
        'Xtreme Defender',
        'Controlled Chaos',
        'Maximum Expansion',
        'HoneyBadger',
        'TUI',
        'V-Crown',
        'SCHP',
        'Scirocco II',
        'Scirocco',
        'A-Frame',
        'FMJBT',
        'BTHP',
        'HPBT',
        'OTM',
        'FMJ',
        'JHP',
        'PHP',
        'CPHP',
        'CPRN',
        'TMJ',
        'JSP',
        'SJHP',
        'SJSP',
        'SP',
        'HP',
        'LRN',
        'LSWC',
        'SWC',
        'WC',
        'LFN',
        'RNFP',
        'FP',
        'FN',
        'Buckshot',
        'Rifled Slug',
        'Sabot Slug',
        'Slug',
        'Frangible',
        'Subsonic',
        'Tracer',
        'Green Tip',
        'Black Tip',
      ];
      commonProjectiles.sort((a, b) => b.length - a.length);
      for (const proj of commonProjectiles) {
        const regex = new RegExp(`\\b${escapeRegExp(proj)}\\b`, 'i');
        if (regex.test(combinedText)) {
          const expandedMatch = uniqueProjectiles.find((p) => {
            const upperP = p.toUpperCase();
            const upperProj = proj.toUpperCase();
            return (
              upperP === upperProj ||
              upperP.startsWith(upperProj + ' ') ||
              upperP.startsWith(upperProj + '(') ||
              upperP.startsWith(upperProj + '-')
            );
          });
          projectile = expandedMatch || proj;
          break;
        }
      }
    }

    if (!count) {
      const titleQtyMatch =
        decodedTitle.match(
          /(?:^|\s|\()(\d{1,3}(?:,\d{3})+|\d+)\s*[-/]?\s*(?:ROUNDS|RDS|ROUND|RD|PACK|PK|CT|COUNT|PCS|PIECES|BUCKET|TUB|BX)\b/i
        ) ||
        decodedTitle.match(
          /\b(20|25|50|100|200|250|300|325|333|500|525|555|1000|1200|1400|1500|2000|5000|1,000|1,200|1,400|1,500|2,000|5,000)\b/
        );
      if (titleQtyMatch) {
        count = parseInt(titleQtyMatch[1].replace(/,/g, ''), 10);
      }
    }

    let costPerRound: number | undefined;
    if (foundCost && count) {
      costPerRound = parseFloat((foundCost / count).toFixed(3));
    }

    result.parsedAmmo = {
      manufacturer: decodedBrand,
      grain,
      caliber,
      projectile,
      isPlusP: !!combinedText.match(/\+P|Plus\s*P/i),
      count,
      upc_match: decodedTitle,
      boxPrice: foundCost,
      costPerRound,
    };
  }

  return result;
};

/**
 * Parses deep link URIs like armoryvault://storage/12 or storage:12 into a numeric storage location ID.
 */
export const parseStorageUri = (input?: string | null): number | null => {
  if (!input) return null;
  const trimmed = input.trim();
  const uriMatch = trimmed.match(/^armoryvault:\/\/(?:storage|location)\/(\d+)$/i);
  if (uriMatch) return parseInt(uriMatch[1], 10);
  const prefixMatch = trimmed.match(/^(?:storage|location)[:/#](\d+)$/i);
  if (prefixMatch) return parseInt(prefixMatch[1], 10);
  return null;
};
