import { lazy } from 'react';
import { Settings } from '@material-ui/icons';
import { registerPlugin } from 'core/plugins/registry';

export default () =>
  registerPlugin('/server/summary', {
    component: lazy(
      () =>
        import(
          /* webpackChunkName: 'ServerSummaryPlugin' */
          './Summary'
        ),
    ),
    cardComponent: lazy(
      () =>
        import(
          /* webpackChunkName: 'ServerSettingsCard' */
          './Card'
        ),
    ),
    displayName: 'Summary',
    icon: Settings,
    group: '/server',
  });
