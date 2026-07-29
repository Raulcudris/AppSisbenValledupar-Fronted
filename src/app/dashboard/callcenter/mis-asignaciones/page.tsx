'use client';

import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PersonIcon from '@mui/icons-material/Person';
import PhoneIcon from '@mui/icons-material/Phone';
import RefreshIcon from '@mui/icons-material/Refresh';
import ReplayIcon from '@mui/icons-material/Replay';
import ScheduleIcon from '@mui/icons-material/Schedule';
import SearchIcon from '@mui/icons-material/Search';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  TablePagination,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState, type ReactNode } from 'react';

import {
  actualizarCallCenterResultadoVisita,
  getMisCallCenterVisitas,
} from '@/services/callcenter-workflow.service';
import {
  CallCenterEstadoVisita,
  CallCenterVisitaResponse,
  CallCenterVisitaResultadoRequest,
} from '@/types/callcenter-workflow.types';

/**
 * Color permitido para chips de estado.
 */
type ChipColor =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'error'
  | 'info'
  | 'success'
  | 'warning';

/**
 * Estado local de filtros de visitas.
 *
 * Se separan los filtros escritos en pantalla de los filtros aplicados,
 * para evitar consultas automáticas mientras el usuario escribe.
 */
type VisitaFilterState = {
  q: string;
  estadoVisita: string;
  condicion: string;
  fechaDesde: string;
  fechaHasta: string;
};

/**
 * Estados permitidos para actualizar visitas desde frontend.
 */
const ESTADOS_VISITA: CallCenterEstadoVisita[] = [
  'REALIZADA',
  'NO_ATENDIDA',
  'REPROGRAMADA',
  'CANCELADA',
];

/**
 * Opciones de filtro para el estado operativo de la visita.
 */
const ESTADOS_VISITA_FILTRO = [
  'PENDIENTE',
  'PROGRAMADA',
  'REALIZADA',
  'NO_ATENDIDA',
  'REPROGRAMADA',
  'CANCELADA',
];

/**
 * Filtros iniciales de consulta.
 */
const initialFilters: VisitaFilterState = {
  q: '',
  estadoVisita: 'TODOS',
  condicion: 'TODAS',
  fechaDesde: '',
  fechaHasta: '',
};

/**
 * Estado inicial del formulario de resultado de visita.
 */
const initialResultadoForm: CallCenterVisitaResultadoRequest = {
  estadoVisita: 'REALIZADA',
  fechaVisitaReal: null,
  horaVisitaReal: null,
  encuestaRealizada: true,
  motivoNoEncuesta: '',
  fechaReprogramacion: null,
  observacionEncuestador: '',
};

/**
 * Página de mis asignaciones de visitas para encuestadores.
 *
 * Esta vista pertenece al flujo del FUNCIONARIO_ENCUESTADOR.
 * Permite consultar visitas asignadas, filtrar resultados y registrar
 * el resultado operativo de campo cuando la visita está abierta.
 */
export default function PageMisAsignacionesCallCenter() {
  const [items, setItems] = useState<CallCenterVisitaResponse[]>([]);
  const [selected, setSelected] = useState<CallCenterVisitaResponse | null>(null);
  const [form, setForm] = useState<CallCenterVisitaResultadoRequest>(initialResultadoForm);

  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [total, setTotal] = useState(0);

  const [searchText, setSearchText] = useState('');
  const [estadoVisitaFiltro, setEstadoVisitaFiltro] = useState('TODOS');
  const [condicionFiltro, setCondicionFiltro] = useState('TODAS');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [appliedFilters, setAppliedFilters] = useState<VisitaFilterState>(initialFilters);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const visitasFinalizadas = useMemo(
    () => items.filter((item) => isVisitLocked(item)).length,
    [items]
  );

  const visitasAbiertas = useMemo(
    () => items.filter((item) => !isVisitLocked(item)).length,
    [items]
  );

  const hasActiveFilters = Boolean(
    searchText.trim()
    || estadoVisitaFiltro !== 'TODOS'
    || condicionFiltro !== 'TODAS'
    || fechaDesde
    || fechaHasta
  );

  /**
   * Carga las visitas asignadas al encuestador autenticado aplicando filtros desde backend.
   *
   * @param nextPage página solicitada.
   * @param nextSize tamaño de página.
   * @param filters filtros aplicados.
   */
  async function loadData(
    nextPage = page,
    nextSize = size,
    filters = appliedFilters
  ) {
    try {
      setLoading(true);
      setError(null);

      const response = await getMisCallCenterVisitas(nextPage, nextSize, {
        q: filters.q,
        estadoVisita: filters.estadoVisita,
        condicion: filters.condicion,
        fechaDesde: filters.fechaDesde,
        fechaHasta: filters.fechaHasta,
      });

      const content = getPageContent<CallCenterVisitaResponse>(response);

      setItems(content);
      setTotal(getTotalElements(response, content.length));
    } catch (exception) {
      setError(getErrorMessage(exception, 'No fue posible cargar las asignaciones.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData(page, size, appliedFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, size, appliedFilters]);

  /**
   * Refresca manualmente las visitas asignadas usando los últimos filtros aplicados.
   */
  function refresh() {
    loadData(page, size, appliedFilters);
  }

  /**
   * Ejecuta la búsqueda con los filtros seleccionados.
   *
   * No se consulta automáticamente mientras el usuario escribe; la búsqueda
   * se ejecuta únicamente al pulsar el botón Buscar.
   */
  function handleSearch() {
    const nextFilters: VisitaFilterState = {
      q: searchText,
      estadoVisita: estadoVisitaFiltro,
      condicion: condicionFiltro,
      fechaDesde,
      fechaHasta,
    };

    setPage(0);
    setAppliedFilters(nextFilters);
  }

  /**
   * Limpia todos los filtros visuales y vuelve a consultar las visitas sin filtros.
   */
  function clearFilters() {
    setSearchText('');
    setEstadoVisitaFiltro('TODOS');
    setCondicionFiltro('TODAS');
    setFechaDesde('');
    setFechaHasta('');
    setPage(0);
    setAppliedFilters(initialFilters);
  }

  /**
   * Abre el formulario para registrar el resultado de la visita.
   *
   * @param item visita seleccionada.
   */
  function handleOpenResultado(item: CallCenterVisitaResponse) {
    if (isVisitLocked(item)) {
      setError('Esta visita ya está finalizada o pertenece a un caso cerrado/cancelado.');
      return;
    }

    const now = new Date();

    setSelected(item);
    setForm({
      estadoVisita: 'REALIZADA',
      fechaVisitaReal: now.toISOString().slice(0, 10),
      horaVisitaReal: now.toTimeString().slice(0, 5),
      encuestaRealizada: true,
      motivoNoEncuesta: '',
      fechaReprogramacion: null,
      observacionEncuestador: '',
    });
  }

  /**
   * Cierra el formulario de resultado.
   */
  function handleCloseResultado() {
    setSelected(null);
    setForm(initialResultadoForm);
  }

  /**
   * Cambia el estado de visita seleccionado y ajusta campos relacionados.
   *
   * @param estado estado seleccionado.
   */
  function handleChangeEstadoVisita(estado: CallCenterEstadoVisita) {
    setForm((current) => ({
      ...current,
      estadoVisita: estado,
      encuestaRealizada: estado === 'REALIZADA',
      motivoNoEncuesta: estado === 'REALIZADA' ? '' : current.motivoNoEncuesta,
      fechaReprogramacion: estado === 'REPROGRAMADA' ? current.fechaReprogramacion : null,
    }));
  }

  /**
   * Guarda el resultado operativo de la visita seleccionada.
   */
  async function handleSaveResultado() {
    if (!selected) {
      return;
    }

    if (isVisitLocked(selected)) {
      setError('Esta visita ya está finalizada o pertenece a un caso cerrado/cancelado.');
      return;
    }

    if (form.estadoVisita !== 'REALIZADA' && !form.motivoNoEncuesta?.trim()) {
      setError('Debes registrar el motivo cuando la visita no queda realizada.');
      return;
    }

    if (form.estadoVisita === 'REPROGRAMADA' && !form.fechaReprogramacion) {
      setError('Debes seleccionar la fecha de reprogramación.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      await actualizarCallCenterResultadoVisita(selected.id, form);

      setSuccess('Resultado de visita actualizado correctamente.');
      handleCloseResultado();
      await loadData(page, size, appliedFilters);
    } catch (exception) {
      setError(getErrorMessage(exception, 'No fue posible actualizar el resultado de visita.'));
    } finally {
      setSaving(false);
    }
  }

  if (loading && items.length === 0) {
    return (
      <Box
        sx={{
          minHeight: 320,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
        }}
      >
        <CircularProgress />

        <Typography component="p" sx={{ mt: 2 }}>
          Cargando asignaciones...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          gap: 1.5,
        }}
      >
        <Box>
          <Typography component="h1" variant="h5" sx={{ fontWeight: 800 }}>
            Mis asignaciones
          </Typography>

          <Typography component="p" variant="body2" sx={{ color: 'text.secondary' }}>
            Consulta tus visitas asignadas, filtra la información y registra el resultado de campo.
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={refresh}
          disabled={loading}
        >
          Actualizar
        </Button>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: '1fr 1fr',
            lg: '1fr 1fr 1fr',
          },
          gap: 1.5,
        }}
      >
        <SummaryCard label="Visitas cargadas" value={items.length} />
        <SummaryCard label="Abiertas" value={visitasAbiertas} />
        <SummaryCard label="Finalizadas" value={visitasFinalizadas} />
      </Box>

      <Card variant="outlined">
        <CardContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <Typography component="h2" variant="h6" sx={{ fontWeight: 800 }}>
                Filtros de búsqueda
              </Typography>

              <Typography component="p" variant="body2" sx={{ color: 'text.secondary' }}>
                Selecciona los filtros y pulsa Buscar para consultar en base de datos.
              </Typography>
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  md: '2fr 1fr 1fr',
                  lg: '2fr 1fr 1fr 1fr 1fr',
                },
                gap: 1.5,
              }}
            >
              <TextField
                label="Buscar"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Nombre, cédula, teléfono, barrio, dirección o caso"
                fullWidth
              />

              <FormControl fullWidth>
                <InputLabel>Estado visita</InputLabel>

                <Select
                  label="Estado visita"
                  value={estadoVisitaFiltro}
                  onChange={(event) => setEstadoVisitaFiltro(String(event.target.value))}
                >
                  <MenuItem value="TODOS">Todos</MenuItem>

                  {ESTADOS_VISITA_FILTRO.map((estado) => (
                    <MenuItem key={estado} value={estado}>
                      {formatLabel(estado)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Condición</InputLabel>

                <Select
                  label="Condición"
                  value={condicionFiltro}
                  onChange={(event) => setCondicionFiltro(String(event.target.value))}
                >
                  <MenuItem value="TODAS">Todas</MenuItem>
                  <MenuItem value="ABIERTAS">Abiertas</MenuItem>
                  <MenuItem value="FINALIZADAS">Finalizadas</MenuItem>
                  <MenuItem value="CERRADO">Caso cerrado</MenuItem>
                  <MenuItem value="CANCELADO">Caso cancelado</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="Fecha desde"
                type="date"
                value={fechaDesde}
                onChange={(event) => setFechaDesde(event.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                fullWidth
              />

              <TextField
                label="Fecha hasta"
                type="date"
                value={fechaHasta}
                onChange={(event) => setFechaHasta(event.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                fullWidth
              />
            </Box>

            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 1,
              }}
            >
              <Typography component="p" variant="body2" sx={{ color: 'text.secondary' }}>
                {loading ? 'Buscando visitas...' : `Mostrando ${items.length} de ${total} visita(s).`}
              </Typography>

              <Box sx={{ display: 'flex', gap: 1, justifyContent: { xs: 'stretch', sm: 'flex-end' } }}>
                <Button
                  variant="contained"
                  startIcon={<SearchIcon />}
                  onClick={handleSearch}
                  disabled={loading}
                >
                  Buscar
                </Button>

                <Button
                  variant="text"
                  startIcon={<FilterAltOffIcon />}
                  onClick={clearFilters}
                  disabled={!hasActiveFilters || loading}
                >
                  Limpiar filtros
                </Button>
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {visitasFinalizadas > 0 && (
        <Alert severity="info">
          Tienes {visitasFinalizadas} visita(s) finalizada(s). Estas quedan solo para consulta y no permiten registrar
          nuevos resultados.
        </Alert>
      )}

      {items.length === 0 ? (
        <Alert severity="info">
          No tienes visitas asignadas con los filtros aplicados.
        </Alert>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              md: '1fr 1fr',
              xl: '1fr 1fr 1fr',
            },
            gap: 2,
            opacity: loading ? 0.65 : 1,
            pointerEvents: loading ? 'none' : 'auto',
          }}
        >
          {items.map((item) => {
            const locked = isVisitLocked(item);
            const estadoCaso = getOptionalStringField(item, 'estadoCaso');
            const tipoSolicitud = getOptionalStringField(item, 'tipoSolicitudCallcenter');

            return (
              <Card key={item.id} variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: 1.5,
                      }}
                    >
                      <Box sx={{ display: 'flex', gap: 1.2, alignItems: 'center' }}>
                        <Avatar
                          sx={{
                            width: 44,
                            height: 44,
                          }}
                        >
                          {getVisitIcon(item)}
                        </Avatar>

                        <Box>
                          <Typography component="p" sx={{ fontWeight: 900 }}>
                            {`Caso #${item.callCenterRegistroId}`}
                          </Typography>

                          <Typography component="p" variant="caption" sx={{ color: 'text.secondary' }}>
                            {`Visita #${item.id}`}
                          </Typography>
                        </Box>
                      </Box>

                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <Chip
                          size="small"
                          label={formatLabel(item.estadoVisita)}
                          color={getStatusColor(item.estadoVisita)}
                        />

                        {estadoCaso && (
                          <Chip
                            size="small"
                            label={formatLabel(estadoCaso)}
                            color={getStatusColor(estadoCaso)}
                            variant="outlined"
                          />
                        )}
                      </Box>
                    </Box>

                    {locked && (
                      <Alert severity="success" sx={{ py: 0.5 }}>
                        Esta visita se encuentra finalizada. Solo permite consulta.
                      </Alert>
                    )}

                    <Divider />

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Typography component="p" variant="subtitle2" sx={{ fontWeight: 900 }}>
                        Datos del ciudadano
                      </Typography>

                      <InfoItem
                        icon={<PersonIcon fontSize="small" />}
                        label="Ciudadano"
                        value={item.nombreCompleto ?? 'Sin nombre'}
                      />

                      <InfoItem
                        icon={<AssignmentIndIcon fontSize="small" />}
                        label="Cédula"
                        value={item.cedulaSolicitante ?? 'Sin cédula'}
                      />

                      <InfoItem
                        icon={<PhoneIcon fontSize="small" />}
                        label="Teléfono"
                        value={item.telefono ?? 'Sin teléfono'}
                      />
                    </Box>

                    <Divider />

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Typography component="p" variant="subtitle2" sx={{ fontWeight: 900 }}>
                        Ubicación y programación
                      </Typography>

                      <InfoItem
                        icon={<LocationOnIcon fontSize="small" />}
                        label="Dirección"
                        value={item.direccionTexto ?? 'Sin dirección'}
                      />

                      <InfoItem
                        icon={<HomeWorkIcon fontSize="small" />}
                        label="Barrio / Comuna"
                        value={`${item.barrioNombre ?? 'Sin barrio'} / ${item.comunaNombre ?? 'Sin comuna'}`}
                      />

                      <InfoItem
                        icon={<CalendarMonthIcon fontSize="small" />}
                        label="Fecha programada"
                        value={`${item.fechaProgramada ?? 'Sin fecha'} ${item.horaProgramada ?? ''}`.trim()}
                      />
                    </Box>

                    <Divider />

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Typography component="p" variant="subtitle2" sx={{ fontWeight: 900 }}>
                        Resultado y solicitud
                      </Typography>

                      {tipoSolicitud && (
                        <InfoItem
                          label="Tipo de solicitud"
                          value={formatLabel(tipoSolicitud)}
                        />
                      )}

                      {item.fechaVisitaReal && (
                        <InfoItem
                          label="Fecha visita real"
                          value={`${item.fechaVisitaReal} ${item.horaVisitaReal ?? ''}`.trim()}
                        />
                      )}

                      {item.encuestaRealizada !== null && item.encuestaRealizada !== undefined && (
                        <InfoItem
                          label="Encuesta realizada"
                          value={item.encuestaRealizada ? 'Sí' : 'No'}
                        />
                      )}

                      {item.motivoNoEncuesta && (
                        <InfoItem
                          label="Motivo no encuesta"
                          value={item.motivoNoEncuesta}
                        />
                      )}

                      {item.observacionEncuestador && (
                        <Box>
                          <Typography component="p" variant="caption" sx={{ color: 'text.secondary' }}>
                            Observación
                          </Typography>

                          <Typography component="p" variant="body2">
                            {item.observacionEncuestador}
                          </Typography>
                        </Box>
                      )}
                    </Box>

                    <Button
                      variant={locked ? 'outlined' : 'contained'}
                      startIcon={<FactCheckIcon />}
                      onClick={() => handleOpenResultado(item)}
                      disabled={locked}
                      fullWidth
                    >
                      {locked ? 'Resultado registrado' : 'Registrar resultado'}
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}

      <TablePagination
        component="div"
        count={total}
        page={page}
        rowsPerPage={size}
        onPageChange={(_, newPage) => {
          setPage(newPage);
        }}
        onRowsPerPageChange={(event) => {
          setSize(Number(event.target.value));
          setPage(0);
        }}
        rowsPerPageOptions={[10, 20, 50]}
        labelRowsPerPage="Filas"
      />

      <Dialog open={Boolean(selected)} onClose={handleCloseResultado} maxWidth="sm" fullWidth>
        <DialogTitle>Registrar resultado de visita</DialogTitle>

        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Estado visita</InputLabel>

              <Select
                label="Estado visita"
                value={form.estadoVisita}
                onChange={(event) => {
                  handleChangeEstadoVisita(event.target.value as CallCenterEstadoVisita);
                }}
              >
                {ESTADOS_VISITA.map((estado) => (
                  <MenuItem key={estado} value={estado}>
                    {formatLabel(estado)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Fecha visita real"
              type="date"
              value={form.fechaVisitaReal ?? ''}
              onChange={(event) => setForm((current) => ({
                ...current,
                fechaVisitaReal: event.target.value || null,
              }))}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />

            <TextField
              label="Hora visita real"
              type="time"
              value={form.horaVisitaReal ?? ''}
              onChange={(event) => setForm((current) => ({
                ...current,
                horaVisitaReal: event.target.value || null,
              }))}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />

            {form.estadoVisita !== 'REALIZADA' && (
              <TextField
                label="Motivo no encuesta"
                value={form.motivoNoEncuesta ?? ''}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  motivoNoEncuesta: event.target.value,
                }))}
                required
                fullWidth
              />
            )}

            {form.estadoVisita === 'REPROGRAMADA' && (
              <TextField
                label="Fecha reprogramación"
                type="date"
                value={form.fechaReprogramacion ?? ''}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  fechaReprogramacion: event.target.value || null,
                }))}
                slotProps={{ inputLabel: { shrink: true } }}
                required
                fullWidth
              />
            )}

            <TextField
              label="Observación del encuestador"
              value={form.observacionEncuestador ?? ''}
              onChange={(event) => setForm((current) => ({
                ...current,
                observacionEncuestador: event.target.value,
              }))}
              multiline
              minRows={3}
              fullWidth
            />
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCloseResultado}>
            Cancelar
          </Button>

          <Button
            variant="contained"
            disabled={saving || (selected ? isVisitLocked(selected) : false)}
            onClick={handleSaveResultado}
          >
            Guardar resultado
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(error)}
        autoHideDuration={6000}
        onClose={() => setError(null)}
      >
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={Boolean(success)}
        autoHideDuration={4000}
        onClose={() => setSuccess(null)}
      >
        <Alert severity="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
}

/**
 * Tarjeta breve para mostrar un indicador de resumen.
 */
function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography component="p" variant="caption" sx={{ color: 'text.secondary' }}>
          {label}
        </Typography>

        <Typography component="p" variant="h5" sx={{ fontWeight: 900 }}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

/**
 * Componente auxiliar para mostrar un dato breve de la visita.
 */
function InfoItem({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
}) {
  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
      {icon && (
        <Box sx={{ color: 'text.secondary', mt: 0.2 }}>
          {icon}
        </Box>
      )}

      <Box>
        <Typography component="p" variant="caption" sx={{ color: 'text.secondary' }}>
          {label}
        </Typography>

        <Typography component="p" variant="body2" sx={{ fontWeight: 700 }}>
          {value}
        </Typography>
      </Box>
    </Box>
  );
}

/**
 * Extrae el contenido de una respuesta paginada de forma tolerante.
 *
 * @param pageResponse respuesta recibida.
 * @returns arreglo de registros.
 */
function getPageContent<T>(pageResponse: unknown): T[] {
  const data = pageResponse as {
    content?: T[];
    items?: T[];
    data?: T[];
  };

  return data.content ?? data.items ?? data.data ?? [];
}

/**
 * Obtiene el total de registros de una respuesta paginada.
 *
 * @param pageResponse respuesta recibida.
 * @param fallback total alternativo.
 * @returns total de registros.
 */
function getTotalElements(pageResponse: unknown, fallback: number) {
  const data = pageResponse as {
    totalElements?: number;
    totalItems?: number;
    total?: number;
    totalRecords?: number;
  };

  return data.totalElements ?? data.totalItems ?? data.total ?? data.totalRecords ?? fallback;
}

/**
 * Obtiene un campo string opcional desde una respuesta dinámica.
 *
 * @param item registro de visita.
 * @param field campo opcional.
 * @returns valor string o null.
 */
function getOptionalStringField(item: CallCenterVisitaResponse, field: string) {
  const data = item as unknown as Record<string, unknown>;
  const value = data[field];

  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Valida si una visita debe bloquear nuevas actualizaciones de resultado.
 *
 * @param item visita evaluada.
 * @returns true si la visita está finalizada o el caso está cerrado/cancelado.
 */
function isVisitLocked(item: CallCenterVisitaResponse) {
  const estadoVisita = normalizeCode(item.estadoVisita);
  const estadoCaso = normalizeCode(getOptionalStringField(item, 'estadoCaso'));

  return item.encuestaRealizada === true
    || estadoVisita === 'REALIZADA'
    || estadoVisita === 'CANCELADA'
    || estadoCaso === 'CERRADO'
    || estadoCaso === 'CANCELADO';
}

/**
 * Obtiene un icono representativo según el estado de la visita.
 *
 * @param item visita evaluada.
 * @returns icono visual.
 */
function getVisitIcon(item: CallCenterVisitaResponse) {
  const estadoVisita = normalizeCode(item.estadoVisita);

  if (item.encuestaRealizada === true || estadoVisita === 'REALIZADA') {
    return <CheckCircleIcon />;
  }

  if (estadoVisita === 'CANCELADA') {
    return <CancelIcon />;
  }

  if (estadoVisita === 'REPROGRAMADA') {
    return <ReplayIcon />;
  }

  if (estadoVisita === 'NO_ATENDIDA') {
    return <WarningAmberIcon />;
  }

  if (estadoVisita === 'PROGRAMADA') {
    return <ScheduleIcon />;
  }

  return <AssignmentIndIcon />;
}

/**
 * Normaliza códigos técnicos para comparaciones internas.
 *
 * @param value valor recibido.
 * @returns código normalizado.
 */
function normalizeCode(value?: string | number | null) {
  return String(value ?? '').trim().toUpperCase();
}

/**
 * Obtiene un mensaje de error legible.
 *
 * @param exception excepción recibida.
 * @param fallback mensaje por defecto.
 * @returns mensaje de error.
 */
function getErrorMessage(exception: unknown, fallback: string) {
  if (
    exception &&
    typeof exception === 'object' &&
    'message' in exception &&
    typeof exception.message === 'string'
  ) {
    return exception.message;
  }

  return fallback;
}

/**
 * Convierte códigos técnicos en etiquetas legibles.
 *
 * @param value código técnico.
 * @returns etiqueta visible.
 */
function formatLabel(value?: string | null) {
  return String(value ?? 'Sin estado')
    .split('_')
    .join(' ')
    .toLowerCase()
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

/**
 * Define el color visual de los estados.
 *
 * @param value estado técnico.
 * @returns color del chip.
 */
function getStatusColor(value?: string | null): ChipColor {
  const normalized = String(value ?? '').toUpperCase();

  if (normalized.includes('REALIZADA') || normalized.includes('CERRADO')) {
    return 'success';
  }

  if (
    normalized.includes('PENDIENTE')
    || normalized.includes('PROGRAMADA')
    || normalized.includes('ASIGNADO')
  ) {
    return 'info';
  }

  if (normalized.includes('REPROGRAMADA') || normalized.includes('NO_ATENDIDA')) {
    return 'warning';
  }

  if (normalized.includes('CANCELADA') || normalized.includes('CANCELADO')) {
    return 'error';
  }

  return 'default';
}