import { useCallback, useEffect, useState } from 'react';
import { useFlexgetAPI } from 'core/api';
import { Schedule, Task, TaskStatus } from './activeTasksTypes';

export const useGetTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [state, request] = useFlexgetAPI<Task[]>('/tasks');

  const refresh = useCallback(async () => {
    const resp = await request();
    if (resp.ok) {
      setTasks(resp.data);
    }
  }, [request]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ...state, tasks };
};

// Fetches the complete set of task statuses (not just a page) so they can be
// matched against the full task list on the client. See CLAUDE.md "Fetching
// complete record sets".
export const useGetTaskStatuses = () => {
  const [statuses, setStatuses] = useState<TaskStatus[]>([]);
  const [state, request] = useFlexgetAPI<TaskStatus[]>('/tasks/status?per_page=10000');

  const refresh = useCallback(async () => {
    const resp = await request();
    if (resp.ok) {
      setStatuses(resp.data);
    }
  }, [request]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ...state, statuses };
};

export const useGetSchedules = () => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [state, request] = useFlexgetAPI<Schedule[]>('/schedules');

  const refresh = useCallback(async () => {
    const resp = await request();
    if (resp.ok) {
      setSchedules(resp.data);
    }
  }, [request]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ...state, schedules };
};
