import React, { FC, useEffect } from 'react';
import { act } from 'react-dom/test-utils';
import { cleanup, fireEvent, wait } from '@testing-library/react';
import { useHistory, Route, Switch } from 'react-router';
import fetchMock from 'fetch-mock';
import YAML from 'yaml';
import { renderWithWrapper } from 'utils/tests';
import * as coreApi from 'core/api';
import SeriesPicker from './SeriesPicker';

// ---------------------------------------------------------------------------
// Test wrapper
// ---------------------------------------------------------------------------

interface Props {
  path: string;
}

const TestSeriesPicker: FC<Props> = ({ path }) => {
  const { push } = useHistory();
  useEffect(() => { push(path); }, [path, push]);
  return (
    <Switch>
      <Route path="/series-picker"><SeriesPicker /></Route>
    </Switch>
  );
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const getField = (container: HTMLElement, name: string) =>
  container.querySelector(`[name="${name}"]`) as HTMLInputElement | HTMLTextAreaElement | null;

// Source Series Groups is index 0; Available Series multi-select is index 1.
const SOURCE_GROUPS_SELECT_INDEX = 0;
const AVAILABLE_SERIES_SELECT_INDEX = 1;

const flatTaskConfig = {
  config: { series: ['Show A', 'Show B'] },
  name: 'test-task',
};

// Group names use all-lowercase to survive API camelization unchanged
const objectGroupTaskConfig = {
  config: {
    series: { hdtv: ['Show X'], settings: { quality: '720p' } },
  },
  name: 'test-task',
};

const arrayGroupTaskConfig = {
  config: {
    series: [{ hdtv: ['Show X'] }, { bluray: ['Show Y'] }],
  },
  name: 'test-task',
};

const waitForConfig = (container: HTMLElement, expected: any) =>
  wait(
    () => {
      const el = getField(container, 'taskConfig');
      expect(el).not.toBeNull();
      expect(el!.value).toBe(YAML.stringify(expected));
    },
    { timeout: 8000 },
  );

const openSelect = (container: HTMLElement, index: number) => {
  const selectDiv = container.querySelectorAll('.MuiSelect-root')[index] as HTMLElement;
  fireEvent.mouseDown(selectDiv);
};

const getPortalOptions = () => Array.from(document.querySelectorAll('[role="option"]'));

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

describe('plugins/series-picker/SeriesPicker', () => {
  beforeAll(() => jest.setTimeout(15000));
  afterAll(() => jest.setTimeout(5000));

  let capturedDoneCallback: (() => void) | undefined;
  let capturedFailCallback: (() => void) | undefined;
  let capturedNodeHandlers: Record<string, (e: any) => void>;
  let mockConnect: jest.Mock;
  let mockStream: any;

  beforeEach(() => {
    capturedDoneCallback = undefined;
    capturedFailCallback = undefined;
    capturedNodeHandlers = {};
    mockConnect = jest.fn();

    mockStream = {
      node: jest.fn().mockImplementation((path: string, cb: (e: any) => void) => {
        capturedNodeHandlers[path] = cb;
        return mockStream;
      }),
      done: jest.fn().mockImplementation((cb: () => void) => {
        capturedDoneCallback = cb;
        return mockStream;
      }),
      fail: jest.fn().mockImplementation((cb: () => void) => {
        capturedFailCallback = cb;
        return mockStream;
      }),
    };

    jest.spyOn(coreApi, 'useFlexgetStream').mockReturnValue([
      { stream: mockStream as any, readyState: coreApi.ReadyState.Closed },
      { connect: mockConnect, disconnect: jest.fn() },
    ]);

    fetchMock
      .get('/api/tasks/test-task', flatTaskConfig)
      .put('/api/tasks/test-task', 200)
      .catch();
  });

  afterEach(() => {
    cleanup();
    fetchMock.reset();
    jest.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // Initial state
  // -------------------------------------------------------------------------

  describe('initial state', () => {
    it('loads task config from the API and shows it in the taskConfig field', async () => {
      const { container } = renderWithWrapper(
        <TestSeriesPicker path="/series-picker?task=test-task" />,
      );
      await waitForConfig(container, flatTaskConfig);
    });

    it('Available Series select is disabled before Fetch Series is clicked', async () => {
      const { container } = renderWithWrapper(
        <TestSeriesPicker path="/series-picker?task=test-task" />,
      );
      await waitForConfig(container, flatTaskConfig);

      const availableSelect = container.querySelectorAll('.MuiSelect-root')[AVAILABLE_SERIES_SELECT_INDEX];
      expect(availableSelect.closest('.MuiInputBase-root')).toHaveClass('Mui-disabled');
    });

    it('Add Series button is disabled when no series are selected', async () => {
      const { container, getByText } = renderWithWrapper(
        <TestSeriesPicker path="/series-picker?task=test-task" />,
      );
      await waitForConfig(container, flatTaskConfig);

      const addBtn = getByText('Add Series').closest('button');
      expect(addBtn).toBeDisabled();
    });

    it('episode 1 toggle is checked by default', async () => {
      const { container } = renderWithWrapper(
        <TestSeriesPicker path="/series-picker?task=test-task" />,
      );
      await waitForConfig(container, flatTaskConfig);

      const toggle = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
      expect(toggle.checked).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Source Series Groups
  // -------------------------------------------------------------------------

  describe('Source Series Groups', () => {
    it('is disabled with placeholder text when config has a flat series array', async () => {
      const { container } = renderWithWrapper(
        <TestSeriesPicker path="/series-picker?task=test-task" />,
      );
      await waitForConfig(container, flatTaskConfig);

      const groupsSelect = container.querySelectorAll('.MuiSelect-root')[SOURCE_GROUPS_SELECT_INDEX];
      expect(groupsSelect.closest('.MuiInputBase-root')).toHaveClass('Mui-disabled');
      expect(groupsSelect.textContent).toBe('No groups specified');
    });

    it('is enabled and shows "Select a group" for object-format series with one group (excluding settings)', async () => {
      fetchMock.restore().get('/api/tasks/test-task', objectGroupTaskConfig).put('/api/tasks/test-task', 200).catch();

      const { container } = renderWithWrapper(
        <TestSeriesPicker path="/series-picker?task=test-task" />,
      );
      await waitForConfig(container, objectGroupTaskConfig);

      const groupsSelect = container.querySelectorAll('.MuiSelect-root')[SOURCE_GROUPS_SELECT_INDEX];
      expect(groupsSelect.closest('.MuiInputBase-root')).not.toHaveClass('Mui-disabled');
      expect(groupsSelect.textContent).toBe('Select a group');
    });

    it('shows available group names when opened for array-format grouped config', async () => {
      fetchMock.restore().get('/api/tasks/test-task', arrayGroupTaskConfig).put('/api/tasks/test-task', 200).catch();

      const { container } = renderWithWrapper(
        <TestSeriesPicker path="/series-picker?task=test-task" />,
      );
      await waitForConfig(container, arrayGroupTaskConfig);

      openSelect(container, SOURCE_GROUPS_SELECT_INDEX);
      await wait(() => {
        const options = getPortalOptions().map((el) => el.textContent?.trim());
        expect(options).toContain('hdtv');
        expect(options).toContain('bluray');
      });
    });

    it('updates when taskConfig textarea is edited to add groups', async () => {
      const { container } = renderWithWrapper(
        <TestSeriesPicker path="/series-picker?task=test-task" />,
      );
      await waitForConfig(container, flatTaskConfig);

      const groupedYaml = YAML.stringify({
        config: { series: [{ GroupA: ['Show X'] }, { GroupB: ['Show Y'] }] },
        name: 'test-task',
      });
      fireEvent.change(getField(container, 'taskConfig')!, { target: { value: groupedYaml } });

      await wait(() => {
        const groupsSelect = container.querySelectorAll('.MuiSelect-root')[SOURCE_GROUPS_SELECT_INDEX];
        expect(groupsSelect.closest('.MuiInputBase-root')).not.toHaveClass('Mui-disabled');
      });
    });
  });

  // -------------------------------------------------------------------------
  // Fetch Series
  // -------------------------------------------------------------------------

  describe('Fetch Series', () => {
    it('calls connect with the task name and correct flags when Fetch Series is clicked', async () => {
      const { container, getByText } = renderWithWrapper(
        <TestSeriesPicker path="/series-picker?task=test-task" />,
      );
      await waitForConfig(container, flatTaskConfig);

      fireEvent.click(getByText('Fetch Series').closest('button')!);

      expect(mockConnect).toHaveBeenCalledWith({
        tasks: ['test-task'],
        entryDump: true,
        secondGuessMetadata: true,
        noCache: true,
        now: true,
      });
    });

    it('sets the cursor to wait while fetching and resets it when the stream completes', async () => {
      const { container, getByText } = renderWithWrapper(
        <TestSeriesPicker path="/series-picker?task=test-task" />,
      );
      await waitForConfig(container, flatTaskConfig);

      fireEvent.click(getByText('Fetch Series').closest('button')!);
      expect(document.body.style.cursor).toBe('wait');

      act(() => { capturedDoneCallback?.(); });
      await wait(() => expect(document.body.style.cursor).toBe(''));
    });

    it('resets the cursor when the stream fails', async () => {
      const { container, getByText } = renderWithWrapper(
        <TestSeriesPicker path="/series-picker?task=test-task" />,
      );
      await waitForConfig(container, flatTaskConfig);

      fireEvent.click(getByText('Fetch Series').closest('button')!);
      expect(document.body.style.cursor).toBe('wait');

      act(() => { capturedFailCallback?.(); });
      await wait(() => expect(document.body.style.cursor).toBe(''));
    });

    it('populates Available Series from entry_dump, filtering to episode 1 when toggle is ON', async () => {
      const { container, getByText } = renderWithWrapper(
        <TestSeriesPicker path="/series-picker?task=test-task" />,
      );
      await waitForConfig(container, flatTaskConfig);

      fireEvent.click(getByText('Fetch Series').closest('button')!);

      act(() => {
        capturedNodeHandlers['{entry_dump}']?.({
          task_id: 1,
          entry_dump: [
            { series_name: 'Show Alpha', series_episode: 1 },
            { series_name: 'Show Beta', series_episode: 2 },
          ],
        });
      });

      openSelect(container, AVAILABLE_SERIES_SELECT_INDEX);
      await wait(() => {
        const options = getPortalOptions().map((el) => el.textContent?.trim());
        expect(options).toContain('Show Alpha');
        expect(options).not.toContain('Show Beta');
      });
    });

    it('does not filter by episode when the toggle is switched OFF', async () => {
      const { container, getByText } = renderWithWrapper(
        <TestSeriesPicker path="/series-picker?task=test-task" />,
      );
      await waitForConfig(container, flatTaskConfig);

      // Turn off episode 1 filter
      fireEvent.click(container.querySelector('input[type="checkbox"]') as HTMLElement);
      fireEvent.click(getByText('Fetch Series').closest('button')!);

      act(() => {
        capturedNodeHandlers['{entry_dump}']?.({
          task_id: 1,
          entry_dump: [
            { series_name: 'Show Alpha', series_episode: 1 },
            { series_name: 'Show Beta', series_episode: 2 },
          ],
        });
      });

      openSelect(container, AVAILABLE_SERIES_SELECT_INDEX);
      await wait(() => {
        const options = getPortalOptions().map((el) => el.textContent?.trim());
        expect(options).toContain('Show Alpha');
        expect(options).toContain('Show Beta');
      });
    });

    it('deduplicates series names across multiple entry_dump events', async () => {
      const { container, getByText } = renderWithWrapper(
        <TestSeriesPicker path="/series-picker?task=test-task" />,
      );
      await waitForConfig(container, flatTaskConfig);

      fireEvent.click(getByText('Fetch Series').closest('button')!);

      act(() => {
        capturedNodeHandlers['{entry_dump}']?.({
          task_id: 1,
          entry_dump: [{ series_name: 'Show Alpha', series_episode: 1 }],
        });
        capturedNodeHandlers['{entry_dump}']?.({
          task_id: 1,
          entry_dump: [{ series_name: 'Show Alpha', series_episode: 1 }],
        });
      });

      openSelect(container, AVAILABLE_SERIES_SELECT_INDEX);
      await wait(() => {
        const options = getPortalOptions().filter(
          (el) => el.textContent?.trim() === 'Show Alpha',
        );
        expect(options).toHaveLength(1);
      });
    });

    it('sorts Available Series alphabetically', async () => {
      const { container, getByText } = renderWithWrapper(
        <TestSeriesPicker path="/series-picker?task=test-task" />,
      );
      await waitForConfig(container, flatTaskConfig);

      fireEvent.click(getByText('Fetch Series').closest('button')!);

      act(() => {
        capturedNodeHandlers['{entry_dump}']?.({
          task_id: 1,
          entry_dump: [
            { series_name: 'Zebra Show', series_episode: 1 },
            { series_name: 'Alpha Show', series_episode: 1 },
            { series_name: 'Mango Show', series_episode: 1 },
          ],
        });
      });

      openSelect(container, AVAILABLE_SERIES_SELECT_INDEX);
      await wait(() => {
        const options = getPortalOptions().map((el) => el.textContent?.trim());
        const seriesOptions = options.filter((t) =>
          ['Alpha Show', 'Mango Show', 'Zebra Show'].includes(t ?? ''),
        );
        expect(seriesOptions).toEqual(['Alpha Show', 'Mango Show', 'Zebra Show']);
      });
    });
  });

  // -------------------------------------------------------------------------
  // Add Series
  // -------------------------------------------------------------------------

  describe('Add Series', () => {
    it('appends selected series to the task config and writes to updatedTaskConfig', async () => {
      const { container, getByText } = renderWithWrapper(
        <TestSeriesPicker path="/series-picker?task=test-task" />,
      );
      await waitForConfig(container, flatTaskConfig);

      // Populate Available Series via stream
      fireEvent.click(getByText('Fetch Series').closest('button')!);
      act(() => {
        capturedNodeHandlers['{entry_dump}']?.({
          task_id: 1,
          entry_dump: [{ series_name: 'New Show', series_episode: 1 }],
        });
      });

      // Select "New Show" from the Available Series multi-select
      openSelect(container, AVAILABLE_SERIES_SELECT_INDEX);
      await wait(() => {
        const options = getPortalOptions();
        const option = options.find((el) => el.textContent?.trim() === 'New Show');
        expect(option).not.toBeNull();
        fireEvent.click(option!);
      });

      // Add Series button should now be enabled
      await wait(() => {
        expect(getByText('Add Series').closest('button')).not.toBeDisabled();
      });

      fireEvent.click(getByText('Add Series').closest('button')!);

      await wait(() => {
        const updatedField = getField(container, 'updatedTaskConfig') as HTMLTextAreaElement;
        expect(updatedField.value).toContain('New Show');
        const updatedParsed = YAML.parse(updatedField.value);
        expect(updatedParsed.config.series).toContain('New Show');
        expect(updatedParsed.config.series).toContain('Show A');
      });
    });
  });

  // -------------------------------------------------------------------------
  // Update Task
  // -------------------------------------------------------------------------

  describe('Update Task', () => {
    it('PUTs the full updatedTaskConfig as JSON to the API', async () => {
      const { container, getByText } = renderWithWrapper(
        <TestSeriesPicker path="/series-picker?task=test-task" />,
      );
      await waitForConfig(container, flatTaskConfig);

      const updatedConfig = {
        config: { series: ['Show A', 'Show B', 'New Show'] },
        name: 'test-task',
      };
      fireEvent.change(getField(container, 'updatedTaskConfig')!, {
        target: { value: YAML.stringify(updatedConfig) },
      });

      fireEvent.click(getByText('Update Task').closest('button')!);

      await wait(() => {
        expect(fetchMock.called('/api/tasks/test-task', { method: 'put' })).toBe(true);
      });

      const putCalls = fetchMock
        .calls()
        .filter(([url, opts]) => url === '/api/tasks/test-task' && (opts as RequestInit)?.method === 'put');
      const body = JSON.parse((putCalls[0][1] as RequestInit).body as string);
      expect(body.name).toBe('test-task');
      expect(body.config.series).toEqual(['Show A', 'Show B', 'New Show']);
    });

    it('does not call the API when updatedTaskConfig is empty', async () => {
      const { container, getByText } = renderWithWrapper(
        <TestSeriesPicker path="/series-picker?task=test-task" />,
      );
      await waitForConfig(container, flatTaskConfig);

      // updatedTaskConfig is empty string by default — click Update Task without setting it
      fireEvent.click(getByText('Update Task').closest('button')!);

      await wait(() =>
        expect(fetchMock.called('/api/tasks/test-task', { method: 'put' })).toBe(false),
      );
    });
  });
});
