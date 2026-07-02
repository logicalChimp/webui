import { Schedule, ScheduleStatus } from './activeTasksTypes';

// Mirrors the group/series-entry detection in ./addSeriesUtils (extractGroupNames,
// appendToGroup's existingNames) so a task's series count is derived using the same
// logic that page uses to detect existing series (and, like that logic, excludes
// group headers/'settings' from the result).
const isGroupEntry = (entry: any) =>
  entry && typeof entry === 'object' && Object.values(entry).some(v => Array.isArray(v));

export const countSeriesInTask = (task: Record<string, any>): number => {
  if (!task || typeof task !== 'object') return 0;
  const target = task.config && typeof task.config === 'object' ? task.config : task;
  const seriesConfig = target.series;
  if (!seriesConfig) return 0;

  if (Array.isArray(seriesConfig)) {
    return seriesConfig.reduce((count: number, entry: any) => {
      if (typeof entry === 'string') return count + 1;
      if (entry && typeof entry === 'object') {
        const key = Object.keys(entry)[0];
        if (key === 'settings') return count;
        if (isGroupEntry(entry)) {
          const groupSeries = Array.isArray(entry[key]) ? entry[key] : [];
          return count + groupSeries.length;
        }
        return count + 1;
      }
      return count;
    }, 0);
  }

  if (typeof seriesConfig === 'object') {
    return Object.entries(seriesConfig)
      .filter(([key]) => key !== 'settings')
      .reduce((count, [, value]) => count + (Array.isArray(value) ? value.length : 0), 0);
  }

  return 0;
};

// Groups all schedules that reference the given task, then classifies them:
// 'Interval' if any grouped schedule has an 'interval' key, 'Schedule' if any has
// a 'schedule' key, or 'both' if there are at least two schedules for the task and
// at least one has 'interval' while another has 'schedule'.
export const getScheduleStatusForTask = (
  schedules: Schedule[],
  taskName: string,
): ScheduleStatus | undefined => {
  const taskSchedules = schedules.filter(({ tasks }) =>
    Array.isArray(tasks) ? tasks.includes(taskName) : tasks === taskName,
  );

  if (taskSchedules.length === 0) return undefined;

  const hasInterval = taskSchedules.some(s => 'interval' in s);
  const hasSchedule = taskSchedules.some(s => 'schedule' in s);

  if (taskSchedules.length >= 2 && hasInterval && hasSchedule) return 'both';
  if (hasInterval) return 'Interval';
  if (hasSchedule) return 'Schedule';
  return undefined;
};
