import { ListAlt } from '@material-ui/icons';
import { registerPlugin } from 'core/plugins/registry';

export default () =>
  registerPlugin('/lists', {
    displayName: 'Lists',
    icon: ListAlt,
  });
