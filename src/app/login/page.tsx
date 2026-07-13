'use client';

import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import SaveIcon from '@mui/icons-material/Save';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

import { ApiClientError } from '@/lib/apiClient';
import { getDefaultDashboardPathByRole } from '@/lib/roleAccess';
import { login } from '@/services/auth.service';
import { changePasswordFromLogin } from '@/services/user-management.service';

type PasswordFormState = {
  username: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type SnackbarSeverity = 'success' | 'error' | 'warning' | 'info';

type SnackbarState = {
  open: boolean;
  message: string;
  severity: SnackbarSeverity;
};

const initialPasswordForm: PasswordFormState = {
  username: '',
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

const initialSnackbar: SnackbarState = {
  open: false,
  message: '',
  severity: 'success',
};

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState('ADMIN');
  const [password, setPassword] = useState('Admin123*');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [forgotDialogOpen, setForgotDialogOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState<PasswordFormState>(initialPasswordForm);
  const [savingPassword, setSavingPassword] = useState(false);

  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [snackbar, setSnackbar] = useState<SnackbarState>(initialSnackbar);

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

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setLoading(true);
    setError('');

    try {
      const session = await login(username, password);
      const redirectPath = getDefaultDashboardPathByRole(session.user.rolCodigo);

      router.replace(redirectPath);
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.status === 0) {
          setError('No hay conexión con el backend.');
        } else if ([400, 401, 403].includes(err.status)) {
          setError('Usuario o contraseña incorrectos. Verifica los datos e intenta nuevamente.');
        } else {
          setError('No fue posible procesar la solicitud en este momento. Intenta nuevamente o comunícate con el administrador del sistema.');
        }
      } else {
        setError('No fue posible iniciar sesión.');
      }
    } finally {
      setLoading(false);
    }
  };

  const openPasswordDialog = () => {
    setError('');
    setPasswordForm({
      ...initialPasswordForm,
      username: username.trim(),
    });
    setPasswordDialogOpen(true);
  };

  const closePasswordDialog = () => {
    setPasswordDialogOpen(false);
    setPasswordForm(initialPasswordForm);
  };

  const openForgotDialog = () => {
    setForgotDialogOpen(true);
  };

  const closeForgotDialog = () => {
    setForgotDialogOpen(false);
  };

  const updatePasswordForm = (key: keyof PasswordFormState, value: string) => {
    setPasswordForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const validatePasswordForm = () => {
    if (!passwordForm.username.trim()) {
      return 'El usuario es obligatorio.';
    }

    if (!passwordForm.currentPassword.trim()) {
      return 'La contraseña actual es obligatoria.';
    }

    if (!passwordForm.newPassword.trim()) {
      return 'La nueva contraseña es obligatoria.';
    }

    if (passwordForm.newPassword.length < 8) {
      return 'La nueva contraseña debe tener mínimo 8 caracteres.';
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      return 'La nueva contraseña y la confirmación no coinciden.';
    }

    if (passwordForm.currentPassword === passwordForm.newPassword) {
      return 'La nueva contraseña debe ser diferente a la contraseña actual.';
    }

    return '';
  };

  const savePasswordFromLogin = async () => {
    setError('');

    const validationMessage = validatePasswordForm();

    if (validationMessage) {
      showSnackbar(validationMessage, 'warning');
      return;
    }

    setSavingPassword(true);

    try {
      await changePasswordFromLogin({
        username: passwordForm.username.trim(),
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.confirmPassword,
      });

      showSnackbar('Contraseña actualizada correctamente. Ahora puedes iniciar sesión.', 'success');

      setUsername(passwordForm.username.trim());
      setPassword('');
      closePasswordDialog();
    } catch (err) {
      if (err instanceof ApiClientError) {
        if ([400, 401, 403].includes(err.status)) {
          showSnackbar(
            'No fue posible cambiar la contraseña. Verifica el usuario y la contraseña actual.',
            'error'
          );
        } else if (err.status === 0) {
          showSnackbar('No hay conexión con el backend.', 'error');
        } else {
          showSnackbar(
            'No fue posible procesar la solicitud en este momento. Intenta nuevamente o comunícate con el administrador del sistema.',
            'error'
          );
        }
      } else {
        showSnackbar('No fue posible cambiar la contraseña.', 'error');
      }
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <Container maxWidth="xs">
        <Card>
          <CardContent sx={{ p: 4 }}>
            <Stack spacing={3} sx={{ alignItems: 'center' }}>
              <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
                <LockOutlinedIcon />
              </Avatar>

              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5">
                  AppSisbenValledupar
                </Typography>

                <Typography color="text.secondary">
                  Inicia sesión para acceder al dashboard
                </Typography>
              </Box>

              {error ? (
                <Alert severity="error" sx={{ width: '100%' }}>
                  <Stack spacing={1}>
                    <Typography sx={{ fontSize: 14 }}>
                      {error}
                    </Typography>

                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                     startIcon={<LockOutlinedIcon />}
                      onClick={openForgotDialog}
                    >
                      Olvidé mi contraseña
                    </Button>
                  </Stack>
                </Alert>
              ) : null}

              <Box component="form" onSubmit={handleLogin} sx={{ width: '100%' }}>
                <Stack spacing={2}>
                  <TextField
                    label="Usuario"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    fullWidth
                    required
                  />

                  <TextField
                    label="Contraseña"
                    type={showLoginPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    fullWidth
                    required
                    slotProps={{
                      input: {
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              edge="end"
                              onClick={() => setShowLoginPassword((current) => !current)}
                            >
                              {showLoginPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      },
                    }}
                  />

                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={loading}
                    fullWidth
                  >
                    {loading ? 'Ingresando...' : 'Ingresar'}
                  </Button>

                  <Stack spacing={1}>
                    <Button
                      variant="text"
                      size="small"
                      onClick={openPasswordDialog}
                    >
                      Cambiar contraseña con mi contraseña actual
                    </Button>

                    <Button
                      variant="text"
                      size="small"
                      color="warning"
                      startIcon={<LockOutlinedIcon />}
                      onClick={openForgotDialog}
                    >
                      Olvidé mi contraseña
                    </Button>
                  </Stack>
                </Stack>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Container>

      <Dialog
        open={passwordDialogOpen}
        onClose={closePasswordDialog}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>
          Cambiar contraseña
        </DialogTitle>

        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Alert severity="info">
              Esta opción es solo para usuarios que recuerdan su contraseña actual.
            </Alert>

            <TextField
              label="Usuario"
              size="small"
              required
              value={passwordForm.username}
              onChange={(event) => updatePasswordForm('username', event.target.value)}
            />

            <TextField
              label="Contraseña actual"
              type={showCurrentPassword ? 'text' : 'password'}
              size="small"
              required
              value={passwordForm.currentPassword}
              onChange={(event) => updatePasswordForm('currentPassword', event.target.value)}
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
              type={showNewPassword ? 'text' : 'password'}
              size="small"
              required
              value={passwordForm.newPassword}
              onChange={(event) => updatePasswordForm('newPassword', event.target.value)}
              helperText="Debe tener mínimo 8 caracteres."
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        edge="end"
                        onClick={() => setShowNewPassword((current) => !current)}
                      >
                        {showNewPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />

            <TextField
              label="Confirmar nueva contraseña"
              type={showConfirmPassword ? 'text' : 'password'}
              size="small"
              required
              value={passwordForm.confirmPassword}
              onChange={(event) => updatePasswordForm('confirmPassword', event.target.value)}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        edge="end"
                        onClick={() => setShowConfirmPassword((current) => !current)}
                      >
                        {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={closePasswordDialog}>
            Cancelar
          </Button>

          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={savePasswordFromLogin}
            disabled={savingPassword}
          >
            {savingPassword ? 'Guardando...' : 'Actualizar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={forgotDialogOpen}
        onClose={closeForgotDialog}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>
          Restablecimiento de contraseña
        </DialogTitle>

        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Alert severity="warning">
              Si olvidaste tu contraseña, solicita al administrador del sistema que restablezca tu acceso.
            </Alert>

            <Typography color="text.secondary" sx={{ fontSize: 14 }}>
              El administrador podrá asignarte una contraseña temporal desde el módulo
              “Gestión de usuarios” o desde “Cambiar contraseña”.
            </Typography>

            <Typography color="text.secondary" sx={{ fontSize: 14 }}>
              Después de ingresar con la contraseña temporal, podrás cambiarla desde el menú
              “Cambiar contraseña”.
            </Typography>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button variant="contained" onClick={closeForgotDialog}>
            Entendido
          </Button>
        </DialogActions>
      </Dialog>

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
    </Box>
  );
}