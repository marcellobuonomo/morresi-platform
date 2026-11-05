import { describe, expect, it } from 'vitest';
import { rangeLabel, startOfWeek, stepDate, visibleRange } from './agenda-dates';

describe('visibleRange', () => {
  it('shows Monday to Sunday for the week', () => {
    expect(visibleRange('week', '2026-11-05')).toEqual({ from: '2026-11-02', to: '2026-11-08' });
  });

  it('shows whole weeks for the month, like Fresha', () => {
    expect(visibleRange('month', '2026-11-05')).toEqual({ from: '2026-10-26', to: '2026-12-06' });
  });

  it('shows three days from the date', () => {
    expect(visibleRange('3days', '2026-10-31')).toEqual({ from: '2026-10-31', to: '2026-11-02' });
  });
});

describe('stepDate', () => {
  it('moves by the size of the view', () => {
    expect(stepDate('3days', '2026-11-05', 1)).toBe('2026-11-08');
    expect(stepDate('week', '2026-11-05', -1)).toBe('2026-10-29');
    expect(stepDate('month', '2026-01-31', 1)).toBe('2026-02-01');
  });
});

describe('startOfWeek', () => {
  it('returns Monday also on Sunday', () => {
    expect(startOfWeek('2026-11-08')).toBe('2026-11-02');
  });
});

describe('rangeLabel', () => {
  it('formats labels like Fresha', () => {
    expect(rangeLabel('day', '2026-11-05')).toBe('gio 5 nov');
    expect(rangeLabel('week', '2026-11-05')).toBe('02–08 nov 2026');
    expect(rangeLabel('3days', '2026-10-31')).toBe('31 ott–02 nov 2026');
    expect(rangeLabel('month', '2026-11-05')).toBe('novembre 2026');
  });
});
