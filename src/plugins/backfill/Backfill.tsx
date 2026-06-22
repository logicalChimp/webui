import React, { FC, useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Formik, Form, Field, useFormikContext } from 'formik';
import {
  Box,
  Button,
  Checkbox,
  FormControl,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Theme,
  TextField as MuiTextField,
  Snackbar,
  Tooltip,
  Typography,
} from '@material-ui/core';
import { DragHandle, ExpandLess, ExpandMore } from '@material-ui/icons';
import { css } from '@emotion/core';
import YAML from 'yaml';
import { useInjectPageTitle } from 'core/layout/AppBar/hooks';
import { useFlexgetStream } from 'core/api';
import { Method, camelize } from 'utils/fetch';
import TextField from 'common/inputs/formik/TextField';
import { useGetTaskConfig, useCreateTask, useDeleteTask } from './hooks';

const wrapper = (theme: Theme) => css`
  margin: ${theme.typography.pxToRem(theme.spacing(2))};
  padding: ${theme.typography.pxToRem(theme.spacing(3))};
  display: grid;
  grid-template-columns: max-content 1fr;
  column-gap: ${theme.typography.pxToRem(theme.spacing(3))};
  row-gap: ${theme.typography.pxToRem(theme.spacing(3))};
  align-items: start;

  .MuiOutlinedInput-multiline {
    padding: 12px 14px;
  }
  .MuiOutlinedInput-input:not(.MuiOutlinedInput-inputMultiline) {
    padding-top: 12px;
    padding-bottom: 12px;
  }
`;

const formLabel = (theme: Theme) => css`
  white-space: nowrap;
  color: ${theme.palette.text.secondary};
  font-size: ${theme.typography.body1.fontSize};
  line-height: 1.5;
  padding-top: ${theme.typography.pxToRem(11)};
`;

const inputRow = (theme: Theme) => css`
  display: flex;
  align-items: flex-start;
  gap: ${theme.typography.pxToRem(theme.spacing(2))};
`;

interface FormValues {
  taskName: string;
  autoUpdateTaskName: boolean;
  rssBackfillUrl: string;
  sourceBackfillUrl: string;
  encodedSeriesName: string;
  taskConfig: string;
  selectedSeries: string;
  backfillTaskConfig: string;
}

const applyRssUrl = (obj: Record<string, any>, newUrl: string): boolean => {
  if (typeof obj.rss === 'string') {
    obj.rss = newUrl;
    return true;
  }
  if (obj.rss && typeof obj.rss === 'object' && 'url' in obj.rss) {
    obj.rss.url = newUrl;
    return true;
  }
  return false;
};

const replaceRssUrl = (taskConfig: string, newUrl: string): string => {
  const parsed = YAML.parse(taskConfig);
  if (!parsed || typeof parsed !== 'object') return taskConfig;

  // Handle direct rss key, and the FlexGet task definition format { config: { rss: ... }, name: ... }
  if (!applyRssUrl(parsed, newUrl) && parsed.config && typeof parsed.config === 'object') {
    applyRssUrl(parsed.config, newUrl);
  }

  return YAML.stringify(parsed);
};

const replaceTaskName = (taskConfig: string, taskName: string): string => {
  const parsed = YAML.parse(taskConfig);
  if (!parsed || typeof parsed !== 'object' || !('name' in parsed)) return taskConfig;

  parsed.name = taskName;
  return YAML.stringify(parsed);
};

const extractRssUrl = (taskConfig: string): string => {
  try {
    const parsed = YAML.parse(taskConfig);
    if (!parsed || typeof parsed !== 'object') return '';
    if (typeof parsed.rss === 'string') return parsed.rss;
    if (parsed.rss && typeof parsed.rss === 'object' && 'url' in parsed.rss) return parsed.rss.url;
    if (parsed.config && typeof parsed.config === 'object') {
      if (typeof parsed.config.rss === 'string') return parsed.config.rss;
      if (parsed.config.rss && typeof parsed.config.rss === 'object' && 'url' in parsed.config.rss)
        return parsed.config.rss.url;
    }
  } catch {
    // ignore malformed YAML
  }
  return '';
};

const toKebabCase = (str: string): string =>
  str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const extractSeriesEntry = (entry: any): string[] => {
  if (typeof entry === 'string') return [entry];
  if (entry && typeof entry === 'object') return Object.keys(entry);
  return [];
};

const extractSeriesNames = (taskConfig: string): string[] => {
  try {
    const parsed = YAML.parse(taskConfig);
    if (!parsed || typeof parsed !== 'object') return [];
    const seriesConfig = parsed.config?.series ?? parsed.series;
    if (!seriesConfig) return [];
    if (Array.isArray(seriesConfig)) {
      return seriesConfig.flatMap(extractSeriesEntry);
    }
    if (typeof seriesConfig === 'object') {
      return Object.values(seriesConfig).flatMap((group: any) =>
        Array.isArray(group) ? group.flatMap(extractSeriesEntry) : [],
      );
    }
  } catch {
    // ignore malformed YAML
  }
  return [];
};

const useTextareaResize = () => {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [dragHeight, setDragHeight] = useState<number | undefined>(undefined);

  const onResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = inputRef.current?.clientHeight ?? 80;
    const onMove = (ev: MouseEvent) => {
      setDragHeight(Math.max(startH + ev.clientY - startY, 36));
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, []);

  const resetDragHeight = useCallback(() => setDragHeight(undefined), []);

  return { inputRef, dragHeight, onResizeMouseDown, resetDragHeight };
};

const ResizeHandle: FC<{ onMouseDown: (e: React.MouseEvent) => void }> = ({ onMouseDown }) => (
  <Box
    onMouseDown={onMouseDown}
    style={{
      position: 'absolute',
      bottom: 4,
      right: 4,
      cursor: 'ns-resize',
      color: 'rgba(0,0,0,0.3)',
      display: 'flex',
      userSelect: 'none',
      lineHeight: 0,
    }}
  >
    <DragHandle fontSize="small" />
  </Box>
);

const FormRow: FC<{ label: string }> = ({ label, children }) => (
  <>
    <div css={formLabel}>{label}</div>
    <div>{children}</div>
  </>
);

interface TaskSeriesFieldProps {
  taskParam: string;
}

const TaskSeriesField: FC<TaskSeriesFieldProps> = ({ taskParam }) => {
  const { values, setFieldValue } = useFormikContext<FormValues>();
  const seriesNames = extractSeriesNames(values.taskConfig).sort((a, b) => a.localeCompare(b));
  if (!seriesNames.length) return null;

  const handleChange = (e: React.ChangeEvent<{ value: unknown }>) => {
    const value = e.target.value as string;
    setFieldValue('selectedSeries', value);
    if (values.autoUpdateTaskName) {
      setFieldValue('taskName', `${taskParam}-${toKebabCase(value)}-backfill`);
    }
    setFieldValue('encodedSeriesName', encodeURIComponent(value).replace(/%20/g, '+'));
  };

  return (
    <>
      <div css={formLabel}>Task Series</div>
      <FormControl variant="outlined" fullWidth>
        <Select
          value={values.selectedSeries}
          displayEmpty
          renderValue={v => (v as string) || 'Optional: Select Task Series to Backfill'}
          onChange={handleChange}
        >
          {seriesNames.map(name => (
            <MenuItem key={name} value={name}>
              {name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </>
  );
};

interface BackfillTaskNameRowProps {
  taskParam: string;
}

const BackfillTaskNameRow: FC<BackfillTaskNameRowProps> = ({ taskParam }) => {
  const { values, setFieldValue } = useFormikContext<FormValues>();

  const handleAutoUpdateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setFieldValue('autoUpdateTaskName', checked);
    if (checked && values.selectedSeries) {
      setFieldValue('taskName', `${taskParam}-${toKebabCase(values.selectedSeries)}-backfill`);
    }
  };

  return (
    <>
      <div css={formLabel} style={{ marginTop: 16 }}>Backfill Task Name</div>
      <div css={inputRow} style={{ marginTop: 16 }}>
        <Box flex={1}>
          <TextField name="taskName" variant="outlined" fullWidth />
        </Box>
        <Tooltip title="Automatically update the 'Backfill Task Name' with the chosen 'Task Series' value">
          <Box position="relative" style={{ flexShrink: 0 }}>
            <Typography
              variant="caption"
              color="textSecondary"
              style={{
                position: 'absolute',
                bottom: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                whiteSpace: 'nowrap',
              }}
            >
              Auto update
            </Typography>
            <Checkbox checked={values.autoUpdateTaskName} onChange={handleAutoUpdateChange} />
          </Box>
        </Tooltip>
      </div>
    </>
  );
};

const appendToQueryParam = (url: string, paramName: string, suffix: string): string => {
  const regex = new RegExp(`([?&]${paramName}=)([^&]*)`);
  return url.replace(regex, `$1$2+${suffix}`);
};

const extractQueryParamNames = (url: string): string[] => {
  try {
    return Array.from(new URL(url).searchParams.keys());
  } catch {
    return [];
  }
};

const RssBackfillUrlField: FC = () => {
  const { handleChange, setFieldValue, values } = useFormikContext<FormValues>();
  const [selectedParam, setSelectedParam] = useState('');
  const [autoUpdate, setAutoUpdate] = useState(false);
  const [disabledSnackOpen, setDisabledSnackOpen] = useState(false);
  const paramNames = extractQueryParamNames(values.sourceBackfillUrl);

  useEffect(() => {
    if (!autoUpdate || !selectedParam || !values.encodedSeriesName) return;
    setFieldValue(
      'rssBackfillUrl',
      appendToQueryParam(values.sourceBackfillUrl, selectedParam, values.encodedSeriesName),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.encodedSeriesName]);

  const handleAutoUpdateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setAutoUpdate(checked);
    if (checked && selectedParam && values.encodedSeriesName) {
      setFieldValue(
        'rssBackfillUrl',
        appendToQueryParam(values.sourceBackfillUrl, selectedParam, values.encodedSeriesName),
      );
    }
  };

  return (
    <>
      <div css={formLabel} style={{ marginTop: 16 }}>Backfill RSS URL</div>
      <div style={{ marginTop: 16 }}>
        <div css={inputRow}>
          <Box flex={1}>
            <TextField
              name="rssBackfillUrl"
              variant="outlined"
              fullWidth
              helperText="The RSS feed URL containing the episodes to backfill"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                handleChange(e);
                setFieldValue('sourceBackfillUrl', e.target.value);
              }}
            />
          </Box>
          <Box position="relative" style={{ flexShrink: 0, minWidth: 150 }}>
            <Typography
              variant="caption"
              color="textSecondary"
              style={{
                position: 'absolute',
                bottom: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                whiteSpace: 'nowrap',
              }}
            >
              Query Param
            </Typography>
            <FormControl variant="outlined" fullWidth>
              <Select
                value={selectedParam}
                displayEmpty
                renderValue={v => (v as string) || 'Not set'}
                onChange={e => setSelectedParam(e.target.value as string)}
              >
                {paramNames.map(name => (
                  <MenuItem key={name} value={name}>
                    {name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Tooltip title="Automatically update the 'Backfill RSS URL's 'Query Param' with the chosen 'Task Series' value">
            <Box
              position="relative"
              style={{ flexShrink: 0 }}
              onClick={!selectedParam ? () => setDisabledSnackOpen(true) : undefined}
            >
              <Typography
                variant="caption"
                color="textSecondary"
                style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  whiteSpace: 'nowrap',
                }}
              >
                Auto update
              </Typography>
              <Checkbox
                checked={autoUpdate}
                disabled={!selectedParam}
                onChange={handleAutoUpdateChange}
              />
            </Box>
          </Tooltip>
        </div>
        <Snackbar
          open={disabledSnackOpen}
          autoHideDuration={4000}
          onClose={() => setDisabledSnackOpen(false)}
          message="Please select the Query Param that will be updated, to enable automatic updating"
        />
      </div>
    </>
  );
};

const BackfillTaskConfigField: FC = () => {
  const { values, setFieldValue } = useFormikContext<FormValues>();
  const [expanded, setExpanded] = useState(false);
  const { inputRef, dragHeight, onResizeMouseDown, resetDragHeight } = useTextareaResize();

  useEffect(() => {
    const withRss = replaceRssUrl(values.taskConfig, values.rssBackfillUrl);
    const updated = replaceTaskName(withRss, values.taskName);
    setFieldValue('backfillTaskConfig', updated);
  }, [values.taskConfig, values.rssBackfillUrl, values.taskName, setFieldValue]);

  return (
    <>
      <div css={formLabel} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        Backfill Task Config
        <IconButton size="small" onClick={() => { setExpanded(v => !v); resetDragHeight(); }}>
          {expanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
        </IconButton>
      </div>
      <Box position="relative">
        <TextField
          name="backfillTaskConfig"
          variant="outlined"
          fullWidth
          multiline
          rows={expanded ? 6 : 1}
          inputRef={inputRef}
          InputProps={dragHeight !== undefined ? { style: { height: dragHeight } } : undefined}
          inputProps={dragHeight !== undefined ? { style: { height: '100%', overflow: 'auto' } } : undefined}
        />
        {expanded && <ResizeHandle onMouseDown={onResizeMouseDown} />}
      </Box>
    </>
  );
};

const validate = (values: FormValues): Partial<FormValues> => {
  const errors: Partial<FormValues> = {};
  if (!values.taskName) errors.taskName = 'Task name is required';
  if (!values.rssBackfillUrl) errors.rssBackfillUrl = 'Backfill RSS URL is required';
  if (!values.taskConfig) errors.taskConfig = 'Task Config is required';
  return errors;
};

const Backfill: FC = () => {
  const taskParam = new URLSearchParams(useLocation().search).get('task');
  useInjectPageTitle(`Backfill Task: ${taskParam ?? 'Unknown'}`);

  const taskName = taskParam ? `${taskParam}-backfill` : '';
  const { config: taskConfig } = useGetTaskConfig(taskParam ?? '');
  const [executionLog, setExecutionLog] = useState(' ');
  const [sourceConfigExpanded, setSourceConfigExpanded] = useState(false);
  const {
    inputRef: sourceConfigInputRef,
    dragHeight: sourceConfigDragHeight,
    onResizeMouseDown: onSourceConfigResizeMouseDown,
    resetDragHeight: resetSourceConfigDragHeight,
  } = useTextareaResize();
  const pendingDelete = useRef(false);
  const logRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [executionLog]);

  const [deleteTaskName, setDeleteTaskName] = useState(taskName);
  const [, createTask] = useCreateTask();
  const [, deleteTask] = useDeleteTask(deleteTaskName);
  const [{ stream }, { connect }] = useFlexgetStream('/tasks/execute', Method.Post);

  const appendLog = useCallback((line: string) => {
    setExecutionLog(prev => `${prev}${line}\n`);
  }, []);

  const runDelete = useCallback(() => {
    appendLog(`Deleting task '${deleteTaskName}'...`);
    deleteTask().then(resp => {
      appendLog(
        resp.ok
          ? `Task '${deleteTaskName}' deleted.`
          : `Error deleting task: ${resp.error?.message ?? 'Unknown error'}`,
      );
    });
  }, [appendLog, deleteTask, deleteTaskName]);

  const runDeleteRef = useRef(runDelete);
  useEffect(() => {
    runDeleteRef.current = runDelete;
  }, [runDelete]);

  useEffect(() => {
    if (!stream) return;

    stream
      .node('{progress}', (e: any) => {
        const ev = camelize<any>(e) as any;
        appendLog(`[${ev.progress.phase}] ${ev.progress.plugin}`);
      })
      .node('{summary}', (e: any) => {
        const ev = camelize<any>(e) as any;
        if (ev.summary.aborted) {
          appendLog(`Aborted: ${ev.summary.abortReason ?? 'unknown reason'}`);
        } else {
          appendLog(
            `Summary: ${ev.summary.accepted} accepted, ${ev.summary.rejected} rejected, ${ev.summary.failed} failed`,
          );
        }
      })
      .done(() => {
        if (!pendingDelete.current) return;
        pendingDelete.current = false;
        runDeleteRef.current();
      })
      .fail(() => {
        if (!pendingDelete.current) return;
        pendingDelete.current = false;
        appendLog('Task execution failed.');
        runDeleteRef.current();
      });
  }, [stream, appendLog]);

  const initialValues: FormValues = {
    taskName,
    autoUpdateTaskName: false,
    rssBackfillUrl: taskParam ? extractRssUrl(taskConfig) : '',
    sourceBackfillUrl: taskParam ? extractRssUrl(taskConfig) : '',
    encodedSeriesName: '',
    taskConfig: taskParam ? taskConfig : 'No task selected',
    selectedSeries: '',
    backfillTaskConfig: '',
  };

  return (
    <Formik
      initialValues={initialValues}
      enableReinitialize
      validate={validate}
      onSubmit={async values => {
        setExecutionLog('');
        setDeleteTaskName(values.taskName);
        const updatedParsed = YAML.parse(values.backfillTaskConfig);

        appendLog(`Creating task '${values.taskName}'...`);
        const createResp = await createTask(
          values.taskName,
          updatedParsed.config ?? updatedParsed,
        );
        if (!createResp.ok) {
          appendLog(`Error creating task: ${createResp.error?.message ?? 'Unknown error'}`);
          return;
        }
        appendLog(`Task '${values.taskName}' created.`);
        appendLog(`Executing task '${values.taskName}'...`);
        pendingDelete.current = true;
        connect({ tasks: [values.taskName], progress: true, summary: true });
      }}
    >
      <Form>
        <Paper css={wrapper}>
          <>
            <div css={formLabel} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              Source Task Config
              <IconButton size="small" onClick={() => { setSourceConfigExpanded(v => !v); resetSourceConfigDragHeight(); }}>
                {sourceConfigExpanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
              </IconButton>
            </div>
            <Box position="relative">
              <TextField
                name="taskConfig"
                variant="outlined"
                fullWidth
                multiline
                rows={sourceConfigExpanded ? 6 : 1}
                inputRef={sourceConfigInputRef}
                InputProps={sourceConfigDragHeight !== undefined ? { style: { height: sourceConfigDragHeight } } : undefined}
                inputProps={sourceConfigDragHeight !== undefined ? { style: { height: '100%', overflow: 'auto' } } : undefined}
              />
              {sourceConfigExpanded && <ResizeHandle onMouseDown={onSourceConfigResizeMouseDown} />}
            </Box>
          </>
          <BackfillTaskNameRow taskParam={taskParam ?? ''} />
          <RssBackfillUrlField />
          <Field type="hidden" name="sourceBackfillUrl" />
          <Field type="hidden" name="encodedSeriesName" />
          <TaskSeriesField taskParam={taskParam ?? ''} />
          <BackfillTaskConfigField />
          <FormRow label="">
            <Button type="submit" variant="contained" color="primary">
              Backfill
            </Button>
          </FormRow>
          <FormRow label="Execution log">
            <MuiTextField
              value={executionLog}
              variant="outlined"
              fullWidth
              multiline
              rows={8}
              inputProps={{ readOnly: true, name: 'executionLog' }}
              inputRef={logRef}
            />
          </FormRow>
        </Paper>
      </Form>
    </Formik>
  );
};

export default Backfill;
