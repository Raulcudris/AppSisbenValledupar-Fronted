'use client';

import {
  Alert,
  AlertColor,
  Snackbar,
} from '@mui/material';

export type AppSnackbarState = {
  open: boolean;
  type: AlertColor;
  title?: string;
  message: string;
};

type AppSnackbarProps = {
  feedback: AppSnackbarState;
  onClose: () => void;
};

export const initialSnackbarState: AppSnackbarState = {
  open: false,
  type: 'info',
  title: '',
  message: '',
};

export default function AppSnackbar({
  feedback,
  onClose,
}: AppSnackbarProps) {
  return (
    <Snackbar
      open={feedback.open}
      autoHideDuration={4500}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
    >
      <Alert
        onClose={onClose}
        severity={feedback.type}
        variant="filled"
        sx={{
          width: '100%',
          boxShadow: 3,
        }}
      >
        {feedback.title ? <strong>{feedback.title}: </strong> : null}
        {feedback.message}
      </Alert>
    </Snackbar>
  );
}