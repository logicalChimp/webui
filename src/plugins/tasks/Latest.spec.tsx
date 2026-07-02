import React, { FC, useEffect } from 'react';
import { cleanup, fireEvent, wait } from '@testing-library/react';
import { useHistory, Route, Switch } from 'react-router';
import fetchMock from 'fetch-mock';
import { renderWithWrapper } from 'utils/tests';
import { TaskContainer } from './hooks';
import Latest from './Latest';

const TestLatest: FC = () => {
  const { push } = useHistory();
  useEffect(() => {
    push('/tasks/executions');
  }, [push]);
  return (
    <TaskContainer.Provider>
      <Switch>
        <Route path="/tasks/executions" exact>
          <Latest />
        </Route>
      </Switch>
    </TaskContainer.Provider>
  );
};

const execution = {
  start: 't1',
  end: 't1',
  produced: 0,
  accepted: 0,
  rejected: 0,
  failed: 0,
  succeeded: true,
};

describe('plugins/tasks/Latest', () => {
  afterEach(() => {
    cleanup();
    fetchMock.reset();
  });

  it('shows only non-deleted tasks by default, and reveals deleted tasks when "Show Deleted" is toggled on', async () => {
    fetchMock
      .get('/api/tasks', [{ id: 1, name: 'kept-task' }])
      .get('glob:/api/tasks/status?*', [
        { id: 10, name: 'kept-task', lastExecution: execution },
        { id: 11, name: 'removed-task', lastExecution: execution },
      ])
      .catch();

    const { findByText, queryByText, getByText } = renderWithWrapper(<TestLatest />);

    await findByText('kept-task');
    expect(queryByText('removed-task')).not.toBeInTheDocument();

    const toggle = getByText('Show Deleted').closest('label')!.querySelector('input')!;
    fireEvent.click(toggle);

    await wait(() => expect(queryByText('removed-task')).toBeInTheDocument());
    expect(queryByText('kept-task')).toBeInTheDocument();

    fireEvent.click(toggle);
    await wait(() => expect(queryByText('removed-task')).not.toBeInTheDocument());
  });

  it('does not render any action icons in a row', async () => {
    fetchMock
      .get('/api/tasks', [{ id: 1, name: 'kept-task' }])
      .get('glob:/api/tasks/status?*', [{ id: 10, name: 'kept-task', lastExecution: execution }])
      .catch();

    const { findByText, container } = renderWithWrapper(<TestLatest />);

    await findByText('kept-task');
    const row = container.querySelector('tbody tr') as HTMLElement;
    expect(row.querySelectorAll('button')).toHaveLength(0);
  });

  it('does not render rows for tasks with no latest execution', async () => {
    fetchMock
      .get('/api/tasks', [
        { id: 1, name: 'executed-task' },
        { id: 2, name: 'never-executed-task' },
      ])
      .get('glob:/api/tasks/status?*', [
        { id: 10, name: 'executed-task', lastExecution: execution },
      ])
      .catch();

    const { findByText, queryByText } = renderWithWrapper(<TestLatest />);

    await findByText('executed-task');
    expect(queryByText('never-executed-task')).not.toBeInTheDocument();
  });
});
