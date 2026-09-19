import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  identifyPayloadFormat,
  parseAndValidatePayload,
  commitParsedPayload,
  decryptPayloadEnvelope,
  EncryptedPayloadEnvelope,
} from './payloadIngestionEngine';

describe('ArmoryVault Payload Ingestion Engine (Desktop Scope)', () => {
  beforeEach(() => {
    (window as any).api = {
      addFirearm: vi.fn().mockResolvedValue(101),
      addAmmo: vi.fn().mockResolvedValue(201),
      addComponent: vi.fn().mockResolvedValue(301),
      addAccessory: vi.fn().mockResolvedValue(401),
      addFirearmLog: vi.fn().mockResolvedValue(501),
      logRangeSession: vi.fn().mockResolvedValue({ success: true }),
      getFirearms: vi.fn().mockResolvedValue([]),
      updateFirearm: vi.fn().mockResolvedValue(1),
    };
  });

  it('accurately identifies all 8 payload formats', () => {
    expect(identifyPayloadFormat({ format: 'armoryvault_firearm' })).toBe('armoryvault_firearm');
    expect(identifyPayloadFormat({ format: 'armoryvault_range_session' })).toBe('armoryvault_range_session');
    expect(identifyPayloadFormat({ format: 'armoryvault_ammo' })).toBe('armoryvault_ammo');
    expect(identifyPayloadFormat({ format: 'armoryvault_reloading_component' })).toBe('armoryvault_reloading_component');
    expect(identifyPayloadFormat({ format: 'armoryvault_accessory' })).toBe('armoryvault_accessory');
    expect(identifyPayloadFormat({ format: 'armoryvault_maintenance' })).toBe('armoryvault_maintenance');
    expect(identifyPayloadFormat({ format: 'armoryvault_transfer' })).toBe('armoryvault_transfer');
    expect(identifyPayloadFormat({ format: 'armoryvault_bundle' })).toBe('armoryvault_bundle');
  });

  it('parses unencrypted firearm payload with rich summary', async () => {
    const raw = JSON.stringify({
      format: 'armoryvault_firearm',
      firearm: {
        make: 'Glock',
        model: '19 Gen 5',
        caliber: '9mm',
        serial_number: 'GLOCK-12345',
      },
    });

    const parsed = await parseAndValidatePayload(raw);
    expect(parsed.success).toBe(true);
    expect(parsed.format).toBe('armoryvault_firearm');
    expect(parsed.summaryTitle).toBe('Glock 19 Gen 5');
    expect(parsed.summarySubtitle).toContain('Caliber: 9mm');
  });

  it('flags encrypted envelopes that require a key', async () => {
    const envelope: EncryptedPayloadEnvelope = {
      format: 'armoryvault_encrypted_payload',
      version: '1.0.0',
      created_at: new Date().toISOString(),
      encryption: {
        algorithm: 'AES-256-GCM',
        kdf: 'PBKDF2',
        iterations: 100000,
        salt: '00112233445566778899aabbccddeeff',
        iv: '00112233445566778899aabb',
        auth_tag_length_bits: 128,
      },
      ciphertext: 'deadbeef',
    };

    const parsed = await parseAndValidatePayload(JSON.stringify(envelope));
    expect(parsed.success).toBe(false);
    expect(parsed.isEncrypted).toBe(true);
    expect(parsed.needsKey).toBe(true);
    expect(parsed.summaryTitle).toBe('Encrypted ArmoryVault Payload');
  });

  it('commits firearm payload into encrypted vault via window.api.addFirearm', async () => {
    const parsed = await parseAndValidatePayload(
      JSON.stringify({
        format: 'armoryvault_firearm',
        firearm: {
          make: 'Walther',
          model: 'PDP Compact',
          caliber: '9mm',
        },
      })
    );

    const result = await commitParsedPayload(parsed);
    expect(result.success).toBe(true);
    expect(result.committedCount).toBe(1);
    expect((window as any).api.addFirearm).toHaveBeenCalledWith(
      expect.objectContaining({ make: 'Walther', model: 'PDP Compact' })
    );
  });

  it('commits master bundle payload into respective database tables', async () => {
    const bundleData = {
      format: 'armoryvault_bundle',
      summary: {
        firearms_count: 1,
        ammo_adjustments_count: 1,
      },
      payload: {
        firearms: [{ make: 'CZ', model: 'Shadow 2', caliber: '9mm' }],
        ammo: [{ manufacturer: 'Fiocchi', caliber: '9mm Luger', count: 250 }],
      },
    };

    const parsed = await parseAndValidatePayload(JSON.stringify(bundleData));
    expect(parsed.success).toBe(true);
    expect(parsed.format).toBe('armoryvault_bundle');

    const result = await commitParsedPayload(parsed);
    expect(result.success).toBe(true);
    expect(result.committedCount).toBe(2);
    expect((window as any).api.addFirearm).toHaveBeenCalled();
    expect((window as any).api.addAmmo).toHaveBeenCalled();
  });

  it('seamlessly decrypts Mobile Companion envelope with Base64 ciphertext and separate auth_tag', async () => {
    const key = 'test-pairing-key-mobile';
    const sample = {
      format: 'armoryvault_firearm',
      firearm: {
        make: 'Colt',
        model: 'Python',
        caliber: '.357 Magnum',
        serial_number: 'PY-9921',
      },
    };

    // Encrypt using WebCrypto matching Mobile Companion behavior
    const enc = new TextEncoder();
    const saltBytes = new Uint8Array(16);
    crypto.getRandomValues(saltBytes);
    const ivBytes = new Uint8Array(12);
    crypto.getRandomValues(ivBytes);

    const baseKey = await crypto.subtle.importKey(
      'raw',
      enc.encode(key),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    const aesKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: saltBytes,
        iterations: 1000,
        hash: 'SHA-256',
      },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: ivBytes, tagLength: 128 },
      aesKey,
      enc.encode(JSON.stringify(sample))
    );

    const encArr = new Uint8Array(encrypted);
    const ctBytes = encArr.slice(0, encArr.length - 16);
    const tagBytes = encArr.slice(encArr.length - 16);

    let ctBinary = '';
    for (let i = 0; i < ctBytes.length; i++) ctBinary += String.fromCharCode(ctBytes[i]);
    const ctBase64 = btoa(ctBinary);

    let tagHex = '';
    for (let i = 0; i < tagBytes.length; i++) tagHex += tagBytes[i].toString(16).padStart(2, '0');

    let saltHex = '';
    for (let i = 0; i < saltBytes.length; i++) saltHex += saltBytes[i].toString(16).padStart(2, '0');

    let ivHex = '';
    for (let i = 0; i < ivBytes.length; i++) ivHex += ivBytes[i].toString(16).padStart(2, '0');

    const mobileEnvelope: EncryptedPayloadEnvelope = {
      format: 'armoryvault_encrypted_payload',
      version: '1.0.0',
      created_at: new Date().toISOString(),
      encryption: {
        algorithm: 'AES-256-GCM',
        kdf: 'PBKDF2-HMAC-SHA256',
        iterations: 1000,
        salt: saltHex,
        iv: ivHex,
        auth_tag: tagHex,
      },
      ciphertext: ctBase64,
    };

    const parsed = await parseAndValidatePayload(JSON.stringify(mobileEnvelope), key);
    expect(parsed.success).toBe(true);
    expect(parsed.format).toBe('armoryvault_firearm');
    expect(parsed.summaryTitle).toBe('Colt Python');
    expect(parsed.summarySubtitle).toContain('.357 Magnum');
  });
});

