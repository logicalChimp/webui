import { lazy } from 'react';
import { Create } from '@material-ui/icons';
import { registerPlugin } from 'core/plugins/registry';

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
          './SelectSeries'
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
