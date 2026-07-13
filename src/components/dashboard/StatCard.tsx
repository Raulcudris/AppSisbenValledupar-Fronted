'use client';

import { Card, CardContent, Stack, Typography } from '@mui/material';
import { ReactNode } from 'react';

type StatCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
};

export default function StatCard({ title, value, subtitle, icon }: StatCardProps) {
  return (
    <Card>
      <CardContent>
        <Stack
          direction="row"
          spacing={2}
          sx={{
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Stack spacing={0.5}>
            <Typography color="text.secondary" sx={{ fontSize: 14 }}>
              {title}
            </Typography>
            <Typography variant="h4">
              {value}
            </Typography>
            {subtitle ? (
              <Typography color="text.secondary" sx={{ fontSize: 14 }}>
                {subtitle}
              </Typography>
            ) : null}
          </Stack>
          {icon}
        </Stack>
      </CardContent>
    </Card>
  );
}
