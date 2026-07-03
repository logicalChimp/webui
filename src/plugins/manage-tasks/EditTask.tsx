import React, { FC, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Link,
  Paper,
  Snackbar,
  TextField,
  Theme,
  Typography,
  useTheme,
} from '@material-ui/core';
import { OpenInNew } from '@material-ui/icons';
import { themes } from 'core/theme';
import { css } from '@emotion/core';
import { useRouteMatch, useHistory } from 'react-router';
import { Formik, Form } from 'formik';
import YAML from 'yaml';
import { NoPaddingWrapper } from 'common/styles';
import { useInjectPageTitle } from 'core/layout/AppBar/hooks';
import { useGlobalStatus } from 'core/status/hooks';
import SubNav from './SubNav';
import Editor from './Editor';
import SubmitButton from './SubmitButton';
import ResetForm from './ResetForm';
import { useGetTaskConfig, useCreateTask } from './backfillEpisodesHooks';
import { useUpdateTaskConfig } from './addSeriesHooks';
import { FormState } from './editorTypes';

const wrapper = (theme: Theme) => css`
  margin: ${theme.typography.pxToRem(theme.spacing(2))};
  padding: ${theme.typography.pxToRem(theme.spacing(3))};

  .MuiOutlinedInput-input:not(.MuiOutlinedInput-inputMultiline) {
    padding-top: 12px;
    padding-bottom: 12px;
  }
`;

const buttonRow = (theme: Theme) => css`
  display: flex;
  align-items: center;
  gap: ${theme.typography.pxToRem(theme.spacing(2))};
  margin-top: ${theme.typography.pxToRem(theme.spacing(2))};
`;

const EditTask: FC = () => {
  useInjectPageTitle('Tasks - Manage Task');
  const match = useRouteMatch<{ taskId: string }>('/tasks/current/:taskId/edit');
  const taskId = match?.params.taskId;
  const history = useHistory();

  const theme = useTheme();
  const codeStyle: React.CSSProperties = {
    backgroundColor: themes[theme.palette.type].background.default,
    padding: '2px 5px',
    borderRadius: 3,
  };

  const [taskName, setTaskName] = useState(taskId ?? '');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [snackOpen, setSnackOpen] = useState(false);
  const [snackMessage, setSnackMessage] = useState('');
  const [savedConfig, setSavedConfig] = useState('');

  const { loading: configLoading, error: configError, config } = useGetTaskConfig(taskId ?? '');

  useEffect(() => {
    if (taskId && config) {
      setSavedConfig(config);
    }
  }, [taskId, config]);
  const [createState, createTask] = useCreateTask();
  const [updateState, updateTask] = useUpdateTaskConfig(taskId ?? '');

  useGlobalStatus(
    configLoading || createState.loading || updateState.loading,
    configError ?? updateState.error,
  );

  const MONACO_LINE_HEIGHT = 19; // Monaco default (px)
  const MIN_EDITOR_HEIGHT = 20 * MONACO_LINE_HEIGHT;
  const paperRef = useRef<HTMLDivElement>(null);
  const [editorHeight, setEditorHeight] = useState(MIN_EDITOR_HEIGHT);
  const editorHeightRef = useRef(MIN_EDITOR_HEIGHT);

  const recalculate = useCallback(() => {
    if (!paperRef.current) return;
    const paperEl = paperRef.current;
    const paperBottom = paperEl.getBoundingClientRect().bottom;
    const paperMarginBottom = parseFloat(window.getComputedStyle(paperEl).marginBottom) || 0;
    const target = Math.max(
      editorHeightRef.current + window.innerHeight - paperBottom - paperMarginBottom,
      MIN_EDITOR_HEIGHT,
    );
    if (target !== editorHeightRef.current) {
      editorHeightRef.current = target;
      setEditorHeight(target);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    recalculate();
    window.addEventListener('resize', recalculate);
    return () => window.removeEventListener('resize', recalculate);
  }, [recalculate]);

  const initialValues = useMemo<FormState>(
    () => ({ yaml: taskId ? config : 'config:\n  ' }),
    [taskId, config],
  );

  const validateYaml = useCallback((values: FormState) => {
    try {
      if (YAML.parse(values.yaml) == null) return { yaml: 'Invalid YAML' };
    } catch {
      return { yaml: 'Invalid YAML' };
    }
    return {};
  }, []);

  const handleSubmit = useCallback(
    async (values: FormState) => {
      const parsed = YAML.parse(values.yaml) ?? {};
      if (taskId) {
        const resp = await updateTask(parsed);
        if (resp.status === 200 || resp.status === 201) {
          setSnackMessage(`Task Updated: ${taskId}`);
          setSnackOpen(true);
          setSavedConfig(values.yaml);
        }
      } else {
        const resp = await createTask(taskName, parsed);
        if (resp.status === 200 || resp.status === 201) {
          setSnackMessage(`Task Created: ${taskName}`);
          setSnackOpen(true);
          history.push(`/tasks/current/${encodeURIComponent(taskName)}/edit`);
        } else {
          setErrorMessage(resp.error?.message ?? 'An unknown error occurred');
        }
      }
    },
    [taskId, taskName, updateTask, createTask, history],
  );

  return (
    <NoPaddingWrapper>
      {taskId && <SubNav />}
      <Formik initialValues={initialValues} validate={validateYaml} onSubmit={handleSubmit}>
        {({ isValid, values }) => (
          <Form>
            <ResetForm initialValues={initialValues} />
            <Paper ref={paperRef} css={wrapper}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                <Box position="relative">
                  <Typography
                    variant="caption"
                    color="textSecondary"
                    style={{ position: 'absolute', bottom: '100%', left: 0, whiteSpace: 'nowrap' }}
                  >
                    Task Name
                  </Typography>
                  <TextField
                    value={taskName}
                    onChange={e => setTaskName(e.target.value)}
                    variant="outlined"
                    InputProps={taskId ? { readOnly: true } : undefined}
                  />
                </Box>
                <Link
                  href="https://flexget.com/en/Configuration#step-by-step-configuration-tutorial"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  Task Configuration Documentation
                  <OpenInNew fontSize="small" />
                </Link>
              </div>
              <p>
                NOTE: In the full configuration YAML, the top-level key for tasks is{' '}
                <code style={codeStyle}>tasks:</code>. However, when creating / editing an
                individual task, the top-level <code style={codeStyle}>tasks:</code> key is replaced
                with <code style={codeStyle}>config:</code>. This is a quirk of the Flexget API.
              </p>
              <Editor name="yaml" height={editorHeight} />
              <div css={buttonRow}>
                <SubmitButton
                  loading={createState.loading || updateState.loading}
                  disabled={taskId ? values.yaml === savedConfig : !taskName.trim() || !isValid}
                >
                  {taskId ? 'Update Task' : 'Create Task'}
                </SubmitButton>
              </div>
            </Paper>
          </Form>
        )}
      </Formik>
      <Snackbar
        open={snackOpen}
        autoHideDuration={4000}
        onClose={() => setSnackOpen(false)}
        message={snackMessage}
      />
      <Dialog open={errorMessage !== null} onClose={() => setErrorMessage(null)}>
        <DialogTitle>API Error Response</DialogTitle>
        <DialogContent>
          <DialogContentText>{errorMessage}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setErrorMessage(null)} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </NoPaddingWrapper>
  );
};

export default EditTask;
