'use client';

import AddIcon from '@mui/icons-material/Add';
import ApartmentIcon from '@mui/icons-material/Apartment';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import FilterListIcon from '@mui/icons-material/FilterList';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
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
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  InputAdornment,
  MenuItem,
  Snackbar,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { ChangeEvent, useEffect, useMemo, useState } from 'react';

import LoadingState from '@/components/dashboard/LoadingState';
import {
  activateComuna,
  createComuna,
  deactivateComuna,
  searchComunas,
  updateComuna,
} from '@/services/territory.service';
import { PageResponse } from '@/types/api.types';
import { ComunaResponse, TerritoryStatusFilter } from '@/types/territory.types';

type FormState = {
  id?: number;
  codigo: string;
  nombre: string;
  estrato: string;
  descripcion: string;
  activo: boolean;
};

type SnackbarSeverity = 'success' | 'error' | 'warning' | 'info';

type SnackbarState = {
  open: boolean;
  message: string;
  severity: SnackbarSeverity;
};

type ConfirmAction = {
  open: boolean;
  row: ComunaResponse | null;
  action: 'ACTIVATE' | 'DEACTIVATE' | null;
};

const initialForm: FormState = {
  codigo: '',
  nombre: '',
  estrato: '',
  descripcion: '',
  activo: true,
};

const initialSnackbar: SnackbarState = {
  open: false,
  message: '',
  severity: 'success',
};

const initialConfirmAction: ConfirmAction = {
  open: false,
  row: null,
  action: null,
};

function statusToActivo(status: TerritoryStatusFilter) {
  if (status === 'ACTIVE') return true;
  if (status === 'INACTIVE') return false;
  return undefined;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function normalizeText(value: string) {
  return value.trim().toUpperCase();
}

function formatEstrato(value: number | null | undefined) {
  return value ? `Estrato ${value}` : 'Sin estrato';
}

function truncateText(value: string | null | undefined, maxLength = 90) {
  const safeValue = value?.trim();

  if (!safeValue) {
    return 'Sin descripción';
  }

  if (safeValue.length <= maxLength) {
    return safeValue;
  }

  return `${safeValue.slice(0, maxLength)}...`;
}

function SummaryCard({
  title,
  value,
  helper,
}: {
  title: string;
  value: number;
  helper: string;
}) {
  return (
    <Card
      sx={{
        borderRadius: 4,
        border: '1px solid',
        borderColor: 'divider',
        height: '100%',
      }}
    >
      <CardContent>
        <Typography
          color="text.secondary"
          sx={{
            fontSize: 12,
            fontWeight: 900,
            textTransform: 'uppercase',
          }}
        >
          {title}
        </Typography>

        <Typography variant="h4" sx={{ fontWeight: 900, mt: 0.5 }}>
          {value}
        </Typography>

        <Typography color="text.secondary" sx={{ fontSize: 13, mt: 0.5 }}>
          {helper}
        </Typography>
      </CardContent>
    </Card>
  );
}

export default function ComunasPage() {
  const [pageData, setPageData] = useState<PageResponse<ComunaResponse> | null>(null);

  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TerritoryStatusFilter>('ALL');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processingAction, setProcessingAction] = useState(false);
  const [error, setError] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(initialForm);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(initialConfirmAction);
  const [feedback, setFeedback] = useState<SnackbarState>(initialSnackbar);

  const rows = pageData?.content ?? [];
  const totalRecords = pageData?.totalElements ?? 0;
  const currentPage = pageData?.page ?? page;
  const currentSize = pageData?.size ?? size;

  const pageActiveCount = useMemo(() => {
    return rows.filter((row) => row.activo).length;
  }, [rows]);

  const pageInactiveCount = useMemo(() => {
    return rows.filter((row) => !row.activo).length;
  }, [rows]);

  const showFeedback = (message: string, severity: SnackbarSeverity = 'success') => {
    setFeedback({
      open: true,
      message,
      severity,
    });
  };

  const closeFeedback = () => {
    setFeedback(initialSnackbar);
  };

  const load = async (
    nextPage: number = page,
    nextSize: number = size,
    nextStatus: TerritoryStatusFilter = statusFilter
  ) => {
    setLoading(true);
    setError('');

    try {
      const response = await searchComunas({
        page: nextPage,
        size: nextSize,
        q: search,
        activo: statusToActivo(nextStatus),
      });

      setPageData(response);
      setPage(response.page ?? nextPage);
      setSize(response.size ?? nextSize);
    } catch (err) {
      const message = getErrorMessage(err, 'No fue posible consultar las comunas.');
      setError(message);
      showFeedback(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(0, size, statusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateForm = (key: keyof FormState, value: string | boolean) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const openCreateDialog = () => {
    setForm(initialForm);
    setDialogOpen(true);
  };

  const openEditDialog = (row: ComunaResponse) => {
    setForm({
      id: row.id,
      codigo: row.codigo ?? '',
      nombre: row.nombre ?? '',
      estrato: row.estrato ? String(row.estrato) : '',
      descripcion: row.descripcion ?? '',
      activo: Boolean(row.activo),
    });

    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (saving) return;

    setDialogOpen(false);
    setForm(initialForm);
  };

  const validateForm = () => {
    if (!form.nombre.trim()) {
      return 'El nombre de la comuna es obligatorio.';
    }

    if (form.nombre.trim().length > 120) {
      return 'El nombre de la comuna no puede superar 120 caracteres.';
    }

    if (!form.estrato) {
      return 'El estrato de la comuna es obligatorio.';
    }

    const estratoNumber = Number(form.estrato);

    if (!Number.isInteger(estratoNumber) || estratoNumber < 1 || estratoNumber > 6) {
      return 'El estrato de la comuna debe estar entre 1 y 6.';
    }

    if (form.descripcion.trim().length > 1000) {
      return 'La descripción no puede superar 1000 caracteres.';
    }

    return '';
  };

  const save = async () => {
    const validationMessage = validateForm();

    if (validationMessage) {
      showFeedback(validationMessage, 'warning');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        nombre: normalizeText(form.nombre),
        estrato: Number(form.estrato),
        descripcion: form.descripcion.trim() || null,
        activo: form.activo,
      };

      if (form.id) {
        await updateComuna(form.id, payload);
        showFeedback('Comuna actualizada correctamente.');
      } else {
        await createComuna(payload);
        showFeedback('Comuna creada correctamente.');
      }

      setDialogOpen(false);
      setForm(initialForm);

      await load(currentPage, currentSize, statusFilter);
    } catch (err) {
      showFeedback(getErrorMessage(err, 'No fue posible guardar la comuna.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const clearFilters = async () => {
    setSearch('');
    setStatusFilter('ALL');
    setPage(0);

    setLoading(true);
    setError('');

    try {
      const response = await searchComunas({
        page: 0,
        size,
        activo: undefined,
      });

      setPageData(response);
      setPage(response.page ?? 0);
      setSize(response.size ?? size);
    } catch (err) {
      const message = getErrorMessage(err, 'No fue posible consultar las comunas.');
      setError(message);
      showFeedback(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const changePage = async (_event: unknown, nextPage: number) => {
    setPage(nextPage);
    await load(nextPage, currentSize, statusFilter);
  };

  const changeRowsPerPage = async (event: ChangeEvent<HTMLInputElement>) => {
    const nextSize = Number(event.target.value);

    setSize(nextSize);
    setPage(0);

    await load(0, nextSize, statusFilter);
  };

  const openConfirmAction = (row: ComunaResponse, action: 'ACTIVATE' | 'DEACTIVATE') => {
    setConfirmAction({
      open: true,
      row,
      action,
    });
  };

  const closeConfirmAction = () => {
    if (processingAction) return;

    setConfirmAction(initialConfirmAction);
  };

  const confirmStatusAction = async () => {
    if (!confirmAction.row || !confirmAction.action) return;

    setProcessingAction(true);

    try {
      if (confirmAction.action === 'ACTIVATE') {
        await activateComuna(confirmAction.row.id);
        showFeedback('Comuna activada correctamente.');
      } else {
        await deactivateComuna(confirmAction.row.id);
        showFeedback('Comuna inactivada correctamente.');
      }

      setConfirmAction(initialConfirmAction);

      await load(currentPage, currentSize, statusFilter);
    } catch (err) {
      showFeedback(getErrorMessage(err, 'No fue posible cambiar el estado de la comuna.'), 'error');
    } finally {
      setProcessingAction(false);
    }
  };

  if (loading && !pageData) {
    return <LoadingState />;
  }

  return (
    <Stack spacing={3}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: {
            xs: 'column',
            md: 'row',
          },
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box>
          <Stack direction="row" spacing={1.2} sx={{ alignItems: 'center' }}>
            <ApartmentIcon color="primary" />

            <Typography variant="h4" sx={{ fontWeight: 900 }}>
              Administración de comunas
            </Typography>
          </Stack>

          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Consulta, creación, modificación e inactivación lógica de comunas.
          </Typography>
        </Box>

        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
          Nueva comuna
        </Button>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            md: 'repeat(3, 1fr)',
          },
          gap: 2,
        }}
      >
        <SummaryCard
          title="Total encontrado"
          value={totalRecords}
          helper="Registros según filtros aplicados"
        />

        <SummaryCard
          title="Activas en página"
          value={pageActiveCount}
          helper="Comunas activas visibles actualmente"
        />

        <SummaryCard
          title="Inactivas en página"
          value={pageInactiveCount}
          helper="Comunas inactivas visibles actualmente"
        />
      </Box>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Card sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
        <CardContent>
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FilterListIcon color="primary" />

              <Typography variant="h6" sx={{ fontWeight: 900 }}>
                Filtros de búsqueda
              </Typography>
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  md: '1.4fr 1fr auto auto',
                },
                gap: 2,
                alignItems: 'center',
              }}
            >
              <TextField
                label="Buscar código, nombre o descripción"
                size="small"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    load(0, currentSize, statusFilter);
                  }
                }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  },
                }}
              />

              <TextField
                select
                label="Estado"
                size="small"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as TerritoryStatusFilter)
                }
              >
                <MenuItem value="ALL">Todos</MenuItem>
                <MenuItem value="ACTIVE">Activas</MenuItem>
                <MenuItem value="INACTIVE">Inactivas</MenuItem>
              </TextField>

              <Button
                variant="contained"
                startIcon={<SearchIcon />}
                onClick={() => load(0, currentSize, statusFilter)}
                disabled={loading}
              >
                Consultar
              </Button>

              <Button
                variant="outlined"
                color="inherit"
                startIcon={<RestartAltIcon />}
                onClick={clearFilters}
                disabled={loading}
              >
                Limpiar
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
        <CardContent>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 2,
              mb: 2,
            }}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>
                Comunas registradas
              </Typography>

              <Typography color="text.secondary" sx={{ fontSize: 13 }}>
                Total encontrado: {totalRecords}
              </Typography>
            </Box>

            {loading ? <Chip label="Actualizando..." color="info" /> : null}
          </Box>

          <Divider sx={{ mb: 2 }} />

          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 980 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 900 }}>Código</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Nombre de la comuna</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 900 }}>
                    Estrato
                  </TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Descripción</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 900 }}>
                    Estado
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 900 }}>
                    Acciones
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell sx={{ fontWeight: 900 }}>{row.codigo}</TableCell>

                    <TableCell sx={{ fontWeight: 800 }}>{row.nombre}</TableCell>

                    <TableCell align="center">
                      <Chip
                        size="small"
                        label={formatEstrato(row.estrato)}
                        color={row.estrato ? 'primary' : 'default'}
                        variant="outlined"
                      />
                    </TableCell>

                    <TableCell sx={{ maxWidth: 320 }}>
                      <Typography
                        color={row.descripcion ? 'text.primary' : 'text.secondary'}
                        sx={{ fontSize: 13 }}
                      >
                        {truncateText(row.descripcion)}
                      </Typography>
                    </TableCell>

                    <TableCell align="center">
                      <Chip
                        size="small"
                        label={row.activo ? 'Activa' : 'Inactiva'}
                        color={row.activo ? 'success' : 'default'}
                        variant={row.activo ? 'filled' : 'outlined'}
                      />
                    </TableCell>

                    <TableCell align="center">
                      <Tooltip title="Editar comuna">
                        <IconButton color="info" onClick={() => openEditDialog(row)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>

                      {row.activo ? (
                        <Tooltip title="Inactivar comuna">
                          <IconButton
                            color="warning"
                            onClick={() => openConfirmAction(row, 'DEACTIVATE')}
                          >
                            <ToggleOffIcon />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Tooltip title="Reactivar comuna">
                          <IconButton
                            color="success"
                            onClick={() => openConfirmAction(row, 'ACTIVATE')}
                          >
                            <RestoreIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}

                {!rows.length ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                      No se encontraron comunas con los filtros seleccionados.
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
            rowsPerPage={currentSize}
            onPageChange={changePage}
            onRowsPerPageChange={changeRowsPerPage}
            rowsPerPageOptions={[10, 20, 50, 100]}
            labelRowsPerPage="Filas por página"
          />
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle sx={{ pb: 1.5 }}>
          <Stack direction="row" spacing={1.4} sx={{ alignItems: 'center' }}>
            <Box
              sx={{
                width: 42,
                height: 42,
                borderRadius: 3,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ApartmentIcon />
            </Box>

            <Box>
              <Typography sx={{ fontWeight: 900, fontSize: 20 }}>
                {form.id ? 'Editar comuna' : 'Nueva comuna'}
              </Typography>

              <Typography color="text.secondary" sx={{ fontSize: 13 }}>
                El código se genera automáticamente en formato C001, C002, C003.
              </Typography>
            </Box>
          </Stack>
        </DialogTitle>

        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <Box>
              <Typography sx={{ fontWeight: 900, mb: 1 }}>
                Información básica
              </Typography>

              <Stack spacing={2}>
                <TextField
                  label="Código de la comuna"
                  size="small"
                  value={form.codigo || (form.id ? '' : 'Se generará automáticamente')}
                  disabled
                  helperText={
                    form.id
                      ? 'El código no se modifica para conservar la trazabilidad.'
                      : 'El backend asignará el siguiente código disponible.'
                  }
                />

                <TextField
                  label="Nombre de la comuna"
                  size="small"
                  required
                  value={form.nombre}
                  onChange={(event) => updateForm('nombre', event.target.value.toUpperCase())}
                  autoFocus
                  helperText="Nombre oficial de la comuna."
                  slotProps={{
                    htmlInput: {
                      maxLength: 120,
                    },
                  }}
                />

                <TextField
                  select
                  label="Estrato de la comuna"
                  size="small"
                  required
                  value={form.estrato}
                  onChange={(event) => updateForm('estrato', event.target.value)}
                  helperText="Selecciona un solo estrato principal para la comuna."
                >
                  <MenuItem value="">Seleccione un estrato</MenuItem>

                  {[1, 2, 3, 4, 5, 6].map((estrato) => (
                    <MenuItem key={estrato} value={String(estrato)}>
                      Estrato {estrato}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  label="Descripción"
                  size="small"
                  value={form.descripcion}
                  onChange={(event) => updateForm('descripcion', event.target.value)}
                  multiline
                  minRows={3}
                  helperText={`${form.descripcion.trim().length}/1000 caracteres. Describe características generales o referencias de la comuna.`}
                  slotProps={{
                    htmlInput: {
                      maxLength: 1000,
                    },
                  }}
                />
              </Stack>
            </Box>

            <Box
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 3,
                p: 2,
                bgcolor: '#F8FBFF',
              }}
            >
              <Typography sx={{ fontWeight: 900, mb: 0.5 }}>
                Estado del registro
              </Typography>

              <FormControlLabel
                control={
                  <Switch
                    checked={form.activo}
                    onChange={(event) => updateForm('activo', event.target.checked)}
                  />
                }
                label={form.activo ? 'Comuna activa' : 'Comuna inactiva'}
              />

              <Alert severity="info" icon={<InfoOutlinedIcon />} sx={{ mt: 1 }}>
                Las comunas inactivas se conservan para historial, pero no deberían usarse en nuevos registros.
              </Alert>
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            color="inherit"
            startIcon={<CloseIcon />}
            onClick={closeDialog}
            disabled={saving}
          >
            Cancelar
          </Button>

          <Button variant="contained" onClick={save} disabled={saving}>
            {saving ? 'Guardando...' : form.id ? 'Actualizar comuna' : 'Guardar comuna'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmAction.open} onClose={closeConfirmAction} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 900 }}>
          {confirmAction.action === 'ACTIVATE' ? 'Reactivar comuna' : 'Inactivar comuna'}
        </DialogTitle>

        <DialogContent dividers>
          <Typography>
            {confirmAction.action === 'ACTIVATE'
              ? `¿Deseas reactivar la comuna ${confirmAction.row?.nombre ?? ''}?`
              : `¿Deseas inactivar la comuna ${confirmAction.row?.nombre ?? ''}?`}
          </Typography>

          {confirmAction.action === 'DEACTIVATE' ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              La comuna no será eliminada físicamente. Solo dejará de aparecer como activa para nuevos registros.
            </Alert>
          ) : null}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button color="inherit" onClick={closeConfirmAction} disabled={processingAction}>
            Cancelar
          </Button>

          <Button
            variant="contained"
            color={confirmAction.action === 'ACTIVATE' ? 'success' : 'warning'}
            onClick={confirmStatusAction}
            disabled={processingAction}
          >
            {processingAction
              ? 'Procesando...'
              : confirmAction.action === 'ACTIVATE'
                ? 'Reactivar'
                : 'Inactivar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={feedback.open}
        autoHideDuration={5000}
        onClose={closeFeedback}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
      >
        <Alert
          onClose={closeFeedback}
          severity={feedback.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {feedback.message}
        </Alert>
      </Snackbar>
    </Stack>
  );
}