import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatBytes, formatCurrency, formatRelativeTime, formatSignedCurrency, parseCurrency, parseRelativeTime, toDateString } from '../src/utils/format.js';
import { maskEmail, maskPhone } from '../src/utils/mask.js';
import { storageStatus } from '../src/services/mappers.js';

describe('format utils', () => {
  it('formats rupees with Indian digit grouping and round-trips them', () => {
    assert.equal(formatCurrency(1234567), '₹12,34,567');
    assert.equal(formatCurrency(0), '₹0');
    assert.equal(formatCurrency(undefined), '₹0');
    for (const value of ['₹48,200', '₹0', '₹3,800']) assert.equal(formatCurrency(parseCurrency(value)), value);
    for (const value of ['+₹299', '-₹248', '+₹1,00,000']) assert.equal(formatSignedCurrency(parseCurrency(value)), value);
  });

  it('formats byte sizes', () => {
    assert.equal(formatBytes(0), '0 B');
    assert.equal(formatBytes(1536), '1.5 KB');
    assert.equal(formatBytes(2.8 * 1024 ** 3), '2.8 GB');
  });

  it('formats dates defensively', () => {
    assert.equal(toDateString(new Date('2024-01-15T10:00:00Z')), '2024-01-15');
    assert.equal(toDateString(null), '');
    assert.equal(toDateString('not a date'), '');
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

describe('masking client contact details', () => {
  it('masks emails and phones', () => {
    assert.equal(maskEmail('rahul.k@gmail.com'), 'r***@gmail.com');
    assert.equal(maskEmail(''), '');
    assert.equal(maskEmail('no-at-sign'), '***');
    assert.equal(maskPhone('9876543210'), '98****3210');
    assert.equal(maskPhone('+91 98765 43210'), '98****3210');
    assert.equal(maskPhone(''), '');
    assert.equal(maskPhone('12345'), '***45');
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
