'use client';

import { Alert, Box, CircularProgress, Stack, Typography } from '@mui/material';

export function LoadingState() {
  return (
    <Box sx={{ py: 8 }}>
      <Stack spacing={2} sx={{ alignItems: 'center' }}>
        <CircularProgress />
        <Typography color="text.secondary">Cargando información...</Typography>
      </Stack>
    </Box>
  );
}

export function AccessMessage({ message }: { message?: string }) {
  return (
    <Alert severity="warning">
      {message ?? 'No tienes permisos para consultar esta información con el rol actual.'}
    </Alert>
  );
}
