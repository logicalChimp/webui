import React from 'react';
import { cleanup, fireEvent, wait } from '@testing-library/react';
import fetchMock from 'fetch-mock';
import { renderWithWrapper } from 'utils/tests';
import ActiveTasks from './ActiveTasks';

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

    it('links Edit, Add Series, and Backfill to the correct task-scoped pages', async () => {
      mockTasksAndStatuses([{ id: 1, name: 'my-task' }]);
      const { findByText, container } = renderWithWrapper(<ActiveTasks />);

      await findByText('my-task');
      const row = container.querySelector('tbody tr') as HTMLElement;
      fireEvent.click(row.querySelector('button') as HTMLElement);

      await wait(() => expect(document.querySelectorAll('[role="menuitem"]')).toHaveLength(5));

      expect(
        document.querySelector('a[href="/tasks/edit-task/my-task"][role="menuitem"]'),
      ).toBeInTheDocument();
      expect(
        document.querySelector('a[href="/tasks/add-series/my-task"][role="menuitem"]'),
      ).toBeInTheDocument();
      expect(
        document.querySelector('a[href="/tasks/backfill-episodes/my-task"][role="menuitem"]'),
      ).toBeInTheDocument();
    });

    it('disables Clone and Delete', async () => {
      mockTasksAndStatuses([{ id: 1, name: 'my-task' }]);
      const { findByText, container } = renderWithWrapper(<ActiveTasks />);

      await findByText('my-task');
      const row = container.querySelector('tbody tr') as HTMLElement;
      fireEvent.click(row.querySelector('button') as HTMLElement);

      await wait(() => expect(document.querySelectorAll('[role="menuitem"]')).toHaveLength(5));
      const items = Array.from(document.querySelectorAll('[role="menuitem"]'));
      const clone = items.find(item => item.textContent === 'Clone') as HTMLElement;
      const del = items.find(item => item.textContent === 'Delete') as HTMLElement;
      expect(clone).toHaveClass('Mui-disabled');
      expect(del).toHaveClass('Mui-disabled');
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
