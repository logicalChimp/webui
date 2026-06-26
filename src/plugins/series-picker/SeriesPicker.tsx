import React, { FC, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Formik, Form, useFormikContext } from 'formik';
import {
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  IconButton,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Switch,
  Theme,
} from '@material-ui/core';
import { DragHandle, ExpandLess, ExpandMore } from '@material-ui/icons';
import { css } from '@emotion/core';
import YAML from 'yaml';
import TextField from 'common/inputs/formik/TextField';
import { useInjectPageTitle } from 'core/layout/AppBar/hooks';
import { useFlexgetStream } from 'core/api';
import { Method, camelize } from 'utils/fetch';
import { useGetTaskConfig, useUpdateTaskConfig } from './hooks';
import { extractGroupNames, applySelectedSeries } from './utils';

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

const FormRow: FC<{ label: React.ReactNode }> = ({ label, children }) => (
  <>
    <div css={formLabel}>{label}</div>
    <div>{children}</div>
  </>
);

// ---------------------------------------------------------------------------
// Resize hook + handle
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// ExpandableTextarea
// ---------------------------------------------------------------------------

interface ExpandableTextareaProps {
  label: string;
  name: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const ExpandableTextarea: FC<ExpandableTextareaProps> = ({ label, name, onChange }) => {
  const [expanded, setExpanded] = useState(false);
  const { inputRef, dragHeight, onResizeMouseDown, resetDragHeight } = useTextareaResize();

  return (
    <FormRow
      label={
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {label}
          <IconButton
            size="small"
            onClick={() => {
              setExpanded(v => !v);
              resetDragHeight();
            }}
          >
            {expanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
          </IconButton>
        </span>
      }
    >
      <Box position="relative">
        <TextField
          name={name}
          variant="outlined"
          fullWidth
          multiline
          rows={expanded ? 6 : 1}
          inputRef={inputRef}
          {...(onChange ? { onChange } : {})}
          InputProps={dragHeight !== undefined ? { style: { height: dragHeight } } : undefined}
          inputProps={
            dragHeight !== undefined ? { style: { height: '100%', overflow: 'auto' } } : undefined
          }
        />
        {expanded && <ResizeHandle onMouseDown={onResizeMouseDown} />}
      </Box>
    </FormRow>
  );
};

// ---------------------------------------------------------------------------
// Form values
// ---------------------------------------------------------------------------

interface FormValues {
  taskConfig: string;
  selectedSeries: string[];
  updatedTaskConfig: string;
}

// ---------------------------------------------------------------------------
// Inner form (has access to Formik context)
// ---------------------------------------------------------------------------

interface SeriesPickerFormProps {
  availableSeries: string[];
  onFetchSeries: (episodeOneOnly: boolean) => void;
}

const SourceTaskConfigField: FC = () => (
  <ExpandableTextarea label="Source Task Config" name="taskConfig" />
);

interface SourceSeriesGroupsFieldProps {
  selectedGroup: string;
  onGroupChange: (group: string) => void;
  onReset: () => void;
}

const SourceSeriesGroupsField: FC<SourceSeriesGroupsFieldProps> = ({ selectedGroup, onGroupChange, onReset }) => {
  const { values } = useFormikContext<FormValues>();
  const groupNames = useMemo(() => extractGroupNames(values.taskConfig), [values.taskConfig]);

  useEffect(() => {
    onReset();
  }, [values.taskConfig]); // eslint-disable-line react-hooks/exhaustive-deps

  const noGroups = groupNames.length === 0;

  return (
    <FormRow label="Source Series Groups">
      <FormControl variant="outlined" fullWidth>
        <Select
          value={noGroups ? '' : selectedGroup}
          disabled={noGroups}
          displayEmpty
          onChange={e => onGroupChange(e.target.value as string)}
          renderValue={v => (noGroups ? 'No groups specified' : (v as string) || 'Select a group')}
        >
          {groupNames.map(name => (
            <MenuItem key={name} value={name}>
              {name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </FormRow>
  );
};

const SeriesPickerForm: FC<SeriesPickerFormProps> = ({ availableSeries, onFetchSeries }) => {
  const { setFieldValue, values } = useFormikContext<FormValues>();
  const [episodeOneOnly, setEpisodeOneOnly] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState('');

  const handleAddSeries = useCallback(() => {
    if (values.selectedSeries.length === 0) return;
    try {
      setFieldValue(
        'updatedTaskConfig',
        applySelectedSeries(values.taskConfig, values.selectedSeries, selectedGroup),
      );
    } catch (err) {
      console.error('Failed to update task config:', err);
    }
  }, [values.selectedSeries, values.taskConfig, selectedGroup, setFieldValue]);

  return (
    <Form>
      <Paper css={wrapper}>
        <SourceTaskConfigField />

        <FormRow label="">
          <div css={inputRow} style={{ alignItems: 'center' }}>
            <Button variant="contained" color="primary" onClick={() => onFetchSeries(episodeOneOnly)}>
              Fetch Series
            </Button>
            <FormControlLabel
              control={
                <Switch
                  checked={episodeOneOnly}
                  onChange={e => setEpisodeOneOnly(e.target.checked)}
                  color="primary"
                />
              }
              label="Only fetch series names currently on episode 1"
            />
          </div>
        </FormRow>

        <SourceSeriesGroupsField
          selectedGroup={selectedGroup}
          onGroupChange={setSelectedGroup}
          onReset={() => setSelectedGroup('')}
        />

        <FormRow label="Available Series">
          <div css={inputRow}>
            <Box flex={1}>
              <FormControl variant="outlined" fullWidth>
                <Select
                  multiple
                  value={values.selectedSeries}
                  onChange={e => setFieldValue('selectedSeries', e.target.value as string[])}
                  displayEmpty
                  disabled={availableSeries.length === 0}
                  renderValue={selected => {
                    const arr = selected as string[];
                    if (availableSeries.length === 0) return 'Click Fetch Series to populate';
                    if (arr.length === 0) return 'Select series to add';
                    return arr.join(', ');
                  }}
                >
                  {availableSeries.map(name => (
                    <MenuItem key={name} value={name}>
                      <Checkbox checked={values.selectedSeries.includes(name)} />
                      <ListItemText primary={name} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Button variant="contained" color="primary" onClick={handleAddSeries} disabled={values.selectedSeries.length === 0}>
              Add Series
            </Button>
          </div>
        </FormRow>

        <ExpandableTextarea label="Updated Task Config" name="updatedTaskConfig" />

        <FormRow label="">
          <Button type="submit" variant="contained" color="primary">
            Update Task
          </Button>
        </FormRow>
      </Paper>
    </Form>
  );
};

// ---------------------------------------------------------------------------
// Root component
// ---------------------------------------------------------------------------

const SeriesPicker: FC = () => {
  const taskParam = new URLSearchParams(useLocation().search).get('task');
  useInjectPageTitle(`Series Picker${taskParam ? `: ${taskParam}` : ''}`);

  const [availableSeries, setAvailableSeries] = useState<string[]>([]);
  const [fetching, setFetching] = useState(false);
  const { config: taskConfig } = useGetTaskConfig(taskParam ?? '');
  const [, updateTaskConfig] = useUpdateTaskConfig(taskParam ?? '');
  const [{ stream }, { connect }] = useFlexgetStream('/tasks/execute', Method.Post);
  const episodeOneOnlyRef = useRef(false);

  useEffect(() => {
    document.body.style.cursor = fetching ? 'wait' : '';
    return () => { document.body.style.cursor = ''; };
  }, [fetching]);

  useEffect(() => {
    if (!stream) return;
    stream
      .node('{entry_dump}', (e: any) => {
        const ev = camelize<any>(e);
        let entries: any[] = ev.entryDump ?? [];
        if (episodeOneOnlyRef.current) {
          entries = entries.filter((entry: any) => entry.seriesEpisode === 1);
        }
        const names: string[] = entries.map((entry: any) => entry.seriesName as string).filter(Boolean);
        setAvailableSeries(prev => [...new Set([...prev, ...names])].sort((a, b) => a.localeCompare(b)));
      })
      .done(() => setFetching(false))
      .fail(() => setFetching(false));
  }, [stream]);

  const handleFetchSeries = useCallback((episodeOneOnly: boolean) => {
    if (!taskParam) return;
    episodeOneOnlyRef.current = episodeOneOnly;
    setAvailableSeries([]);
    setFetching(true);
    connect({
      tasks: [taskParam],
      entryDump: true,
      secondGuessMetadata: true,
      noCache: true,
      now: true,
    });
  }, [connect, taskParam]);

  const initialValues: FormValues = {
    taskConfig,
    selectedSeries: [],
    updatedTaskConfig: '',
  };

  return (
    <Formik
      initialValues={initialValues}
      enableReinitialize
      onSubmit={async values => {
        if (!values.updatedTaskConfig) return;
        try {
          const json: Record<string, any> = YAML.parse(values.updatedTaskConfig);
          await updateTaskConfig(json);
        } catch (err) {
          console.error('Failed to update task config:', err);
        }
      }}
    >
      <SeriesPickerForm availableSeries={availableSeries} onFetchSeries={handleFetchSeries} />
    </Formik>
  );
};

export default SeriesPicker;
