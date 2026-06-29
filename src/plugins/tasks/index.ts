import { lazy } from 'react';
import { registerPlugin } from 'core/plugins/registry';
import { Assignment } from '@material-ui/icons';

export default () => {
  registerPlugin('/tasks', {
    displayName: 'Tasks',
    icon: Assignment,
  });

  registerPlugin('/tasks/executions', {
    component: lazy(
      () =>
        import(
          /* webpackChunkName: 'TasksPlugin' */
          'plugins/tasks/Tasks'
        ),
    ),
    displayName: 'Latest Executions',
    icon: Assignment,
    group: '/tasks',
    cardComponent: lazy(
      () =>
        import(
          /* webpackChunkName: 'TasksHomeCard' */
          'plugins/tasks/Card'
        ),
    ),
  });
};
