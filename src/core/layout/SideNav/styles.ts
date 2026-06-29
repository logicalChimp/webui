import { Theme } from '@material-ui/core';
import { css } from '@emotion/core';
import { rgba } from 'polished';

export const nested = (theme: Theme) => css`
  padding-left: ${theme.spacing(0.4)}rem;
`;

export const innerDrawer = css`
  width: inherit;
  height: inherit;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
`;

export const drawerOpen = (theme: Theme) => css`
  width: ${theme.typography.pxToRem(theme.mixins.sidebar.width.open)};
  ${theme.breakpoints.up('sm')} {
    width: ${theme.typography.pxToRem(theme.mixins.sidebar.width.open)};
  }
`;

export const drawerClose = (theme: Theme) => css`
  ${theme.breakpoints.up('sm')} {
    width: ${theme.typography.pxToRem(theme.mixins.sidebar.width.closed)};
  }
`;

export const divider = (theme: Theme) => css`
  background-color: ${rgba(theme.palette.secondary.light, 0.15)};
  border-bottom-color: ${theme.palette.secondary.light};
`;

export const drawer = (theme: Theme) => css`
  background-color: ${theme.palette.secondary.main};
  width: 0;
  height: 100%;
  white-space: nowrap;

  & .MuiDrawer-paper {
    width: inherit;
    background-color: inherit;
    border-right: none !important;
    position: relative;
  }

  ${theme.breakpoints.up('sm')} {
    width: 6rem;
  }
`;

export const hideVersion = css`
  opacity: 0;
`;

export const activeNavItem = (theme: Theme) => css`
  border-left: 3px solid ${theme.palette.primary.main};
  background-color: ${rgba(theme.palette.primary.main, 0.12)};
`;

export const accordionRoot = (theme: Theme) => css`
  background-color: transparent;
  box-shadow: none;
  color: ${theme.palette.secondary.light};

  &::before {
    display: none;
  }

  &.Mui-expanded {
    margin: 0;
  }

  & .MuiExpansionPanelSummary-root {
    padding: 0 16px;
    min-height: 48px;
    border-left: 3px solid transparent;
    cursor: pointer;

    &:hover {
      background-color: rgba(255, 255, 255, 0.06);
    }

    &.Mui-expanded {
      min-height: 48px;
    }
  }

  & .MuiExpansionPanelSummary-content {
    margin: 0;
    align-items: center;

    &.Mui-expanded {
      margin: 0;
    }
  }

  & .MuiExpansionPanelSummary-expandIcon {
    color: ${theme.palette.secondary.light};
  }

  & .MuiExpansionPanelDetails-root {
    padding: 0 0 0 ${theme.spacing(2)}px;
    flex-direction: column;
  }
`;

export const accordionSummaryActive = (theme: Theme) => css`
  & .MuiExpansionPanelSummary-root {
    border-left: 3px solid ${theme.palette.primary.main};
  }
`;

export const logoWrapper = (theme: Theme) => css`
  display: flex;
  justify-content: space-between;
  color: ${theme.palette.secondary.light};
`;
