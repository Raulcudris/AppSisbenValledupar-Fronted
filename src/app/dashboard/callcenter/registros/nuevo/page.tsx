'use client';

import {
  Alert,
  Box,
} from '@mui/material';

import {
  useSearchParams,
} from 'next/navigation';

import CallCenterRegistroCompletoForm
  from '@/components/callcenter/CallCenterRegistroCompletoForm';

/**
 * Ruta unificada para crear y modificar un registro completo.
 *
 * Sin parámetro:
 *
 * /dashboard/callcenter/registros/nuevo
 *
 * Con parámetro:
 *
 * /dashboard/callcenter/registros/nuevo?id=71
 */
export default function NuevoRegistroCallCenterPage() {
  const searchParams =
    useSearchParams();

  const rawId =
    searchParams.get('id');

  const registroId =
    rawId
      ? Number(rawId)
      : undefined;

  if (
    rawId
    && (
      !Number.isSafeInteger(registroId)
      || Number(registroId) <= 0
    )
  ) {
    return (
      <Box
        sx={{
          p: {
            xs: 2,
            md: 3,
          },
        }}
      >
        <Alert severity="error">
          El identificador del registro Call Center no es
          válido.
        </Alert>
      </Box>
    );
  }

  return (
    <CallCenterRegistroCompletoForm
      registroId={registroId}
    />
  );
}