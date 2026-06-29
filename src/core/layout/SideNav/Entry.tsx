import React, { ComponentType, FC, useCallback, useState } from 'react';
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
import { accordionRoot } from './styles';

interface Props {
  onClick?: () => void;
  path?: string;
  Icon: ComponentType;
  className?: string;
  name: string;
}

export const colorClass = (theme: Theme) => css`
  color: ${theme.palette.secondary.light};
`;

const navItem = (theme: Theme) => css`
  ${colorClass(theme)};
  border-left: 3px solid transparent;
  cursor: pointer;

  &:hover {
    border-left: 3px solid ${theme.palette.primary.main};
  }
`;

const SideNavEntry: FC<Props> = ({ onClick, path, Icon, name, className }) => {
  const item = (
    <ListItem css={theme => [navItem(theme), className]} onClick={onClick}>
      <ListItemIcon css={colorClass}>
        <Icon />
      </ListItemIcon>
      <ListItemText css={colorClass} disableTypography primary={name} />
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
}

export const AccordionEntry: FC<AccordionProps> = ({ name, Icon, children, onNavigate }) => {
  const history = useHistory();
  const location = useLocation();
  const isActive = children.some(c => location.pathname.startsWith(c.path));
  const [open, setOpen] = useState(isActive);

  const handleChange = useCallback(
    (_: unknown, expanded: boolean) => {
      setOpen(expanded);
      if (expanded) {
        history.push(children[0].path);
        onNavigate?.();
      }
    },
    [children, history, onNavigate],
  );

  return (
    <ExpansionPanel css={accordionRoot} expanded={open} onChange={handleChange} elevation={0} square>
      <ExpansionPanelSummary expandIcon={<ExpandMore />}>
        <ListItemIcon css={colorClass}>
          <Icon />
        </ListItemIcon>
        <ListItemText css={colorClass} disableTypography primary={name} />
      </ExpansionPanelSummary>
      <ExpansionPanelDetails>
        {children.map(child => (
          <SideNavEntry key={child.path} path={child.path} Icon={child.Icon} name={child.name} onClick={onNavigate} />
        ))}
      </ExpansionPanelDetails>
    </ExpansionPanel>
  );
};

export default SideNavEntry;
