'use client';

import { Button, Stack, Typography } from '@mui/material';
import { ReactNode } from 'react';

type CrudPageHeaderProps = {
  title: string;
  subtitle: string;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
};

export default function CrudPageHeader({
  title,
  subtitle,
  primaryAction,
  secondaryAction,
}: CrudPageHeaderProps) {
  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={2}
      sx={{
        justifyContent: 'space-between',
        alignItems: { xs: 'flex-start', md: 'center' },
      }}
    >
      <Stack spacing={0.5}>
        <Typography variant="h4">
          {title}
        </Typography>
        <Typography color="text.secondary">
          {subtitle}
        </Typography>
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        {secondaryAction}
        {primaryAction}
      </Stack>
    </Stack>
  );
}

export function HeaderButton({
  children,
  onClick,
  variant = 'contained',
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  variant?: 'contained' | 'outlined';
  disabled?: boolean;
}) {
  return (
    <Button variant={variant} onClick={onClick} disabled={disabled}>
      {children}
    </Button>
  );
}