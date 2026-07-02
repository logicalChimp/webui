import React, { FC, useEffect } from 'react';
import { cleanup, fireEvent, wait } from '@testing-library/react';
import { useHistory, Route, Switch } from 'react-router';
import { useField } from 'formik';
import fetchMock from 'fetch-mock';
import YAML from 'yaml';
import { renderWithWrapper } from 'utils/tests';
import * as EditorModule from './Editor';
import EditTask from './EditTask';

// ---------------------------------------------------------------------------
// Test wrapper
// ---------------------------------------------------------------------------

interface Props {
  path: string;
}

const TestEditTask: FC<Props> = ({ path }) => {
  const { push } = useHistory();
  useEffect(() => { push(path); }, [path, push]);
  return (
    <Switch>
      <Route path="/tasks/edit-task"><EditTask /></Route>
    </Switch>
  );
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const getYamlField = (container: HTMLElement) =>
  container.querySelector('[name="yaml"]') as HTMLTextAreaElement | null;

// The Task Name TextField is the only <input> on the page.
const getTaskNameField = (container: HTMLElement) =>
  container.querySelector('input') as HTMLInputElement | null;

const getSubmitButton = (container: HTMLElement, label: 'Update Task' | 'Create Task') =>
  Array.from(container.querySelectorAll('button')).find(
    b => b.textContent?.trim() === label && !b.classList.contains('MuiTab-root'),
  ) ?? null;

const taskConfigFixture = { config: { series: ['Show A'] }, name: 'test-task' };

const waitForYaml = (container: HTMLElement) =>
  wait(
    () => {
      const el = getYamlField(container);
      expect(el).not.toBeNull();
      expect(el!.value).toBe(YAML.stringify(taskConfigFixture));
    },
    { timeout: 8000 },
  );

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

describe('plugins/manage-tasks/EditTask', () => {
  beforeAll(() => jest.setTimeout(15000));
  afterAll(() => jest.setTimeout(5000));

  beforeEach(() => {
    // Replace the Monaco editor with a plain textarea connected to the Formik field.
    // jest.spyOn (not jest.mock) is used so the factory runs after react-hot-loader
    // runtime is initialised — avoids the hoisting-time __signature__ error.
    jest.spyOn(EditorModule, 'default').mockImplementation(({ name }: any) => {
      const [{ value }, , { setValue }] = useField<string>(name);
      return (
        <textarea
          name={name}
          value={value}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setValue(e.target.value)}
        />
      );
    });
  });

  afterEach(() => {
    cleanup();
    fetchMock.reset();
    jest.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // Edit mode (:taskId present)
  // -------------------------------------------------------------------------

  describe('edit mode', () => {
    beforeEach(() => {
      fetchMock
        .get('/api/tasks/test-task', taskConfigFixture)
        .put('/api/tasks/test-task', 200)
        .catch();
    });

    it('loads existing task config into the YAML editor', async () => {
      const { container } = renderWithWrapper(
        <TestEditTask path="/tasks/edit-task/test-task" />,
      );
      await waitForYaml(container);
    });

    it('Task Name field is read-only', async () => {
      const { container } = renderWithWrapper(
        <TestEditTask path="/tasks/edit-task/test-task" />,
      );
      await waitForYaml(container);
      expect(getTaskNameField(container)).toHaveAttribute('readonly');
    });

    it('renders Update Task button', async () => {
      const { container } = renderWithWrapper(
        <TestEditTask path="/tasks/edit-task/test-task" />,
      );
      await waitForYaml(container);
      expect(getSubmitButton(container, 'Update Task')).toBeInTheDocument();
    });

    it('Update Task button is disabled when YAML matches saved config', async () => {
      const { container } = renderWithWrapper(
        <TestEditTask path="/tasks/edit-task/test-task" />,
      );
      await waitForYaml(container);
      expect(getSubmitButton(container, 'Update Task')).toBeDisabled();
    });

    it('Update Task button is enabled after YAML is changed', async () => {
      const { container } = renderWithWrapper(
        <TestEditTask path="/tasks/edit-task/test-task" />,
      );
      await waitForYaml(container);

      fireEvent.change(getYamlField(container)!, {
        target: { value: YAML.stringify({ config: { series: ['Show A', 'Show B'] }, name: 'test-task' }) },
      });

      await wait(() => {
        expect(getSubmitButton(container, 'Update Task')).not.toBeDisabled();
      });
    });

    it('on successful PUT, snackbar shows Task Updated message', async () => {
      const { container } = renderWithWrapper(
        <TestEditTask path="/tasks/edit-task/test-task" />,
      );
      await waitForYaml(container);

      fireEvent.change(getYamlField(container)!, {
        target: { value: YAML.stringify({ config: { series: ['Show A', 'Show B'] }, name: 'test-task' }) },
      });
      await wait(() => expect(getSubmitButton(container, 'Update Task')).not.toBeDisabled());

      fireEvent.click(getSubmitButton(container, 'Update Task')!);

      await wait(() => {
        expect(document.body.textContent).toContain('Task Updated: test-task');
      });
    });

    it('on successful PUT, Update Task button returns to disabled', async () => {
      const { container } = renderWithWrapper(
        <TestEditTask path="/tasks/edit-task/test-task" />,
      );
      await waitForYaml(container);

      const newYaml = YAML.stringify({ config: { series: ['Show A', 'Show B'] }, name: 'test-task' });
      fireEvent.change(getYamlField(container)!, { target: { value: newYaml } });
      await wait(() => expect(getSubmitButton(container, 'Update Task')).not.toBeDisabled());

      fireEvent.click(getSubmitButton(container, 'Update Task')!);

      await wait(() => {
        expect(getSubmitButton(container, 'Update Task')).toBeDisabled();
      });
    });

    it('on non-ok PUT, snackbar does not appear', async () => {
      fetchMock.reset();
      fetchMock
        .get('/api/tasks/test-task', taskConfigFixture)
        .put('/api/tasks/test-task', { status: 500, body: { message: 'Server error' } })
        .catch();

      const { container } = renderWithWrapper(
        <TestEditTask path="/tasks/edit-task/test-task" />,
      );
      await waitForYaml(container);

      fireEvent.change(getYamlField(container)!, {
        target: { value: YAML.stringify({ config: { series: ['Show A', 'Show B'] }, name: 'test-task' }) },
      });
      await wait(() => expect(getSubmitButton(container, 'Update Task')).not.toBeDisabled());

      fireEvent.click(getSubmitButton(container, 'Update Task')!);

      await wait(() => {
        expect(fetchMock.called('/api/tasks/test-task', { method: 'put' })).toBe(true);
      });

      expect(document.body.textContent).not.toContain('Task Updated');
    });
  });

  // -------------------------------------------------------------------------
  // Create mode (no :taskId)
  // -------------------------------------------------------------------------

  describe('create mode', () => {
    beforeEach(() => {
      fetchMock.post('/api/tasks', 200).catch();
    });

    it('renders Create Task button', () => {
      const { container } = renderWithWrapper(
        <TestEditTask path="/tasks/edit-task" />,
      );
      expect(getSubmitButton(container, 'Create Task')).toBeInTheDocument();
    });

    it('Task Name field is editable', () => {
      const { container } = renderWithWrapper(
        <TestEditTask path="/tasks/edit-task" />,
      );
      expect(getTaskNameField(container)).not.toHaveAttribute('readonly');
    });

    it('Create Task button is disabled when task name is empty', () => {
      const { container } = renderWithWrapper(
        <TestEditTask path="/tasks/edit-task" />,
      );
      expect(getSubmitButton(container, 'Create Task')).toBeDisabled();
    });

    it('Create Task button is enabled when task name is filled', async () => {
      const { container } = renderWithWrapper(
        <TestEditTask path="/tasks/edit-task" />,
      );

      fireEvent.change(getTaskNameField(container)!, { target: { value: 'my-new-task' } });

      await wait(() => {
        expect(getSubmitButton(container, 'Create Task')).not.toBeDisabled();
      });
    });

    it('on successful POST, snackbar shows Task Created message', async () => {
      const { container } = renderWithWrapper(
        <TestEditTask path="/tasks/edit-task" />,
      );

      fireEvent.change(getTaskNameField(container)!, { target: { value: 'my-new-task' } });
      await wait(() => expect(getSubmitButton(container, 'Create Task')).not.toBeDisabled());

      fireEvent.click(getSubmitButton(container, 'Create Task')!);

      await wait(() => {
        expect(document.body.textContent).toContain('Task Created: my-new-task');
      });
    });

    it('on successful POST, navigates to the edit page for the new task', async () => {
      fetchMock.reset();
      fetchMock
        .post('/api/tasks', 200)
        .get('/api/tasks/my-new-task', { config: {}, name: 'my-new-task' })
        .catch();

      const { container } = renderWithWrapper(
        <TestEditTask path="/tasks/edit-task" />,
      );

      fireEvent.change(getTaskNameField(container)!, { target: { value: 'my-new-task' } });
      await wait(() => expect(getSubmitButton(container, 'Create Task')).not.toBeDisabled());

      fireEvent.click(getSubmitButton(container, 'Create Task')!);

      await wait(() => {
        expect(getSubmitButton(container, 'Update Task')).toBeInTheDocument();
      });
    });

    it('on API error, shows the error dialog', async () => {
      fetchMock.reset();
      fetchMock
        .post('/api/tasks', { status: 400, body: { message: 'Task already exists' } })
        .catch();

      const { container } = renderWithWrapper(
        <TestEditTask path="/tasks/edit-task" />,
      );

      fireEvent.change(getTaskNameField(container)!, { target: { value: 'existing-task' } });
      await wait(() => expect(getSubmitButton(container, 'Create Task')).not.toBeDisabled());

      fireEvent.click(getSubmitButton(container, 'Create Task')!);

      await wait(() => {
        expect(document.body.textContent).toContain('Task already exists');
      });
    });
  });
});
