'use client';

import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import LockResetIcon from '@mui/icons-material/LockReset';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import RestoreIcon from '@mui/icons-material/Restore';
import SearchIcon from '@mui/icons-material/Search';
import ToggleOffIcon from '@mui/icons-material/ToggleOff';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { ChangeEvent, MouseEvent, useEffect, useMemo, useState } from 'react';

import AccessMessage from '@/components/dashboard/AccessMessage';
import LoadingState from '@/components/dashboard/LoadingState';
import { ApiClientError } from '@/lib/apiClient';
import { currentRole } from '@/lib/roleAccess';
import {
  activateUser,
  createUser,
  getUserRoles,
  getUsers,
  inactivateUser,
  resetUserPassword,
  updateUser,
} from '@/services/user-management.service';
import { PageResponse } from '@/types/api.types';
import {
  RoleOptionResponse,
  UserCreateRequest,
  UserResponse,
  UserUpdateRequest,
} from '@/types/user-management.types';

type UserFormState = {
  id?: number;
  username: string;
  password: string;
  confirmPassword: string;
  documento: string;
  nombres: string;
  apellidos: string;
  email: string;
  telefono: string;
  activo: boolean;
  rolCodigo: string;
};

type PasswordFormState = {
  newPassword: string;
  confirmPassword: string;
};

type SnackbarSeverity = 'success' | 'error' | 'warning' | 'info';

type SnackbarState = {
  open: boolean;
  message: string;
  severity: SnackbarSeverity;
};

const initialSnackbar: SnackbarState = {
  open: false,
  message: '',
  severity: 'success',
};

const initialForm: UserFormState = {
  username: '',
  password: '',
  confirmPassword: '',
  documento: '',
  nombres: '',
  apellidos: '',
  email: '',
  telefono: '',
  activo: true,
  rolCodigo: '',
};

const initialPasswordForm: PasswordFormState = {
  newPassword: '',
  confirmPassword: '',
};

export default function UsuariosPage() {
  const [pageData, setPageData] = useState<PageResponse<UserResponse> | null>(null);
  const [roles, setRoles] = useState<RoleOptionResponse[]>([]);
  const [tableSearch, setTableSearch] = useState('');

  const [loading, setLoading] = useState(true);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [restricted, setRestricted] = useState(false);
  const [error, setError] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [form, setForm] = useState<UserFormState>(initialForm);
  const [passwordForm, setPasswordForm] = useState<PasswordFormState>(initialPasswordForm);
  const [passwordRecord, setPasswordRecord] = useState<UserResponse | null>(null);

  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [menuRecord, setMenuRecord] = useState<UserResponse | null>(null);

  const [snackbar, setSnackbar] = useState<SnackbarState>(initialSnackbar);

  const role = currentRole();
  const isAdmin = role === 'ADMIN';
  const menuOpen = Boolean(menuAnchorEl);

  const totalRecords = pageData?.totalElements ?? 0;
  const currentPage = pageData?.page ?? 0;
  const currentSize = pageData?.size ?? 20;

  const visibleRows = useMemo(() => {
    const searchText = tableSearch.trim().toLowerCase();

    return (pageData?.content ?? []).filter((row) => {
      if (!searchText) {
        return true;
      }

      return [
        row.username,
        row.documento,
        row.nombres,
        row.apellidos,
        row.email,
        row.telefono,
        row.rolCodigo,
        row.rolNombre,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(searchText));
    });
  }, [pageData, tableSearch]);

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

  const loadRoles = async () => {
    setCatalogLoading(true);

    try {
      const response = await getUserRoles();
      setRoles(response);
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : 'No fue posible cargar los roles.';

      setError(message);
      showSnackbar(message, 'error');
    } finally {
      setCatalogLoading(false);
    }
  };

  const load = async (page = currentPage, size = currentSize) => {
    setLoading(true);
    setRestricted(false);
    setError('');

    try {
      const response = await getUsers(page, size);
      setPageData(response);
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 403) {
        setRestricted(true);
      } else {
        const message = err instanceof Error
          ? err.message
          : 'No fue posible consultar usuarios.';

        setError(message);
        showSnackbar(message, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) {
      setRestricted(true);
      setLoading(false);
      return;
    }

    loadRoles();
    load(0, 20);
  }, []);

  const openCreate = () => {
    setError('');
    setForm(initialForm);
    setFormOpen(true);
  };

  const openEdit = (row: UserResponse) => {
    setError('');
    setForm({
      id: row.id,
      username: row.username ?? '',
      password: '',
      confirmPassword: '',
      documento: row.documento ?? '',
      nombres: row.nombres ?? '',
      apellidos: row.apellidos ?? '',
      email: row.email ?? '',
      telefono: row.telefono ?? '',
      activo: row.activo,
      rolCodigo: row.rolCodigo ?? '',
    });
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
  };

  const handleFormClose = (
    _: unknown,
    reason?: 'backdropClick' | 'escapeKeyDown'
  ) => {
    if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
      return;
    }
  };

  const updateFormValue = (key: keyof UserFormState, value: string | boolean) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const updatePasswordFormValue = (
    key: keyof PasswordFormState,
    value: string
  ) => {
    setPasswordForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const openRowMenu = (
    event: MouseEvent<HTMLButtonElement>,
    row: UserResponse
  ) => {
    setMenuAnchorEl(event.currentTarget);
    setMenuRecord(row);
  };

  const closeRowMenu = () => {
    setMenuAnchorEl(null);
    setMenuRecord(null);
  };

  const handleMenuEdit = () => {
    if (!menuRecord) {
      return;
    }

    const record = menuRecord;
    closeRowMenu();
    openEdit(record);
  };

  const handleMenuStatus = async () => {
    if (!menuRecord) {
      return;
    }

    const record = menuRecord;
    closeRowMenu();

    try {
      if (record.activo) {
        await inactivateUser(record.id);
        showSnackbar('Usuario inactivado correctamente.', 'success');
      } else {
        await activateUser(record.id);
        showSnackbar('Usuario activado correctamente.', 'success');
      }

      load(currentPage, currentSize);
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : 'No fue posible actualizar el estado del usuario.';

      setError(message);
      showSnackbar(message, 'error');
    }
  };

  const handleMenuResetPassword = () => {
    if (!menuRecord) {
      return;
    }

    const record = menuRecord;

    setPasswordRecord(record);
    setPasswordForm(initialPasswordForm);
    setPasswordDialogOpen(true);
    closeRowMenu();
  };

  const closePasswordDialog = () => {
    setPasswordDialogOpen(false);
    setPasswordRecord(null);
    setPasswordForm(initialPasswordForm);
  };

  const validateUserForm = () => {
    if (!form.username.trim()) {
      return 'El nombre de usuario es obligatorio.';
    }

    if (!form.nombres.trim()) {
      return 'Los nombres son obligatorios.';
    }

    if (!form.rolCodigo) {
      return 'Selecciona el rol del usuario.';
    }

    if (!form.id && !form.password.trim()) {
      return 'La contraseña es obligatoria para crear un usuario.';
    }

    if (!form.id && form.password.length < 8) {
      return 'La contraseña debe tener mínimo 8 caracteres.';
    }

    if (!form.id && form.password !== form.confirmPassword) {
      return 'La contraseña y la confirmación no coinciden.';
    }

    return '';
  };

  const saveUser = async () => {
    setError('');

    const validationMessage = validateUserForm();

    if (validationMessage) {
      setError(validationMessage);
      showSnackbar(validationMessage, 'warning');
      return;
    }

    try {
      if (form.id) {
        const request: UserUpdateRequest = {
          username: form.username.trim(),
          documento: form.documento.trim() || undefined,
          nombres: form.nombres.trim(),
          apellidos: form.apellidos.trim() || undefined,
          email: form.email.trim() || undefined,
          telefono: form.telefono.trim() || undefined,
          activo: form.activo,
          rolCodigo: form.rolCodigo,
        };

        await updateUser(form.id, request);
        showSnackbar('Usuario actualizado correctamente.', 'success');
      } else {
        const request: UserCreateRequest = {
          username: form.username.trim(),
          password: form.password,
          confirmPassword: form.confirmPassword,
          documento: form.documento.trim() || undefined,
          nombres: form.nombres.trim(),
          apellidos: form.apellidos.trim() || undefined,
          email: form.email.trim() || undefined,
          telefono: form.telefono.trim() || undefined,
          activo: form.activo,
          rolCodigo: form.rolCodigo,
        };

        await createUser(request);

        showSnackbar(
          'Usuario creado correctamente. Puedes crear otro usuario o cerrar el formulario.',
          'success'
        );

        setForm(initialForm);
      }

      load(currentPage, currentSize);
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : 'No fue posible guardar el usuario.';

      setError(message);
      showSnackbar(message, 'error');
    }
  };

  const resetPassword = async () => {
    if (!passwordRecord) {
      return;
    }

    if (!passwordForm.newPassword.trim()) {
      showSnackbar('La nueva contraseña es obligatoria.', 'warning');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      showSnackbar('La contraseña debe tener mínimo 8 caracteres.', 'warning');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showSnackbar('La contraseña y la confirmación no coinciden.', 'warning');
      return;
    }

    try {
      await resetUserPassword(passwordRecord.id, passwordForm);

      showSnackbar('Contraseña restablecida correctamente.', 'success');
      closePasswordDialog();
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : 'No fue posible restablecer la contraseña.';

      showSnackbar(message, 'error');
    }
  };

  const clearSearch = () => {
    setTableSearch('');
  };

  const handleChangePage = (_: unknown, newPage: number) => {
    load(newPage, currentSize);
  };

  const handleChangeRowsPerPage = (event: ChangeEvent<HTMLInputElement>) => {
    load(0, Number(event.target.value));
  };

  if (loading && !pageData && isAdmin) {
    return <LoadingState />;
  }

  if (!isAdmin || restricted) {
    return <AccessMessage />;
  }

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
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            sx={{
              alignItems: { xs: 'flex-start', md: 'center' },
              justifyContent: 'space-between',
            }}
          >
            <Box>
              <Chip
                label="Administración"
                color="primary"
                variant="outlined"
                sx={{ mb: 1.5 }}
              />

              <Typography variant="h4" sx={{ fontWeight: 800 }}>
                Gestión de usuarios
              </Typography>

              <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 720 }}>
                Crea, consulta, actualiza, activa, inactiva usuarios y restablece contraseñas de acceso a la app web.
              </Typography>
            </Box>

            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={openCreate}
              disabled={catalogLoading}
            >
              Nuevo usuario
            </Button>
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
          borderRadius: 4,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 16px 40px rgba(15, 23, 42, 0.08)',
        }}
      >
        <CardContent sx={{ p: 0 }}>
          <Box
            sx={{
              px: { xs: 2, md: 2.5 },
              py: 2,
              display: 'flex',
              gap: 2,
              alignItems: { xs: 'stretch', sm: 'center' },
              justifyContent: 'space-between',
              flexDirection: { xs: 'column', sm: 'row' },
              bgcolor: 'background.paper',
            }}
          >
            <TextField
              placeholder="Buscar usuario, documento, nombre, rol..."
              size="small"
              value={tableSearch}
              onChange={(event) => setTableSearch(event.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{
                width: { xs: '100%', sm: 520, md: 620 },
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2.5,
                  bgcolor: '#ffffff',
                },
              }}
            />

            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Chip
                label={`${visibleRows.length} visible${visibleRows.length === 1 ? '' : 's'}`}
                size="small"
                color="primary"
                variant="outlined"
              />

              <Button
                variant="outlined"
                startIcon={<RestartAltIcon />}
                onClick={clearSearch}
              >
                Limpiar
              </Button>
            </Stack>
          </Box>

          <Box sx={{ overflowX: 'auto' }}>
            <Table
              sx={{
                minWidth: 1100,
                '& .MuiTableCell-root': {
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                },
                '& .MuiTableHead-root .MuiTableCell-root': {
                  bgcolor: '#f8fafc',
                  color: 'text.secondary',
                  fontSize: 13,
                  fontWeight: 800,
                  py: 1.6,
                },
                '& .MuiTableBody-root .MuiTableCell-root': {
                  py: 1.7,
                  fontSize: 14,
                },
                '& .MuiTableRow-root:hover': {
                  bgcolor: '#f8fafc',
                },
              }}
            >
              <TableHead>
                <TableRow>
                  <TableCell>Usuario</TableCell>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Documento</TableCell>
                  <TableCell>Contacto</TableCell>
                  <TableCell>Rol</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {visibleRows.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell>
                      <Chip
                        label={row.username}
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ fontWeight: 700 }}
                      />
                    </TableCell>

                    <TableCell>
                      <Stack spacing={0.2} sx={{ minWidth: 220 }}>
                        <Typography sx={{ fontWeight: 800 }}>
                          {row.nombres} {row.apellidos ?? ''}
                        </Typography>

                        <Typography color="text.secondary" sx={{ fontSize: 13 }}>
                          ID: {row.id}
                        </Typography>
                      </Stack>
                    </TableCell>

                    <TableCell>
                      <Typography sx={{ minWidth: 130 }}>
                        {row.documento || 'Sin documento'}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Stack spacing={0.2} sx={{ minWidth: 220 }}>
                        <Typography sx={{ fontSize: 14 }}>
                          {row.email || 'Sin correo'}
                        </Typography>

                        <Typography color="text.secondary" sx={{ fontSize: 13 }}>
                          {row.telefono || 'Sin teléfono'}
                        </Typography>
                      </Stack>
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={row.rolNombre || row.rolCodigo}
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 700 }}
                      />
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={row.activo ? 'Activo' : 'Inactivo'}
                        size="small"
                        color={row.activo ? 'success' : 'warning'}
                        variant={row.activo ? 'outlined' : 'filled'}
                        sx={{ fontWeight: 700 }}
                      />
                    </TableCell>

                    <TableCell align="center">
                      <IconButton
                        onClick={(event) => openRowMenu(event, row)}
                        sx={{
                          borderRadius: 2,
                          color: 'text.secondary',
                        }}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}

                {!visibleRows.length ? (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <Box sx={{ py: 5, textAlign: 'center' }}>
                        <Typography variant="h6">
                          No hay usuarios para mostrar
                        </Typography>

                        <Typography color="text.secondary" sx={{ mt: 1 }}>
                          Intenta limpiar la búsqueda o verificar los datos registrados.
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </Box>

          <TablePagination
            component="div"
            count={totalRecords}
            page={currentPage}
            onPageChange={handleChangePage}
            rowsPerPage={currentSize}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[10, 20, 50]}
            labelRowsPerPage="Filas por página"
            labelDisplayedRows={({ from, to, count }) =>
              `${from}-${to} de ${count !== -1 ? count : `más de ${to}`}`
            }
            sx={{
              borderTop: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
            }}
          />

          <Menu
            anchorEl={menuAnchorEl}
            open={menuOpen}
            onClose={closeRowMenu}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            slotProps={{
              paper: {
                sx: {
                  mt: 1,
                  minWidth: 230,
                  borderRadius: 3,
                  boxShadow: '0 16px 40px rgba(15, 23, 42, 0.16)',
                },
              },
            }}
          >
            <MenuItem
              onClick={handleMenuEdit}
              sx={{
                gap: 1.5,
                color: 'info.main',
                fontWeight: 700,
              }}
            >
              <EditIcon fontSize="small" />
              Actualizar usuario
            </MenuItem>

            <MenuItem
              onClick={handleMenuStatus}
              sx={{
                gap: 1.5,
                color: menuRecord?.activo ? 'error.main' : 'success.main',
                fontWeight: 700,
              }}
            >
              {menuRecord?.activo ? (
                <ToggleOffIcon fontSize="small" />
              ) : (
                <RestoreIcon fontSize="small" />
              )}

              {menuRecord?.activo ? 'Inactivar usuario' : 'Activar usuario'}
            </MenuItem>

            <MenuItem
              onClick={handleMenuResetPassword}
              sx={{
                gap: 1.5,
                color: 'warning.main',
                fontWeight: 700,
              }}
            >
              <LockResetIcon fontSize="small" />
              Restablecer contraseña
            </MenuItem>
          </Menu>
        </CardContent>
      </Card>

      <Dialog open={formOpen} onClose={handleFormClose} fullScreen>
        <DialogTitle
          sx={{
            px: { xs: 2, md: 4 },
            py: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Stack
            direction="row"
            spacing={2}
            sx={{
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                {form.id ? 'Editar usuario' : 'Nuevo usuario'}
              </Typography>

              <Typography color="text.secondary" sx={{ fontSize: 14 }}>
                Gestiona la información y permisos del usuario de la app web.
              </Typography>
            </Box>

            <IconButton
              onClick={closeForm}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
              }}
            >
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent
          sx={{
            p: { xs: 2, md: 4 },
            bgcolor: '#f8fafc',
          }}
        >
          <Stack spacing={3} sx={{ maxWidth: 1100, mx: 'auto', pt: 1 }}>
            <Card
              sx={{
                borderRadius: 4,
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: '1fr',
                      md: 'repeat(2, 1fr)',
                    },
                    gap: 2,
                  }}
                >
                  <TextField
                    label="Usuario"
                    size="small"
                    required
                    value={form.username}
                    onChange={(event) => updateFormValue('username', event.target.value)}
                  />

                  <TextField
                    select
                    label="Rol"
                    size="small"
                    required
                    value={form.rolCodigo}
                    onChange={(event) => updateFormValue('rolCodigo', event.target.value)}
                    disabled={catalogLoading}
                  >
                    {roles.map((roleOption) => (
                      <MenuItem key={roleOption.codigo} value={roleOption.codigo}>
                        {roleOption.nombre} ({roleOption.codigo})
                      </MenuItem>
                    ))}
                  </TextField>

                  {!form.id ? (
                    <>
                      <TextField
                        label="Contraseña"
                        type="password"
                        size="small"
                        required
                        value={form.password}
                        onChange={(event) => updateFormValue('password', event.target.value)}
                      />

                      <TextField
                        label="Confirmar contraseña"
                        type="password"
                        size="small"
                        required
                        value={form.confirmPassword}
                        onChange={(event) => updateFormValue('confirmPassword', event.target.value)}
                      />
                    </>
                  ) : null}

                  <TextField
                    label="Documento"
                    size="small"
                    value={form.documento}
                    onChange={(event) => updateFormValue('documento', event.target.value)}
                  />

                  <TextField
                    label="Nombres"
                    size="small"
                    required
                    value={form.nombres}
                    onChange={(event) => updateFormValue('nombres', event.target.value)}
                  />

                  <TextField
                    label="Apellidos"
                    size="small"
                    value={form.apellidos}
                    onChange={(event) => updateFormValue('apellidos', event.target.value)}
                  />

                  <TextField
                    label="Correo"
                    type="email"
                    size="small"
                    value={form.email}
                    onChange={(event) => updateFormValue('email', event.target.value)}
                  />

                  <TextField
                    label="Teléfono"
                    size="small"
                    value={form.telefono}
                    onChange={(event) => updateFormValue('telefono', event.target.value)}
                  />

                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={form.activo}
                        onChange={(event) => updateFormValue('activo', event.target.checked)}
                      />
                    }
                    label="Usuario activo"
                  />
                </Box>
              </CardContent>
            </Card>
          </Stack>
        </DialogContent>

        <DialogActions
          sx={{
            px: { xs: 2, md: 4 },
            py: 2,
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            justifyContent: 'flex-end',
          }}
        >
          <Button variant="outlined" color="inherit" onClick={closeForm}>
            Cancelar
          </Button>

          <Button
            variant="contained"
            color={form.id ? 'info' : 'primary'}
            onClick={saveUser}
          >
            {form.id ? 'Actualizar usuario' : 'Guardar usuario'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={passwordDialogOpen}
        onClose={closePasswordDialog}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>
          Restablecer contraseña
        </DialogTitle>

        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Alert severity="info">
              Se cambiará la contraseña del usuario {passwordRecord?.username}.
            </Alert>

            <TextField
              label="Nueva contraseña"
              type="password"
              size="small"
              value={passwordForm.newPassword}
              onChange={(event) => updatePasswordFormValue('newPassword', event.target.value)}
            />

            <TextField
              label="Confirmar nueva contraseña"
              type="password"
              size="small"
              value={passwordForm.confirmPassword}
              onChange={(event) => updatePasswordFormValue('confirmPassword', event.target.value)}
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={closePasswordDialog}>
            Cancelar
          </Button>

          <Button variant="contained" color="warning" onClick={resetPassword}>
            Restablecer
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
    </Stack>
  );
}