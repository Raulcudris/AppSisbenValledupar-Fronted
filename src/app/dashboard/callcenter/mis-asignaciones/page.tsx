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
import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  actualizarCallCenterResultadoVisita,
  getMisCallCenterVisitas,
} from '@/services/callcenter-workflow.service';
import type {
  CallCenterEstadoVisita,
  CallCenterVisitaResponse,
  CallCenterVisitaResultadoRequest,
} from '@/types/callcenter-workflow.types';

/**
 * Colores permitidos para los chips de estado.
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
 * Modo de apertura del diálogo de resultado.
 *
 * edit:
 * Permite registrar o actualizar el resultado de una visita abierta.
 *
 * view:
 * Permite consultar una visita bloqueada o finalizada.
 */
type ResultadoDialogMode =
  | 'edit'
  | 'view'
  | null;

/**
 * Filtros visibles y aplicados en la consulta de visitas.
 */
type VisitaFilterState = {
  q: string;
  estadoVisita: string;
  estadoCaso: string;
  condicion: string;
  fechaDesde: string;
  fechaHasta: string;
};

/**
 * Estados que el encuestador puede registrar como resultado de campo.
 */
const ESTADOS_VISITA: CallCenterEstadoVisita[] = [
  'REALIZADA',
  'NO_ATENDIDA',
  'REPROGRAMADA',
  'CANCELADA',
];

/**
 * Estados disponibles para filtrar visitas.
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
 * Estados disponibles para filtrar el caso maestro.
 */
const ESTADOS_CASO_FILTRO = [
  'PENDIENTE_ENRUTAMIENTO',
  'ASIGNADO_CALLCENTER',
  'EN_GESTION_LLAMADA',
  'NO_CONTACTADO',
  'CONTACTADO_SIN_DISPOSICION',
  'PENDIENTE_ASIGNAR_ENCUESTADOR',
  'ASIGNADO_ENCUESTADOR',
  'VISITA_PROGRAMADA',
  'VISITA_REALIZADA',
  'VISITA_NO_ATENDIDA',
  'REPROGRAMADO',
  'CERRADO',
  'CANCELADO',
];

/**
 * Filtros iniciales.
 */
const initialFilters: VisitaFilterState = {
  q: '',
  estadoVisita: 'TODOS',
  estadoCaso: 'TODOS',
  condicion: 'TODAS',
  fechaDesde: '',
  fechaHasta: '',
};

/**
 * Formulario inicial para registrar el resultado de una visita.
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
 * Bandeja operativa de visitas asignadas al encuestador autenticado.
 *
 * La página consulta el endpoint personal del encuestador y no envía
 * manualmente un encuestadorId. La búsqueda, filtros y paginación se
 * ejecutan en backend.
 */
export default function PageMisAsignacionesCallCenter() {
  const [items, setItems] =
    useState<CallCenterVisitaResponse[]>([]);

  const [selected, setSelected] =
    useState<CallCenterVisitaResponse | null>(null);

  const [dialogMode, setDialogMode] =
    useState<ResultadoDialogMode>(null);

  const [form, setForm] =
    useState<CallCenterVisitaResultadoRequest>(
      initialResultadoForm,
    );

  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [total, setTotal] = useState(0);

  const [searchText, setSearchText] = useState('');
  const [estadoVisitaFiltro, setEstadoVisitaFiltro] =
    useState('TODOS');
  const [estadoCasoFiltro, setEstadoCasoFiltro] =
    useState('TODOS');
  const [condicionFiltro, setCondicionFiltro] =
    useState('TODAS');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  const [appliedFilters, setAppliedFilters] =
    useState<VisitaFilterState>(initialFilters);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  /**
   * Indicadores calculados sobre la página cargada.
   */
  const visitasProgramadas = useMemo(
    () =>
      items.filter((item) => {
        const estado =
          normalizeCode(item.estadoVisita);

        return (
          estado === 'PENDIENTE' ||
          estado === 'PROGRAMADA'
        );
      }).length,
    [items],
  );

  const visitasRealizadas = useMemo(
    () =>
      items.filter((item) => {
        const estado =
          normalizeCode(item.estadoVisita);

        return (
          item.encuestaRealizada === true ||
          estado === 'REALIZADA'
        );
      }).length,
    [items],
  );

  const visitasNoAtendidas = useMemo(
    () =>
      items.filter(
        (item) =>
          normalizeCode(item.estadoVisita) ===
          'NO_ATENDIDA',
      ).length,
    [items],
  );

  const visitasReprogramadas = useMemo(
    () =>
      items.filter(
        (item) =>
          normalizeCode(item.estadoVisita) ===
          'REPROGRAMADA',
      ).length,
    [items],
  );

  const visitasFinalizadas = useMemo(
    () =>
      items.filter((item) =>
        isVisitLocked(item),
      ).length,
    [items],
  );

  const hasActiveFilters = Boolean(
    searchText.trim() ||
      estadoVisitaFiltro !== 'TODOS' ||
      estadoCasoFiltro !== 'TODOS' ||
      condicionFiltro !== 'TODAS' ||
      fechaDesde ||
      fechaHasta,
  );

  /**
   * Consulta las visitas asignadas al encuestador autenticado.
   */
  async function loadData(
    nextPage = page,
    nextSize = size,
    filters = appliedFilters,
  ) {
    try {
      setLoading(true);
      setError(null);

      const response =
        await getMisCallCenterVisitas(
          nextPage,
          nextSize,
          {
            q:
              filters.q.trim() ||
              undefined,
            estadoVisita:
              filters.estadoVisita,
            estadoCaso:
              filters.estadoCaso,
            condicion:
              filters.condicion,
            fechaDesde:
              filters.fechaDesde ||
              undefined,
            fechaHasta:
              filters.fechaHasta ||
              undefined,
          },
        );

      const content =
        getPageContent<CallCenterVisitaResponse>(
          response,
        );

      setItems(content);
      setTotal(
        getTotalElements(
          response,
          content.length,
        ),
      );
    } catch (exception) {
      setError(
        getErrorMessage(
          exception,
          'No fue posible cargar las visitas asignadas.',
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData(
      page,
      size,
      appliedFilters,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, size, appliedFilters]);

  /**
   * Refresca la página actual conservando los filtros aplicados.
   */
  function refresh() {
    void loadData(
      page,
      size,
      appliedFilters,
    );
  }

  /**
   * Aplica los filtros seleccionados.
   */
  function handleSearch() {
    if (
      fechaDesde &&
      fechaHasta &&
      fechaDesde > fechaHasta
    ) {
      setError(
        'La fecha inicial no puede ser posterior a la fecha final.',
      );
      return;
    }

    const nextFilters: VisitaFilterState = {
      q: searchText.trim(),
      estadoVisita:
        estadoVisitaFiltro,
      estadoCaso:
        estadoCasoFiltro,
      condicion:
        condicionFiltro,
      fechaDesde,
      fechaHasta,
    };

    setPage(0);
    setAppliedFilters(nextFilters);
  }

  /**
   * Restablece los filtros.
   */
  function clearFilters() {
    setSearchText('');
    setEstadoVisitaFiltro('TODOS');
    setEstadoCasoFiltro('TODOS');
    setCondicionFiltro('TODAS');
    setFechaDesde('');
    setFechaHasta('');
    setPage(0);
    setAppliedFilters(initialFilters);
  }

  /**
   * Abre el resultado de una visita.
   *
   * Las visitas finalizadas o bloqueadas se abren en modo consulta.
   * Las visitas abiertas se abren en modo edición.
   */
  function handleOpenResultado(
    item: CallCenterVisitaResponse,
  ) {
    const locked =
      isVisitLocked(item);

    setSelected(item);
    setDialogMode(
      locked
        ? 'view'
        : 'edit',
    );

    if (locked) {
      setForm(
        buildExistingResultForm(item),
      );
      return;
    }

    setForm(
      buildEditableResultForm(item),
    );
  }

  /**
   * Cierra el diálogo de resultado.
   */
  function handleCloseResultado() {
    if (saving) {
      return;
    }

    setSelected(null);
    setDialogMode(null);
    setForm(initialResultadoForm);
  }

  /**
   * Ajusta los campos dependientes del estado seleccionado.
   */
  function handleChangeEstadoVisita(
    estado: CallCenterEstadoVisita,
  ) {
    setForm((current) => ({
      ...current,
      estadoVisita: estado,
      encuestaRealizada:
        estado === 'REALIZADA',
      motivoNoEncuesta:
        estado === 'REALIZADA'
          ? ''
          : current.motivoNoEncuesta,
      fechaReprogramacion:
        estado === 'REPROGRAMADA'
          ? current.fechaReprogramacion
          : null,
    }));
  }

  /**
   * Guarda el resultado operativo de campo.
   */
  async function handleSaveResultado() {
    if (
      !selected ||
      dialogMode !== 'edit'
    ) {
      return;
    }

    if (isVisitLocked(selected)) {
      setError(
        'Esta visita ya está finalizada o pertenece a un caso cerrado o cancelado.',
      );
      return;
    }

    if (
      form.estadoVisita !== 'REALIZADA' &&
      !form.motivoNoEncuesta?.trim()
    ) {
      setError(
        'Debes registrar el motivo cuando la visita no queda realizada.',
      );
      return;
    }

    if (
      form.estadoVisita === 'REPROGRAMADA' &&
      !form.fechaReprogramacion
    ) {
      setError(
        'Debes seleccionar la fecha de reprogramación.',
      );
      return;
    }

    const request =
      buildResultadoRequest(form);

    try {
      setSaving(true);
      setError(null);

      await actualizarCallCenterResultadoVisita(
        selected.id,
        request,
      );

      setSuccess(
        'Resultado de visita actualizado correctamente.',
      );

      setSelected(null);
      setDialogMode(null);
      setForm(initialResultadoForm);

      await loadData(
        page,
        size,
        appliedFilters,
      );
    } catch (exception) {
      setError(
        getErrorMessage(
          exception,
          'No fue posible actualizar el resultado de la visita.',
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  if (
    loading &&
    items.length === 0
  ) {
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

        <Typography
          component="p"
          sx={{ mt: 2 }}
        >
          Cargando visitas asignadas...
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: {
            xs: 'column',
            md: 'row',
          },
          justifyContent: 'space-between',
          gap: 1.5,
        }}
      >
        <Box>
          <Typography
            component="h1"
            variant="h5"
            sx={{ fontWeight: 800 }}
          >
            Visitas asignadas
          </Typography>

          <Typography
            component="p"
            variant="body2"
            sx={{
              color: 'text.secondary',
              mt: 0.5,
            }}
          >
            Consulta las visitas asignadas a tu usuario y
            registra el resultado del trabajo de campo.
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

      <Alert severity="info">
        <Typography
          component="p"
          variant="body2"
          sx={{ fontWeight: 800 }}
        >
          La falta de contacto telefónico no cancela la visita.
        </Typography>

        <Typography
          component="p"
          variant="body2"
        >
          Cuando la visita está programada, debes acudir en
          la fecha asignada aunque el ciudadano no haya
          contestado la llamada de confirmación.
        </Typography>
      </Alert>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, minmax(0, 1fr))',
            lg: 'repeat(5, minmax(0, 1fr))',
          },
          gap: 1.5,
        }}
      >
        <SummaryCard
          label="Visitas en esta página"
          value={items.length}
        />

        <SummaryCard
          label="Pendientes o programadas"
          value={visitasProgramadas}
        />

        <SummaryCard
          label="Realizadas"
          value={visitasRealizadas}
        />

        <SummaryCard
          label="No atendidas"
          value={visitasNoAtendidas}
        />

        <SummaryCard
          label="Reprogramadas"
          value={visitasReprogramadas}
        />
      </Box>

      <Card variant="outlined">
        <CardContent>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            <Box>
              <Typography
                component="h2"
                variant="h6"
                sx={{ fontWeight: 800 }}
              >
                Buscar visitas
              </Typography>

              <Typography
                component="p"
                variant="body2"
                sx={{ color: 'text.secondary' }}
              >
                Los filtros se aplican directamente en el
                backend al pulsar Buscar.
              </Typography>
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  md: 'repeat(2, minmax(0, 1fr))',
                  xl: '2fr repeat(5, minmax(0, 1fr))',
                },
                gap: 1.5,
              }}
            >
              <TextField
                label="Ciudadano, dirección o caso"
                value={searchText}
                onChange={(event) =>
                  setSearchText(
                    event.target.value,
                  )
                }
                placeholder="Nombre, cédula, teléfono, barrio, dirección o caso"
                fullWidth
                size="small"
              />

              <FormControl
                fullWidth
                size="small"
              >
                <InputLabel>
                  Estado de visita
                </InputLabel>

                <Select
                  label="Estado de visita"
                  value={estadoVisitaFiltro}
                  onChange={(event) =>
                    setEstadoVisitaFiltro(
                      String(
                        event.target.value,
                      ),
                    )
                  }
                >
                  <MenuItem value="TODOS">
                    Todos
                  </MenuItem>

                  {ESTADOS_VISITA_FILTRO.map(
                    (estado) => (
                      <MenuItem
                        key={estado}
                        value={estado}
                      >
                        {formatLabel(estado)}
                      </MenuItem>
                    ),
                  )}
                </Select>
              </FormControl>

              <FormControl
                fullWidth
                size="small"
              >
                <InputLabel>
                  Estado del caso
                </InputLabel>

                <Select
                  label="Estado del caso"
                  value={estadoCasoFiltro}
                  onChange={(event) =>
                    setEstadoCasoFiltro(
                      String(
                        event.target.value,
                      ),
                    )
                  }
                >
                  <MenuItem value="TODOS">
                    Todos
                  </MenuItem>

                  {ESTADOS_CASO_FILTRO.map(
                    (estado) => (
                      <MenuItem
                        key={estado}
                        value={estado}
                      >
                        {formatLabel(estado)}
                      </MenuItem>
                    ),
                  )}
                </Select>
              </FormControl>

              <FormControl
                fullWidth
                size="small"
              >
                <InputLabel>
                  Situación
                </InputLabel>

                <Select
                  label="Situación"
                  value={condicionFiltro}
                  onChange={(event) =>
                    setCondicionFiltro(
                      String(
                        event.target.value,
                      ),
                    )
                  }
                >
                  <MenuItem value="TODAS">
                    Todas
                  </MenuItem>

                  <MenuItem value="ABIERTAS">
                    Visitas abiertas
                  </MenuItem>

                  <MenuItem value="FINALIZADAS">
                    Visitas finalizadas
                  </MenuItem>

                  <MenuItem value="CERRADO">
                    Caso cerrado
                  </MenuItem>

                  <MenuItem value="CANCELADO">
                    Caso cancelado
                  </MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="Fecha desde"
                type="date"
                value={fechaDesde}
                onChange={(event) =>
                  setFechaDesde(
                    event.target.value,
                  )
                }
                slotProps={{
                  inputLabel: {
                    shrink: true,
                  },
                }}
                fullWidth
                size="small"
              />

              <TextField
                label="Fecha hasta"
                type="date"
                value={fechaHasta}
                onChange={(event) =>
                  setFechaHasta(
                    event.target.value,
                  )
                }
                slotProps={{
                  inputLabel: {
                    shrink: true,
                  },
                }}
                fullWidth
                size="small"
              />
            </Box>

            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                flexDirection: {
                  xs: 'column',
                  sm: 'row',
                },
                gap: 1,
              }}
            >
              <Typography
                component="p"
                variant="body2"
                sx={{ color: 'text.secondary' }}
              >
                {loading
                  ? 'Buscando visitas...'
                  : `Mostrando ${items.length} de ${total} visita(s).`}
              </Typography>

              <Box
                sx={{
                  display: 'flex',
                  flexDirection: {
                    xs: 'column',
                    sm: 'row',
                  },
                  gap: 1,
                }}
              >
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
                  startIcon={
                    <FilterAltOffIcon />
                  }
                  onClick={clearFilters}
                  disabled={
                    !hasActiveFilters ||
                    loading
                  }
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
          En esta página hay {visitasFinalizadas}{' '}
          visita(s) finalizada(s) o bloqueada(s). Puedes
          consultar su resultado, pero no modificarlo.
        </Alert>
      )}

      {items.length === 0 ? (
        <Alert severity="info">
          No tienes visitas asignadas con los filtros
          aplicados.
        </Alert>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              md: 'repeat(2, minmax(0, 1fr))',
              xl: 'repeat(3, minmax(0, 1fr))',
            },
            gap: 2,
            opacity:
              loading
                ? 0.65
                : 1,
            pointerEvents:
              loading
                ? 'none'
                : 'auto',
          }}
        >
          {items.map((item) => {
            const locked =
              isVisitLocked(item);

            const estadoCaso =
              item.estadoCaso ||
              null;

            const tipoSolicitud =
              item.tipoSolicitudCallcenter ||
              null;

            return (
              <Card
                key={item.id}
                variant="outlined"
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <CardContent
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1.5,
                      flex: 1,
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent:
                          'space-between',
                        gap: 1.5,
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          gap: 1.2,
                          alignItems: 'center',
                        }}
                      >
                        <Avatar
                          sx={{
                            width: 44,
                            height: 44,
                          }}
                        >
                          {getVisitIcon(item)}
                        </Avatar>

                        <Box>
                          <Typography
                            component="p"
                            sx={{
                              fontWeight: 900,
                            }}
                          >
                            {`Caso #${item.callCenterRegistroId}`}
                          </Typography>

                          <Typography
                            component="p"
                            variant="caption"
                            sx={{
                              color:
                                'text.secondary',
                            }}
                          >
                            {`Visita #${item.id}`}
                          </Typography>
                        </Box>
                      </Box>

                      <Box
                        sx={{
                          display: 'flex',
                          gap: 0.5,
                          flexWrap: 'wrap',
                          justifyContent:
                            'flex-end',
                        }}
                      >
                        <Chip
                          size="small"
                          label={formatLabel(
                            item.estadoVisita,
                          )}
                          color={getStatusColor(
                            item.estadoVisita,
                          )}
                        />

                        {estadoCaso && (
                          <Chip
                            size="small"
                            label={formatLabel(
                              estadoCaso,
                            )}
                            color={getStatusColor(
                              estadoCaso,
                            )}
                            variant="outlined"
                          />
                        )}
                      </Box>
                    </Box>

                    {locked && (
                      <Alert
                        severity={
                          isVisitCancelled(item)
                            ? 'warning'
                            : 'success'
                        }
                        sx={{ py: 0.5 }}
                      >
                        Esta visita se encuentra bloqueada para
                        edición. Su información permanece
                        disponible para consulta.
                      </Alert>
                    )}

                    <Divider />

                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1,
                      }}
                    >
                      <Typography
                        component="p"
                        variant="subtitle2"
                        sx={{ fontWeight: 900 }}
                      >
                        Ciudadano
                      </Typography>

                      <InfoItem
                        icon={
                          <PersonIcon fontSize="small" />
                        }
                        label="Nombre"
                        value={
                          item.nombreCompleto ||
                          'Sin nombre'
                        }
                      />

                      <InfoItem
                        icon={
                          <AssignmentIndIcon fontSize="small" />
                        }
                        label="Cédula"
                        value={
                          item.cedulaSolicitante ||
                          'Sin cédula'
                        }
                      />

                      <InfoItem
                        icon={
                          <PhoneIcon fontSize="small" />
                        }
                        label="Teléfono"
                        value={
                          item.telefono ||
                          'Sin teléfono'
                        }
                      />
                    </Box>

                    <Divider />

                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1,
                      }}
                    >
                      <Typography
                        component="p"
                        variant="subtitle2"
                        sx={{ fontWeight: 900 }}
                      >
                        Ubicación y programación
                      </Typography>

                      <InfoItem
                        icon={
                          <LocationOnIcon fontSize="small" />
                        }
                        label="Dirección"
                        value={
                          item.direccionTexto ||
                          'Sin dirección'
                        }
                      />

                      <InfoItem
                        icon={
                          <HomeWorkIcon fontSize="small" />
                        }
                        label="Barrio / Comuna"
                        value={getTerritoryLabel(
                          item,
                        )}
                      />

                      <InfoItem
                        icon={
                          <CalendarMonthIcon fontSize="small" />
                        }
                        label="Fecha programada"
                        value={formatDateTime(
                          item.fechaProgramada,
                          item.horaProgramada,
                          'Sin fecha programada',
                        )}
                      />
                    </Box>

                    <Divider />

                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1,
                      }}
                    >
                      <Typography
                        component="p"
                        variant="subtitle2"
                        sx={{ fontWeight: 900 }}
                      >
                        Resultado de campo
                      </Typography>

                      {tipoSolicitud && (
                        <InfoItem
                          label="Tipo de solicitud"
                          value={formatLabel(
                            tipoSolicitud,
                          )}
                        />
                      )}

                      <InfoItem
                        label="Encuesta realizada"
                        value={getSurveyResultLabel(
                          item,
                        )}
                      />

                      {item.fechaVisitaReal && (
                        <InfoItem
                          label="Fecha de visita"
                          value={formatDateTime(
                            item.fechaVisitaReal,
                            item.horaVisitaReal,
                            'Sin fecha registrada',
                          )}
                        />
                      )}

                      {item.fechaReprogramacion && (
                        <InfoItem
                          label="Fecha de reprogramación"
                          value={
                            item.fechaReprogramacion
                          }
                        />
                      )}

                      {item.motivoNoEncuesta && (
                        <InfoItem
                          label="Motivo de no encuesta"
                          value={
                            item.motivoNoEncuesta
                          }
                        />
                      )}

                      {item.observacionEncuestador && (
                        <Box>
                          <Typography
                            component="p"
                            variant="caption"
                            sx={{
                              color:
                                'text.secondary',
                            }}
                          >
                            Observación
                          </Typography>

                          <Typography
                            component="p"
                            variant="body2"
                            sx={{
                              overflowWrap:
                                'anywhere',
                            }}
                          >
                            {
                              item.observacionEncuestador
                            }
                          </Typography>
                        </Box>
                      )}
                    </Box>

                    <Button
                      variant={
                        locked
                          ? 'outlined'
                          : 'contained'
                      }
                      startIcon={<FactCheckIcon />}
                      onClick={() =>
                        handleOpenResultado(
                          item,
                        )
                      }
                      fullWidth
                      sx={{ mt: 'auto' }}
                    >
                      {locked
                        ? hasVisitResult(item)
                          ? 'Ver resultado'
                          : 'Ver detalle'
                        : 'Registrar resultado'}
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
          setSize(
            Number(
              event.target.value,
            ),
          );
          setPage(0);
        }}
        rowsPerPageOptions={[
          10,
          20,
          50,
        ]}
        labelRowsPerPage="Filas"
      />

      <Dialog
        open={Boolean(
          selected &&
            dialogMode,
        )}
        onClose={handleCloseResultado}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {dialogMode === 'view'
            ? 'Resultado de la visita'
            : 'Registrar resultado de visita'}
        </DialogTitle>

        <DialogContent>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              mt: 1,
            }}
          >
            {dialogMode === 'view' ? (
              <Alert severity="info">
                Esta visita está disponible únicamente para
                consulta.
              </Alert>
            ) : (
              <Alert severity="info">
                Registra el resultado real encontrado durante
                la visita de campo.
              </Alert>
            )}

            {selected && (
              <Card variant="outlined">
                <CardContent>
                  <Typography
                    component="p"
                    sx={{ fontWeight: 800 }}
                  >
                    {selected.nombreCompleto ||
                      'Ciudadano sin nombre'}
                  </Typography>

                  <Typography
                    component="p"
                    variant="body2"
                    sx={{
                      color:
                        'text.secondary',
                    }}
                  >
                    {`Caso #${selected.callCenterRegistroId} · Visita #${selected.id}`}
                  </Typography>

                  <Typography
                    component="p"
                    variant="body2"
                    sx={{ mt: 1 }}
                  >
                    {selected.direccionTexto ||
                      'Sin dirección'}
                  </Typography>

                  <Typography
                    component="p"
                    variant="body2"
                    sx={{
                      color:
                        'text.secondary',
                    }}
                  >
                    Programada:{' '}
                    {formatDateTime(
                      selected.fechaProgramada,
                      selected.horaProgramada,
                      'Sin fecha programada',
                    )}
                  </Typography>
                </CardContent>
              </Card>
            )}

            <FormControl
              fullWidth
              size="small"
              disabled={
                dialogMode === 'view'
              }
            >
              <InputLabel>
                Estado de visita
              </InputLabel>

              <Select
                label="Estado de visita"
                value={form.estadoVisita}
                onChange={(event) =>
                  handleChangeEstadoVisita(
                    event.target
                      .value as CallCenterEstadoVisita,
                  )
                }
              >
                {ESTADOS_VISITA.map(
                  (estado) => (
                    <MenuItem
                      key={estado}
                      value={estado}
                    >
                      {formatLabel(
                        estado,
                      )}
                    </MenuItem>
                  ),
                )}
              </Select>
            </FormControl>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, minmax(0, 1fr))',
                },
                gap: 2,
              }}
            >
              <TextField
                label="Fecha de visita real"
                type="date"
                value={
                  form.fechaVisitaReal ||
                  ''
                }
                onChange={(event) =>
                  setForm(
                    (current) => ({
                      ...current,
                      fechaVisitaReal:
                        event.target.value ||
                        null,
                    }),
                  )
                }
                slotProps={{
                  inputLabel: {
                    shrink: true,
                  },
                }}
                fullWidth
                size="small"
                disabled={
                  dialogMode === 'view'
                }
              />

              <TextField
                label="Hora de visita real"
                type="time"
                value={
                  form.horaVisitaReal ||
                  ''
                }
                onChange={(event) =>
                  setForm(
                    (current) => ({
                      ...current,
                      horaVisitaReal:
                        event.target.value ||
                        null,
                    }),
                  )
                }
                slotProps={{
                  inputLabel: {
                    shrink: true,
                  },
                }}
                fullWidth
                size="small"
                disabled={
                  dialogMode === 'view'
                }
              />
            </Box>

            {form.estadoVisita !==
              'REALIZADA' && (
              <TextField
                label="Motivo de no encuesta"
                value={
                  form.motivoNoEncuesta ||
                  ''
                }
                onChange={(event) =>
                  setForm(
                    (current) => ({
                      ...current,
                      motivoNoEncuesta:
                        event.target.value,
                    }),
                  )
                }
                required={
                  dialogMode === 'edit'
                }
                fullWidth
                size="small"
                disabled={
                  dialogMode === 'view'
                }
              />
            )}

            {form.estadoVisita ===
              'REPROGRAMADA' && (
              <TextField
                label="Fecha de reprogramación"
                type="date"
                value={
                  form.fechaReprogramacion ||
                  ''
                }
                onChange={(event) =>
                  setForm(
                    (current) => ({
                      ...current,
                      fechaReprogramacion:
                        event.target.value ||
                        null,
                    }),
                  )
                }
                slotProps={{
                  inputLabel: {
                    shrink: true,
                  },
                }}
                required={
                  dialogMode === 'edit'
                }
                fullWidth
                size="small"
                disabled={
                  dialogMode === 'view'
                }
              />
            )}

            <TextField
              label="Observación del encuestador"
              value={
                form.observacionEncuestador ||
                ''
              }
              onChange={(event) =>
                setForm(
                  (current) => ({
                    ...current,
                    observacionEncuestador:
                      event.target.value,
                  }),
                )
              }
              multiline
              minRows={3}
              fullWidth
              size="small"
              disabled={
                dialogMode === 'view'
              }
            />
          </Box>
        </DialogContent>

        <DialogActions>
          {dialogMode === 'view' ? (
            <Button
              variant="contained"
              onClick={handleCloseResultado}
            >
              Cerrar
            </Button>
          ) : (
            <>
              <Button
                onClick={handleCloseResultado}
                disabled={saving}
              >
                Cancelar
              </Button>

              <Button
                variant="contained"
                disabled={
                  saving ||
                  !selected ||
                  (
                    selected
                      ? isVisitLocked(
                          selected,
                        )
                      : false
                  )
                }
                onClick={() =>
                  void handleSaveResultado()
                }
              >
                {saving
                  ? 'Guardando...'
                  : 'Guardar resultado'}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(error)}
        autoHideDuration={6000}
        onClose={() =>
          setError(null)
        }
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
      >
        <Alert
          severity="error"
          onClose={() =>
            setError(null)
          }
          sx={{ width: '100%' }}
        >
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={Boolean(success)}
        autoHideDuration={4000}
        onClose={() =>
          setSuccess(null)
        }
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
      >
        <Alert
          severity="success"
          onClose={() =>
            setSuccess(null)
          }
          sx={{ width: '100%' }}
        >
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
}

/**
 * Tarjeta de indicador.
 *
 * Los valores corresponden únicamente a la página cargada.
 */
function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography
          component="p"
          variant="caption"
          sx={{
            color:
              'text.secondary',
          }}
        >
          {label}
        </Typography>

        <Typography
          component="p"
          variant="h5"
          sx={{ fontWeight: 900 }}
        >
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

/**
 * Componente auxiliar para presentar información de una visita.
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
    <Box
      sx={{
        display: 'flex',
        gap: 1,
        alignItems: 'flex-start',
      }}
    >
      {icon && (
        <Box
          sx={{
            color:
              'text.secondary',
            mt: 0.2,
          }}
        >
          {icon}
        </Box>
      )}

      <Box sx={{ minWidth: 0 }}>
        <Typography
          component="p"
          variant="caption"
          sx={{
            color:
              'text.secondary',
          }}
        >
          {label}
        </Typography>

        <Typography
          component="p"
          variant="body2"
          sx={{
            fontWeight: 700,
            overflowWrap:
              'anywhere',
          }}
        >
          {value}
        </Typography>
      </Box>
    </Box>
  );
}

/**
 * Construye el formulario para una visita abierta.
 */
function buildEditableResultForm(
  item: CallCenterVisitaResponse,
): CallCenterVisitaResultadoRequest {
  const now = new Date();

  const currentState =
    ESTADOS_VISITA.includes(
      item.estadoVisita as CallCenterEstadoVisita,
    )
      ? (
          item.estadoVisita as CallCenterEstadoVisita
        )
      : 'REALIZADA';

  return {
    estadoVisita:
      currentState,
    fechaVisitaReal:
      item.fechaVisitaReal ||
      formatLocalDate(now),
    horaVisitaReal:
      item.horaVisitaReal ||
      formatLocalTime(now),
    encuestaRealizada:
      currentState ===
      'REALIZADA',
    motivoNoEncuesta:
      item.motivoNoEncuesta ||
      '',
    fechaReprogramacion:
      item.fechaReprogramacion ||
      null,
    observacionEncuestador:
      item.observacionEncuestador ||
      '',
  };
}

/**
 * Construye el formulario de consulta para una visita bloqueada.
 */
function buildExistingResultForm(
  item: CallCenterVisitaResponse,
): CallCenterVisitaResultadoRequest {
  return {
    estadoVisita:
      item.estadoVisita as CallCenterEstadoVisita,
    fechaVisitaReal:
      item.fechaVisitaReal ||
      null,
    horaVisitaReal:
      item.horaVisitaReal ||
      null,
    encuestaRealizada:
      item.encuestaRealizada ??
      (
        normalizeCode(
          item.estadoVisita,
        ) === 'REALIZADA'
      ),
    motivoNoEncuesta:
      item.motivoNoEncuesta ||
      '',
    fechaReprogramacion:
      item.fechaReprogramacion ||
      null,
    observacionEncuestador:
      item.observacionEncuestador ||
      '',
  };
}

/**
 * Limpia los campos dependientes antes de enviar el resultado.
 */
function buildResultadoRequest(
  form: CallCenterVisitaResultadoRequest,
): CallCenterVisitaResultadoRequest {
  const realizada =
    form.estadoVisita ===
    'REALIZADA';

  const reprogramada =
    form.estadoVisita ===
    'REPROGRAMADA';

  return {
    estadoVisita:
      form.estadoVisita,
    fechaVisitaReal:
      form.fechaVisitaReal ||
      null,
    horaVisitaReal:
      form.horaVisitaReal ||
      null,
    encuestaRealizada:
      realizada,
    motivoNoEncuesta:
      realizada
        ? null
        : (
            form.motivoNoEncuesta?.trim() ||
            null
          ),
    fechaReprogramacion:
      reprogramada
        ? (
            form.fechaReprogramacion ||
            null
          )
        : null,
    observacionEncuestador:
      form.observacionEncuestador?.trim() ||
      null,
  };
}

/**
 * Extrae el contenido de una respuesta paginada.
 */
function getPageContent<T>(
  pageResponse: unknown,
): T[] {
  const data =
    pageResponse as {
      content?: T[];
      items?: T[];
      data?: T[];
    };

  return (
    data.content ??
    data.items ??
    data.data ??
    []
  );
}

/**
 * Obtiene el total de registros paginados.
 */
function getTotalElements(
  pageResponse: unknown,
  fallback: number,
) {
  const data =
    pageResponse as {
      totalElements?: number;
      totalItems?: number;
      total?: number;
      totalRecords?: number;
    };

  return (
    data.totalElements ??
    data.totalItems ??
    data.total ??
    data.totalRecords ??
    fallback
  );
}

/**
 * Determina si una visita debe bloquear nuevas actualizaciones.
 */
function isVisitLocked(
  item: CallCenterVisitaResponse,
) {
  const estadoVisita =
    normalizeCode(
      item.estadoVisita,
    );

  const estadoCaso =
    normalizeCode(
      item.estadoCaso,
    );

  return (
    item.encuestaRealizada === true ||
    estadoVisita === 'REALIZADA' ||
    estadoVisita === 'CANCELADA' ||
    estadoCaso === 'CERRADO' ||
    estadoCaso === 'CANCELADO'
  );
}

/**
 * Determina si la visita o el caso están cancelados.
 */
function isVisitCancelled(
  item: CallCenterVisitaResponse,
) {
  const estadoVisita =
    normalizeCode(
      item.estadoVisita,
    );

  const estadoCaso =
    normalizeCode(
      item.estadoCaso,
    );

  return (
    estadoVisita === 'CANCELADA' ||
    estadoCaso === 'CANCELADO'
  );
}

/**
 * Determina si existe información de resultado para mostrar.
 */
function hasVisitResult(
  item: CallCenterVisitaResponse,
) {
  return Boolean(
    item.fechaVisitaReal ||
      item.horaVisitaReal ||
      item.encuestaRealizada !== null &&
        item.encuestaRealizada !== undefined ||
      item.motivoNoEncuesta ||
      item.fechaReprogramacion ||
      item.observacionEncuestador,
  );
}

/**
 * Devuelve el icono asociado al estado de la visita.
 */
function getVisitIcon(
  item: CallCenterVisitaResponse,
) {
  const estadoVisita =
    normalizeCode(
      item.estadoVisita,
    );

  if (
    item.encuestaRealizada === true ||
    estadoVisita === 'REALIZADA'
  ) {
    return <CheckCircleIcon />;
  }

  if (
    estadoVisita === 'CANCELADA'
  ) {
    return <CancelIcon />;
  }

  if (
    estadoVisita === 'REPROGRAMADA'
  ) {
    return <ReplayIcon />;
  }

  if (
    estadoVisita === 'NO_ATENDIDA'
  ) {
    return <WarningAmberIcon />;
  }

  if (
    estadoVisita === 'PROGRAMADA'
  ) {
    return <ScheduleIcon />;
  }

  return <AssignmentIndIcon />;
}

/**
 * Construye la etiqueta territorial.
 */
function getTerritoryLabel(
  item: CallCenterVisitaResponse,
) {
  const barrio =
    item.barrioNombre ||
    'Sin barrio';

  const comuna =
    item.comunaNombre
      ? ` / ${item.comunaNombre}`
      : ' / Sin comuna';

  return `${barrio}${comuna}`;
}

/**
 * Devuelve una etiqueta legible del resultado de encuesta.
 */
function getSurveyResultLabel(
  item: CallCenterVisitaResponse,
) {
  if (
    item.encuestaRealizada === true
  ) {
    return 'Sí';
  }

  if (
    item.encuestaRealizada === false
  ) {
    return 'No';
  }

  return 'Sin resultado registrado';
}

/**
 * Presenta fecha y hora sin alterar la zona horaria.
 */
function formatDateTime(
  date?: string | null,
  time?: string | null,
  fallback = 'Sin fecha',
) {
  if (!date) {
    return fallback;
  }

  return time
    ? `${date} · ${time.slice(0, 5)}`
    : date;
}

/**
 * Normaliza códigos para comparaciones internas.
 */
function normalizeCode(
  value?: string | number | null,
) {
  return String(value ?? '')
    .trim()
    .toUpperCase();
}

/**
 * Obtiene un mensaje de error legible.
 */
function getErrorMessage(
  exception: unknown,
  fallback: string,
) {
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
 * Convierte códigos técnicos en etiquetas visibles.
 */
function formatLabel(
  value?: string | null,
) {
  return String(
    value ??
      'Sin estado',
  )
    .split('_')
    .join(' ')
    .toLowerCase()
    .replace(
      /^\w/,
      (letter) =>
        letter.toUpperCase(),
    );
}

/**
 * Define el color visual de cada estado.
 */
function getStatusColor(
  value?: string | null,
): ChipColor {
  const normalized =
    normalizeCode(value);

  if (
    normalized.includes('CANCELADA') ||
    normalized.includes('CANCELADO')
  ) {
    return 'error';
  }

  if (
    normalized.includes('REPROGRAMADA') ||
    normalized.includes('REPROGRAMADO') ||
    normalized.includes('NO_ATENDIDA') ||
    normalized.includes('NO_CONTACTADO')
  ) {
    return 'warning';
  }

  if (
    normalized.includes('REALIZADA') ||
    normalized.includes('CERRADO')
  ) {
    return 'success';
  }

  if (
    normalized.includes('PENDIENTE') ||
    normalized.includes('PROGRAMADA') ||
    normalized.includes('ASIGNADO') ||
    normalized.includes('GESTION')
  ) {
    return 'info';
  }

  return 'default';
}

/**
 * Genera una fecha local YYYY-MM-DD sin convertir a UTC.
 */
function formatLocalDate(
  date: Date,
) {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1,
    ).padStart(
      2,
      '0',
    );

  const day =
    String(
      date.getDate(),
    ).padStart(
      2,
      '0',
    );

  return `${year}-${month}-${day}`;
}

/**
 * Genera una hora local HH:mm.
 */
function formatLocalTime(
  date: Date,
) {
  const hours =
    String(
      date.getHours(),
    ).padStart(
      2,
      '0',
    );

  const minutes =
    String(
      date.getMinutes(),
    ).padStart(
      2,
      '0',
    );

  return `${hours}:${minutes}`;
}