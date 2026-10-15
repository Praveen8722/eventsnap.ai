import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatCurrency, formatRelativeTime, formatSignedCurrency, parseCurrency, parseRelativeTime } from '../src/utils/format.js';
import { storageStatus } from '../src/services/mappers.js';

describe('format utils', () => {
  it('round-trips currency strings', () => {
    for (const value of ['$48,200', '$0', '$3,800']) assert.equal(formatCurrency(parseCurrency(value)), value);
    for (const value of ['+$299.00', '-$248.00', '+$1,164.50']) assert.equal(formatSignedCurrency(parseCurrency(value)), value);
  });

  it('round-trips relative times', () => {
    const now = new Date('2024-01-15T12:00:00Z');
    for (const value of ['3 min ago', '1h ago', '23h ago', '2d ago']) {
      assert.equal(formatRelativeTime(parseRelativeTime(value, now), now), value);
    }
    assert.equal(formatRelativeTime(parseRelativeTime('2m ago', now), now), '2 min ago');
    assert.equal(formatRelativeTime(now, now), 'just now');
  });
});

describe('storageStatus', () => {
  it('flags usage at 90% of the limit as a warning and above the limit as exceeded', () => {
    assert.equal(storageStatus(44.9, 50), 'ok');
    assert.equal(storageStatus(45, 50), 'warning');
    assert.equal(storageStatus(50, 50), 'warning');
    assert.equal(storageStatus(50.1, 50), 'exceeded');
  });
});
