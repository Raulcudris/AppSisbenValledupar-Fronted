'use client';

import { Alert } from '@mui/material';

type AccessMessageProps = {
  message?: string;
};

export default function AccessMessage({
  message = 'No tienes permisos para consultar esta información con el rol actual.',
}: AccessMessageProps) {
  return (
    <Alert severity="warning">
      {message}
    </Alert>
  );
}