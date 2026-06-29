import { Dns } from '@material-ui/icons';
import { registerPlugin } from 'core/plugins/registry';

export default () =>
  registerPlugin('/server', {
    displayName: 'Server',
    icon: Dns,
  });
