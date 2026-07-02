import React, { ChangeEvent, useCallback, Key } from 'react';
import { useFormikContext } from 'formik';
import {
  TableContainer,
  Paper,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Table,
  TablePagination,
  TableSortLabel,
  TableRowProps,
  Theme,
} from '@material-ui/core';
import { css } from '@emotion/core';
import { useDebounceFormikSubmit } from 'utils/hooks';
import { Direction, DefaultOptions, toggleDirection } from 'utils/query';

const columnDivider = (theme: Theme, showDivider: boolean) => css`
  ${showDivider ? `border-right: 1px solid ${theme.palette.divider};` : ''}
`;

// `width: 1%` (with nowrap) makes an auto-layout table column shrink to the
// intrinsic width of its content plus the cell's own padding, rather than a
// hand-picked pixel value that would go stale if theme/typography changes.
const fitContentStyle: React.CSSProperties = { width: '1%', whiteSpace: 'nowrap' };

const groupHeaderCell = (theme: Theme, showDivider: boolean) => css`
  border-bottom: none;
  ${columnDivider(theme, showDivider)}
`;

// Flags, aligned with the flattened `headers` array, marking the last column of
// each header group (except the final group) so the divider drawn in the group
// row can also be carried down through the column-header row and every task row.
const getColumnDividerFlags = (headerGroups?: HeaderGroup[]): boolean[] => {
  if (!headerGroups) return [];
  const flags: boolean[] = [];
  let columnIndex = -1;
  headerGroups.forEach((group, groupIndex) => {
    columnIndex += group.span;
    flags[columnIndex] = groupIndex < headerGroups.length - 1;
  });
  return flags;
};

interface Row<T> {
  key: Key;
  data: T;
  props?: TableRowProps;
}

export interface Header<T extends Key> {
  id: T;
  label?: string;
  sortByField?: boolean;
  numeric?: boolean;
  align?: 'left' | 'center' | 'right';
  fitContent?: boolean;
}

export interface HeaderGroup {
  label?: string;
  span: number;
}

interface Props<T> {
  rows: Row<T>[];
  headers: Header<Extract<keyof T, Key>>[];
  headerGroups?: HeaderGroup[];
  total: number;
}

const ActiveTasksTable = <T extends {}>({ total, headers, headerGroups, rows }: Props<T>) => {
  const {
    setFieldValue,
    values: { order, perPage, page, sortBy },
  } = useFormikContext<DefaultOptions>();

  const handleChangePerPage = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setFieldValue('perPage', parseInt(event.target.value, 10));
      setFieldValue('page', 0);
    },
    [setFieldValue],
  );

  const handleChangePage = useCallback(
    (_: unknown, p: number) => {
      setFieldValue('page', p);
    },
    [setFieldValue],
  );

  const handleSortClick = useCallback(
    (field: keyof T) => {
      if (sortBy === field) {
        setFieldValue('order', toggleDirection(order));
      } else {
        setFieldValue('sortBy', field);
        setFieldValue('order', Direction.Asc);
      }
    },
    [order, setFieldValue, sortBy],
  );

  useDebounceFormikSubmit(500);

  const columnDividerFlags = getColumnDividerFlags(headerGroups);

  return (
    <Paper>
      <TableContainer>
        <Table size="small">
          <TableHead>
            {headerGroups && (
              <TableRow>
                {headerGroups.map(({ label, span }, index) => (
                  <TableCell
                    // eslint-disable-next-line react/no-array-index-key
                    key={index}
                    colSpan={span}
                    align="left"
                    css={theme => groupHeaderCell(theme, index < headerGroups.length - 1)}
                  >
                    {label}
                  </TableCell>
                ))}
              </TableRow>
            )}
            <TableRow>
              {headers.map(({ id, label, sortByField, numeric, align, fitContent }, index) => (
                <TableCell
                  key={id}
                  align={align ?? (numeric ? 'right' : 'left')}
                  sortDirection={id === sortBy ? order : false}
                  style={fitContent ? fitContentStyle : undefined}
                  css={theme => columnDivider(theme, !!columnDividerFlags[index])}
                >
                  {sortByField ? (
                    <TableSortLabel
                      active={id === sortBy}
                      direction={id === sortBy ? order : Direction.Asc}
                      onClick={() => handleSortClick(id)}
                    >
                      {label}
                    </TableSortLabel>
                  ) : (
                    label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(({ key, data, props = {} }) => (
              <TableRow key={key} {...props}>
                {headers.map(({ id, numeric, align, fitContent }) => (
                  <TableCell
                    key={id}
                    align={align ?? (numeric ? 'right' : 'left')}
                    style={fitContent ? fitContentStyle : undefined}
                  >
                    {data[id]}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        size="medium"
        rowsPerPageOptions={[5, 10, 25]}
        count={total}
        rowsPerPage={perPage}
        page={page}
        onChangePage={handleChangePage}
        onChangeRowsPerPage={handleChangePerPage}
      />
    </Paper>
  );
};

export default ActiveTasksTable;
