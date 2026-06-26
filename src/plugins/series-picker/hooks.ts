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

export const useUpdateTaskConfig = (taskName: string) => {
  const [state, request] = useFlexgetAPI<Record<string, any>>(
    `/tasks/${encodeURIComponent(taskName)}`,
    Method.Put,
  );
  const update = useCallback(
    (config: Record<string, any>) => request(config),
    [request],
  );
  return [state, update] as const;
};
