import React, { FC, useEffect } from 'react';
import { act } from 'react-dom/test-utils';
import { cleanup, fireEvent, wait } from '@testing-library/react';
import { useHistory, Route, Switch } from 'react-router';
import fetchMock from 'fetch-mock';
import YAML from 'yaml';
import { renderWithWrapper } from 'utils/tests';
import * as coreApi from 'core/api';
import AddSeries from './AddSeries';

// ---------------------------------------------------------------------------
// Test wrapper
// ---------------------------------------------------------------------------

interface Props {
  path: string;
}

const TestAddSeries: FC<Props> = ({ path }) => {
  const { push } = useHistory();
  useEffect(() => { push(path); }, [path, push]);
  return (
    <Switch>
      <Route path="/tasks/current/:taskId/add-series"><AddSeries /></Route>
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

// The SubNav also renders an "Add Series" tab (a button), so we must exclude MuiTab-root.
const getAddSeriesButton = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('button'))
    .find(btn => btn.textContent?.trim() === 'Add Series' && !btn.classList.contains('MuiTab-root')) ?? null;

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

describe('plugins/manage-tasks/AddSeries', () => {
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
        <TestAddSeries path="/tasks/current/test-task/add-series" />,
      );
      await waitForConfig(container, flatTaskConfig);
    });

    it('Available Series select is disabled before Fetch Series is clicked', async () => {
      const { container } = renderWithWrapper(
        <TestAddSeries path="/tasks/current/test-task/add-series" />,
      );
      await waitForConfig(container, flatTaskConfig);

      const availableSelect = container.querySelectorAll('.MuiSelect-root')[AVAILABLE_SERIES_SELECT_INDEX];
      expect(availableSelect.closest('.MuiInputBase-root')).toHaveClass('Mui-disabled');
    });

    it('Add Series button is disabled when no series are selected', async () => {
      const { container } = renderWithWrapper(
        <TestAddSeries path="/tasks/current/test-task/add-series" />,
      );
      await waitForConfig(container, flatTaskConfig);

      expect(getAddSeriesButton(container)).toBeDisabled();
    });

    it('episode 1 toggle is checked by default', async () => {
      const { container } = renderWithWrapper(
        <TestAddSeries path="/tasks/current/test-task/add-series" />,
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
        <TestAddSeries path="/tasks/current/test-task/add-series" />,
      );
      await waitForConfig(container, flatTaskConfig);

      const groupsSelect = container.querySelectorAll('.MuiSelect-root')[SOURCE_GROUPS_SELECT_INDEX];
      expect(groupsSelect.closest('.MuiInputBase-root')).toHaveClass('Mui-disabled');
      expect(groupsSelect.textContent).toBe('No groups specified');
    });

    it('is enabled and shows "Select a group" for object-format series with one group (excluding settings)', async () => {
      fetchMock.restore().get('/api/tasks/test-task', objectGroupTaskConfig).put('/api/tasks/test-task', 200).catch();

      const { container } = renderWithWrapper(
        <TestAddSeries path="/tasks/current/test-task/add-series" />,
      );
      await waitForConfig(container, objectGroupTaskConfig);

      const groupsSelect = container.querySelectorAll('.MuiSelect-root')[SOURCE_GROUPS_SELECT_INDEX];
      expect(groupsSelect.closest('.MuiInputBase-root')).not.toHaveClass('Mui-disabled');
      expect(groupsSelect.textContent).toBe('Select a group');
    });

    it('shows available group names when opened for array-format grouped config', async () => {
      fetchMock.restore().get('/api/tasks/test-task', arrayGroupTaskConfig).put('/api/tasks/test-task', 200).catch();

      const { container } = renderWithWrapper(
        <TestAddSeries path="/tasks/current/test-task/add-series" />,
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
        <TestAddSeries path="/tasks/current/test-task/add-series" />,
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
        <TestAddSeries path="/tasks/current/test-task/add-series" />,
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
        <TestAddSeries path="/tasks/current/test-task/add-series" />,
      );
      await waitForConfig(container, flatTaskConfig);

      fireEvent.click(getByText('Fetch Series').closest('button')!);
      expect(document.body.style.cursor).toBe('wait');

      act(() => { capturedDoneCallback?.(); });
      await wait(() => expect(document.body.style.cursor).toBe(''));
    });

    it('resets the cursor when the stream fails', async () => {
      const { container, getByText } = renderWithWrapper(
        <TestAddSeries path="/tasks/current/test-task/add-series" />,
      );
      await waitForConfig(container, flatTaskConfig);

      fireEvent.click(getByText('Fetch Series').closest('button')!);
      expect(document.body.style.cursor).toBe('wait');

      act(() => { capturedFailCallback?.(); });
      await wait(() => expect(document.body.style.cursor).toBe(''));
    });

    it('populates Available Series from entry_dump, filtering to episode 1 when toggle is ON', async () => {
      const { container, getByText } = renderWithWrapper(
        <TestAddSeries path="/tasks/current/test-task/add-series" />,
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
        <TestAddSeries path="/tasks/current/test-task/add-series" />,
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
        <TestAddSeries path="/tasks/current/test-task/add-series" />,
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
        <TestAddSeries path="/tasks/current/test-task/add-series" />,
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
        <TestAddSeries path="/tasks/current/test-task/add-series" />,
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
        expect(getAddSeriesButton(container)).not.toBeDisabled();
      });

      fireEvent.click(getAddSeriesButton(container)!);

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
  // Button disabled states
  // -------------------------------------------------------------------------

  describe('Button disabled states', () => {
    it('Fetch Series button is disabled when Source Task Config is empty', async () => {
      const { container } = renderWithWrapper(
        <TestAddSeries path="/tasks/current/test-task/add-series" />,
      );
      await waitForConfig(container, flatTaskConfig);

      fireEvent.change(getField(container, 'taskConfig')!, { target: { value: '' } });

      await wait(() => {
        const btn = Array.from(container.querySelectorAll('button')).find(
          b => b.textContent?.trim() === 'Fetch Series',
        );
        expect(btn).toBeDisabled();
      });
    });

    it('Update Task button is disabled when Updated Task Config is empty', async () => {
      const { container } = renderWithWrapper(
        <TestAddSeries path="/tasks/current/test-task/add-series" />,
      );
      await waitForConfig(container, flatTaskConfig);

      const btn = Array.from(container.querySelectorAll('button')).find(
        b => b.textContent?.trim() === 'Update Task',
      );
      expect(btn).toBeDisabled();
    });

    it('Update Task button is disabled when Updated Task Config matches Source Task Config', async () => {
      const { container } = renderWithWrapper(
        <TestAddSeries path="/tasks/current/test-task/add-series" />,
      );
      await waitForConfig(container, flatTaskConfig);

      const configValue = getField(container, 'taskConfig')!.value;
      fireEvent.change(getField(container, 'updatedTaskConfig')!, {
        target: { value: configValue },
      });

      await wait(() => {
        const btn = Array.from(container.querySelectorAll('button')).find(
          b => b.textContent?.trim() === 'Update Task',
        );
        expect(btn).toBeDisabled();
      });
    });

    it('Update Task button is enabled when Updated Task Config differs from Source Task Config', async () => {
      const { container } = renderWithWrapper(
        <TestAddSeries path="/tasks/current/test-task/add-series" />,
      );
      await waitForConfig(container, flatTaskConfig);

      fireEvent.change(getField(container, 'updatedTaskConfig')!, {
        target: { value: YAML.stringify({ config: { series: ['Show A', 'New Show'] }, name: 'test-task' }) },
      });

      await wait(() => {
        const btn = Array.from(container.querySelectorAll('button')).find(
          b => b.textContent?.trim() === 'Update Task',
        );
        expect(btn).not.toBeDisabled();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Episode-1 toggle reprocessing from cache
  // -------------------------------------------------------------------------

  describe('Episode-1 toggle reprocessing', () => {
    it('toggling episode-1 OFF after a fetch shows all series without re-fetching', async () => {
      const { container, getByText } = renderWithWrapper(
        <TestAddSeries path="/tasks/current/test-task/add-series" />,
      );
      await waitForConfig(container, flatTaskConfig);

      fireEvent.click(getByText('Fetch Series').closest('button')!);
      act(() => {
        capturedNodeHandlers['{entry_dump}']?.({
          entry_dump: [
            { series_name: 'Show Alpha', series_episode: 1 },
            { series_name: 'Show Beta', series_episode: 2 },
          ],
        });
      });

      // Toggle episode-1 filter OFF
      fireEvent.click(container.querySelector('input[type="checkbox"]') as HTMLElement);

      openSelect(container, AVAILABLE_SERIES_SELECT_INDEX);
      await wait(() => {
        const options = getPortalOptions().map(el => el.textContent?.trim());
        expect(options).toContain('Show Alpha');
        expect(options).toContain('Show Beta');
      });

      // No second connect call issued
      expect(mockConnect).toHaveBeenCalledTimes(1);
    });

    it('toggling episode-1 ON after fetch-without-filter filters list back down', async () => {
      const { container, getByText } = renderWithWrapper(
        <TestAddSeries path="/tasks/current/test-task/add-series" />,
      );
      await waitForConfig(container, flatTaskConfig);

      // Switch filter off before fetching
      fireEvent.click(container.querySelector('input[type="checkbox"]') as HTMLElement);
      fireEvent.click(getByText('Fetch Series').closest('button')!);
      act(() => {
        capturedNodeHandlers['{entry_dump}']?.({
          entry_dump: [
            { series_name: 'Show Alpha', series_episode: 1 },
            { series_name: 'Show Beta', series_episode: 2 },
          ],
        });
      });

      // Toggle episode-1 filter back ON
      fireEvent.click(container.querySelector('input[type="checkbox"]') as HTMLElement);

      openSelect(container, AVAILABLE_SERIES_SELECT_INDEX);
      await wait(() => {
        const options = getPortalOptions().map(el => el.textContent?.trim());
        expect(options).toContain('Show Alpha');
        expect(options).not.toContain('Show Beta');
      });
    });

    it('toggling episode-1 when no cache exists leaves the Available Series list empty', async () => {
      const { container } = renderWithWrapper(
        <TestAddSeries path="/tasks/current/test-task/add-series" />,
      );
      await waitForConfig(container, flatTaskConfig);

      // Toggle without fetching first
      fireEvent.click(container.querySelector('input[type="checkbox"]') as HTMLElement);

      const availableSelect = container.querySelectorAll('.MuiSelect-root')[AVAILABLE_SERIES_SELECT_INDEX];
      expect(availableSelect.closest('.MuiInputBase-root')).toHaveClass('Mui-disabled');
    });
  });

  // -------------------------------------------------------------------------
  // Selected series cleared on toggle
  // -------------------------------------------------------------------------

  describe('Selected series cleared on toggle', () => {
    it('toggling the episode-1 switch clears any selected series', async () => {
      const { container, getByText } = renderWithWrapper(
        <TestAddSeries path="/tasks/current/test-task/add-series" />,
      );
      await waitForConfig(container, flatTaskConfig);

      fireEvent.click(getByText('Fetch Series').closest('button')!);
      act(() => {
        capturedNodeHandlers['{entry_dump}']?.({
          entry_dump: [{ series_name: 'Show Alpha', series_episode: 1 }],
        });
      });

      openSelect(container, AVAILABLE_SERIES_SELECT_INDEX);
      await wait(() => {
        const option = getPortalOptions().find(el => el.textContent?.trim() === 'Show Alpha');
        expect(option).not.toBeNull();
        fireEvent.click(option!);
      });

      await wait(() => {
        expect(getAddSeriesButton(container)).not.toBeDisabled();
      });

      // Toggle the switch
      fireEvent.click(container.querySelector('input[type="checkbox"]') as HTMLElement);

      await wait(() => {
        expect(getAddSeriesButton(container)).toBeDisabled();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Second Fetch clears stale results
  // -------------------------------------------------------------------------

  describe('Second Fetch clears stale results', () => {
    it('clicking Fetch Series a second time clears the Available Series list before new results arrive', async () => {
      const { container, getByText } = renderWithWrapper(
        <TestAddSeries path="/tasks/current/test-task/add-series" />,
      );
      await waitForConfig(container, flatTaskConfig);

      // First fetch — populate the list
      fireEvent.click(getByText('Fetch Series').closest('button')!);
      act(() => {
        capturedNodeHandlers['{entry_dump}']?.({
          entry_dump: [{ series_name: 'Show Alpha', series_episode: 1 }],
        });
        capturedDoneCallback?.();
      });

      await wait(() => {
        const availableSelect = container.querySelectorAll('.MuiSelect-root')[AVAILABLE_SERIES_SELECT_INDEX];
        expect(availableSelect.closest('.MuiInputBase-root')).not.toHaveClass('Mui-disabled');
      });

      // Second fetch — list should clear immediately
      fireEvent.click(getByText('Fetch Series').closest('button')!);

      await wait(() => {
        const availableSelect = container.querySelectorAll('.MuiSelect-root')[AVAILABLE_SERIES_SELECT_INDEX];
        expect(availableSelect.closest('.MuiInputBase-root')).toHaveClass('Mui-disabled');
      });
    });
  });

  // -------------------------------------------------------------------------
  // Update Task success sequence
  // -------------------------------------------------------------------------

  describe('Update Task success sequence', () => {
    const differentConfig = YAML.stringify({
      config: { series: ['Show A', 'Show B', 'New Show'] },
      name: 'test-task',
    });

    it('on successful PUT, Updated Task Config field is cleared', async () => {
      const { container, getByText } = renderWithWrapper(
        <TestAddSeries path="/tasks/current/test-task/add-series" />,
      );
      await waitForConfig(container, flatTaskConfig);

      fireEvent.change(getField(container, 'updatedTaskConfig')!, {
        target: { value: differentConfig },
      });

      fireEvent.click(getByText('Update Task').closest('button')!);

      await wait(() => {
        expect(getField(container, 'updatedTaskConfig')!.value).toBe('');
      });
    });

    it('on successful PUT, Source Task Config GET is re-issued', async () => {
      const { container, getByText } = renderWithWrapper(
        <TestAddSeries path="/tasks/current/test-task/add-series" />,
      );
      await waitForConfig(container, flatTaskConfig);

      fireEvent.change(getField(container, 'updatedTaskConfig')!, {
        target: { value: differentConfig },
      });

      fireEvent.click(getByText('Update Task').closest('button')!);

      await wait(() => {
        const getCalls = fetchMock
          .calls()
          .filter(
            ([url, opts]) =>
              url === '/api/tasks/test-task' && (opts as RequestInit)?.method === 'get',
          );
        expect(getCalls).toHaveLength(2);
      });
    });

    it('on successful PUT, snackbar shows Task Updated message', async () => {
      const { container, getByText } = renderWithWrapper(
        <TestAddSeries path="/tasks/current/test-task/add-series" />,
      );
      await waitForConfig(container, flatTaskConfig);

      fireEvent.change(getField(container, 'updatedTaskConfig')!, {
        target: { value: differentConfig },
      });

      fireEvent.click(getByText('Update Task').closest('button')!);

      await wait(() => {
        expect(document.body.textContent).toContain('Task Updated: test-task');
      });
    });
  });

  // -------------------------------------------------------------------------
  // Update Task
  // -------------------------------------------------------------------------

  describe('Update Task', () => {
    it('PUTs the full updatedTaskConfig as JSON to the API', async () => {
      const { container, getByText } = renderWithWrapper(
        <TestAddSeries path="/tasks/current/test-task/add-series" />,
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
        <TestAddSeries path="/tasks/current/test-task/add-series" />,
      );
      await waitForConfig(container, flatTaskConfig);

      // updatedTaskConfig is empty string by default — click Update Task without setting it
      fireEvent.click(getByText('Update Task').closest('button')!);

      await wait(() =>
        expect(fetchMock.called('/api/tasks/test-task', { method: 'put' })).toBe(false),
      );
    });
  });

  // -------------------------------------------------------------------------
  // Updated Task Config validation
  // -------------------------------------------------------------------------

  describe('Updated Task Config validation', () => {
    it('marks the field invalid with "Invalid YAML" and does not call the API when the YAML is malformed', async () => {
      const { container, getByText } = renderWithWrapper(
        <TestAddSeries path="/tasks/current/test-task/add-series" />,
      );
      await waitForConfig(container, flatTaskConfig);

      fireEvent.change(getField(container, 'updatedTaskConfig')!, {
        target: { value: 'not: valid: yaml: here' },
      });

      fireEvent.click(getByText('Update Task').closest('button')!);

      await wait(() => {
        expect(document.body.textContent).toContain('Invalid YAML');
      });
      expect(fetchMock.called('/api/tasks/test-task', { method: 'put' })).toBe(false);
    });

    it('marks the field invalid with a required message when the YAML is empty', async () => {
      const { container } = renderWithWrapper(
        <TestAddSeries path="/tasks/current/test-task/add-series" />,
      );
      await waitForConfig(container, flatTaskConfig);

      const field = getField(container, 'updatedTaskConfig')!;
      fireEvent.change(field, { target: { value: 'x' } });
      fireEvent.change(field, { target: { value: '' } });
      fireEvent.blur(field);

      await wait(() => {
        expect(document.body.textContent).toContain('An updated Task Config YAML is required');
      });
    });
  });

  // -------------------------------------------------------------------------
  // Update Task failure handling
  // -------------------------------------------------------------------------

  describe('Update Task failure handling', () => {
    const differentConfig = YAML.stringify({
      config: { series: ['Show A', 'Show B', 'New Show'] },
      name: 'test-task',
    });

    it('shows the API error message in a dialog when the PUT fails', async () => {
      fetchMock.restore().get('/api/tasks/test-task', flatTaskConfig)
        .put('/api/tasks/test-task', { status: 500, body: { message: 'Validation failed' } })
        .catch();

      const { container, getByText } = renderWithWrapper(
        <TestAddSeries path="/tasks/current/test-task/add-series" />,
      );
      await waitForConfig(container, flatTaskConfig);

      fireEvent.change(getField(container, 'updatedTaskConfig')!, {
        target: { value: differentConfig },
      });

      fireEvent.click(getByText('Update Task').closest('button')!);

      await wait(() => {
        expect(document.body.textContent).toContain('Validation failed');
      });
    });

    it('still shows the "Task Updated" snackbar when the PUT succeeds but the config reload fails', async () => {
      fetchMock.restore()
        .get('/api/tasks/test-task', flatTaskConfig, { repeat: 1 })
        .get('/api/tasks/test-task', 500, { overwriteRoutes: false })
        .put('/api/tasks/test-task', 200)
        .catch();

      const { container, getByText } = renderWithWrapper(
        <TestAddSeries path="/tasks/current/test-task/add-series" />,
      );
      await waitForConfig(container, flatTaskConfig);

      fireEvent.change(getField(container, 'updatedTaskConfig')!, {
        target: { value: differentConfig },
      });

      fireEvent.click(getByText('Update Task').closest('button')!);

      await wait(() => {
        expect(document.body.textContent).toContain('Task Updated: test-task');
      });
    });
  });
});
