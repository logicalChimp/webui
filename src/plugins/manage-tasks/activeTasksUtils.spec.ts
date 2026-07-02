import { countSeriesInTask, getScheduleStatusForTask } from './activeTasksUtils';
import { Schedule } from './activeTasksTypes';

describe('plugins/manage-tasks/activeTasksUtils countSeriesInTask', () => {
  it('counts a flat array of series names', () => {
    const task = { config: { series: ['Show A', 'Show B'] }, name: 'test-task' };
    expect(countSeriesInTask(task)).toBe(2);
  });

  it('counts series nested in an object-form group, excluding the group header and settings', () => {
    const task = {
      config: { series: { hdtv: ['Show X', 'Show Y'], settings: { quality: '720p' } } },
      name: 'test-task',
    };
    expect(countSeriesInTask(task)).toBe(2);
  });

  it('counts series across multiple object-form groups', () => {
    const task = {
      config: { series: { hdtv: ['Show X'], bluray: ['Show Y', 'Show Z'] } },
      name: 'test-task',
    };
    expect(countSeriesInTask(task)).toBe(3);
  });

  it('counts series nested in array-form groups, excluding the group headers', () => {
    const task = {
      config: { series: [{ hdtv: ['Show X'] }, { bluray: ['Show Y', 'Show Z'] }] },
      name: 'test-task',
    };
    expect(countSeriesInTask(task)).toBe(3);
  });

  it('counts a mix of plain entries and array-form groups', () => {
    const task = {
      config: { series: ['Show A', { hdtv: ['Show X', 'Show Y'] }] },
      name: 'test-task',
    };
    expect(countSeriesInTask(task)).toBe(3);
  });

  it('counts a per-series settings entry as a single series', () => {
    const task = {
      config: { series: [{ 'Show A': { begin: 'S01E01' } }, 'Show B'] },
      name: 'test-task',
    };
    expect(countSeriesInTask(task)).toBe(2);
  });

  it('excludes a top-level settings entry from an array-form series list', () => {
    const task = {
      config: { series: ['Show A', { settings: { quality: '720p' } }] },
      name: 'test-task',
    };
    expect(countSeriesInTask(task)).toBe(1);
  });

  it('supports records without a config wrapper', () => {
    const task = { series: ['Show A', 'Show B', 'Show C'] };
    expect(countSeriesInTask(task)).toBe(3);
  });

  it('returns 0 when there is no series config', () => {
    expect(countSeriesInTask({ config: {}, name: 'test-task' })).toBe(0);
  });

  it('returns 0 for null/undefined/non-object input', () => {
    expect(countSeriesInTask(null as any)).toBe(0);
    expect(countSeriesInTask(undefined as any)).toBe(0);
  });
});

describe('plugins/manage-tasks/activeTasksUtils getScheduleStatusForTask', () => {
  it('returns undefined when no schedule references the task', () => {
    const schedules: Schedule[] = [{ tasks: 'other-task', interval: {} }];
    expect(getScheduleStatusForTask(schedules, 'my-task')).toBeUndefined();
  });

  it('returns "Interval" for a single matching schedule with an interval key (string tasks value)', () => {
    const schedules: Schedule[] = [{ tasks: 'my-task', interval: {} }];
    expect(getScheduleStatusForTask(schedules, 'my-task')).toBe('Interval');
  });

  it('returns "Schedule" for a single matching schedule with a schedule key (list tasks value)', () => {
    const schedules: Schedule[] = [{ tasks: ['task-a', 'my-task'], schedule: {} }];
    expect(getScheduleStatusForTask(schedules, 'my-task')).toBe('Schedule');
  });

  it('returns "Interval" when every matching schedule for the task has an interval key', () => {
    const schedules: Schedule[] = [
      { tasks: 'my-task', interval: {} },
      { tasks: ['my-task'], interval: {} },
    ];
    expect(getScheduleStatusForTask(schedules, 'my-task')).toBe('Interval');
  });

  it('returns "both" when at least two schedules for the task exist, one with interval and another with schedule', () => {
    const schedules: Schedule[] = [
      { tasks: 'my-task', interval: {} },
      { tasks: ['my-task'], schedule: {} },
    ];
    expect(getScheduleStatusForTask(schedules, 'my-task')).toBe('both');
  });

  it('groups only the schedules for the given task and ignores schedules for other tasks', () => {
    const schedules: Schedule[] = [
      { tasks: 'my-task', interval: {} },
      { tasks: 'other-task', schedule: {} },
    ];
    expect(getScheduleStatusForTask(schedules, 'my-task')).toBe('Interval');
  });
});
