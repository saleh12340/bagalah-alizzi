import { describe, it, expect } from 'vitest';
import { bluetoothAvailable, exportBackupJson } from '@/lib/printer';

describe('printer', () => {
  it('exports bluetoothAvailable and exportBackupJson functions', () => {
    expect(typeof bluetoothAvailable).toBe('function');
    expect(bluetoothAvailable()).toBe(false);
    expect(typeof exportBackupJson).toBe('function');
  });
});
