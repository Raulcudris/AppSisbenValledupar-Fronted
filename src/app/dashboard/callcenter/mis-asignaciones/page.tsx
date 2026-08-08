'use client';

import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PhoneIcon from '@mui/icons-material/Phone';
import RefreshIcon from '@mui/icons-material/Refresh';
import ReplayIcon from '@mui/icons-material/Replay';
import ScheduleIcon from '@mui/icons-material/Schedule';
import SearchIcon from '@mui/icons-material/Search';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
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
  Paper,
  Select,
  Snackbar,
  TablePagination,
  TextField,
  Typography,
} from '@mui/material';

import {
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  canUpdateEncuestadorVisit,
  currentRole,
} from '@/lib/roleAccess';

import {
  getCallCenterEncuestadoresOptions,
} from '@/services/callcenter.service';

import {
  actualizarCallCenterResultadoVisita,
  getMisCallCenterVisitas,
} from '@/services/callcenter-workflow.service';

import type {
  SelectOption,
} from '@/types/catalog.types';

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

type ViewMode =
  | 'CARDS'
  | 'LIST';

type VisitaFilterState = {
  q: string;
  estadoVisita: string;
  condicion: string;
  fechaDesde: string;
  fechaHasta: string;
  encuestadorId: string;
};

type AssignmentItemProps = {
  item: CallCenterVisitaResponse;

  canUpdateResultado: boolean;

  onOpenResultado: (
    item: CallCenterVisitaResponse,
  ) => void;
};

const ESTADOS_VISITA:
  CallCenterEstadoVisita[] = [
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

const initialFilters:
  VisitaFilterState = {
    q: '',
    estadoVisita: 'TODOS',
    condicion: 'ABIERTAS',
    fechaDesde: '',
    fechaHasta: '',
    encuestadorId: '',
  };

const initialResultadoForm:
  CallCenterVisitaResultadoRequest = {
    estadoVisita:
      'REALIZADA',

    fechaVisitaReal:
      null,

    horaVisitaReal:
      null,

    encuestaRealizada:
      true,

    motivoNoEncuesta:
      '',

    fechaReprogramacion:
      null,

    observacionEncuestador:
      '',
  };

export default function PageMisAsignacionesCallCenter() {
  const role =
    currentRole();

  const canFilterByEncuestador =
    role === 'ADMIN'
    || role === 'COORDINADOR_CALLCENTER'
    || role === 'FUNCIONARIO_CALLCENTER';

  const canUpdateResultado =
    canUpdateEncuestadorVisit(
      role,
    );

  const [
    items,
    setItems,
  ] = useState<
    CallCenterVisitaResponse[]
  >([]);

  const [
    selected,
    setSelected,
  ] = useState<
    CallCenterVisitaResponse
    | null
  >(null);

  const [
    form,
    setForm,
  ] = useState<
    CallCenterVisitaResultadoRequest
  >(
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
  ] = useState(
    initialFilters
      .estadoVisita,
  );

  const [
    condicionFiltro,
    setCondicionFiltro,
  ] = useState(
    initialFilters
      .condicion,
  );

  const [
    fechaDesde,
    setFechaDesde,
  ] = useState('');

  const [
    fechaHasta,
    setFechaHasta,
  ] = useState('');

  const [
    encuestadorIdFiltro,
    setEncuestadorIdFiltro,
  ] = useState('');

  const [
    encuestadores,
    setEncuestadores,
  ] = useState<
    SelectOption[]
  >([]);

  const [
    loadingEncuestadores,
    setLoadingEncuestadores,
  ] = useState(false);

  const [
    appliedFilters,
    setAppliedFilters,
  ] = useState<
    VisitaFilterState
  >(
    initialFilters,
  );

  const [
    viewMode,
    setViewMode,
  ] = useState<
    ViewMode
  >(
    'CARDS',
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
  ] = useState<
    string | null
  >(null);

  const [
    resultError,
    setResultError,
  ] = useState<
    string | null
  >(null);

  const [
    success,
    setSuccess,
  ] = useState<
    string | null
  >(null);

  const visitasFinalizadas =
    useMemo(
      () =>
        items.filter(
          (item) =>
            isVisitLocked(
              item,
            ),
        ).length,
      [
        items,
      ],
    );

  const visitasAbiertas =
    useMemo(
      () =>
        items.filter(
          (item) =>
            !isVisitLocked(
              item,
            ),
        ).length,
      [
        items,
      ],
    );

  const hasActiveFilters =
    Boolean(
      searchText.trim()
      || estadoVisitaFiltro
        !== initialFilters
          .estadoVisita
      || condicionFiltro
        !== initialFilters
          .condicion
      || fechaDesde
      || fechaHasta
      || (
        canFilterByEncuestador
        && encuestadorIdFiltro
      ),
    );

  const resultImpact =
    getResultadoImpacto(
      form.estadoVisita,
    );

  useEffect(() => {
    if (
      !canFilterByEncuestador
    ) {
      setEncuestadores(
        [],
      );

      setEncuestadorIdFiltro(
        '',
      );

      return;
    }

    let active =
      true;

    async function loadEncuestadores() {
      try {
        setLoadingEncuestadores(
          true,
        );

        const response =
          await getCallCenterEncuestadoresOptions();

        if (!active) {
          return;
        }

        setEncuestadores(
          response,
        );
      } catch (
        exception
      ) {
        if (!active) {
          return;
        }

        setError(
          getErrorMessage(
            exception,
            'No fue posible cargar el catálogo de encuestadores.',
          ),
        );
      } finally {
        if (active) {
          setLoadingEncuestadores(
            false,
          );
        }
      }
    }

    void loadEncuestadores();

    return () => {
      active =
        false;
    };
  }, [
    canFilterByEncuestador,
  ]);

  async function loadData(
    nextPage =
      page,

    nextSize =
      size,

    filters =
      appliedFilters,
  ) {
    try {
      setLoading(
        true,
      );

      setError(
        null,
      );

      const response =
        await getMisCallCenterVisitas(
          nextPage,
          nextSize,
          {
            q:
              filters.q,

            estadoVisita:
              filters
                .estadoVisita,

            condicion:
              filters
                .condicion,

            fechaDesde:
              filters
                .fechaDesde,

            fechaHasta:
              filters
                .fechaHasta,

            encuestadorId:
              canFilterByEncuestador
              && filters
                .encuestadorId
                ? Number(
                  filters
                    .encuestadorId,
                )
                : undefined,
          },
        );

      const content =
        getPageContent<
          CallCenterVisitaResponse
        >(
          response,
        );

      setItems(
        content,
      );

      setTotal(
        getTotalElements(
          response,
          content.length,
        ),
      );
    } catch (
      exception
    ) {
      setError(
        getErrorMessage(
          exception,
          'No fue posible cargar las asignaciones.',
        ),
      );
    } finally {
      setLoading(
        false,
      );
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
    const nextFilters:
      VisitaFilterState = {
        q:
          searchText
            .trim(),

        estadoVisita:
          estadoVisitaFiltro,

        condicion:
          condicionFiltro,

        fechaDesde,

        fechaHasta,

        encuestadorId:
          canFilterByEncuestador
            ? encuestadorIdFiltro
            : '',
      };

    setPage(
      0,
    );

    setAppliedFilters(
      nextFilters,
    );
  }

  function clearFilters() {
    setSearchText(
      '',
    );

    setEstadoVisitaFiltro(
      initialFilters
        .estadoVisita,
    );

    setCondicionFiltro(
      initialFilters
        .condicion,
    );

    setFechaDesde(
      '',
    );

    setFechaHasta(
      '',
    );

    setEncuestadorIdFiltro(
      '',
    );

    setPage(
      0,
    );

    setAppliedFilters(
      initialFilters,
    );
  }

  function selectAssignmentView(
    condicion:
      | 'ABIERTAS'
      | 'FINALIZADAS',
  ) {
    const nextFilters:
      VisitaFilterState = {
        ...appliedFilters,
        condicion,
      };

    setCondicionFiltro(
      condicion,
    );

    setPage(
      0,
    );

    setAppliedFilters(
      nextFilters,
    );
  }

  function handleOpenResultado(
    item:
      CallCenterVisitaResponse,
  ) {
    if (
      !canUpdateResultado
    ) {
      setError(
        'Tu perfil tiene acceso de consulta y no puede registrar resultados de visita.',
      );

      return;
    }

    if (
      isVisitLocked(
        item,
      )
    ) {
      setError(
        'Esta visita ya está finalizada o pertenece a un caso cerrado o cancelado.',
      );

      return;
    }

    const now =
      new Date();

    setSelected(
      item,
    );

    setResultError(
      null,
    );

    setForm({
      estadoVisita:
        'REALIZADA',

      fechaVisitaReal:
        getLocalDateISO(
          now,
        ),

      horaVisitaReal:
        getLocalTime(
          now,
        ),

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
    setSelected(
      null,
    );

    setResultError(
      null,
    );

    setForm(
      initialResultadoForm,
    );
  }

  function handleChangeEstadoVisita(
    estado:
      CallCenterEstadoVisita,
  ) {
    setResultError(
      null,
    );

    setForm(
      (current) => ({
        ...current,

        estadoVisita:
          estado,

        encuestaRealizada:
          estado
            === 'REALIZADA',

        motivoNoEncuesta:
          estado
            === 'REALIZADA'
            ? ''
            : current
              .motivoNoEncuesta,

        fechaReprogramacion:
          estado
            === 'REPROGRAMADA'
            ? current
              .fechaReprogramacion
            : null,
      }),
    );
  }

  async function handleSaveResultado() {
    if (
      !selected
    ) {
      return;
    }

    if (
      !canUpdateResultado
    ) {
      setResultError(
        'Tu perfil no tiene permiso para registrar resultados de visita.',
      );

      return;
    }

    setResultError(
      null,
    );

    if (
      isVisitLocked(
        selected,
      )
    ) {
      setResultError(
        'Esta visita ya está finalizada o pertenece a un caso cerrado o cancelado.',
      );

      return;
    }

    if (
      form.estadoVisita
        !== 'REALIZADA'
      && !form
        .motivoNoEncuesta
        ?.trim()
    ) {
      setResultError(
        'Debes registrar el motivo cuando la visita no queda realizada.',
      );

      return;
    }

    if (
      form.estadoVisita
        === 'REPROGRAMADA'
      && !form
        .fechaReprogramacion
    ) {
      setResultError(
        'Debes seleccionar la nueva fecha de la visita.',
      );

      return;
    }

    try {
      setSaving(
        true,
      );

      await actualizarCallCenterResultadoVisita(
        selected.id,
        form,
      );

      const reprogramada =
        form.estadoVisita
        === 'REPROGRAMADA';

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
    } catch (
      exception
    ) {
      setResultError(
        getErrorMessage(
          exception,
          'No fue posible actualizar el resultado de la visita.',
        ),
      );
    } finally {
      setSaving(
        false,
      );
    }
  }

  if (
    loading
    && items.length
      === 0
  ) {
    return (
      <Box
        sx={{
          minHeight:
            320,

          display:
            'flex',

          alignItems:
            'center',

          justifyContent:
            'center',

          flexDirection:
            'column',

          gap:
            2,
        }}
      >
        <CircularProgress />

        <Typography
          component="p"
          color="text.secondary"
        >
          Cargando asignaciones...
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display:
          'flex',

        flexDirection:
          'column',

        gap:
          2.5,
      }}
    >
      <Box
        sx={{
          display:
            'flex',

          flexDirection: {
            xs:
              'column',

            md:
              'row',
          },

          justifyContent:
            'space-between',

          alignItems: {
            xs:
              'stretch',

            md:
              'center',
          },

          gap:
            2,
        }}
      >
        <Box>
          <Typography
            component="h1"
            variant="h5"
            sx={{
              fontWeight:
                900,
            }}
          >
            Mis asignaciones
          </Typography>

          <Typography
            component="p"
            variant="body2"
            color="text.secondary"
            sx={{
              mt:
                0.5,
            }}
          >
            Consulta las visitas asignadas, su programación
            y el estado del trabajo de campo.
          </Typography>
        </Box>

        <Box
          sx={{
            display:
              'flex',

            alignItems:
              'center',

            gap:
              1,

            flexWrap:
              'wrap',
          }}
        >
          <Button
            variant={
              appliedFilters
                .condicion
                === 'ABIERTAS'
                ? 'contained'
                : 'outlined'
            }
            size="small"
            onClick={() => {
              selectAssignmentView(
                'ABIERTAS',
              );
            }}
          >
            Pendientes
          </Button>

          <Button
            variant={
              appliedFilters
                .condicion
                === 'FINALIZADAS'
                ? 'contained'
                : 'outlined'
            }
            size="small"
            onClick={() => {
              selectAssignmentView(
                'FINALIZADAS',
              );
            }}
          >
            Historial
          </Button>

          <Button
            variant="outlined"
            size="small"
            startIcon={
              <RefreshIcon />
            }
            onClick={
              refresh
            }
            disabled={
              loading
            }
          >
            Actualizar
          </Button>
        </Box>
      </Box>

      {!canUpdateResultado ? (
        <Alert
          severity="info"
        >
          Tu perfil tiene acceso de consulta. La actualización
          del resultado de una visita permanece restringida a
          los perfiles autorizados.
        </Alert>
      ) : null}

      <Box
        sx={{
          display:
            'grid',

          gridTemplateColumns: {
            xs:
              '1fr',

            sm:
              'repeat(3, minmax(0, 1fr))',
          },

          gap:
            1.5,
        }}
      >
        <SummaryCard
          label="Visitas cargadas"
          value={
            items.length
          }
        />

        <SummaryCard
          label="Abiertas"
          value={
            visitasAbiertas
          }
        />

        <SummaryCard
          label="Finalizadas"
          value={
            visitasFinalizadas
          }
        />
      </Box>

      <Card
        variant="outlined"
      >
        <CardContent>
          <Box
            sx={{
              display:
                'flex',

              flexDirection:
                'column',

              gap:
                2,
            }}
          >
            <Box
              sx={{
                display:
                  'flex',

                flexDirection: {
                  xs:
                    'column',

                  sm:
                    'row',
                },

                justifyContent:
                  'space-between',

                gap:
                  1,
              }}
            >
              <Box>
                <Typography
                  component="h2"
                  variant="h6"
                  sx={{
                    fontWeight:
                      900,
                  }}
                >
                  Filtros de búsqueda
                </Typography>

                <Typography
                  component="p"
                  variant="body2"
                  color="text.secondary"
                >
                  Selecciona los criterios y pulsa Buscar.
                </Typography>
              </Box>

              <Box
                sx={{
                  display:
                    'flex',

                  gap:
                    0.5,
                }}
              >
                <Button
                  size="small"
                  variant={
                    viewMode
                      === 'CARDS'
                      ? 'contained'
                      : 'outlined'
                  }
                  startIcon={
                    <ViewModuleIcon />
                  }
                  onClick={() => {
                    setViewMode(
                      'CARDS',
                    );
                  }}
                >
                  Tarjetas
                </Button>

                <Button
                  size="small"
                  variant={
                    viewMode
                      === 'LIST'
                      ? 'contained'
                      : 'outlined'
                  }
                  startIcon={
                    <ViewListIcon />
                  }
                  onClick={() => {
                    setViewMode(
                      'LIST',
                    );
                  }}
                >
                  Lista
                </Button>
              </Box>
            </Box>

            <Divider />

            <Box
              sx={{
                display:
                  'grid',

                gridTemplateColumns: {
                  xs:
                    '1fr',

                  md:
                    '2fr 1fr 1fr',

                  xl:
                    canFilterByEncuestador
                      ? '2fr 1fr 1fr 1.4fr 1fr 1fr'
                      : '2fr 1fr 1fr 1fr 1fr',
                },

                gap:
                  1.5,
              }}
            >
              <TextField
                label="Buscar ciudadano o caso"
                value={
                  searchText
                }
                onChange={(event) => {
                  setSearchText(
                    event.target
                      .value,
                  );
                }}
                placeholder="Nombre, cédula, teléfono, barrio, dirección o caso"
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
                  value={
                    estadoVisitaFiltro
                  }
                  onChange={(event) => {
                    setEstadoVisitaFiltro(
                      String(
                        event.target
                          .value,
                      ),
                    );
                  }}
                >
                  <MenuItem
                    value="TODOS"
                  >
                    Todos
                  </MenuItem>

                  {ESTADOS_VISITA_FILTRO.map(
                    (
                      estado,
                    ) => (
                      <MenuItem
                        key={
                          estado
                        }
                        value={
                          estado
                        }
                      >
                        {formatLabel(
                          estado,
                        )}
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
                  value={
                    condicionFiltro
                  }
                  onChange={(event) => {
                    setCondicionFiltro(
                      String(
                        event.target
                          .value,
                      ),
                    );
                  }}
                >
                  <MenuItem
                    value="TODAS"
                  >
                    Todas
                  </MenuItem>

                  <MenuItem
                    value="ABIERTAS"
                  >
                    Abiertas
                  </MenuItem>

                  <MenuItem
                    value="FINALIZADAS"
                  >
                    Finalizadas
                  </MenuItem>

                  <MenuItem
                    value="CERRADO"
                  >
                    Caso cerrado
                  </MenuItem>

                  <MenuItem
                    value="CANCELADO"
                  >
                    Caso cancelado
                  </MenuItem>
                </Select>
              </FormControl>

              {canFilterByEncuestador ? (
                <FormControl
                  size="small"
                  fullWidth
                  disabled={
                    loadingEncuestadores
                  }
                >
                  <InputLabel>
                    Encuestador
                  </InputLabel>

                  <Select
                    label="Encuestador"
                    value={
                      encuestadorIdFiltro
                    }
                    onChange={(event) => {
                      setEncuestadorIdFiltro(
                        String(
                          event.target
                            .value,
                        ),
                      );
                    }}
                  >
                    <MenuItem
                      value=""
                    >
                      Todos los encuestadores
                    </MenuItem>

                    {encuestadores.map(
                      (
                        encuestador,
                      ) => (
                        <MenuItem
                          key={
                            encuestador.id
                          }
                          value={
                            String(
                              encuestador.id,
                            )
                          }
                        >
                          {encuestador.label}
                        </MenuItem>
                      ),
                    )}
                  </Select>
                </FormControl>
              ) : null}

              <TextField
                label="Fecha desde"
                type="date"
                value={
                  fechaDesde
                }
                onChange={(event) => {
                  setFechaDesde(
                    event.target
                      .value,
                  );
                }}
                size="small"
                slotProps={{
                  inputLabel: {
                    shrink:
                      true,
                  },
                }}
                fullWidth
              />

              <TextField
                label="Fecha hasta"
                type="date"
                value={
                  fechaHasta
                }
                onChange={(event) => {
                  setFechaHasta(
                    event.target
                      .value,
                  );
                }}
                size="small"
                slotProps={{
                  inputLabel: {
                    shrink:
                      true,
                  },
                }}
                fullWidth
              />
            </Box>

            <Box
              sx={{
                display:
                  'flex',

                flexDirection: {
                  xs:
                    'column',

                  sm:
                    'row',
                },

                justifyContent:
                  'space-between',

                alignItems: {
                  xs:
                    'stretch',

                  sm:
                    'center',
                },

                gap:
                  1,
              }}
            >
              <Typography
                component="p"
                variant="body2"
                color="text.secondary"
              >
                {loading
                  ? 'Buscando visitas...'
                  : `Mostrando ${items.length} de ${total} visita(s).`}
              </Typography>

              <Box
                sx={{
                  display:
                    'flex',

                  flexDirection: {
                    xs:
                      'column',

                    sm:
                      'row',
                  },

                  gap:
                    1,
                }}
              >
                <Button
                  variant="contained"
                  size="small"
                  startIcon={
                    <SearchIcon />
                  }
                  onClick={
                    handleSearch
                  }
                  disabled={
                    loading
                  }
                >
                  Buscar
                </Button>

                <Button
                  variant="text"
                  size="small"
                  startIcon={
                    <FilterAltOffIcon />
                  }
                  onClick={
                    clearFilters
                  }
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

      {items.length
        === 0 ? (
        <Alert
          severity="info"
        >
          No hay visitas con los filtros aplicados.
        </Alert>
      ) : (
        <Box
          sx={{
            display:
              viewMode
                === 'CARDS'
                ? 'grid'
                : 'flex',

            flexDirection:
              viewMode
                === 'LIST'
                ? 'column'
                : undefined,

            gridTemplateColumns:
              viewMode
                === 'CARDS'
                ? {
                  xs:
                    '1fr',

                  md:
                    'repeat(2, minmax(0, 1fr))',

                  lg:
                    'repeat(3, minmax(0, 1fr))',

                  xl:
                    'repeat(4, minmax(0, 1fr))',
                }
                : undefined,

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
          {items.map(
            (
              item,
            ) =>
              viewMode
                === 'CARDS'
                ? (
                  <AssignmentCard
                    key={
                      item.id
                    }
                    item={
                      item
                    }
                    canUpdateResultado={
                      canUpdateResultado
                    }
                    onOpenResultado={
                      handleOpenResultado
                    }
                  />
                )
                : (
                  <AssignmentListItem
                    key={
                      item.id
                    }
                    item={
                      item
                    }
                    canUpdateResultado={
                      canUpdateResultado
                    }
                    onOpenResultado={
                      handleOpenResultado
                    }
                  />
                ),
          )}
        </Box>
      )}

      <TablePagination
        component="div"
        count={
          total
        }
        page={
          page
        }
        rowsPerPage={
          size
        }
        onPageChange={(
          _,
          newPage,
        ) => {
          setPage(
            newPage,
          );
        }}
        onRowsPerPageChange={(event) => {
          setSize(
            Number(
              event.target
                .value,
            ),
          );

          setPage(
            0,
          );
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
        open={
          Boolean(
            selected,
          )
        }
        onClose={() => {
          if (
            !saving
          ) {
            handleCloseResultado();
          }
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle
          sx={{
            pb:
              1,
          }}
        >
          <Typography
            component="span"
            variant="h6"
            sx={{
              fontWeight:
                900,
            }}
          >
            {selected
            && normalizeCode(
              selected
                .estadoVisita,
            )
              === 'REPROGRAMADA'
              ? 'Registrar resultado de visita reprogramada'
              : 'Registrar resultado de visita'}
          </Typography>

          {selected ? (
            <Typography
              component="p"
              variant="body2"
              color="text.secondary"
            >
              Caso #{selected.callCenterRegistroId}
              {' · '}
              {selected.nombreCompleto
                ?? 'Ciudadano sin nombre'}
            </Typography>
          ) : null}
        </DialogTitle>

        <DialogContent
          dividers
        >
          <Box
            sx={{
              display:
                'flex',

              flexDirection:
                'column',

              gap:
                2,

              mt:
                0.5,
            }}
          >
            {resultError ? (
              <Alert
                severity="error"
              >
                {resultError}
              </Alert>
            ) : null}

            <Alert
              severity={
                resultImpact
                  .severity
              }
            >
              <Typography
                component="p"
                variant="body2"
                sx={{
                  fontWeight:
                    900,
                }}
              >
                {resultImpact
                  .title}
              </Typography>

              <Typography
                component="p"
                variant="caption"
              >
                {resultImpact
                  .description}
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
                value={
                  form.estadoVisita
                }
                onChange={(event) => {
                  handleChangeEstadoVisita(
                    event.target
                      .value as CallCenterEstadoVisita,
                  );
                }}
              >
                {ESTADOS_VISITA.map(
                  (
                    estado,
                  ) => (
                    <MenuItem
                      key={
                        estado
                      }
                      value={
                        estado
                      }
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
                display:
                  'grid',

                gridTemplateColumns: {
                  xs:
                    '1fr',

                  sm:
                    'repeat(2, minmax(0, 1fr))',
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
                  setForm(
                    (
                      current,
                    ) => ({
                      ...current,

                      fechaVisitaReal:
                        event.target
                          .value
                        || null,
                    }),
                  );
                }}
                size="small"
                slotProps={{
                  inputLabel: {
                    shrink:
                      true,
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
                  setForm(
                    (
                      current,
                    ) => ({
                      ...current,

                      horaVisitaReal:
                        event.target
                          .value
                        || null,
                    }),
                  );
                }}
                size="small"
                slotProps={{
                  inputLabel: {
                    shrink:
                      true,
                  },
                }}
                fullWidth
              />
            </Box>

            {form.estadoVisita
              !== 'REALIZADA' ? (
              <TextField
                label={
                  form.estadoVisita
                    === 'REPROGRAMADA'
                    ? 'Motivo de la reprogramación'
                    : form.estadoVisita
                      === 'CANCELADA'
                      ? 'Motivo de la cancelación'
                      : 'Motivo de visita no atendida'
                }
                value={
                  form.motivoNoEncuesta
                  ?? ''
                }
                onChange={(event) => {
                  setForm(
                    (
                      current,
                    ) => ({
                      ...current,

                      motivoNoEncuesta:
                        event.target
                          .value,
                    }),
                  );
                }}
                required
                size="small"
                helperText="Este campo es obligatorio para continuar."
                fullWidth
              />
            ) : null}

            {form.estadoVisita
              === 'REPROGRAMADA' ? (
              <TextField
                label="Nueva fecha de la visita"
                type="date"
                value={
                  form.fechaReprogramacion
                  ?? ''
                }
                onChange={(event) => {
                  setForm(
                    (
                      current,
                    ) => ({
                      ...current,

                      fechaReprogramacion:
                        event.target
                          .value
                        || null,
                    }),
                  );
                }}
                size="small"
                slotProps={{
                  inputLabel: {
                    shrink:
                      true,
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
                setForm(
                  (
                    current,
                  ) => ({
                    ...current,

                    observacionEncuestador:
                      event.target
                        .value,
                  }),
                );
              }}
              multiline
              minRows={
                3
              }
              size="small"
              placeholder="Agrega información relevante del trabajo de campo."
              fullWidth
            />
          </Box>
        </DialogContent>

        <DialogActions
          sx={{
            px:
              3,

            py:
              2,
          }}
        >
          <Button
            onClick={
              handleCloseResultado
            }
            disabled={
              saving
            }
          >
            Cancelar
          </Button>

          <Button
            variant="contained"
            disabled={
              saving
              || !canUpdateResultado
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
        open={
          Boolean(
            error,
          )
        }
        autoHideDuration={
          6000
        }
        onClose={() => {
          setError(
            null,
          );
        }}
        anchorOrigin={{
          vertical:
            'bottom',

          horizontal:
            'right',
        }}
      >
        <Alert
          severity="error"
          onClose={() => {
            setError(
              null,
            );
          }}
        >
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={
          Boolean(
            success,
          )
        }
        autoHideDuration={
          5000
        }
        onClose={() => {
          setSuccess(
            null,
          );
        }}
        anchorOrigin={{
          vertical:
            'bottom',

          horizontal:
            'right',
        }}
      >
        <Alert
          severity="success"
          onClose={() => {
            setSuccess(
              null,
            );
          }}
        >
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
}

function AssignmentCard({
  item,
  canUpdateResultado,
  onOpenResultado,
}: AssignmentItemProps) {
  const locked =
    isVisitLocked(
      item,
    );

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
    )
    === 'REPROGRAMADA';

  return (
    <Card
      variant="outlined"
      sx={{
        position:
          'relative',

        overflow:
          'hidden',

        height:
          '100%',

        borderRadius:
          2.5,

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
          theme.transitions
            .create(
              [
                'transform',
                'box-shadow',
                'border-color',
              ],
              {
                duration:
                  theme
                    .transitions
                    .duration
                    .short,
              },
            ),

        '&:hover': {
          transform:
            'translateY(-3px)',

          boxShadow:
            4,

          borderColor:
            getCardAccent(
              item.estadoVisita,
            ),
        },
      }}
    >
      <Box
        sx={{
          height:
            4,

          bgcolor:
            getCardAccent(
              item.estadoVisita,
            ),
        }}
      />

      <CardContent
        sx={{
          p:
            1.75,

          '&:last-child': {
            pb:
              1.75,
          },
        }}
      >
        <Box
          sx={{
            display:
              'flex',

            flexDirection:
              'column',

            gap:
              1.25,

            height:
              '100%',
          }}
        >
          <Box
            sx={{
              display:
                'flex',

              justifyContent:
                'space-between',

              alignItems:
                'flex-start',

              gap:
                1,
            }}
          >
            <Box
              sx={{
                display:
                  'flex',

                alignItems:
                  'center',

                gap:
                  1,

                minWidth:
                  0,
              }}
            >
              <Avatar
                sx={{
                  width:
                    38,

                  height:
                    38,

                  bgcolor:
                    getCardAccent(
                      item.estadoVisita,
                    ),
                }}
              >
                {getVisitIcon(
                  item,
                )}
              </Avatar>

              <Box
                sx={{
                  minWidth:
                    0,
                }}
              >
                <Typography
                  component="p"
                  variant="subtitle2"
                  sx={{
                    fontWeight:
                      900,
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

            <Chip
              size="small"
              label={
                formatLabel(
                  item.estadoVisita,
                )
              }
              color={
                getStatusColor(
                  String(
                    item.estadoVisita,
                  ),
                )
              }
              variant="outlined"
            />
          </Box>

          <Box>
            <Typography
              component="p"
              variant="subtitle2"
              sx={{
                fontWeight:
                  900,
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

          <Divider />

          <Box
            sx={{
              display:
                'flex',

              flexDirection:
                'column',

              gap:
                1,
            }}
          >
            <InfoItem
              icon={
                <AssignmentIndIcon fontSize="small" />
              }
              label="Encuestador"
              value={
                item.encuestadorNombre
                ?? 'Sin encuestador'
              }
            />

            <InfoItem
              icon={
                <PhoneIcon fontSize="small" />
              }
              label="Teléfono"
              value={
                item.telefono
                ?? 'Sin teléfono'
              }
            />

            <InfoItem
              icon={
                <LocationOnIcon fontSize="small" />
              }
              label="Dirección"
              value={
                item.direccionTexto
                ?? 'Sin dirección'
              }
            />

            <InfoItem
              icon={
                <HomeWorkIcon fontSize="small" />
              }
              label="Barrio / Comuna"
              value={
                `${
                  item.barrioNombre
                  ?? 'Sin barrio'
                } / ${
                  item.comunaNombre
                  ?? 'Sin comuna'
                }`
              }
            />

            <InfoItem
              icon={
                <CalendarMonthIcon fontSize="small" />
              }
              label="Fecha programada"
              value={
                `${
                  item.fechaProgramada
                  ?? 'Sin fecha'
                } ${
                  item.horaProgramada
                  ?? ''
                }`.trim()
              }
            />
          </Box>

          {tipoSolicitud ? (
            <Chip
              size="small"
              variant="outlined"
              label={
                formatLabel(
                  tipoSolicitud,
                )
              }
            />
          ) : null}

          {estadoCaso ? (
            <Typography
              component="p"
              variant="caption"
              color="text.secondary"
            >
              Estado caso:{' '}
              <strong>
                {formatLabel(
                  estadoCaso,
                )}
              </strong>
            </Typography>
          ) : null}

          {item.fechaReprogramacion ? (
            <Alert
              severity="info"
              sx={{
                py:
                  0.25,
              }}
            >
              Nueva fecha:{' '}
              <strong>
                {item.fechaReprogramacion}
              </strong>
            </Alert>
          ) : null}

          {item.motivoNoEncuesta ? (
            <Box
              sx={{
                p:
                  1,

                borderRadius:
                  1.5,

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
                  fontWeight:
                    700,

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
                p:
                  1,

                borderRadius:
                  1.5,

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
              >
                {item.observacionEncuestador}
              </Typography>
            </Box>
          ) : null}

          <Box
            sx={{
              mt:
                'auto',

              pt:
                0.5,
            }}
          >
            {locked ? (
              <Alert
                severity={
                  normalizeCode(
                    item.estadoVisita,
                  )
                  === 'CANCELADA'
                    ? 'error'
                    : 'info'
                }
                icon={
                  <CheckCircleIcon fontSize="small" />
                }
                sx={{
                  py:
                    0.25,
                }}
              >
                Visita finalizada. Disponible únicamente para
                consulta.
              </Alert>
            ) : !canUpdateResultado ? (
              <Alert
                severity="info"
                sx={{
                  py:
                    0.25,
                }}
              >
                Consulta únicamente. Tu perfil no registra
                resultados de visita.
              </Alert>
            ) : (
              <>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={
                    reprogramada
                      ? <ReplayIcon />
                      : <FactCheckIcon />
                  }
                  onClick={() => {
                    onOpenResultado(
                      item,
                    );
                  }}
                  fullWidth
                  size="small"
                >
                  {reprogramada
                    ? 'Registrar resultado de nueva visita'
                    : 'Registrar resultado'}
                </Button>

                <Typography
                  component="p"
                  variant="caption"
                  color="text.secondary"
                  align="center"
                  sx={{
                    mt:
                      0.5,
                  }}
                >
                  {reprogramada
                    ? 'Pendiente de la fecha reprogramada'
                    : 'Completa el resultado del trabajo de campo'}
                </Typography>
              </>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

function AssignmentListItem({
  item,
  canUpdateResultado,
  onOpenResultado,
}: AssignmentItemProps) {
  const locked =
    isVisitLocked(
      item,
    );

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
    )
    === 'REPROGRAMADA';

  return (
    <Paper
      variant="outlined"
      sx={{
        p: {
          xs:
            1.5,

          md:
            2,
        },

        borderRadius:
          2,

        borderLeftWidth:
          5,

        borderLeftStyle:
          'solid',

        borderLeftColor:
          getCardAccent(
            item.estadoVisita,
          ),

        bgcolor:
          locked
            ? 'action.hover'
            : 'background.paper',
      }}
    >
      <Box
        sx={{
          display:
            'grid',

          gridTemplateColumns: {
            xs:
              '1fr',

            md:
              'minmax(210px, 1.1fr) minmax(190px, 0.9fr) minmax(260px, 1.4fr) minmax(210px, auto)',
          },

          alignItems: {
            xs:
              'stretch',

            md:
              'center',
          },

          gap:
            2,
        }}
      >
        <Box
          sx={{
            display:
              'flex',

            alignItems:
              'center',

            gap:
              1.25,

            minWidth:
              0,
          }}
        >
          <Avatar
            sx={{
              width:
                42,

              height:
                42,

              bgcolor:
                getCardAccent(
                  item.estadoVisita,
                ),
            }}
          >
            {getVisitIcon(
              item,
            )}
          </Avatar>

          <Box
            sx={{
              minWidth:
                0,
            }}
          >
            <Typography
              component="p"
              variant="subtitle2"
              sx={{
                fontWeight:
                  900,
              }}
            >
              Caso #{item.callCenterRegistroId}
            </Typography>

            <Typography
              component="p"
              variant="body2"
              sx={{
                fontWeight:
                  800,
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
        </Box>

        <Box
          sx={{
            display:
              'flex',

            flexDirection:
              'column',

            gap:
              0.75,
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
                String(
                  item.estadoVisita,
                ),
              )
            }
            variant="outlined"
            sx={{
              width:
                'fit-content',
            }}
          />

          {estadoCaso ? (
            <Typography
              component="p"
              variant="caption"
              color="text.secondary"
            >
              {formatLabel(
                estadoCaso,
              )}
            </Typography>
          ) : null}

          {tipoSolicitud ? (
            <Typography
              component="p"
              variant="caption"
              color="text.secondary"
            >
              {formatLabel(
                tipoSolicitud,
              )}
            </Typography>
          ) : null}
        </Box>

        <Box
          sx={{
            display:
              'grid',

            gridTemplateColumns: {
              xs:
                '1fr',

              sm:
                'repeat(2, minmax(0, 1fr))',
            },

            gap:
              1,
          }}
        >
          <InfoItem
            icon={
              <AssignmentIndIcon fontSize="small" />
            }
            label="Encuestador"
            value={
              item.encuestadorNombre
              ?? 'Sin encuestador'
            }
          />

          <InfoItem
            icon={
              <PhoneIcon fontSize="small" />
            }
            label="Teléfono"
            value={
              item.telefono
              ?? 'Sin teléfono'
            }
          />

          <InfoItem
            icon={
              <LocationOnIcon fontSize="small" />
            }
            label="Dirección"
            value={
              item.direccionTexto
              ?? 'Sin dirección'
            }
          />

          <InfoItem
            icon={
              <CalendarMonthIcon fontSize="small" />
            }
            label="Programación"
            value={
              `${
                item.fechaProgramada
                ?? 'Sin fecha'
              } ${
                item.horaProgramada
                ?? ''
              }`.trim()
            }
          />
        </Box>

        <Box>
          {locked ? (
            <Alert
              severity={
                normalizeCode(
                  item.estadoVisita,
                )
                === 'CANCELADA'
                  ? 'error'
                  : 'info'
              }
              sx={{
                py:
                  0.25,
              }}
            >
              Visita finalizada.
            </Alert>
          ) : !canUpdateResultado ? (
            <Alert
              severity="info"
              sx={{
                py:
                  0.25,
              }}
            >
              Solo consulta.
            </Alert>
          ) : (
            <Button
              variant="contained"
              size="small"
              startIcon={
                reprogramada
                  ? <ReplayIcon />
                  : <FactCheckIcon />
              }
              onClick={() => {
                onOpenResultado(
                  item,
                );
              }}
              fullWidth
            >
              {reprogramada
                ? 'Registrar nueva visita'
                : 'Registrar resultado'}
            </Button>
          )}
        </Box>
      </Box>
    </Paper>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label:
    string;

  value:
    number;
}) {
  return (
    <Card
      variant="outlined"
    >
      <CardContent>
        <Typography
          component="p"
          variant="caption"
          color="text.secondary"
        >
          {label}
        </Typography>

        <Typography
          component="p"
          variant="h5"
          sx={{
            fontWeight:
              900,
          }}
        >
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

function InfoItem({
  label,
  value,
  icon,
}: {
  label:
    string;

  value:
    string;

  icon?:
    ReactNode;
}) {
  return (
    <Box
      sx={{
        display:
          'flex',

        gap:
          1,

        alignItems:
          'flex-start',

        minWidth:
          0,
      }}
    >
      {icon ? (
        <Box
          sx={{
            color:
              'text.secondary',

            mt:
              0.2,
          }}
        >
          {icon}
        </Box>
      ) : null}

      <Box
        sx={{
          minWidth:
            0,
        }}
      >
        <Typography
          component="p"
          variant="caption"
          color="text.secondary"
        >
          {label}
        </Typography>

        <Typography
          component="p"
          variant="body2"
          sx={{
            fontWeight:
              700,

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

function getPageContent<T>(
  pageResponse:
    unknown,
): T[] {
  const data =
    pageResponse as {
      content?:
        T[];

      items?:
        T[];

      data?:
        T[];
    };

  return data.content
    ?? data.items
    ?? data.data
    ?? [];
}

function getTotalElements(
  pageResponse:
    unknown,

  fallback:
    number,
) {
  const data =
    pageResponse as {
      totalElements?:
        number;

      totalItems?:
        number;

      total?:
        number;

      totalRecords?:
        number;
    };

  return data.totalElements
    ?? data.totalItems
    ?? data.total
    ?? data.totalRecords
    ?? fallback;
}

function getOptionalStringField(
  item:
    CallCenterVisitaResponse,

  field:
    string,
) {
  const data =
    item as unknown as Record<
      string,
      unknown
    >;

  const value =
    data[
      field
    ];

  if (
    typeof value
      !== 'string'
  ) {
    return null;
  }

  const trimmed =
    value.trim();

  return trimmed.length
    > 0
    ? trimmed
    : null;
}

function isVisitLocked(
  item:
    CallCenterVisitaResponse,
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
    item.encuestaRealizada
      === true
    || estadoVisita
      === 'REALIZADA'
    || estadoVisita
      === 'NO_ATENDIDA'
    || estadoVisita
      === 'CANCELADA'
    || estadoCaso
      === 'CERRADO'
    || estadoCaso
      === 'CANCELADO'
  );
}

function getVisitIcon(
  item:
    CallCenterVisitaResponse,
) {
  const estadoVisita =
    normalizeCode(
      item.estadoVisita,
    );

  if (
    item.encuestaRealizada
      === true
    || estadoVisita
      === 'REALIZADA'
  ) {
    return (
      <CheckCircleIcon
        fontSize="small"
      />
    );
  }

  if (
    estadoVisita
      === 'CANCELADA'
  ) {
    return (
      <CancelIcon
        fontSize="small"
      />
    );
  }

  if (
    estadoVisita
      === 'REPROGRAMADA'
  ) {
    return (
      <ReplayIcon
        fontSize="small"
      />
    );
  }

  if (
    estadoVisita
      === 'NO_ATENDIDA'
  ) {
    return (
      <WarningAmberIcon
        fontSize="small"
      />
    );
  }

  if (
    estadoVisita
      === 'PROGRAMADA'
  ) {
    return (
      <ScheduleIcon
        fontSize="small"
      />
    );
  }

  return (
    <AssignmentIndIcon
      fontSize="small"
    />
  );
}

function getResultadoImpacto(
  estado:
    CallCenterEstadoVisita,
) {
  if (
    estado
      === 'REALIZADA'
  ) {
    return {
      severity:
        'success' as const,

      title:
        'La encuesta fue realizada',

      description:
        'Al guardar, la visita y el caso quedarán finalizados.',
    };
  }

  if (
    estado
      === 'NO_ATENDIDA'
  ) {
    return {
      severity:
        'warning' as const,

      title:
        'La visita no fue atendida',

      description:
        'Debes registrar el motivo. Al guardar, el caso quedará finalizado.',
    };
  }

  if (
    estado
      === 'CANCELADA'
  ) {
    return {
      severity:
        'error' as const,

      title:
        'La visita será cancelada',

      description:
        'Debes registrar el motivo. Al guardar, el caso quedará cancelado y finalizado.',
    };
  }

  return {
    severity:
      'info' as const,

    title:
      'La visita será reprogramada',

    description:
      'Debes seleccionar una nueva fecha. El caso continuará abierto.',
  };
}

function getResultadoOptionLabel(
  estado:
    CallCenterEstadoVisita,
) {
  if (
    estado
      === 'REALIZADA'
  ) {
    return 'Realizada — finaliza el caso';
  }

  if (
    estado
      === 'NO_ATENDIDA'
  ) {
    return 'No atendida — finaliza el caso';
  }

  if (
    estado
      === 'CANCELADA'
  ) {
    return 'Cancelada — cancela el caso';
  }

  return 'Reprogramada — mantiene el caso abierto';
}

function getResultadoSaveLabel(
  estado:
    CallCenterEstadoVisita,
) {
  if (
    estado
      === 'REALIZADA'
  ) {
    return 'Confirmar visita realizada';
  }

  if (
    estado
      === 'NO_ATENDIDA'
  ) {
    return 'Confirmar visita no atendida';
  }

  if (
    estado
      === 'CANCELADA'
  ) {
    return 'Confirmar cancelación';
  }

  return 'Guardar reprogramación';
}

function getCardAccent(
  value?:
    | string
    | null,
) {
  const normalized =
    normalizeCode(
      value,
    );

  if (
    normalized
      === 'REALIZADA'
  ) {
    return 'success.main';
  }

  if (
    normalized
      === 'NO_ATENDIDA'
  ) {
    return 'warning.main';
  }

  if (
    normalized
      === 'REPROGRAMADA'
  ) {
    return 'info.main';
  }

  if (
    normalized
      === 'CANCELADA'
  ) {
    return 'error.main';
  }

  if (
    normalized
      === 'PROGRAMADA'
  ) {
    return 'primary.main';
  }

  return 'grey.500';
}

function normalizeCode(
  value?:
    | string
    | number
    | null,
) {
  return String(
    value ?? '',
  )
    .trim()
    .toUpperCase();
}

function getErrorMessage(
  exception:
    unknown,

  fallback:
    string,
) {
  if (
    exception
    && typeof exception
      === 'object'
    && 'message'
      in exception
    && typeof exception.message
      === 'string'
  ) {
    return exception.message;
  }

  return fallback;
}

function formatLabel(
  value?:
    | string
    | null,
) {
  return String(
    value
    ?? 'Sin estado',
  )
    .split(
      '_',
    )
    .join(
      ' ',
    )
    .toLowerCase()
    .replace(
      /^\w/,
      (
        letter,
      ) =>
        letter.toUpperCase(),
    );
}

function getStatusColor(
  value?:
    | string
    | null,
): ChipColor {
  const normalized =
    normalizeCode(
      value,
    );

  if (
    normalized.includes(
      'REALIZADA',
    )
    || normalized.includes(
      'CERRADO',
    )
  ) {
    return 'success';
  }

  if (
    normalized.includes(
      'PENDIENTE',
    )
    || normalized.includes(
      'PROGRAMADA',
    )
    || normalized.includes(
      'ASIGNADO',
    )
  ) {
    return 'info';
  }

  if (
    normalized.includes(
      'REPROGRAMADA',
    )
    || normalized.includes(
      'NO_ATENDIDA',
    )
  ) {
    return 'warning';
  }

  if (
    normalized.includes(
      'CANCELADA',
    )
    || normalized.includes(
      'CANCELADO',
    )
  ) {
    return 'error';
  }

  return 'default';
}

function getLocalDateISO(
  date =
    new Date(),
) {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth()
      + 1,
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

function getLocalTime(
  date =
    new Date(),
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