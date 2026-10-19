import { describe, expect, it } from 'vitest';
import { HOURLY, SALARIES, salaryPath, TAKE_HOME } from './data';

describe('programmatic page lists', () => {
  it('has hundreds of unique pages and the minimum wage rates', () => {
    expect(new Set(SALARIES.map(salaryPath)).size).toBe(SALARIES.length);
    expect(SALARIES.length + HOURLY.length + TAKE_HOME.length).toBeGreaterThan(600); // full build
    expect(HOURLY).toContain(14.15);
    expect(HOURLY).toContain(14.94);
  });
});
