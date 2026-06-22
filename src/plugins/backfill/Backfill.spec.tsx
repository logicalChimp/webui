import React, { FC, useEffect } from 'react';
import { act } from 'react-dom/test-utils';
import { cleanup, fireEvent, wait } from '@testing-library/react';
import { useHistory, Route, Switch } from 'react-router';
import fetchMock from 'fetch-mock';
import YAML from 'yaml';
import { renderWithWrapper } from 'utils/tests';
import AppBar from 'core/layout/AppBar';
import { TaskContainer } from 'plugins/tasks/hooks';
import * as coreApi from 'core/api';
import Backfill from './Backfill';

interface Props {
  path: string;
}

const TestBackfill: FC<Props> = ({ path }) => {
  const { push } = useHistory();
  useEffect(() => {
    push(path);
  }, [path, push]);
  return (
    <TaskContainer.Provider>
      <AppBar toggleSidebar={jest.fn()} />
      <Switch>
        <Route path="/backfill">
          <Backfill />
        </Route>
      </Switch>
    </TaskContainer.Provider>
  );
};

const taskConfig = {
  config: { rss: { url: 'http://wrong.com' } },
  name: 'test-task',
};

const getField = (container: HTMLElement, name: string) =>
  container.querySelector(`[name="${name}"]`) as HTMLInputElement | HTMLTextAreaElement;

describe('plugins/backfill/Backfill', () => {
  beforeAll(() => jest.setTimeout(15000));
  afterAll(() => jest.setTimeout(5000));

  let capturedDoneCallback: (() => void) | undefined;
  let mockConnect: jest.Mock;

  beforeEach(() => {
    capturedDoneCallback = undefined;
    mockConnect = jest.fn();

    const mockStream = {
      node: jest.fn().mockReturnThis(),
      done: jest.fn().mockImplementation((cb: () => void) => {
        capturedDoneCallback = cb;
        return mockStream;
      }),
      fail: jest.fn().mockReturnThis(),
    };

    jest.spyOn(coreApi, 'useFlexgetStream').mockReturnValue([
      { stream: mockStream as any, readyState: coreApi.ReadyState.Closed },
      { connect: mockConnect, disconnect: jest.fn() },
    ]);

    fetchMock
      .get('/api/tasks', [])
      .get('/api/tasks/test-task', taskConfig)
      .post('/api/tasks', 200)
      .delete('/api/tasks/test-task-backfill', 204)
      .catch();
  });

  afterEach(() => {
    cleanup();
    fetchMock.reset();
    jest.restoreAllMocks();
  });

  it('should call the create, execute, and delete APIs when Backfill is clicked', async () => {
    const { container, getByText } = renderWithWrapper(
      <TestBackfill path="/backfill?task=test-task" />,
    );

    // Wait for the task config to load from the API
    await wait(
      () => {
        const el = getField(container, 'taskConfig');
        expect(el).not.toBeNull();
        expect(el.value).toBe(YAML.stringify(taskConfig));
      },
      { timeout: 8000 },
    );

    // Set the RSS Backfill URL
    fireEvent.change(getField(container, 'rssBackfillUrl'), {
      target: { value: 'http://example.backfill.com' },
    });

    // Click the Backfill button
    const backfillButton = getByText('Backfill').closest('button');
    if (backfillButton) {
      fireEvent.click(backfillButton);
    }

    // Wait for the create and execute phase to complete
    await wait(() => {
      const log = getField(container, 'executionLog')?.value ?? '';
      expect(log).toContain("Creating task 'test-task-backfill'...");
      expect(log).toContain("Task 'test-task-backfill' created.");
      expect(log).toContain("Executing task 'test-task-backfill'...");
    });

    // Verify the create API was called with the updated task name and RSS URL
    const createCalls = fetchMock
      .calls()
      .filter(([url, opts]) => url === '/api/tasks' && (opts as RequestInit)?.method === 'post');
    expect(createCalls).toHaveLength(1);
    const createBody = JSON.parse((createCalls[0][1] as RequestInit).body as string);
    expect(createBody.name).toBe('test-task-backfill');
    expect(createBody.config.rss.url).toBe('http://example.backfill.com');

    // Verify the execute stream was connected with the correct task name
    expect(mockConnect).toHaveBeenCalledWith(
      expect.objectContaining({ tasks: ['test-task-backfill'] }),
    );

    // Simulate stream completion
    act(() => {
      if (capturedDoneCallback) capturedDoneCallback();
    });

    // Wait for the delete to complete
    await wait(() => {
      const log = getField(container, 'executionLog')?.value ?? '';
      expect(log).toContain("Task 'test-task-backfill' deleted.");
    });
  });
});
