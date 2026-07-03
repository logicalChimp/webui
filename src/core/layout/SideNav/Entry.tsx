import React, { ComponentType, FC, useCallback } from 'react';
import { css } from '@emotion/core';
import { Link } from 'react-router-dom';
import {
  ExpansionPanel,
  ExpansionPanelSummary,
  ExpansionPanelDetails,
  ListItem,
  ListItemText,
  ListItemIcon,
  Theme,
} from '@material-ui/core';
import { ExpandMore } from '@material-ui/icons';
import { useHistory, useLocation } from 'react-router';

import { NavRoute } from 'core/routes/types';
import {
  accordionRoot,
  accordionSummaryActive,
  activeNavItem,
  navRowHeight,
  subEntryBackground,
  subEntryIndent,
} from './styles';

interface Props {
  onClick?: () => void;
  path?: string;
  Icon: ComponentType;
  className?: string;
  name: string;
  sidebarOpen?: boolean;
  // When set, replaces the natural path-based active check entirely (rather
  // than only being able to force it on) — e.g. to suppress the active tint
  // on a collapsed group's own row even though one of its children matches
  // the current route.
  activeOverride?: boolean;
  subEntry?: boolean;
  indent?: boolean;
}

export const colorClass = (theme: Theme) => css`
  color: ${theme.palette.secondary.light};
`;

// height (not just min-height) is load-bearing: an expanded row's ListItemText
// label carries its own vertical margin that an icon-only collapsed row doesn't
// have, so without a fixed height every row is a few px taller when the label
// is showing — bouncing every row below it each time the sidebar is toggled.
const navItem = (theme: Theme) => css`
  ${colorClass(theme)};
  ${navRowHeight};
  border-left: 3px solid transparent;
  cursor: pointer;

  &:hover {
    background-color: rgba(255, 255, 255, 0.06);
  }
`;

const SideNavEntry: FC<Props> = ({
  onClick,
  path,
  Icon,
  name,
  className,
  sidebarOpen = true,
  activeOverride,
  subEntry = false,
  indent = false,
}) => {
  const location = useLocation();
  const isActive = activeOverride ?? (!!path && location.pathname.startsWith(path));

  const item = (
    <ListItem
      css={theme => [
        navItem(theme),
        subEntry && subEntryBackground(theme),
        isActive && activeNavItem(theme),
        indent && subEntryIndent(theme),
        className,
      ]}
      onClick={onClick}
    >
      <ListItemIcon css={colorClass}>
        <Icon />
      </ListItemIcon>
      {sidebarOpen && <ListItemText css={colorClass} disableTypography primary={name} />}
    </ListItem>
  );

  if (path) {
    return <Link to={path}>{item}</Link>;
  }

  return item;
};

interface AccordionProps {
  name: string;
  Icon: ComponentType;
  children: NavRoute[];
  onNavigate?: () => void;
  expanded: boolean;
  onToggle: (expanded: boolean) => void;
  sidebarOpen?: boolean;
}

export const AccordionEntry: FC<AccordionProps> = ({
  name,
  Icon,
  children,
  onNavigate,
  expanded,
  onToggle,
  sidebarOpen = true,
}) => {
  const history = useHistory();
  const location = useLocation();
  const isActive = children.some(c => location.pathname.startsWith(c.path));

  const handleChange = useCallback(
    (_: unknown, isExpanded: boolean) => {
      onToggle(isExpanded);
      if (isExpanded) {
        history.push(children[0].path);
        onNavigate?.();
      }
    },
    [children, history, onNavigate, onToggle],
  );

  // When collapsed there's no room for the accordion's expand/collapse chrome or
  // labels, so render the group icon as a direct link to its first child. Only the
  // currently-open group's children are shown (as icon-only entries below it) —
  // other groups' sub-nav items stay hidden until their own group is opened.
  if (!sidebarOpen) {
    return (
      <>
        <SideNavEntry
          path={children[0].path}
          Icon={Icon}
          name={name}
          onClick={() => {
            onToggle(true);
            onNavigate?.();
          }}
          sidebarOpen={false}
          activeOverride={false}
        />
        {expanded &&
          children.map(child => (
            <SideNavEntry
              key={child.path}
              path={child.path}
              Icon={child.Icon}
              name={child.name}
              onClick={onNavigate}
              sidebarOpen={false}
              subEntry
            />
          ))}
      </>
    );
  }

  return (
    <ExpansionPanel
      css={theme => [accordionRoot(theme), isActive && accordionSummaryActive(theme)]}
      expanded={expanded}
      onChange={handleChange}
      elevation={0}
      square
    >
      <ExpansionPanelSummary expandIcon={<ExpandMore />}>
        <ListItemIcon css={colorClass}>
          <Icon />
        </ListItemIcon>
        <ListItemText css={colorClass} disableTypography primary={name} />
      </ExpansionPanelSummary>
      <ExpansionPanelDetails>
        {children.map(child => (
          <SideNavEntry
            key={child.path}
            path={child.path}
            Icon={child.Icon}
            name={child.name}
            onClick={onNavigate}
            indent
          />
        ))}
      </ExpansionPanelDetails>
    </ExpansionPanel>
  );
};

export default SideNavEntry;
