/**
 * ArmoryVault Payload Ingestion Engine (Desktop Scope)
 * 
 * Decrypts, validates, normalizes, and commits custom payload files:
 * (*.avfirearm, *.avsession, *.avammo, *.avcomponent, *.avaccessory,
 *  *.avmaintenance, *.avtransfer, *.avbundle)
 */

export interface EncryptedPayloadEnvelope {
  $schema?: string;
  format: 'armoryvault_encrypted_payload';
  version: string;
  created_at?: string;
  exported_at?: string;
  payload_type?: string;
  original_filename?: string;
  filename?: string;
  encryption: {
    algorithm: 'AES-256-GCM';
    kdf?: string;
    iterations: number;
    salt: string;
    iv: string;
    auth_tag?: string;
    authTag?: string;
    auth_tag_length_bits?: number;
  };
  ciphertext: string;
}

export type PayloadFormat =
  | 'armoryvault_firearm'
  | 'armoryvault_range_session'
  | 'armoryvault_ammo'
  | 'armoryvault_reloading_component'
  | 'armoryvault_accessory'
  | 'armoryvault_maintenance'
  | 'armoryvault_transfer'
  | 'armoryvault_bundle';

export interface ParsedPayloadResult {
  success: boolean;
  isEncrypted: boolean;
  needsKey?: boolean;
  format?: PayloadFormat;
  version?: string;
  filename?: string;
  envelope?: EncryptedPayloadEnvelope;
  data?: any;
  summaryTitle: string;
  summarySubtitle: string;
  itemCount: number;
  error?: string;
}

export interface CommitResult {
  success: boolean;
  committedCount: number;
  errors: string[];
  itemsCommitted: Array<{ type: string; name: string }>;
}

// ─── Cryptography Helper Functions (WebCrypto AES-256-GCM + PBKDF2) ───

function hexToUint8Array(hex: string): Uint8Array {
  const cleanHex = hex.replace(/[^0-9a-fA-F]/g, '');
  if (cleanHex.length % 2 !== 0) {
    throw new Error('Invalid hex string length');
  }
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
  }
  return bytes;
}

function decodeHexOrBase64Bytes(str: string): Uint8Array {
  const clean = str.trim();
  const isHex = clean.length % 2 === 0 && /^[0-9a-fA-F]+$/.test(clean);
  if (isHex) {
    try {
      return hexToUint8Array(clean);
    } catch {}
  }
  // Fall back to Base64
  try {
    const binary = atob(clean.replace(/[\s\r\n]+/g, ''));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch (err: any) {
    throw new Error(`Failed to decode as hex or base64: ${err.message}`);
  }
}

/**
 * Decrypts an authenticated AES-256-GCM encrypted envelope.
 * Robustly supports both:
 * - Desktop Rust format: Hex ciphertext with embedded 16-byte auth tag.
 * - Mobile Companion format: Base64 ciphertext with separate 16-byte auth tag in encryption metadata.
 */
export async function decryptPayloadEnvelope<T = any>(
  envelope: EncryptedPayloadEnvelope,
  tokenOrKey: string
): Promise<T> {
  const enc = envelope.encryption;
  if (!enc || enc.algorithm !== 'AES-256-GCM') {
    throw new Error(`Unsupported encryption algorithm: ${enc?.algorithm}`);
  }

  const saltBytes = decodeHexOrBase64Bytes(enc.salt);
  const ivBytes = decodeHexOrBase64Bytes(enc.iv);
  const rawCipherBytes = decodeHexOrBase64Bytes(envelope.ciphertext);

  const authTagStr = enc.auth_tag || enc.authTag;
  let combinedCipherBytes: Uint8Array;

  if (authTagStr) {
    const authTagBytes = decodeHexOrBase64Bytes(authTagStr);
    combinedCipherBytes = new Uint8Array(rawCipherBytes.length + authTagBytes.length);
    combinedCipherBytes.set(rawCipherBytes, 0);
    combinedCipherBytes.set(authTagBytes, rawCipherBytes.length);
  } else {
    combinedCipherBytes = rawCipherBytes;
  }

  const textEncoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(tokenOrKey),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const aesKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes as unknown as BufferSource,
      iterations: enc.iterations || 2000,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: ivBytes as unknown as BufferSource,
      tagLength: enc.auth_tag_length_bits || 128,
    },
    aesKey,
    combinedCipherBytes as unknown as BufferSource
  );

  const textDecoder = new TextDecoder();
  const jsonString = textDecoder.decode(decryptedBuffer);
  return JSON.parse(jsonString) as T;
}

// ─── Format Identification & Metadata Parsing ────────────────────────

export function identifyPayloadFormat(data: any): PayloadFormat | null {
  if (!data || typeof data !== 'object') return null;

  if (data.format === 'armoryvault_firearm' || data.firearm) {
    return 'armoryvault_firearm';
  }
  if (data.format === 'armoryvault_range_session' || data.session) {
    return 'armoryvault_range_session';
  }
  if (data.format === 'armoryvault_ammo' || data.ammo) {
    return 'armoryvault_ammo';
  }
  if (data.format === 'armoryvault_reloading_component' || data.component) {
    return 'armoryvault_reloading_component';
  }
  if (data.format === 'armoryvault_accessory' || data.accessory) {
    return 'armoryvault_accessory';
  }
  if (data.format === 'armoryvault_maintenance' || data.maintenance) {
    return 'armoryvault_maintenance';
  }
  if (data.format === 'armoryvault_transfer' || data.transfer_id) {
    return 'armoryvault_transfer';
  }
  if (data.format === 'armoryvault_bundle' || (data.payload && data.summary)) {
    return 'armoryvault_bundle';
  }

  return null;
}

/**
 * Parses raw input string or object, decrypts if necessary, and returns normalized structure.
 */
export async function parseAndValidatePayload(
  rawInput: string | object,
  keyOrToken?: string,
  hintFilename?: string
): Promise<ParsedPayloadResult> {
  let parsedJson: any;

  try {
    parsedJson = typeof rawInput === 'string' ? JSON.parse(rawInput) : rawInput;
  } catch (err: any) {
    return {
      success: false,
      isEncrypted: false,
      summaryTitle: 'Invalid Payload',
      summarySubtitle: 'File does not contain valid JSON data.',
      itemCount: 0,
      error: `JSON Parse error: ${err.message}`,
    };
  }

  // 1. Check if Encrypted Envelope
  if (parsedJson.format === 'armoryvault_encrypted_payload') {
    const envelope = parsedJson as EncryptedPayloadEnvelope;

    if (!keyOrToken) {
      return {
        success: false,
        isEncrypted: true,
        needsKey: true,
        filename: envelope.original_filename || hintFilename,
        envelope,
        summaryTitle: 'Encrypted ArmoryVault Payload',
        summarySubtitle: 'Requires pairing key or passphrase to decrypt.',
        itemCount: 1,
      };
    }

    try {
      const decrypted = await decryptPayloadEnvelope(envelope, keyOrToken);
      return parseAndValidatePayload(decrypted, undefined, envelope.original_filename || hintFilename);
    } catch (err: any) {
      return {
        success: false,
        isEncrypted: true,
        needsKey: true,
        filename: envelope.original_filename || hintFilename,
        envelope,
        summaryTitle: 'Decryption Failed',
        summarySubtitle: 'Incorrect pairing token or authentication failure.',
        itemCount: 0,
        error: err.message,
      };
    }
  }

  // 2. Identify Plaintext Payload Format
  const format = identifyPayloadFormat(parsedJson);
  if (!format) {
    return {
      success: false,
      isEncrypted: false,
      summaryTitle: 'Unknown ArmoryVault Payload',
      summarySubtitle: 'Data format is not recognized.',
      itemCount: 0,
      error: 'Unrecognized schema or format identifier.',
    };
  }

  let summaryTitle = 'Payload Item';
  let summarySubtitle = '';
  let itemCount = 1;

  switch (format) {
    case 'armoryvault_firearm': {
      const f = parsedJson.firearm || parsedJson;
      summaryTitle = `${f.make || ''} ${f.model || ''}`.trim() || f.name || 'Firearm Record';
      summarySubtitle = `Caliber: ${f.caliber || 'Unknown'} • S/N: ${f.serial_number || 'N/A'}`;
      break;
    }
    case 'armoryvault_range_session': {
      const s = parsedJson.session || parsedJson;
      summaryTitle = `Range Session (${s.date || 'Undated'})`;
      summarySubtitle = `${s.location || 'Range'} • ${s.rounds_fired || 0} rounds fired`;
      break;
    }
    case 'armoryvault_ammo': {
      const a = parsedJson.ammo || parsedJson;
      summaryTitle = `${a.manufacturer || ''} ${a.name || a.caliber || ''}`.trim() || 'Ammunition Record';
      summarySubtitle = `${a.count || 0} rounds • ${a.grain ? a.grain + 'gr' : ''} ${a.caliber || ''}`;
      break;
    }
    case 'armoryvault_reloading_component': {
      const c = parsedJson.component || parsedJson;
      summaryTitle = `${c.manufacturer || ''} ${c.name || c.type || ''}`.trim() || 'Reloading Component';
      summarySubtitle = `Type: ${c.type || 'Component'} • Qty: ${c.quantity || 0} ${c.weightUnit || ''}`;
      break;
    }
    case 'armoryvault_accessory': {
      const acc = parsedJson.accessory || parsedJson;
      summaryTitle = `${acc.manufacturer || ''} ${acc.name || acc.model || ''}`.trim() || 'Tactical Accessory';
      summarySubtitle = `Type: ${acc.type || 'Gear'} • S/N: ${acc.serialNumber || 'N/A'}`;
      break;
    }
    case 'armoryvault_maintenance': {
      const m = parsedJson.maintenance || parsedJson;
      summaryTitle = `${m.type || 'Maintenance'} Log (${m.date || 'Recent'})`;
      summarySubtitle = `${m.firearm_name || 'Firearm'} • ${m.notes || 'Routine armorer service'}`;
      break;
    }
    case 'armoryvault_transfer': {
      const t = parsedJson;
      summaryTitle = `Transfer & Bill of Sale (${t.date || 'Recent'})`;
      summarySubtitle = `Firearm: ${t.firearm?.make || ''} ${t.firearm?.model || ''} • Buyer: ${t.buyer_aamva_verified?.full_name || 'Private Party'}`;
      break;
    }
    case 'armoryvault_bundle': {
      const b = parsedJson;
      summaryTitle = `Master Ecosystem Bundle`;
      const counts = b.summary || {};
      const parts: string[] = [];
      if (counts.firearms_count) parts.push(`${counts.firearms_count} firearms`);
      if (counts.range_sessions_count) parts.push(`${counts.range_sessions_count} sessions`);
      if (counts.ammo_adjustments_count) parts.push(`${counts.ammo_adjustments_count} ammo`);
      if (counts.components_count) parts.push(`${counts.components_count} comps`);
      if (counts.accessories_count) parts.push(`${counts.accessories_count} accessories`);
      summarySubtitle = parts.join(', ') || 'Multi-domain vault archive';
      itemCount =
        (counts.firearms_count || 0) +
        (counts.range_sessions_count || 0) +
        (counts.ammo_adjustments_count || 0) +
        (counts.components_count || 0) +
        (counts.accessories_count || 0) +
        (counts.maintenance_logs_count || 0) +
        (counts.transfers_count || 0) || 1;
      break;
    }
  }

  return {
    success: true,
    isEncrypted: false,
    format,
    version: parsedJson.version || '1.0.0',
    filename: hintFilename,
    data: parsedJson,
    summaryTitle,
    summarySubtitle,
    itemCount,
  };
}

// ─── Database Commit Dispatcher ───────────────────────────────────────

/**
 * Commits a validated payload into the ArmoryVault encrypted desktop vault database via window.api.
 */
export async function commitParsedPayload(
  parsed: ParsedPayloadResult
): Promise<CommitResult> {
  if (!parsed.success || !parsed.data) {
    return {
      success: false,
      committedCount: 0,
      errors: [parsed.error || 'Cannot commit invalid payload'],
      itemsCommitted: [],
    };
  }

  const api = (window as any).api;
  if (!api) {
    return {
      success: false,
      committedCount: 0,
      errors: ['Desktop window.api bridge is not available.'],
      itemsCommitted: [],
    };
  }

  const errors: string[] = [];
  const itemsCommitted: Array<{ type: string; name: string }> = [];

  try {
    switch (parsed.format) {
      case 'armoryvault_firearm': {
        const firearmData = parsed.data.firearm || parsed.data;
        await api.addFirearm(firearmData);
        itemsCommitted.push({
          type: 'Firearm',
          name: firearmData.name || `${firearmData.make || ''} ${firearmData.model || ''}`.trim(),
        });
        break;
      }

      case 'armoryvault_range_session': {
        const sessionData = parsed.data.session || parsed.data;
        if (typeof api.logRangeSession === 'function') {
          await api.logRangeSession(sessionData);
        } else {
          // Fallback via firearm log
          await api.addFirearmLog(sessionData.firearm_id || 0, {
            type: 'Range',
            date: sessionData.date || new Date().toISOString(),
            rounds_fired: sessionData.rounds_fired || 0,
            notes: sessionData.notes || 'Ingested from range session payload',
          });
        }
        itemsCommitted.push({
          type: 'Range Session',
          name: `Session on ${sessionData.date || 'Recent'}`,
        });
        break;
      }

      case 'armoryvault_ammo': {
        const ammoData = parsed.data.ammo || parsed.data;
        await api.addAmmo(ammoData);
        itemsCommitted.push({
          type: 'Ammunition',
          name: `${ammoData.manufacturer || ''} ${ammoData.name || ammoData.caliber || ''}`.trim(),
        });
        break;
      }

      case 'armoryvault_reloading_component': {
        const compData = parsed.data.component || parsed.data;
        await api.addComponent(compData);
        itemsCommitted.push({
          type: 'Component',
          name: `${compData.manufacturer || ''} ${compData.name || compData.type || ''}`.trim(),
        });
        break;
      }

      case 'armoryvault_accessory': {
        const accData = parsed.data.accessory || parsed.data;
        await api.addAccessory(accData);
        itemsCommitted.push({
          type: 'Accessory',
          name: `${accData.manufacturer || ''} ${accData.name || accData.model || ''}`.trim(),
        });
        break;
      }

      case 'armoryvault_maintenance': {
        const maintData = parsed.data.maintenance || parsed.data;
        await api.addFirearmLog(maintData.firearm_id || 0, {
          type: maintData.type || 'Cleaning',
          date: maintData.date || new Date().toISOString(),
          notes: maintData.notes || 'Ingested maintenance payload',
        });
        itemsCommitted.push({
          type: 'Maintenance',
          name: `${maintData.type || 'Service'} Log`,
        });
        break;
      }

      case 'armoryvault_transfer': {
        const transferData = parsed.data;
        // Record disposition if matching firearm exists
        const firearms = await api.getFirearms();
        const targetFirearm = (firearms || []).find(
          (f: any) =>
            f.serial_number &&
            transferData.firearm?.serial_number &&
            f.serial_number.toLowerCase() === transferData.firearm.serial_number.toLowerCase()
        );

        if (targetFirearm) {
          await api.updateFirearm(targetFirearm.id, {
            ...targetFirearm,
            is_sold: true,
            sold_date: transferData.date,
            sold_to_name: transferData.buyer_aamva_verified?.full_name,
            sold_price: transferData.sale_price,
            sale_notes: `Transferred via Bill of Sale #${transferData.transfer_id || ''}`,
          });
        }
        itemsCommitted.push({
          type: 'Transfer',
          name: `Transfer for ${transferData.firearm?.make || ''} ${transferData.firearm?.model || ''}`,
        });
        break;
      }

      case 'armoryvault_bundle': {
        const bundle = parsed.data.payload || {};

        if (Array.isArray(bundle.firearms)) {
          for (const f of bundle.firearms) {
            try {
              await api.addFirearm(f);
              itemsCommitted.push({ type: 'Firearm', name: f.name || f.make });
            } catch (err: any) {
              errors.push(`Firearm (${f.name}): ${err.message}`);
            }
          }
        }

        if (Array.isArray(bundle.ammo)) {
          for (const a of bundle.ammo) {
            try {
              await api.addAmmo(a);
              itemsCommitted.push({ type: 'Ammunition', name: a.name || a.caliber });
            } catch (err: any) {
              errors.push(`Ammo (${a.name}): ${err.message}`);
            }
          }
        }

        if (Array.isArray(bundle.components)) {
          for (const c of bundle.components) {
            try {
              await api.addComponent(c);
              itemsCommitted.push({ type: 'Component', name: c.name || c.type });
            } catch (err: any) {
              errors.push(`Component (${c.name}): ${err.message}`);
            }
          }
        }

        if (Array.isArray(bundle.accessories)) {
          for (const acc of bundle.accessories) {
            try {
              await api.addAccessory(acc);
              itemsCommitted.push({ type: 'Accessory', name: acc.name || acc.model });
            } catch (err: any) {
              errors.push(`Accessory (${acc.name}): ${err.message}`);
            }
          }
        }

        if (Array.isArray(bundle.range_sessions)) {
          for (const s of bundle.range_sessions) {
            try {
              if (typeof api.logRangeSession === 'function') {
                await api.logRangeSession(s);
              }
              itemsCommitted.push({ type: 'Range Session', name: s.location || 'Session' });
            } catch (err: any) {
              errors.push(`Session (${s.date}): ${err.message}`);
            }
          }
        }
        break;
      }
    }
  } catch (globalErr: any) {
    errors.push(globalErr.message || String(globalErr));
  }

  return {
    success: errors.length === 0,
    committedCount: itemsCommitted.length,
    errors,
    itemsCommitted,
  };
}
