import React, { FC, useMemo, useState } from 'react';
import { Formik } from 'formik';
import { useHistory, useRouteMatch } from 'react-router';
import { FormControlLabel, Switch } from '@material-ui/core';
import { CheckCircle, Error } from '@material-ui/icons';
import { useInjectPageTitle } from 'core/layout/AppBar/hooks';
import { Direction } from 'utils/query';
import { useContainer } from 'unstated-next';
import { SortByStatus, TaskStatusOptions } from './types';
import TaskTable from './TaskTable';
import { useGetTaskStatuses, TaskContainer } from './hooks';
import Execute from './Execute';

const headers = [
  {
    id: SortByStatus.Succeeded,
    label: '',
    numeric: true,
  },
  {
    id: SortByStatus.Name,
    label: 'Name',
    sortByField: true,
  },
  {
    id: SortByStatus.LastExecutionTime,
    label: 'Start Time',
    sortByField: true,
  },
  {
    id: SortByStatus.End,
    label: 'End Time',
  },
  {
    id: SortByStatus.Produced,
    label: 'Produced',
    numeric: true,
  },
  {
    id: SortByStatus.Accepted,
    label: 'Accepted',
    numeric: true,
  },
  {
    id: SortByStatus.Rejected,
    label: 'Rejected',
    numeric: true,
  },
  {
    id: SortByStatus.Failed,
    label: 'Failed',
    numeric: true,
  },
  {
    id: SortByStatus.AbortReason,
    label: 'Abort Reason',
  },
];

const Latest: FC = () => {
  useInjectPageTitle('Tasks - Latest Executions');
  const { push } = useHistory();
  const { url } = useRouteMatch();
  const [showDeleted, setShowDeleted] = useState(false);
  const [options, setOptions] = useState<TaskStatusOptions>({
    page: 0,
    perPage: 10,
    order: Direction.Desc,
    sortBy: SortByStatus.LastExecutionTime,
  });

  const { tasks, total } = useGetTaskStatuses(options);
  const { tasks: configTasks } = useContainer(TaskContainer);

  const rows = useMemo((): Array<{
    key: React.Key;
    data: { deleted: boolean; [key: string]: React.ReactNode };
    props?: { onClick?: () => void; hover?: boolean };
  }> => {
    const configNames = new Set(configTasks.map(t => t.name));

    return tasks.map(
      ({
        name,
        id,
        lastExecution: { start, end, produced, rejected, accepted, failed, succeeded, abortReason },
      }) => {
        const deleted = !configNames.has(name);
        return {
          key: id,
          data: {
            [SortByStatus.ID]: id,
            [SortByStatus.Name]: name,
            [SortByStatus.LastExecutionTime]: start,
            [SortByStatus.Start]: start,
            [SortByStatus.End]: end,
            [SortByStatus.Produced]: produced,
            [SortByStatus.Rejected]: rejected,
            [SortByStatus.Accepted]: accepted,
            [SortByStatus.Failed]: failed,
            [SortByStatus.AbortReason]: abortReason,
            [SortByStatus.Succeeded]: succeeded ? (
              <CheckCircle fontSize="small" color="primary" />
            ) : (
              <Error fontSize="small" color="error" />
            ),
            deleted,
          },
          props: {
            onClick: () => push(`${url}/${id}`),
            hover: true,
          },
        };
      },
    );
  }, [tasks, push, url, configTasks]);

  const visibleRows = useMemo(() => (showDeleted ? rows : rows.filter(r => !r.data.deleted)), [
    rows,
    showDeleted,
  ]);

  return (
    <>
      <Formik initialValues={options} onSubmit={setOptions}>
        <TaskTable total={total} rows={visibleRows} headers={headers} />
      </Formik>
      <Execute
        tasks={configTasks}
        leftContent={
          <FormControlLabel
            control={
              <Switch
                checked={showDeleted}
                onChange={e => setShowDeleted(e.target.checked)}
                color="primary"
              />
            }
            label="Show Deleted"
          />
        }
      />
    </>
  );
};

export default Latest;
