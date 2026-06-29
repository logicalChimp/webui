import YAML from 'yaml';

export const extractGroupNames = (taskConfig: string): string[] => {
  try {
    const parsed = YAML.parse(taskConfig);
    if (!parsed || typeof parsed !== 'object') return [];
    const target = parsed.config && typeof parsed.config === 'object' ? parsed.config : parsed;
    const seriesConfig = target.series;
    if (!seriesConfig) return [];
    if (Array.isArray(seriesConfig)) {
      return seriesConfig
        .filter(
          (e: any) =>
            e &&
            typeof e === 'object' &&
            Object.keys(e)[0] !== 'settings' &&
            Object.values(e).some((v) => Array.isArray(v)),
        )
        .map((e: any) => Object.keys(e)[0]);
    }
    if (typeof seriesConfig === 'object') {
      return Object.keys(seriesConfig).filter((k) => k !== 'settings');
    }
    return [];
  } catch {
    return [];
  }
};

const appendToGroup = (
  groupSeries: any[],
  groupKey: string,
  container: any,
  toAdd: string[],
) => {
  const existingNames = new Set(
    groupSeries.map((e: any) => (typeof e === 'string' ? e : Object.keys(e)[0])),
  );
  container[groupKey] = [...groupSeries, ...toAdd.filter((name) => !existingNames.has(name))];
};

export const applySelectedSeries = (
  taskConfigYaml: string,
  selectedSeries: string[],
  selectedGroup: string,
): string => {
  const parsed = YAML.parse(taskConfigYaml) ?? {};
  const target = parsed.config && typeof parsed.config === 'object' ? parsed.config : parsed;

  if (Array.isArray(target.series)) {
    const existing: any[] = target.series;
    const groupEntries = existing.filter(
      (e: any) =>
        e &&
        typeof e === 'object' &&
        Object.keys(e)[0] !== 'settings' &&
        Object.values(e).some((v) => Array.isArray(v)),
    );

    if (groupEntries.length === 1) {
      const groupEntry = groupEntries[0];
      const groupName = Object.keys(groupEntry)[0];
      appendToGroup(
        Array.isArray(groupEntry[groupName]) ? groupEntry[groupName] : [],
        groupName,
        groupEntry,
        selectedSeries,
      );
    } else if (groupEntries.length > 1 && selectedGroup) {
      const groupEntry = groupEntries.find((e: any) => Object.keys(e)[0] === selectedGroup);
      if (groupEntry) {
        appendToGroup(
          Array.isArray(groupEntry[selectedGroup]) ? groupEntry[selectedGroup] : [],
          selectedGroup,
          groupEntry,
          selectedSeries,
        );
      }
    } else if (groupEntries.length === 0) {
      const existingNames = new Set(
        existing.map((e: any) => (typeof e === 'string' ? e : Object.keys(e)[0])),
      );
      target.series = [...existing, ...selectedSeries.filter((name) => !existingNames.has(name))];
    }
    // multiple groups but no selectedGroup → leave config unchanged
  } else if (target.series && typeof target.series === 'object') {
    const groupNames = Object.keys(target.series).filter((k) => k !== 'settings');
    const targetGroupName = groupNames.length === 1 ? groupNames[0] : selectedGroup;
    if (targetGroupName) {
      const groupSeries = Array.isArray(target.series[targetGroupName])
        ? target.series[targetGroupName]
        : [];
      appendToGroup(groupSeries, targetGroupName, target.series, selectedSeries);
    }
  }

  return YAML.stringify(parsed);
};
