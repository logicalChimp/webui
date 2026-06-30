import React, { FC } from 'react';
import { Toolbar, Tabs, Tab } from '@material-ui/core';
import { useHistory, useLocation, useRouteMatch } from 'react-router';

const pages = [
  { path: '/tasks/edit-task', label: 'Edit Task', createLabel: 'Create Task' },
  { path: '/tasks/add-series', label: 'Add Series' },
  { path: '/tasks/edit-schedule', label: 'Edit Schedule' },
  { path: '/tasks/backfill-episodes', label: 'Backfill Episodes' },
] as const;

const taskParamPatterns = pages.map(p => `${p.path}/:taskId`);

const SubNav: FC = () => {
  const history = useHistory();
  const location = useLocation();

  const taskMatch = useRouteMatch<{ taskId: string }>(taskParamPatterns);
  const taskId = taskMatch?.params.taskId;

  const currentIndex = pages.findIndex(p => location.pathname.startsWith(p.path));

  const handleChange = (_: unknown, index: number) => {
    const base = pages[index].path;
    history.push(taskId ? `${base}/${taskId}` : base);
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
          <Tab key={p.path} label={!taskId && 'createLabel' in p ? p.createLabel : p.label} />
        ))}
      </Tabs>
    </Toolbar>
  );
};

export default SubNav;
