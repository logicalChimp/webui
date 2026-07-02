import React, { FC, useMemo, useState } from 'react';
import { Formik } from 'formik';
import { CheckCircle, Error, RadioButtonUnchecked } from '@material-ui/icons';
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

  const { tasks } = useGetTasks();
  const { statuses } = useGetTaskStatuses();
  const { schedules } = useGetSchedules();

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
            [Column.Actions]: <ActiveTasksRowActions taskName={name} />,
          },
        };
      }),
    [tasks, statusByName, scheduledTaskNames, schedules],
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
    <Formik initialValues={options} onSubmit={setOptions}>
      <ActiveTasksTable
        total={rows.length}
        rows={visibleRows}
        headers={headers}
        headerGroups={headerGroups}
      />
    </Formik>
  );
};

export default ActiveTasks;
