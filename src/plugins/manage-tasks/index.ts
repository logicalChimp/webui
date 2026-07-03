import { lazy } from 'react';
import { Create, PlaylistPlay } from '@material-ui/icons';
import { registerPlugin } from 'core/plugins/registry';

// Reused across both registerPlugin calls below so EditTask is only ever
// wrapped in a single lazy()/chunk, even though it serves two routes.
const EditTaskComponent = lazy(
  () =>
    import(
      /* webpackChunkName: 'ManageTasksPlugin' */
      './EditTask'
    ),
);

// Registered separately (and before the 'tasks' plugin's stub/executions
// registrations in Root.tsx) so this entry sorts above 'Latest Executions'
// in the 'Tasks' sidebar group. See core/routes/hooks.ts useGetNavRoutes,
// which orders group children by overall plugin-registration order.
export const registerActiveTasks = () => {
  // Registered ahead of '/tasks/current' below: PrivateRoute/Routes.tsx's
  // <Switch> is non-exact, so '/tasks/current' alone would otherwise
  // prefix-match these task-scoped sub-pages too. Object.entries(pluginMap)
  // preserves registration order, and Switch renders the first match, so
  // these more specific routes must be inserted into pluginMap first.
  registerPlugin('/tasks/current/:taskId/edit', {
    component: EditTaskComponent,
    displayName: 'Edit Task',
    icon: Create,
    hidden: true,
  });

  registerPlugin('/tasks/current/:taskId/add-series', {
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

  registerPlugin('/tasks/current/:taskId/backfill', {
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

  registerPlugin('/tasks/current', {
    component: lazy(
      () =>
        import(
          /* webpackChunkName: 'ManageTasksPlugin' */
          './ActiveTasks'
        ),
    ),
    displayName: 'Active Tasks',
    icon: PlaylistPlay,
    group: '/tasks',
  });
};

export default () => {
  registerPlugin('/tasks/create-task', {
    component: EditTaskComponent,
    displayName: 'Create Task',
    icon: Create,
    group: '/tasks',
  });
};
