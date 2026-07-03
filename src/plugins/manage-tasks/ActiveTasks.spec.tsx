import React, { FC, useEffect } from 'react';
import { cleanup, fireEvent, wait } from '@testing-library/react';
import { useHistory } from 'react-router';
import fetchMock from 'fetch-mock';
import { renderWithWrapper } from 'utils/tests';
import ActiveTasks from './ActiveTasks';

// Simulates arriving at Active Tasks via history.push(path, { toast }) from
// another page (e.g. Create Task after a successful create).
const NavigateWithToast: FC<{ toast: string }> = ({ toast }) => {
  const history = useHistory();
  useEffect(() => {
    history.replace('/tasks/current', { toast });
  }, [toast, history]);
  return <ActiveTasks />;
};

const makeTasks = (count: number) =>
  Array.from({ length: count }, (_, i) => ({ id: i + 1, name: `task-${String(i + 1).padStart(2, '0')}` }));

const mockTasksAndStatuses = (
  tasks: unknown[],
  statuses: unknown[] = [],
  schedules: unknown[] = [],
) => {
  fetchMock
    .get('/api/tasks', tasks)
    .get('/api/tasks/status?per_page=10000', statuses)
    .get('/api/schedules', schedules)
    .catch();
};

describe('plugins/manage-tasks/ActiveTasks', () => {
  afterEach(() => {
    cleanup();
    fetchMock.reset();
  });

  it('renders the expected column headers', async () => {
    mockTasksAndStatuses(makeTasks(1));
    const { findByText, container } = renderWithWrapper(<ActiveTasks />);
    await findByText('task-01');

    const headerCells = Array.from(
      container.querySelectorAll('thead tr')[1].querySelectorAll('th'),
    );
    expect(headerCells.map(cell => cell.textContent)).toEqual([
      'Name',
      'Status',
      'Time',
      'Status',
      'Type',
      'Series Count',
      '',
    ]);
  });

  it('renders a grouping header row above the column headers', async () => {
    mockTasksAndStatuses(makeTasks(1));
    const { findByText, container } = renderWithWrapper(<ActiveTasks />);
    await findByText('task-01');

    const headerRows = container.querySelectorAll('thead tr');
    expect(headerRows).toHaveLength(2);

    const groupCells = Array.from(headerRows[0].querySelectorAll('th'));
    expect(groupCells.map(cell => cell.textContent)).toEqual([
      '',
      'Latest Execution',
      'Schedule',
      '',
      '',
    ]);
    expect(groupCells.map(cell => cell.getAttribute('colspan'))).toEqual([
      '1',
      '2',
      '2',
      '1',
      '1',
    ]);

    expect(headerRows[1].querySelectorAll('th')).toHaveLength(7);
  });

  describe('row actions menu', () => {
    it('renders a single triple-dot icon button and no action links until clicked', async () => {
      mockTasksAndStatuses([{ id: 1, name: 'my-task' }]);
      const { findByText, container } = renderWithWrapper(<ActiveTasks />);

      await findByText('my-task');

      const row = container.querySelector('tbody tr') as HTMLElement;
      expect(row.querySelectorAll('button')).toHaveLength(1);
      expect(row.querySelector('a')).not.toBeInTheDocument();
    });

    it('opens a menu with Edit, Clone, Add Series, Backfill, and Delete entries', async () => {
      mockTasksAndStatuses([{ id: 1, name: 'my-task' }]);
      const { findByText, container } = renderWithWrapper(<ActiveTasks />);

      await findByText('my-task');
      const row = container.querySelector('tbody tr') as HTMLElement;
      fireEvent.click(row.querySelector('button') as HTMLElement);

      await wait(() => expect(document.querySelectorAll('[role="menuitem"]')).toHaveLength(5));
      const menuItems = Array.from(document.querySelectorAll('[role="menuitem"]'));
      expect(menuItems.map(item => item.textContent)).toEqual([
        'Edit',
        'Clone',
        'Add Series',
        'Backfill',
        'Delete',
      ]);
    });

    it('links Edit, Clone, Add Series, and Backfill to the correct task-scoped pages', async () => {
      mockTasksAndStatuses([{ id: 1, name: 'my-task' }]);
      const { findByText, container } = renderWithWrapper(<ActiveTasks />);

      await findByText('my-task');
      const row = container.querySelector('tbody tr') as HTMLElement;
      fireEvent.click(row.querySelector('button') as HTMLElement);

      await wait(() => expect(document.querySelectorAll('[role="menuitem"]')).toHaveLength(5));

      expect(
        document.querySelector('a[href="/tasks/current/my-task/edit"][role="menuitem"]'),
      ).toBeInTheDocument();
      expect(
        document.querySelector('a[href="/tasks/create-task?clone=my-task"][role="menuitem"]'),
      ).toBeInTheDocument();
      expect(
        document.querySelector('a[href="/tasks/current/my-task/add-series"][role="menuitem"]'),
      ).toBeInTheDocument();
      expect(
        document.querySelector('a[href="/tasks/current/my-task/backfill"][role="menuitem"]'),
      ).toBeInTheDocument();
    });

    it('does not disable any menu items', async () => {
      mockTasksAndStatuses([{ id: 1, name: 'my-task' }]);
      const { findByText, container } = renderWithWrapper(<ActiveTasks />);

      await findByText('my-task');
      const row = container.querySelector('tbody tr') as HTMLElement;
      fireEvent.click(row.querySelector('button') as HTMLElement);

      await wait(() => expect(document.querySelectorAll('[role="menuitem"]')).toHaveLength(5));
      const items = Array.from(document.querySelectorAll('[role="menuitem"]'));
      items.forEach(item => expect(item).not.toHaveClass('Mui-disabled'));
    });
  });

  describe('Delete confirmation', () => {
    const openDeleteConfirm = async (
      findByText: (text: string) => Promise<HTMLElement>,
      container: HTMLElement,
    ) => {
      await findByText('my-task');
      const row = container.querySelector('tbody tr') as HTMLElement;
      fireEvent.click(row.querySelector('button') as HTMLElement);
      await wait(() => expect(document.querySelectorAll('[role="menuitem"]')).toHaveLength(5));
      const deleteItem = Array.from(document.querySelectorAll('[role="menuitem"]')).find(
        item => item.textContent === 'Delete',
      ) as HTMLElement;
      fireEvent.click(deleteItem);
    };

    const getDialogButton = (label: 'Cancel' | 'Confirm' | 'Close') =>
      Array.from(document.querySelectorAll('button')).find(
        b => b.textContent?.trim() === label,
      ) as HTMLElement;

    it('shows a confirmation dialog with the task name and Confirm/Cancel buttons', async () => {
      mockTasksAndStatuses([{ id: 1, name: 'my-task' }]);
      const { findByText, container } = renderWithWrapper(<ActiveTasks />);
      await openDeleteConfirm(findByText, container);

      expect(document.body.textContent).toContain('Delete my-task');
      expect(document.body.textContent).toContain('Are you sure you wish to delete this task?');
      expect(getDialogButton('Cancel')).toBeInTheDocument();
      expect(getDialogButton('Confirm')).toBeInTheDocument();
    });

    it('clicking Cancel closes the dialog without calling the delete API', async () => {
      mockTasksAndStatuses([{ id: 1, name: 'my-task' }]);
      const { findByText, container } = renderWithWrapper(<ActiveTasks />);
      await openDeleteConfirm(findByText, container);

      fireEvent.click(getDialogButton('Cancel'));

      await wait(() => {
        expect(document.body.textContent).not.toContain(
          'Are you sure you wish to delete this task?',
        );
      });
      expect(fetchMock.called('/api/tasks/my-task', { method: 'delete' })).toBe(false);
    });

    it('on Confirm with a 200 response, shows the "Deleted OK" snackbar', async () => {
      mockTasksAndStatuses([{ id: 1, name: 'my-task' }]);
      fetchMock.delete('/api/tasks/my-task', 200);
      const { findByText, container } = renderWithWrapper(<ActiveTasks />);
      await openDeleteConfirm(findByText, container);

      fireEvent.click(getDialogButton('Confirm'));

      await wait(() => {
        expect(document.body.textContent).toContain('Task my-task: Deleted OK');
      });
    });

    it('on Confirm with a non-200/201 response, shows a Deletion Failed dialog with the response body', async () => {
      mockTasksAndStatuses([{ id: 1, name: 'my-task' }]);
      fetchMock.delete('/api/tasks/my-task', {
        status: 500,
        body: { message: 'Task is currently running' },
      });
      const { findByText, container } = renderWithWrapper(<ActiveTasks />);
      await openDeleteConfirm(findByText, container);

      fireEvent.click(getDialogButton('Confirm'));

      await wait(() => {
        expect(document.body.textContent).toContain('Deletion Failed');
      });
      expect(document.body.textContent).toContain('Task is currently running');
    });

    it('on Confirm with a 200 response, refreshes the task list after the toast is shown', async () => {
      mockTasksAndStatuses([{ id: 1, name: 'my-task' }]);
      fetchMock.delete('/api/tasks/my-task', 200);
      const { findByText, container } = renderWithWrapper(<ActiveTasks />);
      await openDeleteConfirm(findByText, container);

      expect(fetchMock.calls('/api/tasks', { method: 'get' })).toHaveLength(1);

      fireEvent.click(getDialogButton('Confirm'));

      await wait(() => {
        expect(document.body.textContent).toContain('Task my-task: Deleted OK');
      });
      expect(fetchMock.calls('/api/tasks', { method: 'get' })).toHaveLength(2);
    });

    it('on a non-200/201 response, does not refresh the task list', async () => {
      mockTasksAndStatuses([{ id: 1, name: 'my-task' }]);
      fetchMock.delete('/api/tasks/my-task', { status: 500, body: { message: 'Nope' } });
      const { findByText, container } = renderWithWrapper(<ActiveTasks />);
      await openDeleteConfirm(findByText, container);

      fireEvent.click(getDialogButton('Confirm'));

      await wait(() => {
        expect(document.body.textContent).toContain('Deletion Failed');
      });
      expect(fetchMock.calls('/api/tasks', { method: 'get' })).toHaveLength(1);
    });
  });

  describe('toast via navigation state', () => {
    it('shows a toast passed through history.push location state on arrival', async () => {
      mockTasksAndStatuses([{ id: 1, name: 'my-task' }]);
      const { findByText } = renderWithWrapper(
        <NavigateWithToast toast="Task Created: my-task" />,
      );

      await findByText('my-task');
      await wait(() => {
        expect(document.body.textContent).toContain('Task Created: my-task');
      });
    });
  });

  describe('Scheduled', () => {
    it('shows the executed-status icon when the task name is the schedule.tasks string value', async () => {
      mockTasksAndStatuses([{ id: 1, name: 'my-task' }], [], [{ tasks: 'my-task', interval: {} }]);
      const { findByText, container } = renderWithWrapper(<ActiveTasks />);

      await findByText('my-task');
      const scheduledCell = (container.querySelector('tbody tr') as HTMLElement).querySelectorAll(
        'td',
      )[3];
      expect(scheduledCell.querySelector('.MuiSvgIcon-colorPrimary')).toBeInTheDocument();
    });

    it('shows the executed-status icon when the task name is in the schedule.tasks list', async () => {
      mockTasksAndStatuses(
        [{ id: 1, name: 'task-b' }],
        [],
        [{ tasks: ['task-a', 'task-b'], schedule: {} }],
      );
      const { findByText, container } = renderWithWrapper(<ActiveTasks />);

      await findByText('task-b');
      const scheduledCell = (container.querySelector('tbody tr') as HTMLElement).querySelectorAll(
        'td',
      )[3];
      expect(scheduledCell.querySelector('.MuiSvgIcon-colorPrimary')).toBeInTheDocument();
    });

    it('leaves the column empty when the task name appears in no schedule', async () => {
      mockTasksAndStatuses(
        [{ id: 1, name: 'my-task' }],
        [],
        [{ tasks: ['task-a', 'task-b'], schedule: {} }],
      );
      const { findByText, container } = renderWithWrapper(<ActiveTasks />);

      await findByText('my-task');
      const scheduledCell = (container.querySelector('tbody tr') as HTMLElement).querySelectorAll(
        'td',
      )[3];
      expect(scheduledCell.textContent).toBe('');
      expect(scheduledCell.querySelector('svg')).not.toBeInTheDocument();
    });
  });

  describe('Type', () => {
    it('shows "Interval" when the task has a single interval schedule', async () => {
      mockTasksAndStatuses([{ id: 1, name: 'my-task' }], [], [{ tasks: 'my-task', interval: {} }]);
      const { findByText, container } = renderWithWrapper(<ActiveTasks />);

      await findByText('my-task');
      const typeCell = (container.querySelector('tbody tr') as HTMLElement).querySelectorAll(
        'td',
      )[4];
      expect(typeCell.textContent).toBe('Interval');
    });

    it('shows "Schedule" when the task has a single schedule-key schedule', async () => {
      mockTasksAndStatuses([{ id: 1, name: 'my-task' }], [], [{ tasks: 'my-task', schedule: {} }]);
      const { findByText, container } = renderWithWrapper(<ActiveTasks />);

      await findByText('my-task');
      const typeCell = (container.querySelector('tbody tr') as HTMLElement).querySelectorAll(
        'td',
      )[4];
      expect(typeCell.textContent).toBe('Schedule');
    });

    it('shows "both" when the task has both an interval and a schedule-key schedule', async () => {
      mockTasksAndStatuses(
        [{ id: 1, name: 'my-task' }],
        [],
        [
          { tasks: 'my-task', interval: {} },
          { tasks: ['my-task'], schedule: {} },
        ],
      );
      const { findByText, container } = renderWithWrapper(<ActiveTasks />);

      await findByText('my-task');
      const typeCell = (container.querySelector('tbody tr') as HTMLElement).querySelectorAll(
        'td',
      )[4];
      expect(typeCell.textContent).toBe('both');
    });

    it('is empty when the task has no schedule', async () => {
      mockTasksAndStatuses([{ id: 1, name: 'my-task' }]);
      const { findByText, container } = renderWithWrapper(<ActiveTasks />);

      await findByText('my-task');
      const typeCell = (container.querySelector('tbody tr') as HTMLElement).querySelectorAll(
        'td',
      )[4];
      expect(typeCell.textContent).toBe('');
    });
  });

  describe('Series Count', () => {
    it('counts the series in the task config, excluding group headers', async () => {
      mockTasksAndStatuses([
        {
          id: 1,
          name: 'my-task',
          config: { series: [{ hdtv: ['Show X', 'Show Y'] }, 'Show Z'] },
        },
      ]);
      const { findByText } = renderWithWrapper(<ActiveTasks />);

      await findByText('my-task');
      expect(await findByText('3')).toBeInTheDocument();
    });

    it('shows 0 when the task has no series config', async () => {
      mockTasksAndStatuses([{ id: 1, name: 'my-task', config: {} }]);
      const { findByText } = renderWithWrapper(<ActiveTasks />);

      await findByText('my-task');
      const row = (await findByText('my-task')).closest('tr') as HTMLElement;
      expect(row.querySelectorAll('td')[5].textContent).toBe('0');
    });
  });

  describe('Exec Status / Exec Time matching against /tasks/status', () => {
    it('shows a disabled radio icon and an empty Exec Time when no task status matches', async () => {
      mockTasksAndStatuses([{ id: 1, name: 'my-task' }], []);
      const { findByText, container } = renderWithWrapper(<ActiveTasks />);

      await findByText('my-task');
      const [, execStatusCell, execTimeCell] = Array.from(
        (container.querySelector('tbody tr') as HTMLElement).querySelectorAll('td'),
      );
      expect(execStatusCell.querySelector('.MuiSvgIcon-colorDisabled')).toBeInTheDocument();
      expect(execTimeCell.textContent).toBe('');
    });

    it('shows a success icon and the last execution start time when the matching status succeeded', async () => {
      mockTasksAndStatuses(
        [{ id: 1, name: 'my-task' }],
        [{ name: 'my-task', lastExecution: { start: '2026-07-01T12:00:00Z', succeeded: true } }],
      );
      const { findByText, container } = renderWithWrapper(<ActiveTasks />);

      await findByText('my-task');
      const [, execStatusCell, execTimeCell] = Array.from(
        (container.querySelector('tbody tr') as HTMLElement).querySelectorAll('td'),
      );
      expect(execStatusCell.querySelector('.MuiSvgIcon-colorPrimary')).toBeInTheDocument();
      expect(execTimeCell.textContent).toBe('2026-07-01T12:00:00Z');
    });

    it('shows an error icon when the matching status did not succeed', async () => {
      mockTasksAndStatuses(
        [{ id: 1, name: 'my-task' }],
        [{ name: 'my-task', lastExecution: { start: '2026-07-01T12:00:00Z', succeeded: false } }],
      );
      const { findByText, container } = renderWithWrapper(<ActiveTasks />);

      await findByText('my-task');
      const [, execStatusCell] = Array.from(
        (container.querySelector('tbody tr') as HTMLElement).querySelectorAll('td'),
      );
      expect(execStatusCell.querySelector('.MuiSvgIcon-colorError')).toBeInTheDocument();
    });

    it('matches statuses to tasks by name, not list order', async () => {
      mockTasksAndStatuses(
        [
          { id: 1, name: 'task-a' },
          { id: 2, name: 'task-b' },
        ],
        [{ name: 'task-b', lastExecution: { start: '2026-07-01T12:00:00Z', succeeded: true } }],
      );
      const { findByText, container } = renderWithWrapper(<ActiveTasks />);

      await findByText('task-a');
      const rows = Array.from(container.querySelectorAll('tbody tr'));
      const taskARow = rows.find(r => r.textContent?.includes('task-a')) as HTMLElement;
      const taskBRow = rows.find(r => r.textContent?.includes('task-b')) as HTMLElement;

      expect(
        taskARow.querySelectorAll('td')[1].querySelector('.MuiSvgIcon-colorDisabled'),
      ).toBeInTheDocument();
      expect(
        taskBRow.querySelectorAll('td')[1].querySelector('.MuiSvgIcon-colorPrimary'),
      ).toBeInTheDocument();
      expect(taskBRow.querySelectorAll('td')[2].textContent).toBe('2026-07-01T12:00:00Z');
    });
  });

  it('does not render the Show Deleted switch or an Execute button', async () => {
    mockTasksAndStatuses(makeTasks(1));
    const { findByText, queryByText } = renderWithWrapper(<ActiveTasks />);

    await findByText('task-01');
    expect(queryByText('Show Deleted')).not.toBeInTheDocument();
    expect(queryByText('Execute')).not.toBeInTheDocument();
  });

  it('paginates rows using the default page size', async () => {
    mockTasksAndStatuses(makeTasks(15));
    const { findByText, queryByText, container } = renderWithWrapper(<ActiveTasks />);

    await findByText('task-01');
    expect(container.querySelectorAll('tbody tr')).toHaveLength(10);
    expect(queryByText('task-11')).not.toBeInTheDocument();

    fireEvent.click(container.querySelector('button[title="Next page"]') as HTMLElement);

    await wait(() => expect(queryByText('task-11')).toBeInTheDocument());
    expect(container.querySelectorAll('tbody tr')).toHaveLength(5);
  });
});
