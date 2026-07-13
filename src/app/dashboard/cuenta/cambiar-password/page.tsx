'use client';

import LockResetIcon from '@mui/icons-material/LockReset';
import SaveIcon from '@mui/icons-material/Save';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  InputAdornment,
  MenuItem,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';

import LoadingState from '@/components/dashboard/LoadingState';
import { currentRole } from '@/lib/roleAccess';
import {
  changeOwnPassword,
  getUsers,
  resetUserPassword,
} from '@/services/user-management.service';
import { UserResponse } from '@/types/user-management.types';

type OwnPasswordFormState = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type AdminPasswordFormState = {
  userId: string;
  newPassword: string;
  confirmPassword: string;
};

type SnackbarSeverity = 'success' | 'error' | 'warning' | 'info';

type SnackbarState = {
  open: boolean;
  message: string;
  severity: SnackbarSeverity;
};

const initialOwnForm: OwnPasswordFormState = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

const initialAdminForm: AdminPasswordFormState = {
  userId: '',
  newPassword: '',
  confirmPassword: '',
};

const initialSnackbar: SnackbarState = {
  open: false,
  message: '',
  severity: 'success',
};

export default function CambiarPasswordPage() {
  const [ownForm, setOwnForm] = useState<OwnPasswordFormState>(initialOwnForm);
  const [adminForm, setAdminForm] = useState<AdminPasswordFormState>(initialAdminForm);

  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [savingOwnPassword, setSavingOwnPassword] = useState(false);
  const [savingAdminPassword, setSavingAdminPassword] = useState(false);

  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState<SnackbarState>(initialSnackbar);

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showOwnNewPassword, setShowOwnNewPassword] = useState(false);
  const [showOwnConfirmPassword, setShowOwnConfirmPassword] = useState(false);

  const [showAdminNewPassword, setShowAdminNewPassword] = useState(false);
  const [showAdminConfirmPassword, setShowAdminConfirmPassword] = useState(false);

  const isAdmin = currentRole() === 'ADMIN';

  const selectedUser = useMemo(() => {
    return users.find((user) => String(user.id) === adminForm.userId) ?? null;
  }, [adminForm.userId, users]);

  const showSnackbar = (
    message: string,
    severity: SnackbarSeverity = 'success'
  ) => {
    setSnackbar({
      open: true,
      message,
      severity,
    });
  };

  const closeSnackbar = () => {
    setSnackbar(initialSnackbar);
  };

  const loadUsers = async () => {
    if (!isAdmin) {
      return;
    }

    setLoadingUsers(true);
    setError('');

    try {
      const response = await getUsers(0, 200);
      setUsers(response.content ?? []);
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : 'No fue posible cargar los usuarios.';

      setError(message);
      showSnackbar(message, 'error');
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const updateOwnForm = (key: keyof OwnPasswordFormState, value: string) => {
    setOwnForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const updateAdminForm = (key: keyof AdminPasswordFormState, value: string) => {
    setAdminForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const validateOwnPassword = () => {
    if (!ownForm.currentPassword.trim()) {
      return 'La contraseña actual es obligatoria.';
    }

    if (!ownForm.newPassword.trim()) {
      return 'La nueva contraseña es obligatoria.';
    }

    if (ownForm.newPassword.length < 8) {
      return 'La nueva contraseña debe tener mínimo 8 caracteres.';
    }

    if (ownForm.newPassword !== ownForm.confirmPassword) {
      return 'La nueva contraseña y la confirmación no coinciden.';
    }

    if (ownForm.currentPassword === ownForm.newPassword) {
      return 'La nueva contraseña debe ser diferente a la contraseña actual.';
    }

    return '';
  };

  const validateAdminPassword = () => {
    if (!adminForm.userId) {
      return 'Selecciona el usuario al que deseas cambiarle la contraseña.';
    }

    if (!adminForm.newPassword.trim()) {
      return 'La nueva contraseña es obligatoria.';
    }

    if (adminForm.newPassword.length < 8) {
      return 'La nueva contraseña debe tener mínimo 8 caracteres.';
    }

    if (adminForm.newPassword !== adminForm.confirmPassword) {
      return 'La nueva contraseña y la confirmación no coinciden.';
    }

    return '';
  };

  const saveOwnPassword = async () => {
    setError('');

    const validationMessage = validateOwnPassword();

    if (validationMessage) {
      setError(validationMessage);
      showSnackbar(validationMessage, 'warning');
      return;
    }

    setSavingOwnPassword(true);

    try {
      await changeOwnPassword({
        currentPassword: ownForm.currentPassword,
        newPassword: ownForm.newPassword,
        confirmPassword: ownForm.confirmPassword,
      });

      showSnackbar('Tu contraseña fue actualizada correctamente.', 'success');
      setOwnForm(initialOwnForm);
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : 'No fue posible cambiar la contraseña. Verifica la contraseña actual.';

      setError(message);
      showSnackbar(message, 'error');
    } finally {
      setSavingOwnPassword(false);
    }
  };

  const saveAdminPassword = async () => {
    setError('');

    const validationMessage = validateAdminPassword();

    if (validationMessage) {
      setError(validationMessage);
      showSnackbar(validationMessage, 'warning');
      return;
    }

    setSavingAdminPassword(true);

    try {
      await resetUserPassword(Number(adminForm.userId), {
        newPassword: adminForm.newPassword,
        confirmPassword: adminForm.confirmPassword,
      });

      showSnackbar('Contraseña del usuario restablecida correctamente.', 'success');
      setAdminForm(initialAdminForm);
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : 'No fue posible restablecer la contraseña del usuario.';

      setError(message);
      showSnackbar(message, 'error');
    } finally {
      setSavingAdminPassword(false);
    }
  };

  return (
    <Stack spacing={3}>
      <Card sx={{ borderRadius: 4, overflow: 'hidden' }}>
        <CardContent
          sx={{
            p: { xs: 3, md: 4 },
            background:
              'linear-gradient(135deg, rgba(25, 118, 210, 0.10), rgba(25, 118, 210, 0.02))',
          }}
        >
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 3,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <LockResetIcon />
            </Box>

            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>
                Cambiar contraseña
              </Typography>

              <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                Actualiza tu contraseña de ingreso a la app web.
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {error ? (
        <Alert severity="error">
          {error}
        </Alert>
      ) : null}

      <Card
        sx={{
          maxWidth: 720,
          borderRadius: 4,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Stack spacing={2}>
            <Box>
              <Chip
                label="Mi cuenta"
                color="primary"
                variant="outlined"
                sx={{ mb: 1 }}
              />

              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                Cambiar mi contraseña
              </Typography>

              <Typography color="text.secondary" sx={{ fontSize: 14 }}>
                Para cambiar tu contraseña debes escribir tu contraseña actual.
              </Typography>
            </Box>

            <TextField
              label="Contraseña actual"
              type={showCurrentPassword ? 'text' : 'password'}
              size="small"
              required
              value={ownForm.currentPassword}
              onChange={(event) => updateOwnForm('currentPassword', event.target.value)}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        edge="end"
                        onClick={() => setShowCurrentPassword((current) => !current)}
                      >
                        {showCurrentPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />

            <TextField
              label="Nueva contraseña"
              type={showOwnNewPassword ? 'text' : 'password'}
              size="small"
              required
              value={ownForm.newPassword}
              onChange={(event) => updateOwnForm('newPassword', event.target.value)}
              helperText="Debe tener mínimo 8 caracteres."
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        edge="end"
                        onClick={() => setShowOwnNewPassword((current) => !current)}
                      >
                        {showOwnNewPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />

            <TextField
              label="Confirmar nueva contraseña"
              type={showOwnConfirmPassword ? 'text' : 'password'}
              size="small"
              required
              value={ownForm.confirmPassword}
              onChange={(event) => updateOwnForm('confirmPassword', event.target.value)}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        edge="end"
                        onClick={() => setShowOwnConfirmPassword((current) => !current)}
                      >
                        {showOwnConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />

            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={saveOwnPassword}
              disabled={savingOwnPassword}
              sx={{ alignSelf: 'flex-start' }}
            >
              {savingOwnPassword ? 'Guardando...' : 'Actualizar mi contraseña'}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {isAdmin ? (
        <Card
          sx={{
            maxWidth: 760,
            borderRadius: 4,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            <Stack spacing={2}>
              <Box>
                <Chip
                  label="Modo administrador"
                  color="warning"
                  variant="outlined"
                  sx={{ mb: 1 }}
                />

                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  Restablecer contraseña de otro usuario
                </Typography>

                <Typography color="text.secondary" sx={{ fontSize: 14 }}>
                  Esta opción no requiere la contraseña actual del usuario. Solo asigna una nueva contraseña.
                </Typography>
              </Box>

              {loadingUsers ? (
                <LoadingState />
              ) : (
                <TextField
                  select
                  label="Usuario"
                  size="small"
                  required
                  value={adminForm.userId}
                  onChange={(event) => updateAdminForm('userId', event.target.value)}
                >
                  {users.map((user) => (
                    <MenuItem key={user.id} value={String(user.id)}>
                      {user.username} - {user.nombres} {user.apellidos ?? ''} ({user.rolNombre})
                    </MenuItem>
                  ))}
                </TextField>
              )}

              {selectedUser ? (
                <Alert severity="info">
                  Usuario seleccionado: {selectedUser.username} - {selectedUser.nombres} {selectedUser.apellidos ?? ''}
                </Alert>
              ) : null}

              <TextField
                label="Nueva contraseña"
                type={showAdminNewPassword ? 'text' : 'password'}
                size="small"
                required
                value={adminForm.newPassword}
                onChange={(event) => updateAdminForm('newPassword', event.target.value)}
                helperText="Debe tener mínimo 8 caracteres."
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          edge="end"
                          onClick={() => setShowAdminNewPassword((current) => !current)}
                        >
                          {showAdminNewPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />

              <TextField
                label="Confirmar nueva contraseña"
                type={showAdminConfirmPassword ? 'text' : 'password'}
                size="small"
                required
                value={adminForm.confirmPassword}
                onChange={(event) => updateAdminForm('confirmPassword', event.target.value)}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          edge="end"
                          onClick={() => setShowAdminConfirmPassword((current) => !current)}
                        >
                          {showAdminConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />

              <Button
                variant="contained"
                color="warning"
                startIcon={<SaveIcon />}
                onClick={saveAdminPassword}
                disabled={savingAdminPassword || loadingUsers}
                sx={{ alignSelf: 'flex-start' }}
              >
                {savingAdminPassword ? 'Guardando...' : 'Restablecer contraseña'}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      ) : null}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3500}
        onClose={closeSnackbar}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
          onClose={closeSnackbar}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Stack>
  );
}