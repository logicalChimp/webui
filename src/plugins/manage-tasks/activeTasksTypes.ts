export interface Task {
  id: number;
  name: string;
  config?: Record<string, any>;
}

export interface Execution {
  start: string;
  succeeded: boolean;
}

export interface TaskStatus {
  name: string;
  lastExecution: Execution;
}

export interface Schedule {
  tasks: string | string[];
  interval?: Record<string, any>;
  schedule?: Record<string, any>;
}

export type ScheduleStatus = 'Interval' | 'Schedule' | 'both';

export const enum Column {
  Name = 'name',
  ExecStatus = 'execStatus',
  ExecTime = 'execTime',
  Scheduled = 'scheduled',
  Type = 'type',
  SeriesCount = 'seriesCount',
  Actions = 'actions',
}
