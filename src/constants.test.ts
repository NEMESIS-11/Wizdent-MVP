import { describe, it, expect } from 'vitest';
import { getTerritoryName, getTerritoryByCode, getTerritoryInfo, TERRITORIES } from './constants';

describe('Territory Utilities', () => {
  describe('getTerritoryName', () => {
    it('should return the correct name for a valid code', () => {
      expect(getTerritoryName('DL01')).toBe('Delhi - North');
    });

    it('should return the code itself if the territory is not found', () => {
      const invalidCode = 'UNKNOWN_99';
      expect(getTerritoryName(invalidCode)).toBe(invalidCode);
    });
  });

  describe('getTerritoryByCode', () => {
    it('should return the territory object for a valid code', () => {
      const territory = getTerritoryByCode('MH01');
      expect(territory).toEqual({
        code: 'MH01',
        name: 'Mumbai - South',
        region: 'West',
        tier: 1,
      });
    });

    it('should return undefined for an invalid code', () => {
      expect(getTerritoryByCode('NON_EXISTENT')).toBeUndefined();
    });
  });

  describe('getTerritoryInfo', () => {
    it('should return null if identifier is empty or null', () => {
      expect(getTerritoryInfo('')).toBeNull();
    });

    it('should find territory by code (case insensitive)', () => {
      const expected = TERRITORIES.find(t => t.code === 'DL01');
      expect(getTerritoryInfo('dl01')).toEqual(expected);
    });

    it('should find territory by name (case insensitive)', () => {
      const result = getTerritoryInfo('BANGALORE - NORTH');
      expect(result?.code).toBe('KA02');
      expect(result?.name).toBe('Bangalore - North');
    });

    it('should return null if no match is found by code or name', () => {
      expect(getTerritoryInfo('Unknown Territory')).toBeNull();
    });
  });
});