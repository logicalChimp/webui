import { useEffect, useState, useCallback } from 'react';
import YAML from 'yaml';
import { useFlexgetAPI } from 'core/api';
import { Method } from 'utils/fetch';

export const useGetTaskConfig = (taskName: string) => {
  const [config, setConfig] = useState('');
  const [state, request] = useFlexgetAPI<Record<string, any>>(
    `/tasks/${encodeURIComponent(taskName)}`,
  );

  const fetch = useCallback(async () => {
    if (!taskName) return;
    const resp = await request();
    if (resp.ok) {
      setConfig(YAML.stringify(resp.data));
    }
  }, [request, taskName]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { ...state, config };
};

// Callers build their own request body (rather than this hook wrapping a
// `{ name, config }` shape itself) since each has different source data:
// EditTask's parsed YAML already carries its own top-level `config` key,
// while BackfillEpisodes unwraps one first. See EditTask.tsx's create-mode
// submit handler for the "config added first, name added second" pattern.
export const useCreateTask = () => {
  const [state, request] = useFlexgetAPI<Record<string, any>>('/tasks', Method.Post);
  const create = useCallback((body: Record<string, any>) => request(body), [request]);
  return [state, create] as const;
};

export const useDeleteTask = (name: string) =>
  useFlexgetAPI(`/tasks/${encodeURIComponent(name)}`, Method.Delete);
