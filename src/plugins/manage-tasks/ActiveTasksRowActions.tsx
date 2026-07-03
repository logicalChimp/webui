import React, { FC, useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Menu,
  MenuItem,
} from '@material-ui/core';
import { MoreVert } from '@material-ui/icons';
import { useDeleteTask } from './backfillEpisodesHooks';

interface Props {
  taskName: string;
  // Called (rather than showing a local Snackbar) so the toast is owned by the
  // page and survives the task-list refresh that follows — this row unmounts
  // as soon as the refreshed list no longer includes the deleted task.
  onDeleteSuccess?: (taskName: string) => void;
}

const ActiveTasksRowActions: FC<Props> = ({ taskName, onDeleteSuccess }) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [, deleteTask] = useDeleteTask(taskName);

  const handleOpen = useCallback((e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
  }, []);

  const handleClose = useCallback(() => setAnchorEl(null), []);

  const handleDeleteClick = useCallback(() => {
    setAnchorEl(null);
    setConfirmOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    setConfirmOpen(false);
    const resp = await deleteTask();
    if (resp.status === 200 || resp.status === 201) {
      onDeleteSuccess?.(taskName);
    } else {
      setErrorMessage(
        resp.data !== undefined ? JSON.stringify(resp.data) : 'An unknown error occurred',
      );
    }
  }, [deleteTask, onDeleteSuccess, taskName]);

  const encodedName = encodeURIComponent(taskName);

  return (
    <>
      <IconButton size="small" onClick={handleOpen}>
        <MoreVert fontSize="small" />
      </IconButton>
      <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={handleClose}>
        <MenuItem component={Link} to={`/tasks/current/${encodedName}/edit`} onClick={handleClose}>
          Edit
        </MenuItem>
        <MenuItem disabled>Clone</MenuItem>
        <MenuItem
          component={Link}
          to={`/tasks/current/${encodedName}/add-series`}
          onClick={handleClose}
        >
          Add Series
        </MenuItem>
        <MenuItem
          component={Link}
          to={`/tasks/current/${encodedName}/backfill`}
          onClick={handleClose}
        >
          Backfill
        </MenuItem>
        <MenuItem onClick={handleDeleteClick}>Delete</MenuItem>
      </Menu>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>{`Delete ${taskName}`}</DialogTitle>
        <DialogContent>
          <DialogContentText>Are you sure you wish to delete this task?</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} autoFocus>
            Cancel
          </Button>
          <Button onClick={handleConfirmDelete} color="primary">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={errorMessage !== null} onClose={() => setErrorMessage(null)}>
        <DialogTitle>Deletion Failed</DialogTitle>
        <DialogContent>
          <DialogContentText>{errorMessage}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setErrorMessage(null)} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ActiveTasksRowActions;
