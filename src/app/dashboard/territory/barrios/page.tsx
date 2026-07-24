'use client';

import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import FilterListIcon from '@mui/icons-material/FilterList';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import RestoreIcon from '@mui/icons-material/Restore';
import SearchIcon from '@mui/icons-material/Search';
import ToggleOffIcon from '@mui/icons-material/ToggleOff';
import {
  Alert,
  Autocomplete,
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
  activateBarrio,
  createBarrio,
  deactivateBarrio,
  searchBarrios,
  searchComunas,
  updateBarrio,
} from '@/services/territory.service';
import { PageResponse } from '@/types/api.types';
import {
  BarrioResponse,
  ComunaResponse,
  TerritoryStatusFilter,
} from '@/types/territory.types';

type FormState = {
  id?: number;
  nombre: string;
  comunaId: string;
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
  row: BarrioResponse | null;
  action: 'ACTIVATE' | 'DEACTIVATE' | null;
};

const initialForm: FormState = {
  nombre: '',
  comunaId: '',
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
        <Typography color="text.secondary" sx={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase' }}>
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

export default function BarriosPage() {
  const [pageData, setPageData] = useState<PageResponse<BarrioResponse> | null>(null);
  const [comunas, setComunas] = useState<ComunaResponse[]>([]);

  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [search, setSearch] = useState('');
  const [comunaId, setComunaId] = useState('');
  const [statusFilter, setStatusFilter] = useState<TerritoryStatusFilter>('ALL');

  const [loading, setLoading] = useState(true);
  const [catalogLoading, setCatalogLoading] = useState(true);
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

  const pageActiveCount = useMemo(() => rows.filter((row) => row.activo).length, [rows]);
  const pageInactiveCount = useMemo(() => rows.filter((row) => !row.activo).length, [rows]);

  const selectedFormComuna = useMemo(() => {
    return comunas.find((comuna) => String(comuna.id) === form.comunaId) ?? null;
  }, [comunas, form.comunaId]);

  const showFeedback = (message: string, severity: SnackbarSeverity = 'success') => {
    setFeedback({ open: true, message, severity });
  };

  const closeFeedback = () => {
    setFeedback(initialSnackbar);
  };

  const loadComunas = async () => {
    setCatalogLoading(true);

    try {
      const response = await searchComunas({
        page: 0,
        size: 100,
        activo: true,
      });

      setComunas(response.content ?? []);
    } catch (err) {
      const message = getErrorMessage(err, 'No fue posible cargar las comunas.');
      setError(message);
      showFeedback(message, 'error');
    } finally {
      setCatalogLoading(false);
    }
  };

  const load = async (
    nextPage: number = page,
    nextSize: number = size,
    nextStatus: TerritoryStatusFilter = statusFilter
  ) => {
    setLoading(true);
    setError('');

    try {
      const response = await searchBarrios({
        page: nextPage,
        size: nextSize,
        q: search,
        comunaId,
        activo: statusToActivo(nextStatus),
      });

      setPageData(response);
      setPage(response.page ?? nextPage);
      setSize(response.size ?? nextSize);
    } catch (err) {
      const message = getErrorMessage(err, 'No fue posible consultar los barrios.');
      setError(message);
      showFeedback(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComunas();
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

  const openEditDialog = (row: BarrioResponse) => {
    setForm({
      id: row.id,
      nombre: row.nombre ?? '',
      comunaId: String(row.comunaId ?? ''),
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
    if (!form.nombre.trim()) return 'El nombre del barrio es obligatorio.';
    if (form.nombre.trim().length > 150) return 'El nombre del barrio no puede superar 150 caracteres.';
    if (!form.comunaId) return 'Debe seleccionar una comuna.';
    if (Number.isNaN(Number(form.comunaId))) return 'La comuna seleccionada no es válida.';
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
        comunaId: Number(form.comunaId),
        activo: form.activo,
      };

      if (form.id) {
        await updateBarrio(form.id, payload);
        showFeedback('Barrio actualizado correctamente.');
      } else {
        await createBarrio(payload);
        showFeedback('Barrio creado correctamente.');
      }

      setDialogOpen(false);
      setForm(initialForm);
      await load(currentPage, currentSize, statusFilter);
    } catch (err) {
      showFeedback(getErrorMessage(err, 'No fue posible guardar el barrio.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const clearFilters = async () => {
    setSearch('');
    setComunaId('');
    setStatusFilter('ALL');
    setPage(0);

    setLoading(true);
    setError('');

    try {
      const response = await searchBarrios({
        page: 0,
        size,
        activo: undefined,
      });

      setPageData(response);
      setPage(response.page ?? 0);
      setSize(response.size ?? size);
    } catch (err) {
      const message = getErrorMessage(err, 'No fue posible consultar los barrios.');
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

  const changeRowsPerPage = async (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const nextSize = Number(event.target.value);
    setSize(nextSize);
    setPage(0);
    await load(0, nextSize, statusFilter);
  };

  const openConfirmAction = (row: BarrioResponse, action: 'ACTIVATE' | 'DEACTIVATE') => {
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
        await activateBarrio(confirmAction.row.id);
        showFeedback('Barrio activado correctamente.');
      } else {
        await deactivateBarrio(confirmAction.row.id);
        showFeedback('Barrio inactivado correctamente.');
      }

      setConfirmAction(initialConfirmAction);
      await load(currentPage, currentSize, statusFilter);
    } catch (err) {
      showFeedback(getErrorMessage(err, 'No fue posible cambiar el estado del barrio.'), 'error');
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
            <LocationCityIcon color="primary" />
            <Typography variant="h4" sx={{ fontWeight: 900 }}>
              Administración de barrios
            </Typography>
          </Stack>

          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Consulta, creación, modificación e inactivación lógica de barrios por comuna.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openCreateDialog}
          disabled={catalogLoading}
        >
          Nuevo barrio
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
        <SummaryCard title="Total encontrado" value={totalRecords} helper="Registros según filtros aplicados" />
        <SummaryCard title="Activos en página" value={pageActiveCount} helper="Barrios activos visibles actualmente" />
        <SummaryCard title="Inactivos en página" value={pageInactiveCount} helper="Barrios inactivos visibles actualmente" />
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
                  md: '1.4fr 1fr 1fr auto auto',
                },
                gap: 2,
                alignItems: 'center',
              }}
            >
              <TextField
                label="Buscar barrio o comuna"
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
                label="Comuna"
                size="small"
                value={comunaId}
                onChange={(event) => setComunaId(event.target.value)}
                disabled={catalogLoading}
              >
                <MenuItem value="">Todas</MenuItem>
                {comunas.map((comuna) => (
                  <MenuItem key={comuna.id} value={String(comuna.id)}>
                    {comuna.codigo} - {comuna.nombre}
                  </MenuItem>
                ))}
              </TextField>

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
                <MenuItem value="ACTIVE">Activos</MenuItem>
                <MenuItem value="INACTIVE">Inactivos</MenuItem>
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
                Barrios registrados
              </Typography>

              <Typography color="text.secondary" sx={{ fontSize: 13 }}>
                Total encontrado: {totalRecords}
              </Typography>
            </Box>

            {loading ? <Chip label="Actualizando..." color="info" /> : null}
          </Box>

          <Divider sx={{ mb: 2 }} />

          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 860 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 900 }}>Barrio</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Comuna</TableCell>
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
                    <TableCell sx={{ fontWeight: 800 }}>{row.nombre}</TableCell>
                    <TableCell>{row.comunaNombre}</TableCell>
                    <TableCell align="center">
                      <Chip
                        size="small"
                        label={row.activo ? 'Activo' : 'Inactivo'}
                        color={row.activo ? 'success' : 'default'}
                        variant={row.activo ? 'filled' : 'outlined'}
                      />
                    </TableCell>

                    <TableCell align="center">
                      <Tooltip title="Editar barrio">
                        <IconButton color="info" onClick={() => openEditDialog(row)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>

                      {row.activo ? (
                        <Tooltip title="Inactivar barrio">
                          <IconButton
                            color="warning"
                            onClick={() => openConfirmAction(row, 'DEACTIVATE')}
                          >
                            <ToggleOffIcon />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Tooltip title="Reactivar barrio">
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
                    <TableCell colSpan={4} align="center" sx={{ py: 5 }}>
                      No se encontraron barrios con los filtros seleccionados.
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
              <LocationCityIcon />
            </Box>

            <Box>
              <Typography sx={{ fontWeight: 900, fontSize: 20 }}>
                {form.id ? 'Editar barrio' : 'Nuevo barrio'}
              </Typography>

              <Typography color="text.secondary" sx={{ fontSize: 13 }}>
                Define el nombre, comuna asociada y estado del barrio.
              </Typography>
            </Box>
          </Stack>
        </DialogTitle>

        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <Box>
              <Typography sx={{ fontWeight: 900, mb: 1 }}>
                Información del barrio
              </Typography>

              <Stack spacing={2}>
                <TextField
                  label="Nombre del barrio"
                  size="small"
                  required
                  value={form.nombre}
                  onChange={(event) => updateForm('nombre', event.target.value.toUpperCase())}
                  autoFocus
                  helperText="Nombre oficial del barrio tal como debe mostrarse en los formularios."
                  slotProps={{
                    htmlInput: {
                      maxLength: 150,
                    },
                  }}
                />

                <Autocomplete
                  options={comunas}
                  loading={catalogLoading}
                  value={selectedFormComuna}
                  onChange={(_event, value) => updateForm('comunaId', value ? String(value.id) : '')}
                  getOptionLabel={(option) => `${option.codigo} - ${option.nombre}`}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Comuna a la que pertenece"
                      size="small"
                      required
                      helperText="Selecciona la comuna donde se ubica el barrio."
                    />
                  )}
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
                label={form.activo ? 'Barrio activo' : 'Barrio inactivo'}
              />

              <Alert severity="info" icon={<InfoOutlinedIcon />} sx={{ mt: 1 }}>
                Los barrios inactivos se conservan para historial, pero no deberían usarse en nuevos registros.
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
            {saving ? 'Guardando...' : form.id ? 'Actualizar barrio' : 'Guardar barrio'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmAction.open} onClose={closeConfirmAction} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 900 }}>
          {confirmAction.action === 'ACTIVATE' ? 'Reactivar barrio' : 'Inactivar barrio'}
        </DialogTitle>

        <DialogContent dividers>
          <Typography>
            {confirmAction.action === 'ACTIVATE'
              ? `¿Deseas reactivar el barrio ${confirmAction.row?.nombre ?? ''}?`
              : `¿Deseas inactivar el barrio ${confirmAction.row?.nombre ?? ''}?`}
          </Typography>

          {confirmAction.action === 'DEACTIVATE' ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              El barrio no será eliminado físicamente. Solo dejará de aparecer como activo para nuevos registros.
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
