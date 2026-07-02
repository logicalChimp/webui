import React, { FC, useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { IconButton, Menu, MenuItem } from '@material-ui/core';
import { MoreVert } from '@material-ui/icons';

interface Props {
  taskName: string;
}

const ActiveTasksRowActions: FC<Props> = ({ taskName }) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const handleOpen = useCallback((e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
  }, []);

  const handleClose = useCallback(() => setAnchorEl(null), []);

  const encodedName = encodeURIComponent(taskName);

  return (
    <>
      <IconButton size="small" onClick={handleOpen}>
        <MoreVert fontSize="small" />
      </IconButton>
      <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={handleClose}>
        <MenuItem component={Link} to={`/tasks/edit-task/${encodedName}`} onClick={handleClose}>
          Edit
        </MenuItem>
        <MenuItem disabled>Clone</MenuItem>
        <MenuItem component={Link} to={`/tasks/add-series/${encodedName}`} onClick={handleClose}>
          Add Series
        </MenuItem>
        <MenuItem
          component={Link}
          to={`/tasks/backfill-episodes/${encodedName}`}
          onClick={handleClose}
        >
          Backfill
        </MenuItem>
        <MenuItem disabled>Delete</MenuItem>
      </Menu>
    </>
  );
};

export default ActiveTasksRowActions;
