import { Theme } from '@material-ui/core';
import { css } from '@emotion/core';
import { rgba, lighten } from 'polished';

// How much lighter a group's sub-entries are than the drawer/group background,
// so they read as visually nested under their group in both the expanded and
// collapsed sidebar.
const SUB_ENTRY_LIGHTEN_AMOUNT = 0.06;

// Every nav row (group headers, standalone entries, and sub-entries) is pinned
// to this exact height — not just a min-height — in both the expanded and
// collapsed sidebar. Rows with a text label (expanded) would otherwise be
// taller than icon-only rows (collapsed), since MUI's ListItemText carries its
// own 4px top/bottom margin that icon-only rows don't have; a min-height alone
// doesn't prevent that, so every row below it shifts up/down when the sidebar
// is toggled.
const NAV_ROW_HEIGHT = 48;

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

export const navRowHeight = css`
  height: ${NAV_ROW_HEIGHT}px;
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

// Applied to individual sub-entry rows (e.g. the icon-only children rendered
// below an open group when the sidebar is collapsed).
export const subEntryBackground = (theme: Theme) => css`
  background-color: ${lighten(SUB_ENTRY_LIGHTEN_AMOUNT, theme.palette.secondary.main)};
`;

// Indents an expanded sub-entry's own content (rather than indenting via the
// parent ExpansionPanelDetails container) so the row's background — including
// the active/hover tint — still spans the full row width instead of leaving an
// untinted left margin where the container's padding used to be.
export const subEntryIndent = (theme: Theme) => css`
  padding-left: ${theme.spacing(4)}px;
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
    height: ${NAV_ROW_HEIGHT}px;
    min-height: ${NAV_ROW_HEIGHT}px;
    border-left: 3px solid transparent;
    cursor: pointer;

    &:hover {
      background-color: rgba(255, 255, 255, 0.06);
    }

    &.Mui-expanded {
      height: ${NAV_ROW_HEIGHT}px;
      min-height: ${NAV_ROW_HEIGHT}px;
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
    padding: 0;
    flex-direction: column;
    background-color: ${lighten(SUB_ENTRY_LIGHTEN_AMOUNT, theme.palette.secondary.main)};
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
