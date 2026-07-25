'use client';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import RefreshIcon from '@mui/icons-material/Refresh';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SearchIcon from '@mui/icons-material/Search';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
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
  Typography,
} from '@mui/material';
import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  createCallCenterRegistro,
  findAsignacionPendienteNuevaEncuesta,
  getCallCenterBarriosOptions,
  getCallCenterComunasOptions,
  getCallCenterEncuestadoresOptions,
  searchVentanillaForCallCenter,
} from '@/services/callcenter.service';

import { CallCenterRequest, VentanillaCallCenterFilter, VentanillaCallCenterResponse } from '@/types/callcenter.types';
import { SelectOption } from '@/types/catalog.types';


type SnackbarState = {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'warning' | 'info';
};

type VentanillaSearchState = {
  q: string;
  cedulaUsuario: string;
  nombreUsuario: string;
  comunaId: string;
  barrioId: string;
  encuestadorAsignadoId: string;
  fechaEncuestaProgramada: string;
  page: number;
  size: number;
};

const SOLICITUD_NUEVA_ENCUESTA_ID = 6;
const ESTADO_SOLICITUD_PENDIENTE_ID = 1;

const initialSearch: VentanillaSearchState = {
  q: '',
  cedulaUsuario: '',
  nombreUsuario: '',
  comunaId: '',
  barrioId: '',
  encuestadorAsignadoId: '',
  fechaEncuestaProgramada: '',
  page: 0,
  size: 50,
};

const today = () => new Date().toISOString().slice(0, 10);

const nowTime = () => {
  const date = new Date();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${hours}:${minutes}`;
};

function normalizeText(value?: string | null) {
  return value?.trim() ?? '';
}

function toOptionalNumber(value: string) {
  return value ? Number(value) : null;
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

function getVentanillaLabel(record: VentanillaCallCenterResponse) {
  return record.nombreUsuario
    || record.cedulaUsuario
    || record.numeroVentanilla
    || `ID ${record.id}`;
}

function buildVentanillaFilter(
  search: VentanillaSearchState,
  page = search.page,
  size = search.size
): VentanillaCallCenterFilter {
  return {
    page,
    size,
    q: normalizeText(search.q) || undefined,
    cedulaUsuario: normalizeText(search.cedulaUsuario) || undefined,
    nombreUsuario: normalizeText(search.nombreUsuario) || undefined,
    comunaId: search.comunaId || undefined,
    barrioId: search.barrioId || undefined,
    solicitudId: SOLICITUD_NUEVA_ENCUESTA_ID,
    estadoSolicitudId: ESTADO_SOLICITUD_PENDIENTE_ID,
    activo: true,
  };
}

function ventanillaToRequest(
  record: VentanillaCallCenterResponse,
  search: VentanillaSearchState
): CallCenterRequest {
  const encuestadorAsignadoId = toOptionalNumber(search.encuestadorAsignadoId);
  const fechaEncuestaProgramada = search.fechaEncuestaProgramada || null;

  return {
    fechaLlamada: today(),
    horaLlamada: nowTime(),
    tipoRegistro: 'LLAMADA',
    origenRegistro: 'VENTANILLA',
    ventanillaRegistroId: record.id,
    cedulaSolicitante: normalizeText(record.cedulaUsuario) || '',
    nombreCompleto: normalizeText(record.nombreUsuario) || '',
    telefono: normalizeText(record.telefono) || null,
    llamadaConectada: true,
    motivoNoContactoId: null,
    motivoNoContactoTexto: null,
    encuestadorProgramadoId: encuestadorAsignadoId,
    fechaEncuestaProgramada,
    solicitoNuevaEncuesta: true,
    direccionTexto: normalizeText(record.direccion) || null,
    barrioId: record.barrioId ?? null,
    fechaAplicacionInformada: null,
    disposicionRecibirEncuesta: null,
    motivoNoDisposicionId: null,
    motivoNoDisposicionTexto: null,
    encuestadorAsignadoId,
    explicoInformanteCalificado: null,
    verificado: null,
    observacion: [
      record.numeroVentanilla ? `Ventanilla: ${record.numeroVentanilla}` : '',
      record.fecha ? `Fecha ventanilla: ${record.fecha}` : '',
      record.solicitudNombre ? `Solicitud: ${record.solicitudNombre}` : '',
      record.estadoSolicitudNombre ? `Estado: ${record.estadoSolicitudNombre}` : '',
      record.barrioNombre ? `Barrio: ${record.barrioNombre}` : '',
      record.comunaNombre ? `Comuna: ${record.comunaNombre}` : '',
      record.observacion ? `Observación ventanilla: ${record.observacion}` : '',
    ]
      .filter(Boolean)
      .join(' | ') || null,
    activo: true,
  };
}

export default function CargarVentanillaCallCenterPage() {
  const router = useRouter();

  const [search, setSearch] = useState<VentanillaSearchState>(initialSearch);
  const [records, setRecords] = useState<VentanillaCallCenterResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [barrios, setBarrios] = useState<SelectOption[]>([]);
  const [comunas, setComunas] = useState<SelectOption[]>([]);
  const [encuestadores, setEncuestadores] = useState<SelectOption[]>([]);

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

  const loadCatalogs = useCallback(async () => {
    try {
      const [barriosData, comunasData, encuestadoresData] = await Promise.all([
        getCallCenterBarriosOptions(),
        getCallCenterComunasOptions(),
        getCallCenterEncuestadoresOptions(),
      ]);

      setBarrios(barriosData);
      setComunas(comunasData);
      setEncuestadores(encuestadoresData);
    } catch {
      showMessage('No fue posible cargar los catálogos de filtros.', 'warning');
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const page = await searchVentanillaForCallCenter(buildVentanillaFilter(search));
      const content = getPageContent<VentanillaCallCenterResponse>(page);

      setRecords(content);
      setTotal(getTotalElements(page, content.length));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No fue posible cargar los usuarios de ventanilla.';
      showMessage(message, 'error');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadCatalogs();
  }, [loadCatalogs]);

  useEffect(() => {
    load();
  }, [load]);

  const selectedRecords = useMemo(
    () => records.filter((record) => selectedIds.includes(record.id)),
    [records, selectedIds]
  );

  const allVisibleSelected = records.length > 0
    && records.every((record) => selectedIds.includes(record.id));

  const someVisibleSelected = records.some((record) => selectedIds.includes(record.id));

  const updateSearch = (field: keyof VentanillaSearchState, value: string | number) => {
    setSearch((current) => ({
      ...current,
      [field]: value,
      page: field === 'page' || field === 'size' ? current.page : 0,
    }));
    setSelectedIds([]);
  };

  const toggleRecord = (id: number) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((currentId) => currentId !== id)
        : [...current, id]
    );
  };

  const toggleAllVisible = () => {
    setSelectedIds((current) => {
      const visibleIds = records.map((record) => record.id);

      if (allVisibleSelected) {
        return current.filter((id) => !visibleIds.includes(id));
      }

      return Array.from(new Set([...current, ...visibleIds]));
    });
  };

  const createRows = async (rows: VentanillaCallCenterResponse[]) => {
    if (rows.length === 0) {
      showMessage('Selecciona al menos un usuario.', 'warning');
      return;
    }

    if (!search.encuestadorAsignadoId) {
      showMessage('Selecciona el encuestador que realizará la nueva encuesta.', 'warning');
      return;
    }

    setSaving(true);

    let created = 0;
    let failed = 0;
    let skipped = 0;
    const skippedNames: string[] = [];

    for (const row of rows) {
      try {
        const pending = await findAsignacionPendienteNuevaEncuesta({
          cedulaSolicitante: row.cedulaUsuario,
          ventanillaRegistroId: row.id,
        });

        if (pending) {
          skipped += 1;
          skippedNames.push(getVentanillaLabel(row));
          continue;
        }

        await createCallCenterRegistro(ventanillaToRequest(row, search));
        created += 1;
      } catch {
        failed += 1;
      }
    }

    setSaving(false);

    if (created > 0 && failed === 0 && skipped === 0) {
      showMessage(`Se crearon ${created} registros de Call Center.`, 'success');
      router.push('/dashboard/callcenter/registros');
      return;
    }

    if (created === 0 && skipped > 0 && failed === 0) {
      showMessage(
        `No se crearon registros. ${skipped} usuario(s) ya tienen encuesta pendiente asignada.`,
        'warning'
      );
      return;
    }

    showMessage(
      `Resultado: creados ${created}, omitidos por asignación pendiente ${skipped}, con error ${failed}.`,
      skipped > 0 || failed > 0 ? 'warning' : 'success'
    );

    if (skippedNames.length > 0) {
      console.warn('Usuarios omitidos por asignación pendiente:', skippedNames);
    }

    setSelectedIds([]);
    load();
  };

  const createSelected = () => {
    createRows(selectedRecords);
  };

  const createAllFiltered = async () => {
    if (!search.encuestadorAsignadoId) {
      showMessage('Selecciona el encuestador que realizará la nueva encuesta.', 'warning');
      return;
    }

    setLoading(true);

    try {
      const allRecords: VentanillaCallCenterResponse[] = [];
      let page = 0;
      const size = 200;
      let allTotal = 0;

      do {
        const response = await searchVentanillaForCallCenter(buildVentanillaFilter(search, page, size));
        const content = getPageContent<VentanillaCallCenterResponse>(response);
        allTotal = getTotalElements(response, allRecords.length + content.length);

        allRecords.push(...content);

        if (content.length === 0) {
          break;
        }

        page += 1;
      } while (allRecords.length < allTotal);

      await createRows(allRecords);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No fue posible crear los registros filtrados.';
      showMessage(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (_: unknown, page: number) => {
    setSearch((current) => ({
      ...current,
      page,
    }));
  };

  const handleRowsPerPageChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearch((current) => ({
      ...current,
      page: 0,
      size: Number(event.target.value),
    }));
    setSelectedIds([]);
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
              Cargar desde Ventanilla
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Selecciona usuarios con solicitud Nueva Encuesta pendiente y crea registros de Call Center.
            </Typography>
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => router.push('/dashboard/callcenter/registros')}
            >
              Volver
            </Button>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={load}
              disabled={loading}
            >
              Actualizar
            </Button>
          </Stack>
        </Stack>

        <Alert severity="info">
          Esta página filtra automáticamente por solicitud <strong>Nueva Encuesta</strong>, estado <strong>Pendiente</strong> y registros activos de Ventanilla.
          Si un usuario ya tiene una encuesta pendiente asignada, se omitirá y no se volverá a asignar.
        </Alert>

        <Card>
          <CardContent>
            <Stack spacing={3}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  1. Filtrar usuarios
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Puedes filtrar por comuna, barrio, cédula o nombre.
                </Typography>
              </Box>

              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <TextField
                  label="Comuna"
                  select
                  value={search.comunaId}
                  onChange={(event) => updateSearch('comunaId', event.target.value)}
                  fullWidth
                  size="small"
                >
                  <MenuItem value="">Todas las comunas</MenuItem>
                  {comunas.map((option) => (
                    <MenuItem key={option.id} value={option.id}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  label="Barrio"
                  select
                  value={search.barrioId}
                  onChange={(event) => updateSearch('barrioId', event.target.value)}
                  fullWidth
                  size="small"
                >
                  <MenuItem value="">Todos los barrios</MenuItem>
                  {barrios.map((option) => (
                    <MenuItem key={option.id} value={option.id}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  label="Cédula"
                  value={search.cedulaUsuario}
                  onChange={(event) => updateSearch('cedulaUsuario', event.target.value)}
                  fullWidth
                  size="small"
                />

                <TextField
                  label="Nombre"
                  value={search.nombreUsuario}
                  onChange={(event) => updateSearch('nombreUsuario', event.target.value)}
                  fullWidth
                  size="small"
                />
              </Stack>

              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <TextField
                  label="Búsqueda general"
                  value={search.q}
                  onChange={(event) => updateSearch('q', event.target.value)}
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

                <Button variant="outlined" startIcon={<SearchIcon />} onClick={load}>
                  Buscar
                </Button>

                <Button
                  variant="outlined"
                  startIcon={<RestartAltIcon />}
                  onClick={() => {
                    setSearch(initialSearch);
                    setSelectedIds([]);
                  }}
                >
                  Limpiar
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack spacing={3}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  2. Datos para crear registros
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Estos datos se aplican a los usuarios seleccionados.
                </Typography>
              </Box>

              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <TextField
                  label="Encuestador que realizará la encuesta"
                  select
                  value={search.encuestadorAsignadoId}
                  onChange={(event) => updateSearch('encuestadorAsignadoId', event.target.value)}
                  fullWidth
                  size="small"
                  required
                >
                  <MenuItem value="">Selecciona un encuestador</MenuItem>
                  {encuestadores.map((option) => (
                    <MenuItem key={option.id} value={option.id}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  label="Fecha encuesta programada"
                  type="date"
                  value={search.fechaEncuestaProgramada}
                  onChange={(event) => updateSearch('fechaEncuestaProgramada', event.target.value)}
                  fullWidth
                  size="small"
                  slotProps={{ inputLabel: { shrink: true } }}
                />

                <Button
                  variant="contained"
                  startIcon={<AssignmentTurnedInIcon />}
                  onClick={createSelected}
                  disabled={saving || selectedRecords.length === 0}
                >
                  Crear seleccionados ({selectedRecords.length})
                </Button>

                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={createAllFiltered}
                  disabled={saving || loading}
                >
                  Crear todos filtrados
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        {loading ? (
          <Paper sx={{ p: 3 }}>
            <Alert severity="info">
              Buscando usuarios de ventanilla...
            </Alert>
          </Paper>
        ) : records.length === 0 ? (
          <Paper sx={{ p: 3 }}>
            <Alert severity="info">
              Sin resultados. No se encontraron usuarios con Nueva Encuesta pendiente para los filtros actuales.
            </Alert>
          </Paper>
        ) : (
          <Paper>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={allVisibleSelected}
                        indeterminate={!allVisibleSelected && someVisibleSelected}
                        onChange={toggleAllVisible}
                      />
                    </TableCell>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Ventanilla</TableCell>
                    <TableCell>Ciudadano</TableCell>
                    <TableCell>Teléfono</TableCell>
                    <TableCell>Barrio / Comuna</TableCell>
                    <TableCell>Solicitud</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id} hover selected={selectedIds.includes(record.id)}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedIds.includes(record.id)}
                          onChange={() => toggleRecord(record.id)}
                        />
                      </TableCell>
                      <TableCell>{record.fecha || 'Sin fecha'}</TableCell>
                      <TableCell>{record.numeroVentanilla || record.id}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {record.nombreUsuario || 'Sin nombre'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          C.C. {record.cedulaUsuario || 'Sin cédula'}
                        </Typography>
                      </TableCell>
                      <TableCell>{record.telefono || 'Sin dato'}</TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {record.barrioNombre || 'Sin barrio'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {record.comunaNombre || 'Sin comuna'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {record.solicitudNombre || 'Nueva encuesta'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {record.estadoSolicitudNombre || 'Pendiente'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TablePagination
                      count={total}
                      page={search.page}
                      rowsPerPage={search.size}
                      rowsPerPageOptions={[10, 20, 50, 100]}
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
