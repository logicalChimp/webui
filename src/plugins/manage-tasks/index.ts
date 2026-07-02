import { lazy } from 'react';
import { Create } from '@material-ui/icons';
import { registerPlugin } from 'core/plugins/registry';

// Registered separately (and before the 'tasks' plugin's stub/executions
// registrations in Root.tsx) so this entry sorts above 'Latest Executions'
// in the 'Tasks' sidebar group. See core/routes/hooks.ts useGetNavRoutes,
// which orders group children by overall plugin-registration order.
export const registerActiveTasks = () => {
  registerPlugin('/tasks/current', {
    component: lazy(
      () =>
        import(
          /* webpackChunkName: 'ManageTasksPlugin' */
          './ActiveTasks'
        ),
    ),
    displayName: 'Active Tasks',
    icon: Create,
    group: '/tasks',
  });
};

export default () => {
  registerPlugin('/tasks/edit-task', {
    component: lazy(
      () =>
        import(
          /* webpackChunkName: 'ManageTasksPlugin' */
          './EditTask'
        ),
    ),
    displayName: 'Create Task',
    icon: Create,
    group: '/tasks',
  });

  registerPlugin('/tasks/add-series', {
    component: lazy(
      () =>
        import(
          /* webpackChunkName: 'ManageTasksPlugin' */
          './AddSeries'
        ),
    ),
    displayName: 'Add Series',
    icon: Create,
    hidden: true,
  });

  registerPlugin('/tasks/edit-schedule', {
    component: lazy(
      () =>
        import(
          /* webpackChunkName: 'ManageTasksPlugin' */
          './EditSchedule'
        ),
    ),
    displayName: 'Create Schedule',
    icon: Create,
    group: '/tasks',
  });

  registerPlugin('/tasks/backfill-episodes', {
    component: lazy(
      () =>
        import(
          /* webpackChunkName: 'ManageTasksPlugin' */
          './BackfillEpisodes'
        ),
    ),
    displayName: 'Backfill Episodes',
    icon: Create,
    hidden: true,
  });
};
