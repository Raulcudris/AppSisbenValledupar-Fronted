'use client';

import { Card, CardContent, Stack, Typography } from '@mui/material';
import { ReactNode } from 'react';

type SectionCardProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
};

export default function SectionCard({ title, subtitle, action, children }: SectionCardProps) {
  return (
    <Card>
      <CardContent>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{
            mb: 2,
            alignItems: { xs: 'flex-start', sm: 'center' },
            justifyContent: 'space-between',
          }}
        >
          <Stack spacing={0.5}>
            <Typography variant="h6">
              {title}
            </Typography>
            {subtitle ? (
              <Typography color="text.secondary" fontSize={14}>
                {subtitle}
              </Typography>
            ) : null}
          </Stack>
          {action}
        </Stack>
        {children}
      </CardContent>
    </Card>
  );
}