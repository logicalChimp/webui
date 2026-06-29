import React, { FC, useCallback } from 'react';
import { Button, Typography, Divider, Theme } from '@material-ui/core';
import { Sync, Storage, PowerSettingsNew } from '@material-ui/icons';
import { css } from '@emotion/core';

import { PaperWrapper } from 'common/styles';
import { useInjectPageTitle } from 'core/layout/AppBar/hooks';
import { useVersion } from 'core/layout/SideNav/hooks';
import { useGlobalStatus } from 'core/status/hooks';
import ShutdownDialog from './ShutdownDialog';
import Operations from './Operations';
import { useServerOperation } from './hooks';
import { ServerOperation } from './types';
import { useOverlayState } from 'utils/hooks';

const section = (theme: Theme) => css`
  margin-bottom: ${theme.typography.pxToRem(theme.spacing(3))};
`;

const row = (theme: Theme) => css`
  display: flex;
  align-items: center;
  margin-bottom: ${theme.typography.pxToRem(theme.spacing(1))};
`;

const label = css`
  width: 14rem;
  font-weight: 500;
`;

const actions = (theme: Theme) => css`
  display: flex;
  gap: ${theme.typography.pxToRem(theme.spacing(2))};
  flex-wrap: wrap;
`;

const Summary: FC = () => {
  useInjectPageTitle('Server - Summary');

  const { version } = useVersion();
  const [isShutdownOpen, { open: openShutdown, close: closeShutdown }] = useOverlayState();
  const [isOpsOpen, { open: openOps, close: closeOps }] = useOverlayState();
  const [{ loading, error }, handleReloadClick] = useServerOperation(ServerOperation.Reload);
  useGlobalStatus(loading, error);

  const handleShutdownClick = useCallback(() => openShutdown(), [openShutdown]);
  const handleDatabaseClick = useCallback(() => openOps(), [openOps]);

  return (
    <PaperWrapper>
      <div css={section}>
        <Typography variant="h6" gutterBottom>
          Version
        </Typography>
        <div css={row}>
          <Typography css={label} variant="body2">
            Flexget
          </Typography>
          <Typography variant="body2">{version?.flexgetVersion ?? '—'}</Typography>
        </div>
        <div css={row}>
          <Typography css={label} variant="body2">
            API
          </Typography>
          <Typography variant="body2">{version?.apiVersion ?? '—'}</Typography>
        </div>
        <div css={row}>
          <Typography css={label} variant="body2">
            Latest available
          </Typography>
          <Typography variant="body2">{version?.latestVersion ?? '—'}</Typography>
        </div>
      </div>

      <Divider />

      <div css={theme => [section(theme), css`margin-top: ${theme.typography.pxToRem(theme.spacing(3))};`]}>
        <Typography variant="h6" gutterBottom>
          Operations
        </Typography>
        <div css={actions}>
          <Button
            variant="outlined"
            startIcon={<Sync />}
            disabled={loading}
            onClick={handleReloadClick}
          >
            Reload
          </Button>
          <Button variant="outlined" startIcon={<PowerSettingsNew />} onClick={handleShutdownClick}>
            Shutdown
          </Button>
          <Button variant="outlined" startIcon={<Storage />} onClick={handleDatabaseClick}>
            Database
          </Button>
        </div>
      </div>

      <ShutdownDialog open={isShutdownOpen} onClose={closeShutdown} />
      <Operations open={isOpsOpen} onClose={closeOps} />
    </PaperWrapper>
  );
};

export default Summary;
