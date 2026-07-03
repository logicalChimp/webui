import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { Formik } from 'formik';
import { Snackbar } from '@material-ui/core';
import { CheckCircle, Error, RadioButtonUnchecked } from '@material-ui/icons';
import { useHistory, useLocation } from 'react-router';
import { useInjectPageTitle } from 'core/layout/AppBar/hooks';
import { Direction, DefaultOptions } from 'utils/query';
import ActiveTasksTable, { Header, HeaderGroup } from './ActiveTasksTable';
import ActiveTasksRowActions from './ActiveTasksRowActions';
import { useGetSchedules, useGetTasks, useGetTaskStatuses } from './activeTasksHooks';
import { Column, TaskStatus } from './activeTasksTypes';
import { countSeriesInTask, getScheduleStatusForTask } from './activeTasksUtils';

const headers: Header<Column>[] = [
  { id: Column.Name, label: 'Name', sortByField: true },
  { id: Column.ExecStatus, label: 'Status', align: 'center', fitContent: true },
  { id: Column.ExecTime, label: 'Time' },
  { id: Column.Scheduled, label: 'Status', align: 'center', fitContent: true },
  { id: Column.Type, label: 'Type' },
  { id: Column.SeriesCount, label: 'Series Count', align: 'right' },
  { id: Column.Actions, label: '' },
];

const headerGroups: HeaderGroup[] = [
  { span: 1 }, // Name
  { label: 'Latest Execution', span: 2 }, // Exec Status, Exec Time
  { label: 'Schedule', span: 2 }, // Scheduled, Type
  { span: 1 }, // Series Count
  { span: 1 }, // Actions
];

const ActiveTasks: FC = () => {
  useInjectPageTitle('Tasks');

  const [options, setOptions] = useState<DefaultOptions>({
    page: 0,
    perPage: 10,
    order: Direction.Asc,
    sortBy: Column.Name,
  });

  const { tasks, refresh: refreshTasks } = useGetTasks();
  const { statuses } = useGetTaskStatuses();
  const { schedules } = useGetSchedules();

  const [snackOpen, setSnackOpen] = useState(false);
  const [snackMessage, setSnackMessage] = useState('');

  // Pages that redirect here (e.g. Create Task, after a successful create) pass
  // a toast message through history.push's location state, since this is a
  // different page/component — a Snackbar local to the redirecting page would
  // unmount before ever becoming visible. Clear the state via history.replace
  // once shown so it doesn't reappear on a later back-navigation or refresh.
  const history = useHistory();
  const location = useLocation<{ toast?: string } | undefined>();

  useEffect(() => {
    const toastMessage = location.state?.toast;
    if (toastMessage) {
      setSnackMessage(toastMessage);
      setSnackOpen(true);
      history.replace(location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  // Owned here (rather than inside ActiveTasksRowActions) so the toast survives
  // the list refresh that follows it — the deleted task's own row (and any
  // Snackbar local to it) is gone from the DOM as soon as the refreshed task
  // list excludes it.
  const handleDeleteSuccess = useCallback(
    (name: string) => {
      setSnackMessage(`Task ${name}: Deleted OK`);
      setSnackOpen(true);
      refreshTasks();
    },
    [refreshTasks],
  );

  const statusByName = useMemo(
    () => new Map<string, TaskStatus>(statuses.map(status => [status.name, status])),
    [statuses],
  );

  const scheduledTaskNames = useMemo(() => {
    const names = new Set<string>();
    schedules.forEach(({ tasks: scheduleTasks }) => {
      (Array.isArray(scheduleTasks) ? scheduleTasks : [scheduleTasks]).forEach(name =>
        names.add(name),
      );
    });
    return names;
  }, [schedules]);

  const rows = useMemo(
    (): Array<{ key: React.Key; data: { [key: string]: React.ReactNode } }> =>
      tasks.map(task => {
        const { id, name } = task;
        const status = statusByName.get(name);
        return {
          key: id,
          data: {
            [Column.Name]: name,
            [Column.ExecStatus]: status ? (
              status.lastExecution.succeeded ? (
                <CheckCircle fontSize="small" color="primary" />
              ) : (
                <Error fontSize="small" color="error" />
              )
            ) : (
              <RadioButtonUnchecked fontSize="small" color="disabled" />
            ),
            [Column.ExecTime]: status ? status.lastExecution.start : '',
            [Column.Scheduled]: scheduledTaskNames.has(name) ? (
              <CheckCircle fontSize="small" color="primary" />
            ) : (
              ''
            ),
            [Column.Type]: getScheduleStatusForTask(schedules, name) ?? '',
            [Column.SeriesCount]: countSeriesInTask(task),
            [Column.Actions]: (
              <ActiveTasksRowActions taskName={name} onDeleteSuccess={handleDeleteSuccess} />
            ),
          },
        };
      }),
    [tasks, statusByName, scheduledTaskNames, schedules, handleDeleteSuccess],
  );

  const sortedRows = useMemo(() => {
    const { sortBy, order } = options;
    return [...rows].sort((a, b) => {
      const cmp = String(a.data[sortBy]).localeCompare(String(b.data[sortBy]));
      return order === Direction.Asc ? cmp : -cmp;
    });
  }, [rows, options]);

  const visibleRows = useMemo(() => {
    const start = options.page * options.perPage;
    return sortedRows.slice(start, start + options.perPage);
  }, [sortedRows, options.page, options.perPage]);

  return (
    <>
      <Formik initialValues={options} onSubmit={setOptions}>
        <ActiveTasksTable
          total={rows.length}
          rows={visibleRows}
          headers={headers}
          headerGroups={headerGroups}
        />
      </Formik>
      <Snackbar
        open={snackOpen}
        autoHideDuration={4000}
        onClose={() => setSnackOpen(false)}
        message={snackMessage}
      />
    </>
  );
};

export default ActiveTasks;
