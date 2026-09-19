/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { Accessory, Firearm } from '../types';
import { Accessories } from './Accessories';

describe('Accessories Component & Tactical Detail Cards', () => {
  const mockFirearms: Firearm[] = [
    {
      id: 1,
      make: 'Glock',
      model: '19 Gen 5',
      serial_number: 'GLK12345',
      caliber: '9mm Luger',
      purchase_price: 550,
      purchase_date: '2023-01-15',
      condition: 'Excellent',
      image_path: '',
      is_sold: false,
    },
  ];

  const mockAccessories: Accessory[] = [
    {
      id: 101,
      type: 'Optic',
      manufacturer: 'Trijicon',
      model: 'RMR Type 2',
      magnification: '1x / 3.25 MOA',
      serialNumber: 'RMR998822',
      quantity: 1,
      round_count: 1250,
      value: 499.99,
      purchaseDate: '2023-04-10',
      notes: 'Zeroed at 25 yards with 124gr HST',
      mounts: [{ firearmId: 1, quantity: 1 }],
    },
    {
      id: 102,
      type: 'Suppressor',
      manufacturer: 'Dead Air',
      model: 'Sandman-S',
      ratedCalibers: 'Up to .300 Win Mag',
      is_nfa: true,
      nfa_type: 'Suppressor',
      registration_type: 'Trust',
      stamp_status: 'Approved',
      stamp_submitted_date: '2022-06-01',
      stamp_approved_date: '2023-02-15',
      quantity: 1,
      round_count: 3400,
      value: 849.0,
      mounts: [],
    },
    {
      id: 103,
      type: 'Chassis',
      manufacturer: 'MDT',
      model: 'ACC Elite',
      stockType: 'Precision Rifle Chassis',
      actionInlet: 'Remington 700 Short Action',
      bufferTubeType: 'Direct Action V-Block Bedding',
      magCompatibility: 'AICS / AW Detachable Box',
      forendRail: 'Full ARCA-Swiss + M-LOK',
      quantity: 1,
      value: 1299.99,
      mounts: [],
    },
    {
      id: 104,
      type: 'Stock',
      manufacturer: 'Thompson Center',
      model: 'Pro Hunter FlexTech',
      stockType: 'T/C Rifle Buttstock',
      actionInlet: 'Thompson/Center Encore / Pro Hunter / Endeavor',
      bufferTubeType: 'T/C Encore Frame Bolt Interface',
      lengthOfPull: '14.25" FlexTech',
      quantity: 1,
      value: 119.0,
      mounts: [],
    },
    {
      id: 105,
      type: 'Belt',
      manufacturer: 'The Hunter Company',
      model: '150 Series Buscadero',
      beltType: 'Western Buscadero Drop Belt (Single/Double)',
      dropLoopType: 'Single Drop (Right-Hand Strong Side)',
      cartridgeLoopCaliber: '.44 Special / .44 Magnum / .45 Colt',
      cartridgeLoopCount: 25,
      beltWidth: '2.75" - 3.0" (Western Buscadero Drop Belt)',
      buckleType: 'Classic Western Clipped-Corner / Nickel Buckle',
      quantity: 1,
      value: 89.99,
      mounts: [],
    },
    {
      id: 106,
      type: 'Magazine',
      manufacturer: 'Smith & Wesson',
      model: '4566 8rd Magazine',
      capacity: 8,
      caliber: '.45 ACP',
      quantity: 3,
      value: 39.99,
      mounts: [],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (window as any).api = {
      ...window.api,
      getAccessories: vi.fn().mockResolvedValue(mockAccessories),
      getFirearms: vi.fn().mockResolvedValue(mockFirearms),
      deleteAccessory: vi.fn().mockResolvedValue(true),
    } as any;
  });

  test('renders tactical cards with type badges, round telemetry, and specs', async () => {
    render(
      <MemoryRouter>
        <Accessories />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Accessories & Optics')).toBeDefined();
      expect(screen.getByText(/Trijicon RMR Type 2/i)).toBeDefined();
      expect(screen.getByText(/Dead Air Sandman-S/i)).toBeDefined();
      expect(screen.getByText(/MDT ACC Elite/i)).toBeDefined();
      expect(screen.getByText(/150 Series Buscadero/i)).toBeDefined();
    });

    // Check tactical spec chips and telemetry
    expect(screen.getByText(/1,250 rds/i)).toBeDefined();
    expect(screen.getByText(/3,400 rds/i)).toBeDefined();
    expect(screen.getByText(/1x \/ 3.25 MOA/i)).toBeDefined();
    expect(screen.getByText(/Up to \.300 Win Mag/i)).toBeDefined();
    expect(screen.getByText(/Glock 19 Gen 5/i)).toBeDefined();
    expect(screen.getByText(/Remington 700 Short Action/i)).toBeDefined();
    expect(screen.getByText(/14\.25" FlexTech/i)).toBeDefined();
  });

  test('opens AccessoryDetailModal when card or View Details is clicked', async () => {
    render(
      <MemoryRouter>
        <Accessories />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Trijicon RMR Type 2/i)).toBeDefined();
    });

    const card = screen.getByText(/Trijicon RMR Type 2/i).closest('.tactical-card')!;
    const viewDetailsButton = within(card).getByText('View Details');
    fireEvent.click(viewDetailsButton);

    await waitFor(() => {
      expect(screen.getByText('Technical Specifications & Logistics')).toBeDefined();
      expect(screen.getByText('Magnification / Objective')).toBeDefined();
      expect(screen.getByText('RMR998822')).toBeDefined();
      expect(screen.getByText('Firearm Mounting Deployments')).toBeDefined();
      expect(screen.getByText('Zeroed at 25 yards with 124gr HST')).toBeDefined();
    });
  });

  test('displays NFA compliance details for suppressors in detail modal', async () => {
    render(
      <MemoryRouter>
        <Accessories />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Dead Air Sandman-S/i)).toBeDefined();
    });

    const card = screen.getByText(/Dead Air Sandman-S/i).closest('.tactical-card')!;
    const viewDetailsButton = within(card).getByText('View Details');
    fireEvent.click(viewDetailsButton);

    await waitFor(() => {
      expect(screen.getByText('ATF / NFA Registration Details')).toBeDefined();
      expect(screen.getByText('Form 4 Submitted')).toBeDefined();
      expect(screen.getByText('2022-06-01')).toBeDefined();
      expect(screen.getByText('2023-02-15')).toBeDefined();
    });
  });

  test('displays Stock and Chassis technical specs in detail modal', async () => {
    render(
      <MemoryRouter>
        <Accessories />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/MDT ACC Elite/i)).toBeDefined();
    });

    const card = screen.getByText(/MDT ACC Elite/i).closest('.tactical-card')!;
    const viewDetailsButton = within(card).getByText('View Details');
    fireEvent.click(viewDetailsButton);

    await waitFor(() => {
      expect(screen.getByText('Technical Specifications & Logistics')).toBeDefined();
      expect(screen.getByText('Stock / Chassis Subtype')).toBeDefined();
      expect(screen.getAllByText('Precision Rifle Chassis').length).toBeGreaterThan(0);
      expect(screen.getByText('Action Inlet / Platform Fits')).toBeDefined();
      expect(screen.getByText('AICS / AW Detachable Box')).toBeDefined();
      expect(screen.getByText('Full ARCA-Swiss + M-LOK')).toBeDefined();
    });
  });

  test('displays Gun Belt and Western Drop Belt technical specs in detail modal', async () => {
    render(
      <MemoryRouter>
        <Accessories />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/150 Series Buscadero/i)).toBeDefined();
    });

    const card = screen.getByText(/150 Series Buscadero/i).closest('.tactical-card')!;
    const viewDetailsButton = within(card).getByText('View Details');
    fireEvent.click(viewDetailsButton);

    await waitFor(() => {
      expect(screen.getByText('Technical Specifications & Logistics')).toBeDefined();
      expect(screen.getByText('Belt Subtype / Rig Style')).toBeDefined();
      expect(
        screen.getAllByText('Western Buscadero Drop Belt (Single/Double)').length
      ).toBeGreaterThan(0);
      expect(screen.getByText('Western Drop Loop / Configuration')).toBeDefined();
      expect(screen.getAllByText('Single Drop (Right-Hand Strong Side)').length).toBeGreaterThan(0);
      expect(screen.getByText('Integrated Cartridge Loops')).toBeDefined();
      expect(screen.getAllByText('25x .44 Special / .44 Magnum / .45 Colt').length).toBeGreaterThan(
        0
      );
    });
  });

  test('displays Storage Location filter and container information in detail modal', async () => {
    render(
      <MemoryRouter>
        <Accessories />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTitle('Filter accessories by storage location / safe')).toBeDefined();
      expect(screen.getByText('All Storage Locations')).toBeDefined();
    });
  });

  test('renders command metrics deck with counts and valuations', async () => {
    render(
      <MemoryRouter>
        <Accessories />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Total Gear Items')).toBeDefined();
      expect(screen.getByText('Optics & Sights')).toBeDefined();
      expect(screen.getAllByText('Magazines').length).toBeGreaterThan(0);
      expect(screen.getByText('Suppressors & NFA')).toBeDefined();
      expect(screen.getByText('Gear Valuation')).toBeDefined();
    });
  });

  test('filters accessories via category filter chips', async () => {
    render(
      <MemoryRouter>
        <Accessories />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Trijicon RMR Type 2/i)).toBeDefined();
    });

    // Click Optics filter chip in the filter bar
    const filterBar = screen.getByTestId('filter-chips-bar');
    const opticsChip = within(filterBar).getByRole('button', { name: /Optics/i });
    fireEvent.click(opticsChip);

    await waitFor(() => {
      expect(screen.getByText(/Trijicon RMR Type 2/i)).toBeDefined();
      expect(screen.queryByText(/Dead Air Sandman-S/i)).toBeNull();
      expect(screen.queryByText(/MDT ACC Elite/i)).toBeNull();
    });

    // Click All Items chip to restore
    const allChip = within(filterBar).getByRole('button', { name: /All Items/i });
    fireEvent.click(allChip);

    await waitFor(() => {
      expect(screen.getByText(/Dead Air Sandman-S/i)).toBeDefined();
      expect(screen.getByText(/MDT ACC Elite/i)).toBeDefined();
    });
  });

  test('renders multi-quantity accessories with unit price badge cleanly', async () => {
    render(
      <MemoryRouter>
        <Accessories />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/3x Smith & Wesson 4566 8rd Magazine/i)).toBeDefined();
      // Verify unit price badge is rendered
      expect(screen.getByText(/\(\$39\.99 ea\)/i)).toBeDefined();
    });
  });
});

