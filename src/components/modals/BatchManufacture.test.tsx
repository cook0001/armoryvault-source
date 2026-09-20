/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { Ammo, ReloadingComponent } from '@/types';
import { BatchManufactureModal } from './BatchManufactureModal';

describe('BatchManufactureModal Component', () => {
  const mockAmmo: Ammo = {
    id: 101,
    type: 'handload',
    caliber: '.308 Winchester',
    grain: 168,
    projectile: 'BTHP Match',
    bullet_manufacturer: 'Sierra',
    powder: 'Varget',
    powderCharge: 42.5,
    primer: 'Fed 210M',
    primer_type: 'Large Rifle Match',
    brass: 'Lapua',
    count: 200,
  };

  const mockComponents: ReloadingComponent[] = [
    {
      id: 1,
      type: 'Powder',
      manufacturer: 'Hodgdon',
      name: 'Varget',
      quantity: 2.0,
      weightUnit: 'lbs',
    },
    {
      id: 2,
      type: 'Primer',
      manufacturer: 'Federal',
      name: '210M',
      primerType: 'Large Rifle Match',
      quantity: 500,
    },
    { id: 3, type: 'Brass', manufacturer: 'Lapua', caliber: '.308 Winchester', quantity: 250 },
    {
      id: 4,
      type: 'Bullet',
      manufacturer: 'Sierra',
      caliber: '.308 Winchester',
      grain: 168,
      name: 'MatchKing BTHP',
      quantity: 300,
    },
  ];

  beforeEach(() => {
    window.api = {
      ...window.api,
      getComponents: vi.fn().mockResolvedValue(mockComponents),
      manufactureHandloadBatch: vi.fn().mockResolvedValue({ success: true, newAmmoCount: 300 }),
    } as any;
  });

  test('renders modal, auto-matches components, and calculates ingredient requirements', async () => {
    const handleSuccess = vi.fn();
    const handleClose = vi.fn();

    render(
      <BatchManufactureModal
        isOpen={true}
        onClose={handleClose}
        onSuccess={handleSuccess}
        ammo={mockAmmo}
      />
    );

    expect(screen.getByText(/Assemble Handload Batch/i)).toBeDefined();

    await waitFor(() => {
      // 100 rounds * 42.5 gr = 4250 gr / 7000 = ~0.607 lbs
      expect(screen.getByText(/4,250 gr/i)).toBeDefined();
      expect(screen.getByText(/100 primers/i)).toBeDefined();
      expect(screen.getByText(/100 cases/i)).toBeDefined();
      expect(screen.getByText(/100 bullets/i)).toBeDefined();
      expect(screen.getAllByText(/In Stock/i).length).toBeGreaterThan(0);
    });

    const submitBtn = screen.getByRole('button', { name: /Manufacture Batch/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(window.api.manufactureHandloadBatch).toHaveBeenCalledWith(
        101,
        100,
        expect.objectContaining({
          powderId: 1,
          powderAmountGrains: 42.5,
          primerId: 2,
          primerCount: 100,
          brassId: 3,
          brassCount: 100,
          bulletId: 4,
          bulletCount: 100,
        })
      );
      expect(handleSuccess).toHaveBeenCalled();
      expect(handleClose).toHaveBeenCalled();
    });
  });
});
