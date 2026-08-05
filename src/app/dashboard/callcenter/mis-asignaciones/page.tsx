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

type ChipColor =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'error'
  | 'info'
  | 'success'
  | 'warning';

type VisitaFilterState = {
  q: string;
  estadoVisita: string;
  condicion: string;
  fechaDesde: string;
  fechaHasta: string;
};

const ESTADOS_VISITA: CallCenterEstadoVisita[] = [
  'REALIZADA',
  'NO_ATENDIDA',
  'REPROGRAMADA',
  'CANCELADA',
];

const ESTADOS_VISITA_FILTRO = [
  'PENDIENTE',
  'PROGRAMADA',
  'REALIZADA',
  'NO_ATENDIDA',
  'REPROGRAMADA',
  'CANCELADA',
];

const initialFilters: VisitaFilterState = {
  q: '',
  estadoVisita: 'TODOS',
  condicion: 'TODAS',
  fechaDesde: '',
  fechaHasta: '',
};

const initialResultadoForm: CallCenterVisitaResultadoRequest = {
  estadoVisita: 'REALIZADA',
  fechaVisitaReal: null,
  horaVisitaReal: null,
  encuestaRealizada: true,
  motivoNoEncuesta: '',
  fechaReprogramacion: null,
  observacionEncuestador: '',
};

export default function PageMisAsignacionesCallCenter() {
  const [
    items,
    setItems,
  ] = useState<CallCenterVisitaResponse[]>([]);

  const [
    selected,
    setSelected,
  ] = useState<CallCenterVisitaResponse | null>(
    null,
  );

  const [
    form,
    setForm,
  ] = useState<CallCenterVisitaResultadoRequest>(
    initialResultadoForm,
  );

  const [
    page,
    setPage,
  ] = useState(0);

  const [
    size,
    setSize,
  ] = useState(10);

  const [
    total,
    setTotal,
  ] = useState(0);

  const [
    searchText,
    setSearchText,
  ] = useState('');

  const [
    estadoVisitaFiltro,
    setEstadoVisitaFiltro,
  ] = useState('TODOS');

  const [
    condicionFiltro,
    setCondicionFiltro,
  ] = useState('TODAS');

  const [
    fechaDesde,
    setFechaDesde,
  ] = useState('');

  const [
    fechaHasta,
    setFechaHasta,
  ] = useState('');

  const [
    appliedFilters,
    setAppliedFilters,
  ] = useState<VisitaFilterState>(
    initialFilters,
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(null);

  const [
    resultError,
    setResultError,
  ] = useState<string | null>(null);

  const [
    success,
    setSuccess,
  ] = useState<string | null>(null);

  const visitasFinalizadas = useMemo(
    () =>
      items.filter(
        (item) => isVisitLocked(item),
      ).length,
    [items],
  );

  const visitasAbiertas = useMemo(
    () =>
      items.filter(
        (item) => !isVisitLocked(item),
      ).length,
    [items],
  );

  const hasActiveFilters = Boolean(
    searchText.trim()
    || estadoVisitaFiltro !== 'TODOS'
    || condicionFiltro !== 'TODAS'
    || fechaDesde
    || fechaHasta,
  );

  const resultImpact = getResultadoImpacto(
    form.estadoVisita,
  );

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
            q: filters.q,
            estadoVisita:
              filters.estadoVisita,
            condicion:
              filters.condicion,
            fechaDesde:
              filters.fechaDesde,
            fechaHasta:
              filters.fechaHasta,
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
          'No fue posible cargar las asignaciones.',
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
  }, [
    page,
    size,
    appliedFilters,
  ]);

  function refresh() {
    void loadData(
      page,
      size,
      appliedFilters,
    );
  }

  function handleSearch() {
    const nextFilters: VisitaFilterState = {
      q: searchText.trim(),
      estadoVisita:
        estadoVisitaFiltro,
      condicion:
        condicionFiltro,
      fechaDesde,
      fechaHasta,
    };

    setPage(0);
    setAppliedFilters(nextFilters);
  }

  function clearFilters() {
    setSearchText('');
    setEstadoVisitaFiltro('TODOS');
    setCondicionFiltro('TODAS');
    setFechaDesde('');
    setFechaHasta('');
    setPage(0);
    setAppliedFilters(initialFilters);
  }

  function handleOpenResultado(
    item: CallCenterVisitaResponse,
  ) {
    if (isVisitLocked(item)) {
      setError(
        'Esta visita ya está finalizada o pertenece a un caso cerrado o cancelado.',
      );

      return;
    }

    const now = new Date();

    setSelected(item);
    setResultError(null);

    setForm({
      estadoVisita:
        'REALIZADA',

      fechaVisitaReal:
        getLocalDateISO(now),

      horaVisitaReal:
        getLocalTime(now),

      encuestaRealizada:
        true,

      motivoNoEncuesta:
        '',

      fechaReprogramacion:
        null,

      observacionEncuestador:
        '',
    });
  }

  function handleCloseResultado() {
    setSelected(null);
    setResultError(null);
    setForm(initialResultadoForm);
  }

  function handleChangeEstadoVisita(
    estado: CallCenterEstadoVisita,
  ) {
    setResultError(null);

    setForm((current) => ({
      ...current,

      estadoVisita:
        estado,

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

  async function handleSaveResultado() {
    if (!selected) {
      return;
    }

    setResultError(null);

    if (isVisitLocked(selected)) {
      setResultError(
        'Esta visita ya está finalizada o pertenece a un caso cerrado o cancelado.',
      );

      return;
    }

    if (
      form.estadoVisita !== 'REALIZADA'
      && !form.motivoNoEncuesta?.trim()
    ) {
      setResultError(
        'Debes registrar el motivo cuando la visita no queda realizada.',
      );

      return;
    }

    if (
      form.estadoVisita === 'REPROGRAMADA'
      && !form.fechaReprogramacion
    ) {
      setResultError(
        'Debes seleccionar la nueva fecha de la visita.',
      );

      return;
    }

    try {
      setSaving(true);

      await actualizarCallCenterResultadoVisita(
        selected.id,
        form,
      );

      const reprogramada =
        form.estadoVisita === 'REPROGRAMADA';

      handleCloseResultado();

      setSuccess(
        reprogramada
          ? 'La visita fue reprogramada. El caso continúa abierto para registrar el nuevo resultado.'
          : 'El resultado fue registrado correctamente y el caso quedó finalizado.',
      );

      await loadData(
        page,
        size,
        appliedFilters,
      );
    } catch (exception) {
      setResultError(
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
    loading
    && items.length === 0
  ) {
    return (
      <Box
        sx={{
          minHeight: 320,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <CircularProgress />

        <Typography component="p">
          Cargando asignaciones...
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <Box
        sx={{
          display: 'flex',

          flexDirection: {
            xs: 'column',
            md: 'row',
          },

          alignItems: {
            xs: 'stretch',
            md: 'flex-start',
          },

          justifyContent:
            'space-between',

          gap:
            1.5,
        }}
      >
        <Box>
          <Typography
            component="h1"
            variant="h5"
            sx={{
              fontWeight: 900,
            }}
          >
            Mis asignaciones
          </Typography>

          <Typography
            component="p"
            variant="body2"
            color="text.secondary"
          >
            Consulta tus visitas y registra el resultado
            del trabajo de campo.
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={
            <RefreshIcon />
          }
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
            sm: 'repeat(3, 1fr)',
          },

          gap:
            1.25,
        }}
      >
        <SummaryCard
          label="Visitas cargadas"
          value={items.length}
          color="primary.main"
        />

        <SummaryCard
          label="Pendientes"
          value={visitasAbiertas}
          color="warning.main"
        />

        <SummaryCard
          label="Finalizadas"
          value={visitasFinalizadas}
          color="success.main"
        />
      </Box>

      <Card
        variant="outlined"
        sx={{
          borderRadius: 2.5,
        }}
      >
        <CardContent
          sx={{
            p: {
              xs: 1.5,
              md: 2,
            },

            '&:last-child': {
              pb: {
                xs: 1.5,
                md: 2,
              },
            },
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5,
            }}
          >
            <Box>
              <Typography
                component="h2"
                variant="subtitle1"
                sx={{
                  fontWeight: 900,
                }}
              >
                Buscar asignaciones
              </Typography>

              <Typography
                component="p"
                variant="caption"
                color="text.secondary"
              >
                Selecciona los filtros y pulsa Buscar.
              </Typography>
            </Box>

            <Box
              sx={{
                display: 'grid',

                gridTemplateColumns: {
                  xs: '1fr',
                  md: '2fr 1fr 1fr',
                  xl: '2fr 1fr 1fr 1fr 1fr',
                },

                gap:
                  1.25,
              }}
            >
              <TextField
                label="Buscar ciudadano o caso"
                value={searchText}
                onChange={(event) => {
                  setSearchText(
                    event.target.value,
                  );
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    handleSearch();
                  }
                }}
                placeholder="Nombre, cédula, teléfono, barrio o dirección"
                size="small"
                fullWidth
              />

              <FormControl
                size="small"
                fullWidth
              >
                <InputLabel>
                  Estado visita
                </InputLabel>

                <Select
                  label="Estado visita"
                  value={estadoVisitaFiltro}
                  onChange={(event) => {
                    setEstadoVisitaFiltro(
                      String(
                        event.target.value,
                      ),
                    );
                  }}
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
                size="small"
                fullWidth
              >
                <InputLabel>
                  Condición
                </InputLabel>

                <Select
                  label="Condición"
                  value={condicionFiltro}
                  onChange={(event) => {
                    setCondicionFiltro(
                      String(
                        event.target.value,
                      ),
                    );
                  }}
                >
                  <MenuItem value="TODAS">
                    Todas
                  </MenuItem>

                  <MenuItem value="ABIERTAS">
                    Abiertas
                  </MenuItem>

                  <MenuItem value="FINALIZADAS">
                    Finalizadas
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
                onChange={(event) => {
                  setFechaDesde(
                    event.target.value,
                  );
                }}
                size="small"
                slotProps={{
                  inputLabel: {
                    shrink: true,
                  },
                }}
                fullWidth
              />

              <TextField
                label="Fecha hasta"
                type="date"
                value={fechaHasta}
                onChange={(event) => {
                  setFechaHasta(
                    event.target.value,
                  );
                }}
                size="small"
                slotProps={{
                  inputLabel: {
                    shrink: true,
                  },
                }}
                fullWidth
              />
            </Box>

            <Box
              sx={{
                display: 'flex',

                flexDirection: {
                  xs: 'column',
                  sm: 'row',
                },

                alignItems: {
                  xs: 'stretch',
                  sm: 'center',
                },

                justifyContent:
                  'space-between',

                gap:
                  1,
              }}
            >
              <Typography
                component="p"
                variant="caption"
                color="text.secondary"
              >
                {loading
                  ? 'Buscando visitas...'
                  : `Mostrando ${items.length} de ${total} visita(s).`}
              </Typography>

              <Box
                sx={{
                  display: 'flex',
                  gap: 1,
                }}
              >
                <Button
                  variant="contained"
                  size="small"
                  startIcon={
                    <SearchIcon />
                  }
                  onClick={handleSearch}
                  disabled={loading}
                >
                  Buscar
                </Button>

                <Button
                  variant="text"
                  size="small"
                  startIcon={
                    <FilterAltOffIcon />
                  }
                  onClick={clearFilters}
                  disabled={
                    !hasActiveFilters
                    || loading
                  }
                >
                  Limpiar
                </Button>
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {visitasFinalizadas > 0 ? (
        <Alert
          severity="info"
          sx={{
            py: 0.5,
          }}
        >
          Las visitas finalizadas permanecen visibles para
          consulta y no admiten nuevos resultados.
        </Alert>
      ) : null}

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
              lg: 'repeat(3, minmax(0, 1fr))',
              xl: 'repeat(4, minmax(0, 1fr))',
            },

            gap:
              1.5,

            opacity:
              loading
                ? 0.6
                : 1,

            pointerEvents:
              loading
                ? 'none'
                : 'auto',

            transition:
              'opacity 180ms ease',
          }}
        >
          {items.map((item) => {
            const locked =
              isVisitLocked(item);

            const estadoCaso =
              getOptionalStringField(
                item,
                'estadoCaso',
              );

            const tipoSolicitud =
              getOptionalStringField(
                item,
                'tipoSolicitudCallcenter',
              );

            const reprogramada =
              normalizeCode(
                item.estadoVisita,
              ) === 'REPROGRAMADA';

            return (
              <Card
                key={item.id}
                variant="outlined"
                sx={{
                  position: 'relative',
                  overflow: 'hidden',
                  height: '100%',
                  borderRadius: 2.5,

                  borderColor:
                    locked
                      ? 'divider'
                      : getCardAccent(
                        item.estadoVisita,
                      ),

                  backgroundColor:
                    locked
                      ? 'action.hover'
                      : 'background.paper',

                  transition: (
                    theme,
                  ) =>
                    theme.transitions.create(
                      [
                        'transform',
                        'box-shadow',
                        'border-color',
                      ],
                      {
                        duration:
                          theme.transitions
                            .duration.short,
                      },
                    ),

                  '&:hover': {
                    transform:
                      'translateY(-4px)',

                    boxShadow:
                      locked
                        ? 2
                        : 6,

                    borderColor:
                      getCardAccent(
                        item.estadoVisita,
                      ),
                  },
                }}
              >
                <Box
                  sx={{
                    height: 4,
                    bgcolor:
                      getCardAccent(
                        item.estadoVisita,
                      ),
                  }}
                />

                <CardContent
                  sx={{
                    p: 1.75,

                    '&:last-child': {
                      pb: 1.75,
                    },
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 1.25,
                      height: '100%',
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent:
                          'space-between',
                        gap: 1,
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          minWidth: 0,
                        }}
                      >
                        <Avatar
                          sx={{
                            width: 36,
                            height: 36,
                            bgcolor:
                              getCardAccent(
                                item.estadoVisita,
                              ),
                          }}
                        >
                          {getVisitIcon(item)}
                        </Avatar>

                        <Box
                          sx={{
                            minWidth: 0,
                          }}
                        >
                          <Typography
                            component="p"
                            variant="subtitle2"
                            sx={{
                              fontWeight: 900,
                            }}
                          >
                            Caso #{item.callCenterRegistroId}
                          </Typography>

                          <Typography
                            component="p"
                            variant="caption"
                            color="text.secondary"
                          >
                            Visita #{item.id}
                          </Typography>
                        </Box>
                      </Box>

                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-end',
                          gap: 0.5,
                        }}
                      >
                        <Chip
                          size="small"
                          label={
                            formatLabel(
                              item.estadoVisita,
                            )
                          }
                          color={
                            getStatusColor(
                              item.estadoVisita,
                            )
                          }
                        />

                        {estadoCaso ? (
                          <Chip
                            size="small"
                            variant="outlined"
                            label={
                              formatLabel(
                                estadoCaso,
                              )
                            }
                            color={
                              getStatusColor(
                                estadoCaso,
                              )
                            }
                          />
                        ) : null}
                      </Box>
                    </Box>

                    <Divider />

                    <Box
                      sx={{
                        minWidth: 0,
                      }}
                    >
                      <Typography
                        component="p"
                        variant="subtitle2"
                        noWrap
                        sx={{
                          fontWeight: 900,
                        }}
                      >
                        {item.nombreCompleto
                          ?? 'Ciudadano sin nombre'}
                      </Typography>

                      <Typography
                        component="p"
                        variant="caption"
                        color="text.secondary"
                      >
                        C.C.{' '}
                        {item.cedulaSolicitante
                          ?? 'Sin cédula'}
                      </Typography>
                    </Box>

                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns:
                          'repeat(2, minmax(0, 1fr))',
                        gap: 1,
                      }}
                    >
                      <CompactInfoItem
                        icon={
                          <PhoneIcon fontSize="small" />
                        }
                        label="Teléfono"
                        value={
                          item.telefono
                          ?? 'Sin teléfono'
                        }
                      />

                      <CompactInfoItem
                        icon={
                          <CalendarMonthIcon fontSize="small" />
                        }
                        label="Programada"
                        value={
                          formatVisitSchedule(
                            item.fechaProgramada,
                            item.horaProgramada,
                          )
                        }
                      />
                    </Box>

                    <CompactInfoItem
                      icon={
                        <LocationOnIcon fontSize="small" />
                      }
                      label="Dirección"
                      value={
                        item.direccionTexto
                        ?? 'Sin dirección'
                      }
                    />

                    <CompactInfoItem
                      icon={
                        <HomeWorkIcon fontSize="small" />
                      }
                      label="Barrio / comuna"
                      value={
                        `${item.barrioNombre ?? 'Sin barrio'} / ${item.comunaNombre ?? 'Sin comuna'}`
                      }
                    />

                    {tipoSolicitud ? (
                      <CompactInfoItem
                        icon={
                          <AssignmentIndIcon fontSize="small" />
                        }
                        label="Solicitud"
                        value={
                          formatLabel(
                            tipoSolicitud,
                          )
                        }
                      />
                    ) : null}

                    {item.fechaReprogramacion ? (
                      <Alert
                        severity="warning"
                        icon={
                          <ReplayIcon fontSize="small" />
                        }
                        sx={{
                          py: 0.25,

                          '& .MuiAlert-message': {
                            py: 0.25,
                          },
                        }}
                      >
                        Nueva fecha:{' '}
                        <strong>
                          {formatDate(
                            item.fechaReprogramacion,
                          )}
                        </strong>
                      </Alert>
                    ) : null}

                    {item.motivoNoEncuesta ? (
                      <Box
                        sx={{
                          p: 1,
                          borderRadius: 1.5,
                          bgcolor:
                            'action.hover',
                        }}
                      >
                        <Typography
                          component="p"
                          variant="caption"
                          color="text.secondary"
                        >
                          Motivo registrado
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
                          {item.motivoNoEncuesta}
                        </Typography>
                      </Box>
                    ) : null}

                    {item.observacionEncuestador ? (
                      <Box
                        sx={{
                          p: 1,
                          borderRadius: 1.5,
                          bgcolor:
                            'action.hover',
                        }}
                      >
                        <Typography
                          component="p"
                          variant="caption"
                          color="text.secondary"
                        >
                          Observación
                        </Typography>

                        <Typography
                          component="p"
                          variant="body2"
                          sx={{
                            display:
                              '-webkit-box',

                            WebkitBoxOrient:
                              'vertical',

                            WebkitLineClamp:
                              2,

                            overflow:
                              'hidden',
                          }}
                        >
                          {item.observacionEncuestador}
                        </Typography>
                      </Box>
                    ) : null}

                    <Box
                      sx={{
                        mt: 'auto',
                        pt: 0.5,
                      }}
                    >
                      <Button
                        variant={
                          locked
                            ? 'outlined'
                            : 'contained'
                        }
                        color={
                          locked
                            ? 'inherit'
                            : 'primary'
                        }
                        startIcon={
                          locked
                            ? <CheckCircleIcon />
                            : reprogramada
                              ? <ReplayIcon />
                              : <FactCheckIcon />
                        }
                        onClick={() => {
                          handleOpenResultado(
                            item,
                          );
                        }}
                        disabled={locked}
                        fullWidth
                        size="small"
                      >
                        {locked
                          ? 'Caso finalizado'
                          : reprogramada
                            ? 'Actualizar resultado'
                            : 'Registrar resultado'}
                      </Button>

                      <Typography
                        component="p"
                        variant="caption"
                        color="text.secondary"
                        align="center"
                        sx={{
                          mt: 0.5,
                        }}
                      >
                        {locked
                          ? 'Solo disponible para consulta'
                          : reprogramada
                            ? 'Pendiente de la nueva visita'
                            : 'Completa el resultado de campo'}
                      </Typography>
                    </Box>
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
        onPageChange={(
          _,
          newPage,
        ) => {
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
        labelDisplayedRows={({
          from,
          to,
          count,
        }) =>
          `${from}-${to} de ${
            count !== -1
              ? count
              : `más de ${to}`
          }`
        }
      />

      <Dialog
        open={Boolean(selected)}
        onClose={() => {
          if (!saving) {
            handleCloseResultado();
          }
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle
          sx={{
            pb: 1,
          }}
        >
          <Typography
            component="span"
            variant="h6"
            sx={{
              fontWeight: 900,
            }}
          >
            Registrar resultado de visita
          </Typography>

          {selected ? (
            <Typography
              component="p"
              variant="body2"
              color="text.secondary"
            >
              Caso #{selected.callCenterRegistroId} ·{' '}
              {selected.nombreCompleto
                ?? 'Ciudadano sin nombre'}
            </Typography>
          ) : null}
        </DialogTitle>

        <DialogContent dividers>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              mt: 0.5,
            }}
          >
            {resultError ? (
              <Alert severity="error">
                {resultError}
              </Alert>
            ) : null}

            <Alert
              severity={
                resultImpact.severity
              }
            >
              <Typography
                component="p"
                variant="body2"
                sx={{
                  fontWeight: 900,
                }}
              >
                {resultImpact.title}
              </Typography>

              <Typography
                component="p"
                variant="caption"
              >
                {resultImpact.description}
              </Typography>
            </Alert>

            <FormControl
              size="small"
              fullWidth
            >
              <InputLabel>
                Resultado de la visita
              </InputLabel>

              <Select
                label="Resultado de la visita"
                value={form.estadoVisita}
                onChange={(event) => {
                  handleChangeEstadoVisita(
                    event.target
                      .value as CallCenterEstadoVisita,
                  );
                }}
              >
                {ESTADOS_VISITA.map(
                  (estado) => (
                    <MenuItem
                      key={estado}
                      value={estado}
                    >
                      {getResultadoOptionLabel(
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

                gap:
                  1.5,
              }}
            >
              <TextField
                label="Fecha de la gestión"
                type="date"
                value={
                  form.fechaVisitaReal
                  ?? ''
                }
                onChange={(event) => {
                  setForm((current) => ({
                    ...current,

                    fechaVisitaReal:
                      event.target.value
                      || null,
                  }));
                }}
                size="small"
                slotProps={{
                  inputLabel: {
                    shrink: true,
                  },
                }}
                fullWidth
              />

              <TextField
                label="Hora de la gestión"
                type="time"
                value={
                  form.horaVisitaReal
                  ?? ''
                }
                onChange={(event) => {
                  setForm((current) => ({
                    ...current,

                    horaVisitaReal:
                      event.target.value
                      || null,
                  }));
                }}
                size="small"
                slotProps={{
                  inputLabel: {
                    shrink: true,
                  },
                }}
                fullWidth
              />
            </Box>

            {form.estadoVisita !== 'REALIZADA' ? (
              <TextField
                label={
                  form.estadoVisita === 'REPROGRAMADA'
                    ? 'Motivo de la reprogramación'
                    : form.estadoVisita === 'CANCELADA'
                      ? 'Motivo de la cancelación'
                      : 'Motivo de visita no atendida'
                }
                value={
                  form.motivoNoEncuesta
                  ?? ''
                }
                onChange={(event) => {
                  setForm((current) => ({
                    ...current,

                    motivoNoEncuesta:
                      event.target.value,
                  }));
                }}
                required
                size="small"
                helperText="Este campo es obligatorio para continuar."
                fullWidth
              />
            ) : null}

            {form.estadoVisita === 'REPROGRAMADA' ? (
              <TextField
                label="Nueva fecha de la visita"
                type="date"
                value={
                  form.fechaReprogramacion
                  ?? ''
                }
                onChange={(event) => {
                  setForm((current) => ({
                    ...current,

                    fechaReprogramacion:
                      event.target.value
                      || null,
                  }));
                }}
                size="small"
                slotProps={{
                  inputLabel: {
                    shrink: true,
                  },
                }}
                required
                helperText="El caso permanecerá abierto para registrar el resultado de la nueva visita."
                fullWidth
              />
            ) : null}

            <TextField
              label="Observación del encuestador"
              value={
                form.observacionEncuestador
                ?? ''
              }
              onChange={(event) => {
                setForm((current) => ({
                  ...current,

                  observacionEncuestador:
                    event.target.value,
                }));
              }}
              multiline
              minRows={3}
              size="small"
              placeholder="Agrega información relevante del trabajo de campo."
              fullWidth
            />
          </Box>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            py: 2,
          }}
        >
          <Button
            onClick={
              handleCloseResultado
            }
            disabled={saving}
          >
            Cancelar
          </Button>

          <Button
            variant="contained"
            disabled={
              saving
              || (
                selected
                  ? isVisitLocked(
                    selected,
                  )
                  : false
              )
            }
            onClick={() => {
              void handleSaveResultado();
            }}
          >
            {saving
              ? 'Guardando...'
              : getResultadoSaveLabel(
                form.estadoVisita,
              )}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(error)}
        autoHideDuration={6000}
        onClose={() => {
          setError(null);
        }}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
      >
        <Alert
          severity="error"
          onClose={() => {
            setError(null);
          }}
        >
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={Boolean(success)}
        autoHideDuration={5000}
        onClose={() => {
          setSuccess(null);
        }}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
      >
        <Alert
          severity="success"
          onClose={() => {
            setSuccess(null);
          }}
        >
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
}

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2,
      }}
    >
      <CardContent
        sx={{
          p: 1.5,

          '&:last-child': {
            pb: 1.5,
          },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
          }}
        >
          <Typography
            component="p"
            variant="caption"
            color="text.secondary"
          >
            {label}
          </Typography>

          <Box
            sx={{
              width: 9,
              height: 9,
              borderRadius: '50%',
              bgcolor: color,
            }}
          />
        </Box>

        <Typography
          component="p"
          variant="h6"
          sx={{
            fontWeight: 900,
            lineHeight: 1.2,
          }}
        >
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

function CompactInfoItem({
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
        alignItems: 'flex-start',
        gap: 0.75,
        minWidth: 0,
      }}
    >
      {icon ? (
        <Box
          sx={{
            color: 'text.secondary',
            display: 'flex',
            mt: 0.1,

            '& svg': {
              fontSize: 17,
            },
          }}
        >
          {icon}
        </Box>
      ) : null}

      <Box
        sx={{
          minWidth: 0,
        }}
      >
        <Typography
          component="p"
          variant="caption"
          color="text.secondary"
          sx={{
            lineHeight: 1.2,
          }}
        >
          {label}
        </Typography>

        <Typography
          component="p"
          variant="body2"
          sx={{
            fontWeight: 700,
            lineHeight: 1.35,
            overflowWrap: 'anywhere',
          }}
        >
          {value}
        </Typography>
      </Box>
    </Box>
  );
}

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
    data.content
    ?? data.items
    ?? data.data
    ?? []
  );
}

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
    data.totalElements
    ?? data.totalItems
    ?? data.total
    ?? data.totalRecords
    ?? fallback
  );
}

function getOptionalStringField(
  item: CallCenterVisitaResponse,
  field: string,
) {
  const data =
    item as unknown as Record<
      string,
      unknown
    >;

  const value =
    data[field];

  if (
    typeof value !== 'string'
  ) {
    return null;
  }

  const trimmed =
    value.trim();

  return trimmed.length > 0
    ? trimmed
    : null;
}

function isVisitLocked(
  item: CallCenterVisitaResponse,
) {
  const estadoVisita =
    normalizeCode(
      item.estadoVisita,
    );

  const estadoCaso =
    normalizeCode(
      getOptionalStringField(
        item,
        'estadoCaso',
      ),
    );

  return (
    item.encuestaRealizada === true
    || estadoVisita === 'REALIZADA'
    || estadoVisita === 'NO_ATENDIDA'
    || estadoVisita === 'CANCELADA'
    || estadoCaso === 'CERRADO'
    || estadoCaso === 'CANCELADO'
  );
}

function getVisitIcon(
  item: CallCenterVisitaResponse,
) {
  const estadoVisita =
    normalizeCode(
      item.estadoVisita,
    );

  if (
    item.encuestaRealizada === true
    || estadoVisita === 'REALIZADA'
  ) {
    return (
      <CheckCircleIcon fontSize="small" />
    );
  }

  if (
    estadoVisita === 'CANCELADA'
  ) {
    return (
      <CancelIcon fontSize="small" />
    );
  }

  if (
    estadoVisita === 'REPROGRAMADA'
  ) {
    return (
      <ReplayIcon fontSize="small" />
    );
  }

  if (
    estadoVisita === 'NO_ATENDIDA'
  ) {
    return (
      <WarningAmberIcon fontSize="small" />
    );
  }

  if (
    estadoVisita === 'PROGRAMADA'
  ) {
    return (
      <ScheduleIcon fontSize="small" />
    );
  }

  return (
    <AssignmentIndIcon fontSize="small" />
  );
}

function getResultadoImpacto(
  estado: CallCenterEstadoVisita,
) {
  if (estado === 'REALIZADA') {
    return {
      severity: 'success' as const,
      title: 'La encuesta fue realizada',
      description:
        'Al guardar, la visita y el caso quedarán finalizados.',
    };
  }

  if (estado === 'NO_ATENDIDA') {
    return {
      severity: 'warning' as const,
      title: 'La visita no fue atendida',
      description:
        'Debes registrar el motivo. Al guardar, el caso quedará finalizado.',
    };
  }

  if (estado === 'CANCELADA') {
    return {
      severity: 'error' as const,
      title: 'La visita será cancelada',
      description:
        'Debes registrar el motivo. Al guardar, el caso quedará cancelado y finalizado.',
    };
  }

  return {
    severity: 'info' as const,
    title: 'La visita será reprogramada',
    description:
      'Debes seleccionar una nueva fecha. El caso continuará abierto.',
  };
}

function getResultadoOptionLabel(
  estado: CallCenterEstadoVisita,
) {
  if (estado === 'REALIZADA') {
    return 'Realizada — finaliza el caso';
  }

  if (estado === 'NO_ATENDIDA') {
    return 'No atendida — finaliza el caso';
  }

  if (estado === 'CANCELADA') {
    return 'Cancelada — cancela el caso';
  }

  return 'Reprogramada — mantiene el caso abierto';
}

function getResultadoSaveLabel(
  estado: CallCenterEstadoVisita,
) {
  return estado === 'REPROGRAMADA'
    ? 'Guardar reprogramación'
    : 'Guardar y finalizar caso';
}

function getCardAccent(
  value?: string | null,
) {
  const normalized =
    normalizeCode(value);

  if (normalized === 'REALIZADA') {
    return 'success.main';
  }

  if (normalized === 'NO_ATENDIDA') {
    return 'warning.main';
  }

  if (normalized === 'REPROGRAMADA') {
    return 'info.main';
  }

  if (normalized === 'CANCELADA') {
    return 'error.main';
  }

  if (normalized === 'PROGRAMADA') {
    return 'primary.main';
  }

  return 'grey.500';
}

function normalizeCode(
  value?: string | number | null,
) {
  return String(value ?? '')
    .trim()
    .toUpperCase();
}

function getErrorMessage(
  exception: unknown,
  fallback: string,
) {
  if (
    exception
    && typeof exception === 'object'
    && 'message' in exception
    && typeof exception.message === 'string'
  ) {
    return exception.message;
  }

  return fallback;
}

function formatLabel(
  value?: string | null,
) {
  return String(
    value ?? 'Sin estado',
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

function getStatusColor(
  value?: string | null,
): ChipColor {
  const normalized =
    normalizeCode(value);

  if (
    normalized.includes('REALIZADA')
    || normalized.includes('CERRADO')
  ) {
    return 'success';
  }

  if (
    normalized.includes('PENDIENTE')
    || normalized.includes('PROGRAMADA')
    || normalized.includes('ASIGNADO')
  ) {
    return 'info';
  }

  if (
    normalized.includes('REPROGRAMADA')
    || normalized.includes('NO_ATENDIDA')
  ) {
    return 'warning';
  }

  if (
    normalized.includes('CANCELADA')
    || normalized.includes('CANCELADO')
  ) {
    return 'error';
  }

  return 'default';
}

function getLocalDateISO(
  date = new Date(),
) {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1,
    ).padStart(2, '0');

  const day =
    String(
      date.getDate(),
    ).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getLocalTime(
  date = new Date(),
) {
  const hours =
    String(
      date.getHours(),
    ).padStart(2, '0');

  const minutes =
    String(
      date.getMinutes(),
    ).padStart(2, '0');

  return `${hours}:${minutes}`;
}

function formatDate(
  value?: string | null,
) {
  if (!value) {
    return 'Sin fecha';
  }

  const parts =
    value.split('-');

  if (parts.length !== 3) {
    return value;
  }

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function formatTime(
  value?: string | null,
) {
  if (!value) {
    return '';
  }

  return value.slice(0, 5);
}

function formatVisitSchedule(
  fecha?: string | null,
  hora?: string | null,
) {
  const date =
    formatDate(fecha);

  const time =
    formatTime(hora);

  return time
    ? `${date} · ${time}`
    : date;
}