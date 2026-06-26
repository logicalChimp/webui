import { lazy } from 'react';
import { TvTwoTone } from '@material-ui/icons';
import { registerPlugin } from 'core/plugins/registry';

export default () =>
  registerPlugin('/series-picker', {
    component: lazy(
      () =>
        import(
          /* webpackChunkName: 'SeriesPickerPlugin' */
          'plugins/series-picker/SeriesPicker'
        ),
    ),
    displayName: 'Series Picker',
    icon: TvTwoTone,
    hidden: true,
  });
