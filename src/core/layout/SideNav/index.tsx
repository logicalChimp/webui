import React, { FC, useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/core';
import {
  Drawer,
  List,
  Tooltip,
  IconButton,
  useMediaQuery,
  useTheme,
  Divider,
} from '@material-ui/core';
import { Settings } from '@material-ui/icons';

import { useGetNavRoutes } from 'core/routes/hooks';

import Menu from 'core/layout/SideNav/Menu';
import Version from './Version';
import Entry, { AccordionEntry } from './Entry';
import Logo from './Logo';
import {
  drawerOpen,
  drawerClose,
  drawer,
  logoWrapper,
  innerDrawer,
  divider,
  hideVersion,
} from './styles';

interface Props {
  sidebarOpen?: boolean;
  onClose: () => void;
  className?: string;
}

const SideNav: FC<Props> = ({ sidebarOpen = false, onClose, className }) => {
  const { navRoutes } = useGetNavRoutes();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('xs'));

  const drawerCss = useMemo(() => (sidebarOpen ? drawerOpen(theme) : drawerClose(theme)), [
    sidebarOpen,
    theme,
  ]);

  const drawerRootCss = useMemo(() => [drawer(theme), drawerCss], [drawerCss, theme]);

  const handleNavigate = useCallback(() => {
    if (isMobile) onClose();
  }, [isMobile, onClose]);

  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement>();

  const handleSettingsClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => setAnchorEl(event.currentTarget),
    [],
  );

  const handleSettingsClose = useCallback(() => setAnchorEl(undefined), []);

  return (
    <Drawer
      css={drawerRootCss}
      className={className}
      open={sidebarOpen}
      variant={isMobile ? 'temporary' : 'permanent'}
      onClose={onClose}
    >
      <div css={logoWrapper}>
        <Logo sidebarOpen={sidebarOpen} className={className} />

        <Tooltip title="Manage">
          <IconButton aria-label="Manage" onClick={handleSettingsClick} color="inherit">
            <Settings />
          </IconButton>
        </Tooltip>
        <Menu anchorEl={anchorEl} onClose={handleSettingsClose} />
      </div>
      <div css={innerDrawer}>
        <List
          component="nav"
          css={css`
            width: inherit;
          `}
        >
          {navRoutes.map(route =>
            route.children?.length ? (
              <AccordionEntry
                key={route.path}
                name={route.name}
                Icon={route.Icon}
                children={route.children}
                onNavigate={handleNavigate}
              />
            ) : (
              <Entry
                key={route.path}
                path={route.path}
                Icon={route.Icon}
                name={route.name}
                onClick={handleNavigate}
              />
            ),
          )}
        </List>
        <div>
          <Divider css={divider} />
          <Version css={!sidebarOpen && hideVersion} className={className} />
        </div>
      </div>
    </Drawer>
  );
};

export default SideNav;
