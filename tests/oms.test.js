import { describe, it, expect } from 'vitest';
import { OrderManagementSystem, STATES, VALID_TRANSITIONS } from '../server/oms';

// Exercises the OMS's real, exported pure logic. No database or test doubles:
// the generator methods and the transition table are exercised directly.
const oms = new OrderManagementSystem(null, null, null);

describe('STATES', () => {
  it('defines the full order lifecycle', () => {
    expect(STATES.PENDING).toBe('pending');
    expect(STATES.COMPLETED).toBe('completed');
    expect(STATES.CANCELLED).toBe('cancelled');
    expect(STATES.FAILED).toBe('failed');
    expect(Object.keys(STATES).length).toBeGreaterThanOrEqual(10);
  });
});

describe('VALID_TRANSITIONS integrity', () => {
  it('only references known states', () => {
    const known = new Set(Object.values(STATES));
    for (const [from, targets] of Object.entries(VALID_TRANSITIONS)) {
      expect(known.has(from)).toBe(true);
      for (const to of targets) expect(known.has(to)).toBe(true);
    }
  });

  it('treats CANCELLED as terminal', () => {
    expect(VALID_TRANSITIONS[STATES.CANCELLED]).toEqual([]);
  });

  it('does not allow transitions out of COMPLETED', () => {
    expect(VALID_TRANSITIONS[STATES.COMPLETED]).toBeUndefined();
  });

  it('allows the service lifecycle path pending -> ... -> completed', () => {
    const path = [
      STATES.PENDING,
      STATES.INVENTORY_VALIDATED,
      STATES.RIDER_ASSIGNED,
      STATES.ARRIVED,
      STATES.SERVICE_STARTED,
      STATES.COMPLETED,
    ];
    for (let i = 0; i < path.length - 1; i++) {
      expect(VALID_TRANSITIONS[path[i]].includes(path[i + 1])).toBe(true);
    }
  });

  it('allows FAILED to retry back to PENDING', () => {
    expect(VALID_TRANSITIONS[STATES.FAILED]).toContain(STATES.PENDING);
  });

  it('forbids skipping directly from PENDING to COMPLETED', () => {
    expect(VALID_TRANSITIONS[STATES.PENDING]).not.toContain(STATES.COMPLETED);
  });
});

describe('OMS id + key generation', () => {
  it('generates well-formed idempotency keys', () => {
    const key = oms.generateIdempotencyKey();
    expect(key).toMatch(/^ik_[a-f0-9]+$/);
  });

  it('generates unique keys', () => {
    const keys = new Set(Array.from({ length: 50 }, () => oms.generateIdempotencyKey()));
    expect(keys.size).toBe(50);
  });

  it('generates order ids with the ORD- prefix', () => {
    expect(oms.generateOrderId()).toMatch(/^ORD-/);
  });
});
