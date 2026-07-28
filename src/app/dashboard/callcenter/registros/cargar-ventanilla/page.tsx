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
import { useRouter } from 'next/navigation';
import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';

import {
  createCallCenterRegistro,
  getCallCenterBarriosOptions,
  getCallCenterComunasOptions,
  searchCallCenter,
  searchVentanillaForCallCenter,
} from '@/services/callcenter.service';
import {
  CallCenterRequest,
  CallCenterResponse,
  VentanillaCallCenterFilter,
  VentanillaCallCenterResponse,
} from '@/types/callcenter.types';
import { SelectOption } from '@/types/catalog.types';

/**
 * Estado local para mostrar mensajes informativos, exitosos o de error.
 */
type SnackbarState = {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'warning' | 'info';
};

/**
 * Estado de filtros usados para consultar registros de Ventanilla.
 */
type VentanillaSearchState = {
  q: string;
  cedulaUsuario: string;
  nombreUsuario: string;
  comunaId: string;
  barrioId: string;
  page: number;
  size: number;
};

const SOLICITUD_NUEVA_ENCUESTA_ID = 5;
const ESTADO_SOLICITUD_PENDIENTE_ID = 1;

const initialSearch: VentanillaSearchState = {
  q: '',
  cedulaUsuario: '',
  nombreUsuario: '',
  comunaId: '',
  barrioId: '',
  page: 0,
  size: 50,
};

/**
 * Obtiene la fecha actual en formato yyyy-MM-dd.
 *
 * @returns fecha actual.
 */
function today() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Normaliza un texto eliminando espacios iniciales y finales.
 *
 * @param value texto recibido.
 * @returns texto normalizado.
 */
function normalizeText(value?: string | null) {
  return value?.trim() ?? '';
}

/**
 * Extrae el contenido de una respuesta paginada.
 *
 * @param page respuesta paginada.
 * @returns contenido de la página.
 */
function getPageContent<T>(page: unknown): T[] {
  const data = page as {
    content?: T[];
    items?: T[];
    data?: T[];
  };

  return data?.content ?? data?.items ?? data?.data ?? [];
}

/**
 * Obtiene el total de registros de una respuesta paginada.
 *
 * @param page respuesta paginada.
 * @param currentLength cantidad actual de registros.
 * @returns total de registros.
 */
function getTotalElements(page: unknown, currentLength: number) {
  const data = page as {
    totalElements?: number;
    totalItems?: number;
    total?: number;
    totalRecords?: number;
  };

  return data?.totalElements
    ?? data?.totalItems
    ?? data?.total
    ?? data?.totalRecords
    ?? currentLength;
}

/**
 * Construye una etiqueta legible para mostrar registros omitidos.
 *
 * @param record registro de Ventanilla.
 * @returns etiqueta visible.
 */
function getVentanillaLabel(record: VentanillaCallCenterResponse) {
  return record.nombreUsuario
    || record.cedulaUsuario
    || record.numeroVentanilla
    || `ID ${record.id}`;
}

/**
 * Construye los filtros usados para consultar Ventanilla.
 *
 * Filtra únicamente registros activos de Ventanilla con solicitud
 * NUEVA ENCUESTA y estado PENDIENTE.
 *
 * @param search estado actual de filtros.
 * @param page página solicitada.
 * @param size tamaño de página.
 * @returns filtros para el servicio.
 */
function buildVentanillaFilter(
  search: VentanillaSearchState,
  page = search.page,
  size = search.size,
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
/**
 * Convierte un registro de Ventanilla en un caso Call Center.
 *
 * En el flujo formal, esta pantalla NO asigna encuestador ni funcionario
 * Call Center. Solo crea el caso en estado PENDIENTE_ENRUTAMIENTO para que
 * luego el Coordinador / Enrutador lo asigne.
 *
 * @param record registro de Ventanilla.
 * @returns solicitud para crear caso Call Center.
 */
function ventanillaToRequest(record: VentanillaCallCenterResponse): CallCenterRequest {
  return {
    fechaLlamada: today(),
    horaLlamada: null,
    tipoRegistro: 'LLAMADA',
    origenRegistro: 'VENTANILLA',
    ventanillaRegistroId: record.id,
    cedulaSolicitante: normalizeText(record.cedulaUsuario) || '',
    nombreCompleto: normalizeText(record.nombreUsuario) || '',
    telefono: normalizeText(record.telefono) || null,

    /**
     * En el flujo formal todavía no existe gestión de llamada al crear
     * el caso desde Ventanilla. Se envía null para que la llamada real
     * sea registrada luego desde la gestión del caso.
     */
    llamadaConectada: null as unknown as boolean,

    motivoNoContactoId: null,
    motivoNoContactoTexto: null,
    encuestadorProgramadoId: null,
    fechaEncuestaProgramada: null,
    solicitoNuevaEncuesta: true,
    direccionTexto: normalizeText(record.direccion) || null,
    barrioId: record.barrioId ?? null,
    fechaAplicacionInformada: null,
    disposicionRecibirEncuesta: null,
    motivoNoDisposicionId: null,
    motivoNoDisposicionTexto: null,
    encuestadorAsignadoId: null,
    explicoInformanteCalificado: null,
    verificado: null,
    estadoCaso: 'PENDIENTE_ENRUTAMIENTO',
    tipoSolicitudCallcenter: 'NUEVA_ENCUESTA',
    observacion: [
      'Caso creado desde Ventanilla para enrutamiento Call Center',
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

/**
 * Valida si un caso Call Center se considera abierto.
 *
 * @param record registro Call Center.
 * @returns true si el caso aún está abierto.
 */
function isOpenCallCenterCase(record: CallCenterResponse) {
  const estadoCaso = String(record.estadoCaso ?? '').trim().toUpperCase();

  if (record.activo === false) {
    return false;
  }

  return estadoCaso !== 'CERRADO' && estadoCaso !== 'CANCELADO';
}

/**
 * Página para cargar casos Call Center desde registros de Ventanilla.
 *
 * Esta vista pertenece al flujo administrativo del Coordinador / Enrutador.
 * Crea casos pendientes de enrutamiento sin asignar encuestador.
 */
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

  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success',
  });

  const selectedRecords = useMemo(
    () => records.filter((record) => selectedIds.includes(record.id)),
    [records, selectedIds],
  );

  const allVisibleSelected = records.length > 0
    && records.every((record) => selectedIds.includes(record.id));

  const someVisibleSelected = records.some((record) => selectedIds.includes(record.id));

  /**
   * Muestra un mensaje temporal en pantalla.
   *
   * @param message mensaje visible.
   * @param severity tipo de mensaje.
   */
  function showMessage(
    message: string,
    severity: SnackbarState['severity'] = 'success',
  ) {
    setSnackbar({
      open: true,
      message,
      severity,
    });
  }

  /**
   * Cierra el mensaje temporal.
   */
  function closeSnackbar() {
    setSnackbar((current) => ({
      ...current,
      open: false,
    }));
  }

  /**
   * Carga catálogos usados para los filtros.
   */
  const loadCatalogs = useCallback(async () => {
    try {
      const [barriosData, comunasData] = await Promise.all([
        getCallCenterBarriosOptions(),
        getCallCenterComunasOptions(),
      ]);

      setBarrios(barriosData);
      setComunas(comunasData);
    } catch {
      showMessage('No fue posible cargar los catálogos de filtros.', 'warning');
    }
  }, []);

  /**
   * Consulta los registros de Ventanilla que cumplen los filtros actuales.
   */
  const load = useCallback(async () => {
    setLoading(true);

    try {
      const page = await searchVentanillaForCallCenter(buildVentanillaFilter(search));
      const content = getPageContent<VentanillaCallCenterResponse>(page);

      setRecords(content);
      setTotal(getTotalElements(page, content.length));
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'No fue posible cargar los usuarios de Ventanilla.';

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

  /**
   * Actualiza un filtro de búsqueda y reinicia selección.
   *
   * @param field campo a modificar.
   * @param value valor nuevo.
   */
  function updateSearch(field: keyof VentanillaSearchState, value: string | number) {
    setSearch((current) => ({
      ...current,
      [field]: value,
      page: field === 'page' || field === 'size' ? current.page : 0,
    }));

    setSelectedIds([]);
  }

  /**
   * Selecciona o deselecciona un registro visible.
   *
   * @param id identificador del registro de Ventanilla.
   */
  function toggleRecord(id: number) {
    setSelectedIds((current) => (
      current.includes(id)
        ? current.filter((currentId) => currentId !== id)
        : [...current, id]
    ));
  }

  /**
   * Selecciona o deselecciona todos los registros visibles.
   */
  function toggleAllVisible() {
    setSelectedIds((current) => {
      const visibleIds = records.map((record) => record.id);

      if (allVisibleSelected) {
        return current.filter((id) => !visibleIds.includes(id));
      }

      return Array.from(new Set([...current, ...visibleIds]));
    });
  }

  /**
   * Busca si ya existe un caso abierto para el registro de Ventanilla.
   *
   * @param row registro de Ventanilla.
   * @returns caso abierto encontrado o null.
   */
  async function findExistingOpenCase(row: VentanillaCallCenterResponse) {
    const byVentanilla = await searchCallCenter({
      page: 0,
      size: 5,
      ventanillaRegistroId: row.id,
      activo: true,
    });

    const byVentanillaContent = getPageContent<CallCenterResponse>(byVentanilla);
    const existingByVentanilla = byVentanillaContent.find(isOpenCallCenterCase);

    if (existingByVentanilla) {
      return existingByVentanilla;
    }

    const cedula = normalizeText(row.cedulaUsuario);

    if (!cedula) {
      return null;
    }

    const byCedula = await searchCallCenter({
      page: 0,
      size: 5,
      cedulaSolicitante: cedula,
      tipoSolicitudCallcenter: 'NUEVA_ENCUESTA',
      activo: true,
    });

    const byCedulaContent = getPageContent<CallCenterResponse>(byCedula);

    return byCedulaContent.find(isOpenCallCenterCase) ?? null;
  }

  /**
   * Crea casos Call Center a partir de los registros seleccionados.
   *
   * @param rows registros de Ventanilla.
   */
  async function createRows(rows: VentanillaCallCenterResponse[]) {
    if (rows.length === 0) {
      showMessage('Selecciona al menos un usuario.', 'warning');
      return;
    }

    setSaving(true);

    let created = 0;
    let failed = 0;
    let skipped = 0;
    const skippedNames: string[] = [];

    try {
      for (const row of rows) {
        try {
          const existing = await findExistingOpenCase(row);

          if (existing) {
            skipped += 1;
            skippedNames.push(getVentanillaLabel(row));
            continue;
          }

          await createCallCenterRegistro(ventanillaToRequest(row));
          created += 1;
        } catch {
          failed += 1;
        }
      }

      if (created > 0 && failed === 0 && skipped === 0) {
        showMessage(`Se crearon ${created} caso(s) Call Center para enrutamiento.`, 'success');
        router.push('/dashboard/callcenter/asignar-funcionarios');
        return;
      }

      if (created === 0 && skipped > 0 && failed === 0) {
        showMessage(
          `No se crearon casos. ${skipped} usuario(s) ya tienen caso Call Center abierto.`,
          'warning',
        );
        return;
      }

      showMessage(
        `Resultado: creados ${created}, omitidos por caso abierto ${skipped}, con error ${failed}.`,
        skipped > 0 || failed > 0 ? 'warning' : 'success',
      );

      if (skippedNames.length > 0) {
        console.warn('Usuarios omitidos por caso Call Center abierto:', skippedNames);
      }

      setSelectedIds([]);
      await load();
    } finally {
      setSaving(false);
    }
  }

  /**
   * Crea casos solo de los registros seleccionados.
   */
  function createSelected() {
    createRows(selectedRecords);
  }

  /**
   * Crea casos de todos los registros que cumplen el filtro actual.
   */
  async function createAllFiltered() {
    setLoading(true);

    try {
      const allRecords: VentanillaCallCenterResponse[] = [];
      let page = 0;
      const size = 200;
      let allTotal = 0;

      do {
        const response = await searchVentanillaForCallCenter(
          buildVentanillaFilter(search, page, size),
        );

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
      const message = error instanceof Error
        ? error.message
        : 'No fue posible crear los casos filtrados.';

      showMessage(message, 'error');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Cambia la página de la tabla.
   *
   * @param _ evento no utilizado.
   * @param page página solicitada.
   */
  function handlePageChange(_: unknown, page: number) {
    setSearch((current) => ({
      ...current,
      page,
    }));
  }

  /**
   * Cambia la cantidad de registros visibles por página.
   *
   * @param event evento del selector de filas.
   */
  function handleRowsPerPageChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    setSearch((current) => ({
      ...current,
      page: 0,
      size: Number(event.target.value),
    }));

    setSelectedIds([]);
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: 2,
            justifyContent: 'space-between',
          }}
        >
          <Box>
            <Typography component="h1" variant="h5" sx={{ fontWeight: 800 }}>
              Cargar desde Ventanilla
            </Typography>

            <Typography component="p" variant="body2" sx={{ color: 'text.secondary' }}>
              Selecciona usuarios con solicitud Nueva Encuesta pendiente y crea casos para enrutamiento Call Center.
            </Typography>
          </Box>

          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 1,
            }}
          >
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
          </Box>
        </Box>

        <Alert severity="info">
          Esta página filtra automáticamente por solicitud <strong>Nueva Encuesta</strong>, estado{' '}
          <strong>Pendiente</strong> y registros activos de Ventanilla. Los casos creados quedan en estado{' '}
          <strong>Pendiente de enrutamiento</strong>, sin funcionario Call Center ni encuestador asignado.
        </Alert>

        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography component="h2" variant="h6" sx={{ fontWeight: 800 }}>
                  1. Filtrar usuarios
                </Typography>

                <Typography component="p" variant="body2" sx={{ color: 'text.secondary' }}>
                  Puedes filtrar por comuna, barrio, cédula o nombre.
                </Typography>
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    md: '1fr 1fr 1fr 1fr',
                  },
                  gap: 2,
                }}
              >
                <TextField
                  label="Comuna"
                  select
                  value={search.comunaId}
                  onChange={(event) => updateSearch('comunaId', event.target.value)}
                  fullWidth
                  size="small"
                >
                  <MenuItem value="">
                    Todas las comunas
                  </MenuItem>

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
                  <MenuItem value="">
                    Todos los barrios
                  </MenuItem>

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
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', md: 'row' },
                  gap: 2,
                }}
              >
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
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography component="h2" variant="h6" sx={{ fontWeight: 800 }}>
                  2. Crear casos para enrutamiento
                </Typography>

                <Typography component="p" variant="body2" sx={{ color: 'text.secondary' }}>
                  Los casos creados pasarán a la pantalla Asignar funcionarios Call Center.
                </Typography>
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', md: 'row' },
                  gap: 2,
                }}
              >
                <Button
                  variant="contained"
                  startIcon={<AssignmentTurnedInIcon />}
                  onClick={createSelected}
                  disabled={saving || selectedRecords.length === 0}
                >
                  {`Crear seleccionados (${selectedRecords.length})`}
                </Button>

                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={createAllFiltered}
                  disabled={saving || loading}
                >
                  Crear todos filtrados
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {loading ? (
          <Paper sx={{ p: 3 }}>
            <Alert severity="info">
              Buscando usuarios de Ventanilla...
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

                      <TableCell>
                        {record.fecha || 'Sin fecha'}
                      </TableCell>

                      <TableCell>
                        {record.numeroVentanilla || record.id}
                      </TableCell>

                      <TableCell>
                        <Typography component="p" variant="body2" sx={{ fontWeight: 700 }}>
                          {record.nombreUsuario || 'Sin nombre'}
                        </Typography>

                        <Typography component="p" variant="caption" sx={{ color: 'text.secondary' }}>
                          {`C.C. ${record.cedulaUsuario || 'Sin cédula'}`}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        {record.telefono || 'Sin dato'}
                      </TableCell>

                      <TableCell>
                        <Typography component="p" variant="body2">
                          {record.barrioNombre || 'Sin barrio'}
                        </Typography>

                        <Typography component="p" variant="caption" sx={{ color: 'text.secondary' }}>
                          {record.comunaNombre || 'Sin comuna'}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography component="p" variant="body2">
                          {record.solicitudNombre || 'Nueva encuesta'}
                        </Typography>

                        <Typography component="p" variant="caption" sx={{ color: 'text.secondary' }}>
                          {record.estadoSolicitudNombre || 'Pendiente'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>

                <TableFooter>
                  <TableRow>
                    <TablePagination
                      component="td"
                      colSpan={7}
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
      </Box>

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