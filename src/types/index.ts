export interface AccessoryMount {
  firearmId: number;
  quantity: number;
}

export interface Accessory {
  id?: number;
  type:
    | 'Optic'
    | 'Suppressor'
    | 'Light'
    | 'Holster'
    | 'Mount'
    | 'Sling'
    | 'Magazine'
    | 'Stock'
    | 'Chassis'
    | 'Belt'
    | 'Other';
  manufacturer: string;
  model: string;

  magnification?: string;
  opticSubtype?: string;
  objectiveLensMm?: number;
  tubeDiameter?: string;
  reticleFocalPlane?: 'FFP' | 'SFP' | 'N/A';
  turretClickValue?: string;
  mountingSystem?: string;
  zeroDistanceYards?: number;

  ratedCalibers?: string;
  threadPitch?: string;
  caliberRating?: string;
  decibelRating?: number;
  isFullAutoRated?: boolean;
  baffleMaterial?: string;

  lumens?: number;
  lightType?: string;
  candela?: number;
  beamDistanceMeters?: number;
  laserType?: 'None' | 'Red' | 'Green' | 'IR' | 'Dual (Visible+IR)';
  batteryType?: string;
  runTimeHours?: number;

  supportedModels?: string;
  caliber?: string;
  capacity?: number;
  bodyMaterial?: string;
  feedStyle?: string;
  followerColor?: string;

  holsterStyle?: string;
  handedness?: 'Right' | 'Left' | 'Ambidextrous';
  retentionLevel?: string;
  isOpticCut?: boolean;
  lightCompatible?: string;
  beltAttachment?: string;

  mountType?: string;
  mountHeight?: string;
  railInterface?: string;
  ringDiameter?: string;

  slingPoints?: '1-Point' | '2-Point' | '1-to-2 Point Convertible' | '3-Point';
  isPadded?: boolean;
  attachmentHardware?: string;

  // Stock, Chassis & T/C Furniture Fields
  stockType?: string;
  actionInlet?: string;
  bufferTubeType?: string;
  tcForendSpacing?: string;
  lengthOfPull?: string;
  combHeight?: string;
  magCompatibility?: string;
  forendRail?: string;
  isFolding?: boolean;

  // Gun Belt & Rig Fields
  beltType?: string;
  dropLoopType?: string;
  cartridgeLoopCaliber?: string;
  cartridgeLoopCount?: number;
  beltWidth?: string;
  buckleType?: string;
  stiffenerCore?: string;
  attachmentSystem?: string;
  waistSize?: string;
  innerBeltType?: string;
  colorPattern?: string;

  material?: string;
  weight?: string;

  quantity?: number;
  serialNumber?: string;
  round_count?: number;
  value?: number | null;
  purchaseDate?: string;

  mounts?: AccessoryMount[];

  notes?: string;
  photo?: string | null;
  photos?: string[];
  upc_code?: string;
  sku?: string;
  storageLocationId?: number;

  // NFA Info
  is_nfa?: boolean;
  nfa_type?: 'Suppressor' | 'SBR' | 'SBS' | 'Machine Gun' | 'AOW' | 'Destructive Device';
  registration_type?: 'Trust' | 'Individual' | 'Corporation';
  stamp_status?: 'Pending' | 'Approved';
  stamp_submitted_date?: string;
  stamp_approved_date?: string;
}

export interface OpticZeroRecord {
  id: string;
  opticName: string;
  accessoryId?: number;
  ringTorqueInLbs?: number;
  baseTorqueInLbs?: number;
  actionScrewTorqueInLbs?: number;
  zeroDistanceYards?: number;
  zeroAmmo?: string;
  lastZeroDate?: string;
  notes?: string;
}

export interface MaintenanceScheduleItem {
  id: string;
  task_name: string;
  interval_rounds: number;
  interval_days?: number;
  last_performed_rounds: number;
  last_performed_date?: string;
  notes?: string;
}

export interface MaintenanceLog {
  id: number;
  date: string;
  type: 'Cleaning' | 'Range' | 'Modification' | 'Repair' | 'Other';
  rounds_fired?: number;
  ammo_used?: string;
  malfunctions?: number;
  repaired_part?: string;
  part_manufacturer?: string;
  installed_part_details?: string;
  cost?: number;
  image_path?: string;
  notes: string;
}

export interface Ammo {
  id?: number;
  caliber: string;
  category?: 'Pistol' | 'Rifle' | 'Shotgun' | 'Other' | string;
  type: 'factory' | 'handload';
  count: number;
  measurement?: string;
  min_threshold?: number;
  low_stock_threshold?: number;
  costPerRound?: number;
  manufacturer?: string;
  bullet_manufacturer?: string;
  grain?: number;
  projectile?: string;
  shell_length?: string;
  shot_size?: string;
  oz_payload?: string;
  pellet_count?: number;
  powder?: string;
  powderCharge?: number;
  primer_type?: string;
  primer?: string;
  brass?: string;
  oal?: number;
  notes?: string;
  upc_code?: string;
  sku?: string;
  upc_match?: string;
  isPlusP?: boolean;
  target_stock_goal?: number;
  alert_percentage?: number;
  storageLocationId?: number;
  boxPrice?: number;
}

export interface Firearm {
  id?: number;
  make: string;
  model: string;
  serial_number: string;
  caliber: string;
  barrel_length?: string;
  action_type?: string;
  finish?: string;
  notes?: string;
  purchase_price: number | null;
  purchase_date: string;
  condition: string;
  image_path: string;
  photos?: string[];
  round_count?: number;

  // Maintenance Schedule & Rules
  maintenance_round_threshold?: number;
  maintenance_date_threshold_days?: number;
  maintenance_schedules?: MaintenanceScheduleItem[];
  optic_zero_records?: OpticZeroRecord[];

  // Bound Book Fields
  purchased_from?: string;
  firearm_type?: string;

  // Sale info
  is_sold: boolean;
  sold_date?: string;
  sold_to_name?: string;
  sold_price?: number | null;
  sale_notes?: string;
  logs?: MaintenanceLog[];
  documents?: { name: string; path: string; date_added?: string }[];

  // NFA Info
  is_nfa?: boolean;
  nfa_type?: 'Suppressor' | 'SBR' | 'SBS' | 'Machine Gun' | 'AOW' | 'Destructive Device';
  registration_type?: 'Trust' | 'Individual' | 'Corporation';
  stamp_status?: 'Pending' | 'Approved';
  stamp_submitted_date?: string;
  stamp_approved_date?: string;
  storageLocationId?: number;
}

export interface ReloadingComponent {
  id?: number;
  type: 'Powder' | 'Brass' | 'Bullet' | 'Primer';
  manufacturer: string;
  name?: string; // e.g. "Varget" (Powder), "XTP" (Bullet), or "#400" (Primer)

  // General Inventory
  quantity: number; // Count for Brass/Bullet/Primer, or Weight for Powder
  min_threshold?: number;
  cost?: number;
  purchaseDate?: string;
  notes?: string;
  upc_code?: string;

  // Powder Specific
  weightUnit?: 'lbs' | 'oz' | 'grains'; // User preference toggle for display/input
  usageTags?: ('Pistol' | 'Rifle' | 'Shotgun')[]; // Multi-select tags

  // Brass & Primer Specific
  primerType?:
    | 'Small Rifle'
    | 'Large Rifle'
    | 'Small Pistol'
    | 'Large Pistol'
    | '209 Shotgun'
    | string;
  isMagnumPrimer?: boolean; // Toggle for magnum

  // Brass Specific
  prepStage?:
    | 'Fired / Dirty'
    | 'Cleaned'
    | 'Deprimed'
    | 'Sized'
    | 'Trimmed'
    | 'Primed'
    | 'Ready to Load';

  // Brass & Bullet Specific
  caliber?: string; // e.g. ".308", "7mm"

  // Bullet Specific
  bulletType?: string; // e.g. "FMJ", "JHP"
  grain?: number; // Bullet weight
  storageLocationId?: number;
}

export interface CustomSkuItem {
  category?: 'ammo' | 'accessory' | 'component';

  // Common Fields
  manufacturer?: string;
  notes?: string;

  // Ammo Fields
  caliber?: string;
  grain?: number;
  projectile?: string;
  isPlusP?: boolean;
  count?: number;
  costPerRound?: number;
  boxPrice?: number;

  // Accessory / Part Fields
  accessoryType?:
    | 'Optic'
    | 'Suppressor'
    | 'Light'
    | 'Holster'
    | 'Mount'
    | 'Sling'
    | 'Magazine'
    | 'Stock'
    | 'Chassis'
    | 'Belt'
    | 'Other';
  model?: string;
  value?: number;
  serialNumber?: string;
  supportedModels?: string;
  stockType?: string;
  actionInlet?: string;
  bufferTubeType?: string;
  beltType?: string;
  beltWidth?: string;
  buckleType?: string;

  // Reloading Component Fields
  componentType?: 'Powder' | 'Brass' | 'Bullet' | 'Primer';
  name?: string;
  quantity?: number;
  cost?: number;
  weightUnit?: 'lbs' | 'oz' | 'grains';
  primerType?: string;
  isMagnumPrimer?: boolean;
  bulletType?: string;
}

export type CustomSkuDatabase = Record<string, CustomSkuItem>;

export interface CustomSchedulePreset {
  id: string;
  name: string;
  description?: string;
  category?: string;
  tasks: {
    task_name: string;
    interval_rounds: number;
    interval_days?: number;
    notes?: string;
  }[];
}

declare global {
  interface Window {
    api: {
      isVaultSetup: () => Promise<boolean>;
      isVaultLocked: () => Promise<boolean>;
      setupVault: (password: string) => Promise<string>;
      unlockVault: (password: string) => Promise<boolean>;
      unlockWithRecoveryCode: (code: string) => Promise<boolean>;
      changePassword: (
        currentPassword: string,
        newPassword: string,
        regenerateRecoveryKey?: boolean
      ) => Promise<{
        success: boolean;
        error?: string;
        message?: string;
        newRecoveryCode?: string | null;
      }>;
      regenerateRecoveryKey: (currentPassword: string) => Promise<{
        success: boolean;
        error?: string;
        message?: string;
        newRecoveryCode?: string | null;
      }>;
      getRecoveryCode: () => Promise<string | null>;
      lockVault: () => Promise<void>;

      getFirearms: () => Promise<Firearm[]>;
      addFirearm: (firearm: Firearm) => Promise<number>;
      importFirearmsBatch?: (
        firearmsList: Firearm[],
        updatesList?: { existingId: number; updatedItem: Partial<Firearm> }[]
      ) => Promise<{ insertedCount: number; updatedCount: number }>;
      updateFirearm: (id: number, firearm: Firearm) => Promise<number>;
      deleteFirearm: (id: number) => Promise<number>;

      getAmmo: () => Promise<Ammo[]>;
      addAmmo: (ammo: Ammo) => Promise<number>;
      importAmmoBatch?: (
        ammoList: Ammo[],
        updatesList?: { existingId: number; updatedItem: Partial<Ammo> }[]
      ) => Promise<{ insertedCount: number; updatedCount: number }>;
      updateAmmo: (id: number, ammo: Ammo) => Promise<number>;
      deleteAmmo: (id: number) => Promise<number>;

      getAccessories: () => Promise<Accessory[]>;
      addAccessory: (accessory: Accessory) => Promise<number>;
      importAccessoriesBatch?: (accessoriesList: Accessory[]) => Promise<{ insertedCount: number }>;
      updateAccessory: (id: number, accessory: Accessory) => Promise<number>;
      deleteAccessory: (id: number) => Promise<number>;

      getComponents: () => Promise<ReloadingComponent[]>;
      addComponent: (component: ReloadingComponent) => Promise<number>;
      importComponentsBatch?: (
        componentsList: ReloadingComponent[]
      ) => Promise<{ insertedCount: number }>;
      updateComponent: (id: number, component: ReloadingComponent) => Promise<number>;
      deleteComponent: (id: number) => Promise<number>;

      getSkus: () => Promise<CustomSkuDatabase>;
      saveSkus: (skus: CustomSkuDatabase) => Promise<boolean>;
      deleteSku: (skuId: string) => Promise<string>;
      exportSkusCatalog?: () => Promise<{
        format: string;
        version: number;
        exportedAt: string;
        itemCount: number;
        skus: CustomSkuDatabase;
      }>;
      importSkusCatalog?: (
        catalogData: any,
        mode?: 'merge' | 'overwrite'
      ) => Promise<{ success: boolean; count: number }>;

      getCustomSchedulePresets: () => Promise<CustomSchedulePreset[]>;
      saveCustomSchedulePresets: (presets: CustomSchedulePreset[]) => Promise<boolean>;
      manufactureHandloadBatch: (
        ammoId: number,
        quantity: number,
        deductions: {
          powderId?: number;
          powderAmount?: number;
          powderUnit?: 'lbs' | 'oz' | 'grains';
          primerId?: number;
          primerCount?: number;
          brassId?: number;
          brassCount?: number;
          bulletId?: number;
          bulletCount?: number;
        }
      ) => Promise<{ success: boolean; error?: string; remainingStock?: any }>;

      savePhoto: (sourcePath: string, filename: string) => Promise<string | null>;
      saveBase64Photo: (base64Data: string, filename: string) => Promise<string | null>;
      saveDocument: (sourcePath: string, filename: string) => Promise<string | null>;
      saveBase64Document: (base64Data: string, filename: string) => Promise<string | null>;

      getBackupFolder: () => Promise<string | null>;
      createZipBackup: () => Promise<
        { success: boolean; canceled?: boolean; filePath?: string; error?: string } | boolean
      >;
      restoreBackup: () => Promise<{
        success: boolean;
        canceled?: boolean;
        requiresRelogin?: boolean;
        error?: string;
        filePath?: string;
        type?: string;
        count?: number;
        message?: string;
      }>;
      importDatabase?: () => Promise<{
        success: boolean;
        canceled?: boolean;
        requiresRelogin?: boolean;
        error?: string;
        filePath?: string;
        type?: string;
        count?: number;
        message?: string;
      }>;
      selectBackupFolder: () => Promise<string | null>;
      getConfig: (key: string) => Promise<any>;
      setConfig: (key: string, value: any) => Promise<void>;
      saveConfig?: (key: string, value: any) => Promise<void>;
      archiveModuleData?: (
        moduleId: string,
        dataKeys: string[]
      ) => Promise<{
        success: boolean;
        totalRecords?: number;
        dataKeyCount?: Record<string, number>;
        error?: string;
      }>;
      restoreModuleData?: (
        moduleId: string
      ) => Promise<{ success: boolean; restoredRecords?: number; error?: string }>;
      getModuleArchives?: () => Promise<Record<string, any>>;
      downloadModule?: (moduleId: string) => Promise<{
        success: boolean;
        moduleId?: string;
        error?: string;
        fromLocalFallback?: boolean;
      }>;
      deleteModuleFiles?: (moduleId: string) => Promise<{ success: boolean; error?: string }>;
      getInstalledDiskModules?: () => Promise<string[]>;
      checkRemoteModules?: () => Promise<{
        success: boolean;
        modules?: Record<string, any>;
        version?: string;
        repository?: string;
        lastChecked?: string;
        fromCache?: boolean;
        error?: string;
      }>;
      getModuleBundle?: (moduleId: string) => Promise<{
        success: boolean;
        moduleId?: string;
        manifest?: any;
        hasBundle?: boolean;
        jsCode?: string | null;
        cssCode?: string | null;
        error?: string;
      }>;
      onModuleDownloadProgress?: (
        callback: (progress: {
          moduleId: string;
          percent: number;
          transferred: number;
          total: number;
        }) => void
      ) => () => void;

      selectAndSaveDocument: () => Promise<{ name: string; path: string } | null>;
      selectAndSavePhoto: () => Promise<string[] | null>;
      openExternalFile: (filePath: string) => Promise<void>;
      printQRLabel: (data: {
        itemName: string;
        itemDetails: string;
        qrDataUrl: string;
      }) => Promise<boolean>;
      saveQRImage: (data: { itemName: string; qrDataUrl: string }) => Promise<boolean>;
      readFileBase64: (filePath: string) => Promise<string | null>;
      readFileBuffer: (filePath: string) => Promise<Uint8Array | null>;
      openUrl: (url: string) => Promise<void>;
      generateBillOfSale: (data: any) => Promise<string | null>;
      generateArmoryBinder: (data: any) => Promise<string | null>;
      generateWorkOrder: (data: any) => Promise<string | null>;
      generateInsuranceReport: (data: any) => Promise<string | null>;
      lookupUPC: (upc: string) => Promise<any>;
      lookupFFL: (params: { zip?: string; state?: string; limit?: number }) => Promise<{
        success: boolean;
        count?: number;
        source?: string;
        data: Array<{
          id: number;
          license_num?: string;
          business_name: string;
          trade_name?: string;
          street?: string;
          city?: string;
          state?: string;
          zip?: string;
          phone?: string;
          standard_fee?: number | null;
        }>;
      }>;
      lookupRanges: (params: { zip?: string; state?: string; limit?: number }) => Promise<{
        success: boolean;
        count?: number;
        source?: string;
        data: Array<{
          id: number;
          name: string;
          trade_name?: string;
          range_type?: string;
          street?: string;
          city?: string;
          state?: string;
          zip?: string;
          phone?: string;
          lane_fee?: number | null;
          amenities?: string;
          is_public?: number;
        }>;
      }>;

      logRangeSession: (data: {
        firearm_id: number;
        ammo_id?: number;
        rounds_fired: number;
        date?: string;
        notes?: string;
        cost?: number;
        location?: string;
      }) => Promise<{
        success: boolean;
        firearm_rounds?: number;
        ammo_remaining?: number;
        error?: string;
      }>;
      completeMaintenanceTask: (
        firearmId: number,
        taskId: string,
        logData: {
          type?: string;
          action_performed?: string;
          part_details?: string;
          cost?: number;
          date?: string;
          notes?: string;
        }
      ) => Promise<boolean>;
      selectCSVFile?: () => Promise<{ name: string; path: string; content: string } | null>;
      exportData: (dataString: string, filename: string) => Promise<string | null>;
      onUpdateMessage: (callback: (msg: any) => void) => () => void;
      restartApp: () => void;
      getPlatform: () => string;
      getLocalIp: () => Promise<string>;
      getAllLocalIps?: () => Promise<
        Array<{ name: string; address: string; score: number; isVirtual: boolean }>
      >;
      getPairingInfo?: () => Promise<{
        primaryIp: string;
        fallbackIps: string[];
        hostname: string;
        port: number;
        token: string;
        qrData: string;
        interfaces: Array<{ name: string; address: string; score: number; isVirtual: boolean }>;
      }>;
      getPairingToken?: () => Promise<string | null>;
      revokePairingToken?: () => Promise<boolean>;
      // Bluetooth LE Pairing
      isBluetoothAvailable?: () => Promise<boolean>;
      scanBleCompanions?: (timeoutSecs?: number) => Promise<DiscoveredCompanion[]>;
      pairBleCompanion?: (peripheralId: string, pin: string) => Promise<any>;

      // Paired Devices Management
      getPairedDevices?: () => Promise<PairedDevice[]>;
      removePairedDevice?: (id: string) => Promise<boolean>;
      unpairAllDevices?: () => Promise<boolean>;
      onDeviceUnpaired?: (callback: (data: any) => void) => () => void;
      onSyncReceived: (callback: () => void) => () => void;
      onDevicePaired?: (
        callback: (data: { deviceId?: string; deviceName?: string; deviceType?: string; ipAddress?: string; timestamp?: number; isNew?: boolean }) => void
      ) => () => void;
      onVaultLocked: (callback: () => void) => () => void;
      getSyncQueue: () => Promise<SyncItem[]>;
      removeSyncItem: (id: number | string) => Promise<number>;
      clearSyncQueue: () => Promise<boolean>;
      rejectSyncItem?: (params: {
        syncId: string;
        itemType?: string;
        filename?: string;
        itemIdentifier?: string;
        payload?: string;
        deleteFromMobile?: boolean;
      }) => Promise<string | null>;
      getRejectedSyncs?: () => Promise<any[]>;
      confirmRejectedSyncs?: (ids: string[]) => Promise<number>;

      // New Feature API Methods
      getStorageLocations: () => Promise<StorageLocation[]>;
      addStorageLocation: (loc: StorageLocation) => Promise<number>;
      updateStorageLocation: (id: number, loc: StorageLocation) => Promise<number>;
      deleteStorageLocation: (id: number) => Promise<number>;

      getChronoStrings: () => Promise<ChronoString[]>;
      addChronoString: (cs: ChronoString) => Promise<number>;
      deleteChronoString: (id: number) => Promise<number>;

      getTargetAnalyses: () => Promise<TargetAnalysis[]>;
      addTargetAnalysis: (ta: TargetAnalysis) => Promise<number>;
      deleteTargetAnalysis: (id: number) => Promise<number>;

      getLoadLadderTests: () => Promise<LoadLadderTest[]>;
      addLoadLadderTest: (lt: LoadLadderTest) => Promise<number>;
      updateLoadLadderTest: (id: number, lt: LoadLadderTest) => Promise<number>;
      deleteLoadLadderTest: (id: number) => Promise<number>;

      getBallisticProfiles: () => Promise<BallisticProfile[]>;
      addBallisticProfile: (bp: BallisticProfile) => Promise<number>;
      updateBallisticProfile: (id: number, bp: BallisticProfile) => Promise<number>;
      deleteBallisticProfile: (id: number) => Promise<number>;

      getActivityLog: () => Promise<ActivityLogEntry[]>;
    };
  }
}

export interface ActivityLogEntry {
  action: 'add' | 'delete' | 'update' | 'range_session' | 'manufacture' | string;
  entityType: 'firearm' | 'ammo' | 'accessory' | 'component' | 'storage' | string;
  entityId?: number | string;
  detail?: string;
  timestamp?: string;
  source?: 'desktop' | 'mobile' | string;
}

// ─── Range Session Malfunction Telemetry ────────────────────────────
export interface MalfunctionEntry {
  type: 'FTF' | 'FTE' | 'Stovepipe' | 'DoubleFeed' | 'LightStrike' | 'Other';
  roundNumber?: number;
  notes?: string;
}

// ─── Velocity Chronograph String ────────────────────────────────────
export interface ChronoString {
  id?: number;
  firearmId?: number;
  firearm_id?: number;
  ammoId?: number;
  ammo_id?: number;
  ammoLabel?: string;
  shotVelocities?: number[];
  averageVelocity?: number;
  standardDeviation?: number;
  extremeSpread?: number;
  temperature?: number;
  distanceYards?: number;
  date: string;
  notes?: string;
  [key: string]: any;
}

// ─── Target Analysis Record ─────────────────────────────────────────
export interface TargetAnalysis {
  id?: number;
  firearmId?: number;
  imagePath?: string;
  photoBase64?: string;
  shotsCount?: number;
  groupSizeInches?: number;
  groupSizeMOA?: number;
  distanceYards?: number;
  distance_yards?: number;
  moa?: number;
  extreme_spread_inches?: number;
  mean_radius_inches?: number;
  shot_count?: number;
  optic_name?: string;
  photo_path?: string;
  pointOfImpactOffsetInches?: { x: number; y: number };
  date: string;
  notes?: string;
  [key: string]: any;
}

// ─── Storage Location / Safe Item ───────────────────────────────────
export interface StorageLocation {
  id?: number;
  name: string;
  type: 'Safe' | 'Cabinet' | 'AmmoCan' | 'Case' | 'Vehicle' | 'Other';
  capacity?: number;
  capacityMode?: 'firearms' | 'ammo' | 'all';
  notes?: string;
  firearmIds?: number[];
  accessoryIds?: number[];
  ammoIds?: number[];
  componentIds?: number[];
}

// ─── Load Development Ladder Test ───────────────────────────────────
export interface LoadLadderStep {
  chargeGrains: number;
  seatingDepthOAL?: number;
  velocityAvg?: number;
  velocitySD?: number;
  velocityES?: number;
  groupSizeInches?: number;
  groupSizeMOA?: number;
  pressureSigns?:
    | 'None'
    | 'Flattened Primer'
    | 'Cratered Primer'
    | 'Sticky Bolt'
    | 'Extractor Mark';
  notes?: string;
}

export interface LoadLadderTest {
  id?: number;
  caliber: string;
  bulletManufacturer?: string;
  bulletName?: string;
  bulletGrain: number;
  bulletType?: string;
  powderManufacturer?: string;
  powderName: string;
  primerType?: string;
  brassManufacturer?: string;
  distanceYards?: number;
  steps: LoadLadderStep[];
  date: string;
  notes?: string;
}

// ─── Ballistic Profile / DOPE Card ──────────────────────────────────
export interface BallisticProfile {
  id?: number;
  name: string;
  firearmId?: number;
  ammoId?: number;
  caliber: string;
  bulletWeight: number;
  ballisticCoefficient: number;
  dragModel: 'G1' | 'G7';
  muzzleVelocity: number;
  zeroRange: number;
  sightHeight: number;
  windSpeed?: number;
  windAngle?: number;
  temperature?: number;
  altitude?: number;
  barrelTwistRate?: number;
  barrelTwistDirection?: 'Right' | 'Left';
  notes?: string;
}

export interface BallisticSolution {
  range: number;
  drop: number;
  dropMOA: number;
  dropMIL: number;
  windDrift: number;
  windDriftMOA: number;
  windDriftMIL: number;
  velocity: number;
  energy: number;
  timeOfFlight: number;
}

// ─── Insurance Item Summary ─────────────────────────────────────────
export interface InsuranceItem {
  type: 'firearm' | 'accessory' | 'ammo';
  description: string;
  serialNumber?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  currentValue?: number;
  photoPath?: string;
}

export interface PairedDevice {
  id: string;
  deviceName: string;
  deviceType: string;
  ipAddress?: string;
  pairedAt: string;
  lastActiveAt: string;
  isActive: boolean;
}

export interface DiscoveredCompanion {
  id: string;
  name: string;
  rssi?: number;
  is_armoryvault: boolean;
}

export interface SyncItem {
  id?: number;
  type:
    | 'ammo_adjustment'
    | 'component_adjustment'
    | 'accessory_adjustment'
    | 'firearm_log'
    | 'firearm_photo'
    | 'new_firearm'
    | 'firearm_update'
    | 'universal_scan'
    | 'range_session'
    | 'firearm_maintenance'
    | 'bill_of_sale_transfer'
    | 'chrono_string'
    | 'target_analysis'
    | 'optic_zero_update'
    | 'malfunction_report'
    | 'custom_payload';
  upcOrId?: string;
  action?: 'add' | 'remove';
  count?: number;
  measurement?: 'rds' | 'boxes' | 'lbs' | 'brick';
  timestamp: string;
  firearm_id?: number;
  firearmId?: number;
  ammo_id?: number;
  rounds_fired?: number;
  date?: string;
  notes?: string;
  cost?: number;
  photo_data?: string;
  photoBase64?: string;
  photosBase64?: string[];
  data?: Record<string, any>;
  log_type?: string;
  group_metrics?: any;
  malfunctions?: MalfunctionEntry[];
  ammo_compatibility_flag?: any;
  voice_transcript?: string;
  audio_base64?: string;
  bill_of_sale?: any;
  transfer_id?: string;
  buyer_name?: string;
  buyer_dl?: string;
  sale_price?: number;
  pdf_base64?: string;
  // Chrono sync fields
  chrono_data?: ChronoString;
  // Target analysis sync fields
  target_data?: TargetAnalysis;
  // Custom encrypted payload file fields (*.av*)
  custom_payload_filename?: string;
  custom_payload_extension?: string;
  custom_payload_envelope?: any;
  custom_payload_data?: any;
  [key: string]: any;
}
