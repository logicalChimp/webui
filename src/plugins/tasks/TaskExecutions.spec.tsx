import React, { FC, useEffect } from 'react';
import { cleanup, fireEvent, wait } from '@testing-library/react';
import { useHistory, Route, Switch } from 'react-router';
import fetchMock from 'fetch-mock';
import { renderWithWrapper } from 'utils/tests';
import AppBar from 'core/layout/AppBar';
import TaskExecutions from './TaskExecutions';

interface Props {
  path: string;
}

const TestTaskExecutions: FC<Props> = ({ path }) => {
  const { push } = useHistory();
  useEffect(() => {
    push(path);
  }, [path, push]);
  return (
    <>
      <AppBar toggleSidebar={jest.fn()} />
      <Switch>
        <Route path="/tasks/executions" exact>
          <div>Latest Executions Page</div>
        </Route>
        <Route path="/tasks/executions/:taskId">
          <TaskExecutions />
        </Route>
      </Switch>
    </>
  );
};

describe('plugins/tasks/TaskExecutions', () => {
  beforeEach(() => {
    fetchMock
      .get('glob:/api/tasks/status/1', { id: 1, name: 'my-task' })
      .get('glob:/api/tasks/status/1/executions?*', [])
      .catch();
  });

  afterEach(() => {
    cleanup();
    fetchMock.reset();
  });

  it('navigates back to the Latest Executions page when the back arrow is clicked', async () => {
    const { findByLabelText, findByText } = renderWithWrapper(
      <TestTaskExecutions path="/tasks/executions/1" />,
    );

    const backButton = await findByLabelText('go back');
    fireEvent.click(backButton);

    await wait(() => findByText('Latest Executions Page'));
  });
});
