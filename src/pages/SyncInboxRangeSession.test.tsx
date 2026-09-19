import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ModuleProvider } from '../modules/registry/ModuleContext';
import { SyncItem } from '../types';
import { SyncInbox } from './SyncInbox';

describe('SyncInbox Range Session & Telemetry Pipeline', () => {
  const mockRangeSyncQueue: SyncItem[] = [
    {
      id: 201,
      type: 'range_session',
      firearm_id: 1,
      ammo_id: 10,
      rounds_fired: 50,
      date: '2026-09-13',
      location: 'Eagle Eye Precision Shooting Complex',
      cost: 20,
      notes: 'Precision zero verification',
      optic_name: 'Vortex Razor HD Gen III 1-10x',
      malfunctions: [{ type: 'FTF', count: 1 }],
      timestamp: Date.now(),
      group_metrics: {
        moa: 0.68,
        extremeSpreadInches: 0.71,
        meanRadiusInches: 0.24,
        shotCount: 5,
        distanceYards: 100,
      },
      chrono_data: {
        avg: 2650,
        sd: 8.2,
        es: 19,
        shots: [2645, 2655, 2650, 2642, 2658],
      },
    },
  ];

  const logRangeSessionMock = vi.fn().mockResolvedValue({ success: true });
  const addTargetAnalysisMock = vi.fn().mockResolvedValue({ success: true });
  const addChronoStringMock = vi.fn().mockResolvedValue({ success: true });
  const removeSyncItemMock = vi.fn().mockResolvedValue(true);

  beforeEach(() => {
    localStorage.clear();
    (window as any).api = {
      getConfig: vi.fn().mockResolvedValue(['ballistics', 'maintenance']),
      setConfig: vi.fn().mockResolvedValue(undefined),
      getSyncQueue: vi.fn().mockResolvedValue(mockRangeSyncQueue),
      getAmmo: vi
        .fn()
        .mockResolvedValue([
          { id: 10, manufacturer: 'Federal', caliber: '.308 Win', grain: 168, count: 200 },
        ]),
      getFirearms: vi
        .fn()
        .mockResolvedValue([
          { id: 1, make: 'Tikka', model: 'T3x Tac A1', caliber: '.308 Win', round_count: 350 },
        ]),
      getComponents: vi.fn().mockResolvedValue([]),
      getAccessories: vi.fn().mockResolvedValue([]),
      getSkus: vi.fn().mockResolvedValue({}),
      getLocalIp: vi.fn().mockResolvedValue('192.168.1.100'),
      onSyncReceived: vi.fn().mockReturnValue(() => {}),
      onDevicePaired: vi.fn().mockReturnValue(() => {}),
      logRangeSession: logRangeSessionMock,
      addTargetAnalysis: addTargetAnalysisMock,
      addChronoString: addChronoStringMock,
      removeSyncItem: removeSyncItemMock,
      getModuleArchives: vi.fn().mockResolvedValue({}),
    };
  });

  it('renders range session card with MOA group, chrono telemetry, facility, optic, and stoppage badges', async () => {
    render(
      <MemoryRouter>
        <ModuleProvider>
          <SyncInbox />
        </ModuleProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText('Range Trip Session')).toBeInTheDocument();
    expect(screen.getByText(/Tikka T3x Tac A1/i)).toBeInTheDocument();
    expect(screen.getByText(/50 rounds/i)).toBeInTheDocument();
    expect(screen.getByText(/Facility: Eagle Eye Precision Shooting Complex/i)).toBeInTheDocument();
    expect(screen.getByText(/Lane Fee: \$20/i)).toBeInTheDocument();
    expect(screen.getByText(/Mounted Optic: Vortex Razor HD Gen III 1-10x/i)).toBeInTheDocument();
    expect(screen.getByText(/0.68 MOA Group/i)).toBeInTheDocument();
    expect(screen.getByText(/Chrono: 2650 fps Avg/i)).toBeInTheDocument();
    expect(screen.getByText(/Stoppages: 1x FTF/i)).toBeInTheDocument();
  });

  it('approves range session, updating round counts and persisting target analysis and chrono telemetry', async () => {
    render(
      <MemoryRouter>
        <ModuleProvider>
          <SyncInbox />
        </ModuleProvider>
      </MemoryRouter>
    );

    const approveBtn = await screen.findByText('Approve');
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(logRangeSessionMock).toHaveBeenCalledWith(
        expect.objectContaining({
          firearm_id: 1,
          rounds_fired: 50,
          location: 'Eagle Eye Precision Shooting Complex',
        })
      );
      expect(addTargetAnalysisMock).toHaveBeenCalledWith(
        expect.objectContaining({
          moa: 0.68,
          extreme_spread_inches: 0.71,
          shot_count: 5,
        })
      );
      expect(addChronoStringMock).toHaveBeenCalledWith(
        expect.objectContaining({
          firearm_id: 1,
          avg: 2650,
          sd: 8.2,
        })
      );
      expect(removeSyncItemMock).toHaveBeenCalledWith(201);
    });
  });
});
