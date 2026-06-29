import React, { FC } from 'react';
import { Card, CardContent, Typography } from '@material-ui/core';
import { css } from '@emotion/core';
import { useRouteMatch } from 'react-router';
import { NoPaddingWrapper } from 'common/styles';
import { useInjectPageTitle } from 'core/layout/AppBar/hooks';
import SubNav from './SubNav';

const cardWrapper = css`
  padding: 1.6rem;
`;

const EditSchedule: FC = () => {
  useInjectPageTitle('Tasks - Manage Task');
  const match = useRouteMatch<{ taskId: string }>('/tasks/edit-schedule/:taskId');
  const taskId = match?.params.taskId;

  return (
    <NoPaddingWrapper>
      <SubNav />
      <div css={cardWrapper}>
        <Card>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              Edit Schedule{taskId ? ` — ${taskId}` : ''}
            </Typography>
            <Typography>tbc</Typography>
          </CardContent>
        </Card>
      </div>
    </NoPaddingWrapper>
  );
};

export default EditSchedule;
