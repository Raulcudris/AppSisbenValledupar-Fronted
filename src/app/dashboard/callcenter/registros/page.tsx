'use client';

import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import RefreshIcon from '@mui/icons-material/Refresh';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SearchIcon from '@mui/icons-material/Search';
import SourceIcon from '@mui/icons-material/Source';
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
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableFooter,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  activateCallCenterRegistro,
  deactivateCallCenterRegistro,
  getCallCenterEncuestadoresOptions,
  searchCallCenter,
} from '@/services/callcenter.service';

import {
  CallCenterFilter,
  CallCenterOrigenRegistro,
  CallCenterResponse,
} from '@/types/callcenter.types';
import { SelectOption } from '@/types/catalog.types';

type SnackbarState = {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'warning' | 'info';
};

type ConfirmAction = 'ACTIVATE' | 'DEACTIVATE' | null;

type FilterState = {
  q: string;
  fechaInicio: string;
  fechaFin: string;
  encuestadorAsignadoId: string;
  origenRegistro: 'ALL' | CallCenterOrigenRegistro;
  llamadaConectada: 'ALL' | 'true' | 'false';
  activo: 'ALL' | 'true' | 'false';
  page: number;
  size: number;
};

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const initialFilter: FilterState = {
  q: '',
  fechaInicio: '',
  fechaFin: '',
  encuestadorAsignadoId: '',
  origenRegistro: 'ALL',
  llamadaConectada: 'ALL',
  activo: 'true',
  page: 0,
  size: 20,
};

function toBoolean(value: string): boolean | null {
  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return null;
}

function normalizeText(value?: string | null) {
  return value?.trim() ?? '';
}

function getPageContent<T>(page: unknown): T[] {
  const data = page as {
    content?: T[];
    items?: T[];
    data?: T[];
  };

  return data?.content ?? data?.items ?? data?.data ?? [];
}

function getTotalElements(page: unknown, currentLength: number) {
  const data = page as {
    totalElements?: number;
    total?: number;
    totalRecords?: number;
  };

  return data?.totalElements ?? data?.total ?? data?.totalRecords ?? currentLength;
}

function origenColor(origen?: string | null) {
  if (origen === 'VENTANILLA') {
    return 'primary' as const;
  }

  if (origen === 'IMPORTACION') {
    return 'secondary' as const;
  }

  return 'default' as const;
}

function buildFilter(filter: FilterState): CallCenterFilter {
  const llamadaConectada = toBoolean(filter.llamadaConectada);
  const activo = toBoolean(filter.activo);

  return {
    page: filter.page,
    size: filter.size,
    q: normalizeText(filter.q) || undefined,
    fechaInicio: filter.fechaInicio || undefined,
    fechaFin: filter.fechaFin || undefined,
    encuestadorAsignadoId: filter.encuestadorAsignadoId || undefined,
    origenRegistro: filter.origenRegistro === 'ALL' ? undefined : filter.origenRegistro,
    llamadaConectada: llamadaConectada ?? undefined,
    activo: activo ?? undefined,
  };
}

export default function CallCenterRegistrosPage() {
  const router = useRouter();

  const [records, setRecords] = useState<CallCenterResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<FilterState>(initialFilter);
  const [loading, setLoading] = useState(false);
  const [encuestadores, setEncuestadores] = useState<SelectOption[]>([]);

  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [selectedRecord, setSelectedRecord] = useState<CallCenterResponse | null>(null);

  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success',
  });

  const showMessage = (message: string, severity: SnackbarState['severity'] = 'success') => {
    setSnackbar({
      open: true,
      message,
      severity,
    });
  };

  const closeSnackbar = () => {
    setSnackbar((current) => ({
      ...current,
      open: false,
    }));
  };

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const page = await searchCallCenter(buildFilter(filter));
      const content = getPageContent<CallCenterResponse>(page);

      setRecords(content);
      setTotal(getTotalElements(page, content.length));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No fue posible cargar los registros de Call Center.';
      showMessage(message, 'error');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    getCallCenterEncuestadoresOptions()
      .then(setEncuestadores)
      .catch(() => {
        showMessage('No fue posible cargar el catálogo de encuestadores.', 'warning');
      });
  }, []);

  const stats = useMemo(() => {
    const ventanilla = records.filter((item) => item.origenRegistro === 'VENTANILLA').length;
    const manual = records.filter((item) => item.origenRegistro === 'MANUAL').length;
    const connected = records.filter((item) => item.llamadaConectada).length;

    return {
      ventanilla,
      manual,
      connected,
    };
  }, [records]);

  const updateFilter = (field: keyof FilterState, value: string | number) => {
    setFilter((current) => ({
      ...current,
      [field]: value,
      page: field === 'page' || field === 'size' ? current.page : 0,
    }));
  };

  const openConfirm = (record: CallCenterResponse, action: ConfirmAction) => {
    setSelectedRecord(record);
    setConfirmAction(action);
  };

  const closeConfirm = () => {
    setSelectedRecord(null);
    setConfirmAction(null);
  };

  const confirmStatusChange = async () => {
    if (!selectedRecord || !confirmAction) {
      return;
    }

    try {
      if (confirmAction === 'ACTIVATE') {
        await activateCallCenterRegistro(selectedRecord.id);
        showMessage('Registro activado correctamente.', 'success');
      }

      if (confirmAction === 'DEACTIVATE') {
        await deactivateCallCenterRegistro(selectedRecord.id);
        showMessage('Registro inactivado correctamente.', 'success');
      }

      closeConfirm();
      load();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No fue posible cambiar el estado del registro.';
      showMessage(message, 'error');
    }
  };

  const handlePageChange = (_: unknown, page: number) => {
    setFilter((current) => ({
      ...current,
      page,
    }));
  };

  const handleRowsPerPageChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFilter((current) => ({
      ...current,
      page: 0,
      size: Number(event.target.value),
    }));
  };

  return (
    <Box>
      <Stack spacing={3}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          sx={{ justifyContent: 'space-between' }}
        >
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              Registros Call Center
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Gestión de llamadas, registros manuales y carga desde ventanilla para asignación de encuestas.
            </Typography>
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={load}
              disabled={loading}
            >
              Actualizar
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<SourceIcon />}
              onClick={() => router.push('/dashboard/callcenter/registros/cargar-ventanilla')}
            >
              Cargar desde Ventanilla
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => router.push('/dashboard/callcenter/registros/nuevo')}
            >
              Nuevo registro manual
            </Button>
          </Stack>
        </Stack>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Total página
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                {records.length}
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Desde ventanilla
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                {stats.ventanilla}
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Manuales
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                {stats.manual}
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Conectadas
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                {stats.connected}
              </Typography>
            </CardContent>
          </Card>
        </Stack>

        <Paper sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                label="Buscar"
                value={filter.q}
                onChange={(event) => updateFilter('q', event.target.value)}
                fullWidth
                size="small"
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
                label="Encuestador"
                select
                value={filter.encuestadorAsignadoId}
                onChange={(event) => updateFilter('encuestadorAsignadoId', event.target.value)}
                sx={{ minWidth: 260 }}
                size="small"
              >
                <MenuItem value="">Todos los encuestadores</MenuItem>
                {encuestadores.map((option) => (
                  <MenuItem key={option.id} value={option.id}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Fecha inicio"
                type="date"
                value={filter.fechaInicio}
                onChange={(event) => updateFilter('fechaInicio', event.target.value)}
                sx={{ minWidth: 180 }}
                size="small"
                slotProps={{ inputLabel: { shrink: true } }}
              />

              <TextField
                label="Fecha fin"
                type="date"
                value={filter.fechaFin}
                onChange={(event) => updateFilter('fechaFin', event.target.value)}
                sx={{ minWidth: 180 }}
                size="small"
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                label="Origen"
                select
                value={filter.origenRegistro}
                onChange={(event) => updateFilter('origenRegistro', event.target.value)}
                sx={{ minWidth: 180 }}
                size="small"
              >
                <MenuItem value="ALL">Todos</MenuItem>
                <MenuItem value="VENTANILLA">Ventanilla</MenuItem>
                <MenuItem value="MANUAL">Manual</MenuItem>
                <MenuItem value="IMPORTACION">Importación</MenuItem>
              </TextField>

              <TextField
                label="Llamada"
                select
                value={filter.llamadaConectada}
                onChange={(event) => updateFilter('llamadaConectada', event.target.value)}
                sx={{ minWidth: 180 }}
                size="small"
              >
                <MenuItem value="ALL">Todas</MenuItem>
                <MenuItem value="true">Conectada</MenuItem>
                <MenuItem value="false">No conectada</MenuItem>
              </TextField>

              <TextField
                label="Estado"
                select
                value={filter.activo}
                onChange={(event) => updateFilter('activo', event.target.value)}
                sx={{ minWidth: 160 }}
                size="small"
              >
                <MenuItem value="true">Activos</MenuItem>
                <MenuItem value="false">Inactivos</MenuItem>
                <MenuItem value="ALL">Todos</MenuItem>
              </TextField>

              <Button
                variant="outlined"
                startIcon={<RestartAltIcon />}
                onClick={() => setFilter(initialFilter)}
              >
                Limpiar
              </Button>
            </Stack>
          </Stack>
        </Paper>

        {loading ? (
          <Paper sx={{ p: 3 }}>
            <Alert severity="info">
              Cargando registros de Call Center...
            </Alert>
          </Paper>
        ) : records.length === 0 ? (
          <Paper sx={{ p: 3 }}>
            <Alert severity="info">
              Sin registros. No se encontraron registros de Call Center con los filtros actuales.
            </Alert>
          </Paper>
        ) : (
          <Paper>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Origen</TableCell>
                    <TableCell>Ciudadano</TableCell>
                    <TableCell>Teléfono</TableCell>
                    <TableCell>Dirección</TableCell>
                    <TableCell>Llamada</TableCell>
                    <TableCell>Encuestador</TableCell>
                    <TableCell>Visita</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell align="right">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {record.fechaLlamada}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {record.horaLlamada?.slice(0, 5) || 'Sin hora'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Stack spacing={0.5}>
                          <Chip
                            size="small"
                            label={record.origenRegistro || 'MANUAL'}
                            color={origenColor(record.origenRegistro)}
                          />
                          {record.ventanillaNumeroVentanilla && (
                            <Typography variant="caption" color="text.secondary">
                              Vent. {record.ventanillaNumeroVentanilla}
                            </Typography>
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {record.nombreCompleto}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          C.C. {record.cedulaSolicitante}
                        </Typography>
                      </TableCell>
                      <TableCell>{record.telefono || 'Sin dato'}</TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {record.direccionTexto || 'Sin dirección'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {record.barrioNombre || 'Sin barrio'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          color={record.llamadaConectada ? 'success' : 'warning'}
                          label={record.llamadaConectada ? 'Conectada' : 'No conectada'}
                        />
                      </TableCell>
                      <TableCell>{record.encuestadorAsignadoNombre || record.encuestadorProgramadoNombre || 'Sin asignar'}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          variant="outlined"
                          label={record.estadoVisita || 'PENDIENTE'}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          color={record.activo ? 'success' : 'default'}
                          label={record.activo ? 'Activo' : 'Inactivo'}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Editar">
                          <IconButton
                            size="small"
                            onClick={() => router.push(`/dashboard/callcenter/registros/nuevo?id=${record.id}`)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {record.activo ? (
                          <Tooltip title="Inactivar">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => openConfirm(record, 'DEACTIVATE')}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Tooltip title="Activar">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => openConfirm(record, 'ACTIVATE')}
                            >
                              <CheckCircleIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TablePagination
                      count={total}
                      page={filter.page}
                      rowsPerPage={filter.size}
                      rowsPerPageOptions={PAGE_SIZE_OPTIONS}
                      onPageChange={handlePageChange}
                      onRowsPerPageChange={handleRowsPerPageChange}
                      labelRowsPerPage="Filas"
                    />
                  </TableRow>
                </TableFooter>
              </Table>
            </TableContainer>
          </Paper>
        )}
      </Stack>

      <Dialog open={Boolean(confirmAction)} onClose={closeConfirm} fullWidth maxWidth="xs">
        <DialogTitle>
          {confirmAction === 'ACTIVATE' ? 'Activar registro' : 'Inactivar registro'}
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2">
            Confirma la acción para el registro de{' '}
            <strong>{selectedRecord?.nombreCompleto}</strong>.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeConfirm}>Cancelar</Button>
          <Button
            variant="contained"
            color={confirmAction === 'ACTIVATE' ? 'success' : 'error'}
            onClick={confirmStatusChange}
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} onClose={closeSnackbar} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
