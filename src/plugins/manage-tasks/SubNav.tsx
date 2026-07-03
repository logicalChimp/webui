import React, { FC } from 'react';
import { Toolbar, Tabs, Tab } from '@material-ui/core';
import { useHistory, useLocation, useRouteMatch } from 'react-router';

const pages = [
  { suffix: 'edit', label: 'Edit Task' },
  { suffix: 'add-series', label: 'Add Series' },
  { suffix: 'backfill', label: 'Backfill Episodes' },
] as const;

// Only ever rendered from within a '/tasks/current/:taskId/...' page (Edit
// Task hides this SubNav entirely when there's no taskId, i.e. Create Task).
const SubNav: FC = () => {
  const history = useHistory();
  const location = useLocation();

  const match = useRouteMatch<{ taskId: string }>('/tasks/current/:taskId');
  const taskId = match?.params.taskId ?? '';

  const currentSuffix = location.pathname.split('/').filter(Boolean).pop();
  const currentIndex = pages.findIndex(p => p.suffix === currentSuffix);

  const handleChange = (_: unknown, index: number) => {
    history.push(`/tasks/current/${taskId}/${pages[index].suffix}`);
  };

  return (
    <Toolbar disableGutters>
      <Tabs
        value={currentIndex !== -1 ? currentIndex : 0}
        onChange={handleChange}
        indicatorColor="primary"
        textColor="primary"
      >
        {pages.map(p => (
          <Tab key={p.suffix} label={p.label} />
        ))}
      </Tabs>
    </Toolbar>
  );
};

export default SubNav;
