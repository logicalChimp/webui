import YAML from 'yaml';
import { extractGroupNames, applySelectedSeries } from './utils';

// All extractGroupNames inputs are wrapped under a top-level 'config' key,
// which is the mandatory root element for a Flexget task config.

const y = (config: Record<string, any>) => YAML.stringify({ config, name: 'test-task' });

// ---------------------------------------------------------------------------
// extractGroupNames
// ---------------------------------------------------------------------------

describe('extractGroupNames', () => {
  it('returns [] for an empty string', () => {
    expect(extractGroupNames('')).toEqual([]);
  });

  it('returns [] for invalid YAML', () => {
    expect(extractGroupNames('{ not: valid yaml: [')).toEqual([]);
  });

  it('returns [] when config has no series key', () => {
    expect(extractGroupNames(y({ rss: 'http://example.com' }))).toEqual([]);
  });

  it('returns [] for a flat array of series names (no groups)', () => {
    expect(extractGroupNames(y({ series: ['Breaking Bad', 'The Wire'] }))).toEqual([]);
  });

  it('returns [] when the only series entry is a non-array object', () => {
    expect(extractGroupNames(y({ series: [{ settings: { quality: '720p' } }] }))).toEqual([]);
  });

  it('returns the single group name from array format', () => {
    expect(
      extractGroupNames(y({ series: [{ GroupA: ['Show X', 'Show Y'] }] })),
    ).toEqual(['GroupA']);
  });

  it('returns multiple group names from array format', () => {
    expect(
      extractGroupNames(
        y({ series: [{ GroupA: ['Show X'] }, { GroupB: ['Show Y'] }] }),
      ),
    ).toEqual(['GroupA', 'GroupB']);
  });

  it('excludes settings from array format even when settings has an array value', () => {
    expect(
      extractGroupNames(
        y({ series: [{ settings: [{ quality: '720p' }] }, { GroupA: ['Show X'] }] }),
      ),
    ).toEqual(['GroupA']);
  });

  it('ignores flat string entries alongside group entries in array format', () => {
    expect(
      extractGroupNames(y({ series: ['Flat Show', { GroupA: ['Show X'] }] })),
    ).toEqual(['GroupA']);
  });

  it('returns group names from object format', () => {
    expect(
      extractGroupNames(y({ series: { GroupA: ['Show X'], GroupB: ['Show Y'] } })),
    ).toEqual(['GroupA', 'GroupB']);
  });

  it('excludes settings from object format', () => {
    expect(
      extractGroupNames(
        y({ series: { GroupA: ['Show X'], settings: { quality: '720p' } } }),
      ),
    ).toEqual(['GroupA']);
  });

  it('returns [] when series is a plain string (scalar)', () => {
    expect(extractGroupNames(y({ series: 'Show A' }))).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// applySelectedSeries
// ---------------------------------------------------------------------------

const flatConfig = (series: any[], extra: Record<string, any> = {}) =>
  YAML.stringify({ config: { series, ...extra }, name: 'test-task' });

const objectConfig = (series: Record<string, any>, extra: Record<string, any> = {}) =>
  YAML.stringify({ config: { series, ...extra }, name: 'test-task' });

const parsed = (yaml: string) => YAML.parse(yaml);

describe('applySelectedSeries', () => {
  // -------------------------------------------------------------------------
  // Flat array format
  // -------------------------------------------------------------------------

  describe('flat array series', () => {
    it('appends new series to an existing flat list', () => {
      const input = flatConfig(['Show A', 'Show B']);
      const result = parsed(applySelectedSeries(input, ['New Show'], ''));
      expect(result.config.series).toEqual(['Show A', 'Show B', 'New Show']);
    });

    it('does not duplicate series already present in the list', () => {
      const input = flatConfig(['Show A', 'Show B']);
      const result = parsed(applySelectedSeries(input, ['Show A', 'New Show'], ''));
      expect(result.config.series).toEqual(['Show A', 'Show B', 'New Show']);
    });

    it('appends multiple selected series', () => {
      const input = flatConfig(['Show A']);
      const result = parsed(applySelectedSeries(input, ['New Show 1', 'New Show 2'], ''));
      expect(result.config.series).toEqual(['Show A', 'New Show 1', 'New Show 2']);
    });

    it('preserves other config keys and the name field', () => {
      const input = flatConfig(['Show A'], { rss: 'http://example.com' });
      const result = parsed(applySelectedSeries(input, ['New Show'], ''));
      expect(result.name).toBe('test-task');
      expect(result.config.rss).toBe('http://example.com');
    });
  });

  // -------------------------------------------------------------------------
  // Array format with a single group
  // -------------------------------------------------------------------------

  describe('array format — single group', () => {
    it('appends to the group when there is exactly one group', () => {
      const input = flatConfig([{ GroupA: ['Show X'] }]);
      const result = parsed(applySelectedSeries(input, ['New Show'], ''));
      const groupA = result.config.series.find((e: any) => e.GroupA);
      expect(groupA.GroupA).toEqual(['Show X', 'New Show']);
    });

    it('does not duplicate series already in the group', () => {
      const input = flatConfig([{ GroupA: ['Show X', 'New Show'] }]);
      const result = parsed(applySelectedSeries(input, ['New Show'], ''));
      const groupA = result.config.series.find((e: any) => e.GroupA);
      expect(groupA.GroupA).toEqual(['Show X', 'New Show']);
    });

    it('ignores settings entry and still appends to the real group', () => {
      const input = flatConfig([{ settings: { quality: '720p' } }, { GroupA: ['Show X'] }]);
      const result = parsed(applySelectedSeries(input, ['New Show'], ''));
      const groupA = result.config.series.find((e: any) => e.GroupA);
      expect(groupA.GroupA).toEqual(['Show X', 'New Show']);
    });
  });

  // -------------------------------------------------------------------------
  // Array format with multiple groups
  // -------------------------------------------------------------------------

  describe('array format — multiple groups', () => {
    it('appends to the selectedGroup when multiple groups exist', () => {
      const input = flatConfig([{ GroupA: ['Show X'] }, { GroupB: ['Show Y'] }]);
      const result = parsed(applySelectedSeries(input, ['New Show'], 'GroupB'));
      const groupA = result.config.series.find((e: any) => e.GroupA);
      const groupB = result.config.series.find((e: any) => e.GroupB);
      expect(groupA.GroupA).toEqual(['Show X']);
      expect(groupB.GroupB).toEqual(['Show Y', 'New Show']);
    });

    it('leaves config unchanged when no group is selected', () => {
      const input = flatConfig([{ GroupA: ['Show X'] }, { GroupB: ['Show Y'] }]);
      const result = parsed(applySelectedSeries(input, ['New Show'], ''));
      const groupA = result.config.series.find((e: any) => e.GroupA);
      const groupB = result.config.series.find((e: any) => e.GroupB);
      expect(groupA.GroupA).toEqual(['Show X']);
      expect(groupB.GroupB).toEqual(['Show Y']);
    });
  });

  // -------------------------------------------------------------------------
  // Object format
  // -------------------------------------------------------------------------

  describe('object format series', () => {
    it('appends to the group when only one group exists (single group auto-select)', () => {
      const input = objectConfig({ GroupA: ['Show X'] });
      const result = parsed(applySelectedSeries(input, ['New Show'], ''));
      expect(result.config.series.GroupA).toEqual(['Show X', 'New Show']);
    });

    it('does not duplicate series already in the group', () => {
      const input = objectConfig({ GroupA: ['Show X', 'New Show'] });
      const result = parsed(applySelectedSeries(input, ['New Show'], ''));
      expect(result.config.series.GroupA).toEqual(['Show X', 'New Show']);
    });

    it('ignores settings and auto-selects the real group when only one group besides settings', () => {
      const input = objectConfig({ GroupA: ['Show X'], settings: { quality: '720p' } });
      const result = parsed(applySelectedSeries(input, ['New Show'], ''));
      expect(result.config.series.GroupA).toEqual(['Show X', 'New Show']);
      expect(result.config.series.settings).toEqual({ quality: '720p' });
    });

    it('appends to the selectedGroup when multiple groups exist', () => {
      const input = objectConfig({ GroupA: ['Show X'], GroupB: ['Show Y'] });
      const result = parsed(applySelectedSeries(input, ['New Show'], 'GroupA'));
      expect(result.config.series.GroupA).toEqual(['Show X', 'New Show']);
      expect(result.config.series.GroupB).toEqual(['Show Y']);
    });

    it('leaves config unchanged when multiple groups exist and no group is selected', () => {
      const input = objectConfig({ GroupA: ['Show X'], GroupB: ['Show Y'] });
      const result = parsed(applySelectedSeries(input, ['New Show'], ''));
      expect(result.config.series.GroupA).toEqual(['Show X']);
      expect(result.config.series.GroupB).toEqual(['Show Y']);
    });

    it('handles an initially empty group array', () => {
      const input = objectConfig({ GroupA: [] });
      const result = parsed(applySelectedSeries(input, ['New Show'], ''));
      expect(result.config.series.GroupA).toEqual(['New Show']);
    });
  });
});
