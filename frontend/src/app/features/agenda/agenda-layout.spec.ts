import { describe, expect, it } from 'vitest';
import { Appointment } from '../../core/api/models';
import { initials, offShiftRanges, placeAppointments } from './agenda-layout';

const DAY = '2026-10-31';

function appt(start: string, end: string): Appointment {
  return {
    appointmentId: start,
    itemId: start,
    start: `${DAY}T${start}:00`,
    end: `${DAY}T${end}:00`,
    status: 'BOOKED',
    serviceName: 'Gentleman haircut',
    priceMinor: 3000,
    online: false,
    paid: false,
    hasNotes: false,
  };
}

describe('placeAppointments', () => {
  it('places a single appointment at full width', () => {
    const [block] = placeAppointments([appt('10:00', '10:30')], DAY);
    expect(block).toMatchObject({ top: 960, height: 48, left: 0, width: 100 });
  });

  it('puts overlapping appointments side by side', () => {
    const blocks = placeAppointments([appt('17:40', '19:40'), appt('18:00', '18:30')], DAY);
    expect(blocks.map((b) => [b.left, b.width])).toEqual([[0, 50], [50, 50]]);
  });

  it('keeps back-to-back appointments at full width', () => {
    const blocks = placeAppointments([appt('10:00', '10:30'), appt('10:30', '11:00')], DAY);
    expect(blocks.every((b) => b.width === 100)).toBe(true);
  });
});

describe('offShiftRanges', () => {
  it('hatches before and after the shift', () => {
    const ranges = offShiftRanges([{ start: `${DAY}T09:00:00`, end: `${DAY}T18:00:00` }], DAY);
    expect(ranges).toEqual([{ top: 0, height: 864 }, { top: 1728, height: 576 }]);
  });

  it('hatches the whole day without shifts', () => {
    expect(offShiftRanges([], DAY)).toEqual([{ top: 0, height: 2304 }]);
  });
});

describe('initials', () => {
  it('takes first letters of the first two names', () => {
    expect(initials('Giuseppe Peppe')).toBe('GP');
    expect(initials('Samanda')).toBe('S');
  });
});
