// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

describe('widget', () => {
  it('exposes OpenPAYE.calculate matching the engine', async () => {
    const doc = { currentScript: null, readyState: 'complete', querySelectorAll: () => [], getElementById: () => ({}), head: { appendChild() {} }, createElement: () => ({}) };
    vi.stubGlobal('document', doc);
    vi.stubGlobal('window', globalThis);
    await import('./widget');
    const r = (globalThis as any).OpenPAYE.calculate({ salary: 50000, year: 2026 });
    expect(r.netMonthly).toBeCloseTo(39648.43 / 12, 2);
  });
});
