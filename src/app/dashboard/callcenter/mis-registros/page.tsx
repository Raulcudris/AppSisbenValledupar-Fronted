'use client';

import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EditIcon from '@mui/icons-material/Edit';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import PersonIcon from '@mui/icons-material/Person';
import PhoneIcon from '@mui/icons-material/Phone';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
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
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
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

import {
  type ChangeEvent,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  getMisRegistrosCallCenter,
} from '@/services/callcenter.service';

import type {
  PageResponse,
} from '@/types/api.types';

import type {
  CallCenterResponse,
} from '@/types/callcenter.types';

type SnackbarState = {
  open: boolean;
  message: string;

  severity:
    | 'success'
    | 'error'
    | 'warning'
    | 'info';
};

type ChipColor =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'error'
  | 'info'
  | 'success'
  | 'warning';

type RegistroFilterState = {
  q: string;
  estadoCaso: string;
  tipoSolicitud: string;
  condicion: string;
};

const initialFilters: RegistroFilterState = {
  q: '',
  estadoCaso: 'TODOS',
  tipoSolicitud: 'TODOS',
  condicion: 'TODOS',
};

const ESTADOS_CASO_FILTRO = [
  'PENDIENTE_ENRUTAMIENTO',
  'ASIGNADO_CALLCENTER',
  'EN_GESTION_LLAMADA',
  'NO_CONTACTADO',
  'CONTACTADO_SIN_DISPOSICION',
  'PENDIENTE_ASIGNAR_ENCUESTADOR',
  'ASIGNADO_ENCUESTADOR',
  'VISITA_PROGRAMADA',
  'VISITA_NO_ATENDIDA',
  'REPROGRAMADO',
  'VISITA_REALIZADA',
  'CERRADO',
  'CANCELADO',
];

const TIPOS_SOLICITUD_FILTRO = [
  'NUEVA_ENCUESTA',
  'INCLUSION',
  'VERIFICACION',
  'OTRO',
];

export default function MisRegistrosCallCenterPage() {
  const router =
    useRouter();

  const [
    pageData,
    setPageData,
  ] = useState<
    PageResponse<CallCenterResponse> | null
  >(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    searchText,
    setSearchText,
  ] = useState('');

  const [
    estadoCasoFiltro,
    setEstadoCasoFiltro,
  ] = useState('TODOS');

  const [
    tipoSolicitudFiltro,
    setTipoSolicitudFiltro,
  ] = useState('TODOS');

  const [
    condicionFiltro,
    setCondicionFiltro,
  ] = useState('TODOS');

  const [
    appliedFilters,
    setAppliedFilters,
  ] = useState<RegistroFilterState>(
    initialFilters,
  );

  const [
    snackbar,
    setSnackbar,
  ] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success',
  });

  const records =
    pageData?.content ?? [];

  const page =
    pageData?.page ?? 0;

  const size =
    pageData?.size ?? 20;

  const total =
    pageData?.totalElements ?? 0;

  const casosAbiertos = useMemo(
    () =>
      records.filter(
        (record) =>
          !isRecordClosed(record),
      ).length,
    [records],
  );

  const casosCerrados = useMemo(
    () =>
      records.filter(
        (record) =>
          isRecordClosed(record),
      ).length,
    [records],
  );

  const casosConEncuestador = useMemo(
    () =>
      records.filter(
        (record) =>
          hasEncuestador(record),
      ).length,
    [records],
  );

  const hasActiveFilters = Boolean(
    searchText.trim()
    || estadoCasoFiltro !== 'TODOS'
    || tipoSolicitudFiltro !== 'TODOS'
    || condicionFiltro !== 'TODOS',
  );

  function showMessage(
    message: string,
    severity:
      SnackbarState['severity'] =
      'success',
  ) {
    setSnackbar({
      open: true,
      message,
      severity,
    });
  }

  function closeSnackbar() {
    setSnackbar(
      (current) => ({
        ...current,
        open: false,
      }),
    );
  }

  async function load(
    nextPage = 0,
    nextSize = 20,
    filters:
      RegistroFilterState =
      initialFilters,
  ) {
    setLoading(true);

    try {
      const response =
        await getMisRegistrosCallCenter({
          page: nextPage,
          size: nextSize,
          q: filters.q,
          estadoCaso:
            filters.estadoCaso,

          tipoSolicitudCallcenter:
            filters.tipoSolicitud,

          condicion:
            filters.condicion,
        });

      setPageData(response);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'No fue posible cargar tus registros asignados.';

      showMessage(
        message,
        'error',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(
      0,
      20,
      initialFilters,
    );

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSearch() {
    const nextFilters:
      RegistroFilterState = {
        q:
          searchText.trim(),

        estadoCaso:
          estadoCasoFiltro,

        tipoSolicitud:
          tipoSolicitudFiltro,

        condicion:
          condicionFiltro,
      };

    setAppliedFilters(
      nextFilters,
    );

    void load(
      0,
      size,
      nextFilters,
    );
  }

  function clearFilters() {
    setSearchText('');
    setEstadoCasoFiltro('TODOS');
    setTipoSolicitudFiltro('TODOS');
    setCondicionFiltro('TODOS');

    setAppliedFilters(
      initialFilters,
    );

    void load(
      0,
      size,
      initialFilters,
    );
  }

  function handlePageChange(
    _: unknown,
    nextPage: number,
  ) {
    void load(
      nextPage,
      size,
      appliedFilters,
    );
  }

  function handleRowsPerPageChange(
    event:
      ChangeEvent<
        HTMLInputElement
        | HTMLTextAreaElement
      >,
  ) {
    void load(
      0,
      Number(
        event.target.value,
      ),
      appliedFilters,
    );
  }

  function refresh() {
    void load(
      page,
      size,
      appliedFilters,
    );
  }

  function openGestionCaso(
    id: number,
  ) {
    router.push(
      `/dashboard/callcenter/mis-registros/${id}`,
    );
  }

  function openEditRecord(
    record: CallCenterResponse,
  ) {
    if (
      isRecordClosed(record)
    ) {
      showMessage(
        'Los casos cerrados o cancelados permanecen disponibles únicamente para consulta.',
        'warning',
      );

      return;
    }

    router.push(
      `/dashboard/callcenter/registros/nuevo?id=${record.id}`,
    );
  }

  if (
    loading
    && records.length === 0
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
        }}
      >
        <CircularProgress />

        <Typography
          component="p"
          sx={{
            mt: 2,
          }}
        >
          Cargando tus registros asignados...
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box
        sx={{
          display:
            'flex',

          flexDirection:
            'column',

          gap:
            3,
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

            gap:
              2,

            justifyContent:
              'space-between',
          }}
        >
          <Box>
            <Typography
              component="h1"
              variant="h5"
              sx={{
                fontWeight:
                  800,
              }}
            >
              Mis registros Call Center
            </Typography>

            <Typography
              component="p"
              variant="body2"
              color="text.secondary"
            >
              Casos asignados a tu cuenta para gestionar
              llamadas, coordinar visitas y actualizar los
              datos generales del ciudadano.
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
            display:
              'grid',

            gridTemplateColumns: {
              xs:
                '1fr',

              sm:
                '1fr 1fr',

              lg:
                '1fr 1fr 1fr 1fr',
            },

            gap:
              1.5,
          }}
        >
          <SummaryCard
            label="Registros en página"
            value={records.length}
          />

          <SummaryCard
            label="Abiertos en página"
            value={casosAbiertos}
          />

          <SummaryCard
            label="Finalizados en página"
            value={casosCerrados}
          />

          <SummaryCard
            label="Con encuestador en página"
            value={casosConEncuestador}
          />
        </Box>

        <Card variant="outlined">
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
              <Box>
                <Typography
                  component="h2"
                  variant="h6"
                  sx={{
                    fontWeight:
                      800,
                  }}
                >
                  Filtros de búsqueda
                </Typography>

                <Typography
                  component="p"
                  variant="body2"
                  color="text.secondary"
                >
                  Selecciona los filtros y pulsa Buscar.
                  La consulta se realiza en backend.
                </Typography>
              </Box>

              <Box
                sx={{
                  display:
                    'grid',

                  gridTemplateColumns: {
                    xs:
                      '1fr',

                    md:
                      '2fr 1fr 1fr',

                    lg:
                      '2fr 1fr 1fr 1fr',
                  },

                  gap:
                    1.5,
                }}
              >
                <TextField
                  label="Buscar"
                  value={searchText}
                  onChange={(event) => {
                    setSearchText(
                      event.target.value,
                    );
                  }}
                  onKeyDown={(event) => {
                    if (
                      event.key
                      === 'Enter'
                    ) {
                      handleSearch();
                    }
                  }}
                  placeholder="Nombre, cédula, teléfono, dirección, barrio o caso"
                  fullWidth
                />

                <FormControl fullWidth>
                  <InputLabel>
                    Estado caso
                  </InputLabel>

                  <Select
                    label="Estado caso"
                    value={
                      estadoCasoFiltro
                    }
                    onChange={(event) => {
                      setEstadoCasoFiltro(
                        String(
                          event.target.value,
                        ),
                      );
                    }}
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

                <FormControl fullWidth>
                  <InputLabel>
                    Tipo solicitud
                  </InputLabel>

                  <Select
                    label="Tipo solicitud"
                    value={
                      tipoSolicitudFiltro
                    }
                    onChange={(event) => {
                      setTipoSolicitudFiltro(
                        String(
                          event.target.value,
                        ),
                      );
                    }}
                  >
                    <MenuItem value="TODOS">
                      Todas
                    </MenuItem>

                    {TIPOS_SOLICITUD_FILTRO.map(
                      (tipo) => (
                        <MenuItem
                          key={tipo}
                          value={tipo}
                        >
                          {formatLabel(tipo)}
                        </MenuItem>
                      ),
                    )}
                  </Select>
                </FormControl>

                <FormControl fullWidth>
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
                          event.target.value,
                        ),
                      );
                    }}
                  >
                    <MenuItem value="TODOS">
                      Todas
                    </MenuItem>

                    <MenuItem value="ABIERTOS">
                      Casos abiertos
                    </MenuItem>

                    <MenuItem value="CERRADOS">
                      Cerrados o cancelados
                    </MenuItem>

                    <MenuItem value="CON_ENCUESTADOR">
                      Con encuestador
                    </MenuItem>

                    <MenuItem value="SIN_ENCUESTADOR">
                      Sin encuestador
                    </MenuItem>
                  </Select>
                </FormControl>
              </Box>

              <Box
                sx={{
                  display:
                    'flex',

                  justifyContent:
                    'space-between',

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
                <Typography
                  component="p"
                  variant="body2"
                  color="text.secondary"
                >
                  {loading
                    ? 'Actualizando registros...'
                    : `Mostrando ${records.length} de ${total} registro(s).`}
                </Typography>

                <Box
                  sx={{
                    display:
                      'flex',

                    gap:
                      1,

                    justifyContent: {
                      xs:
                        'stretch',

                      sm:
                        'flex-end',
                    },
                  }}
                >
                  <Button
                    variant="contained"
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
                    Limpiar filtros
                  </Button>
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Alert severity="info">
          Usa <strong>Gestionar</strong> para registrar
          llamadas o asignar visitas. Usa{' '}
          <strong>Editar datos</strong> para corregir
          información general del ciudadano en casos abiertos.
        </Alert>

        {records.length === 0 ? (
          <Paper
            sx={{
              p:
                3,
            }}
          >
            <Alert severity="info">
              No se encontraron registros con los filtros
              aplicados.
            </Alert>
          </Paper>
        ) : (
          <Paper
            sx={{
              opacity:
                loading
                  ? 0.65
                  : 1,

              transition:
                'opacity 180ms ease',
            }}
          >
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>
                      Caso
                    </TableCell>

                    <TableCell>
                      Ciudadano
                    </TableCell>

                    <TableCell>
                      Contacto
                    </TableCell>

                    <TableCell>
                      Dirección
                    </TableCell>

                    <TableCell>
                      Solicitud
                    </TableCell>

                    <TableCell>
                      Estado
                    </TableCell>

                    <TableCell>
                      Encuestador
                    </TableCell>

                    <TableCell align="right">
                      Acciones
                    </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {records.map(
                    (record) => {
                      const closed =
                        isRecordClosed(
                          record,
                        );

                      const encuestadorNombre =
                        record
                          .encuestadorAsignadoNombre
                        || record
                          .encuestadorProgramadoNombre
                        || 'Sin asignar';

                      return (
                        <TableRow
                          key={
                            record.id
                          }
                          hover
                        >
                          <TableCell>
                            <Box
                              sx={{
                                display:
                                  'flex',

                                alignItems:
                                  'center',

                                gap:
                                  1,
                              }}
                            >
                              <Avatar
                                sx={{
                                  width:
                                    34,

                                  height:
                                    34,
                                }}
                              >
                                {getRecordIcon(
                                  record,
                                )}
                              </Avatar>

                              <Box>
                                <Typography
                                  component="p"
                                  variant="body2"
                                  sx={{
                                    fontWeight:
                                      800,
                                  }}
                                >
                                  Caso #{record.id}
                                </Typography>

                                <Typography
                                  component="p"
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  {record.fechaLlamada
                                    || 'Sin fecha'}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>

                          <TableCell>
                            <InfoCell
                              icon={
                                <PersonIcon fontSize="small" />
                              }
                              title={
                                record.nombreCompleto
                                || 'Sin nombre'
                              }
                              subtitle={
                                `C.C. ${
                                  record.cedulaSolicitante
                                  || 'Sin dato'
                                }`
                              }
                            />
                          </TableCell>

                          <TableCell>
                            <InfoCell
                              icon={
                                <PhoneIcon fontSize="small" />
                              }
                              title={
                                record.telefono
                                || 'Sin teléfono'
                              }
                              subtitle={
                                getCallConnectionLabel(
                                  record
                                    .llamadaConectada,
                                )
                              }
                            />
                          </TableCell>

                          <TableCell>
                            <InfoCell
                              icon={
                                <HomeWorkIcon fontSize="small" />
                              }
                              title={
                                record.direccionTexto
                                || 'Sin dirección'
                              }
                              subtitle={
                                `${record.barrioNombre || 'Sin barrio'}${
                                  record.comunaNombre
                                    ? ` / ${record.comunaNombre}`
                                    : ''
                                }`
                              }
                            />
                          </TableCell>

                          <TableCell>
                            <Chip
                              size="small"
                              variant="outlined"
                              label={
                                formatLabel(
                                  record
                                    .tipoSolicitudCallcenter
                                  || 'SIN_DATO',
                                )
                              }
                            />
                          </TableCell>

                          <TableCell>
                            <Box
                              sx={{
                                display:
                                  'flex',

                                flexDirection:
                                  'column',

                                gap:
                                  0.5,

                                alignItems:
                                  'flex-start',
                              }}
                            >
                              <Chip
                                size="small"
                                color={
                                  getStatusColor(
                                    record
                                      .estadoCaso,
                                  )
                                }
                                label={
                                  formatLabel(
                                    record
                                      .estadoCaso
                                    || 'SIN_ESTADO',
                                  )
                                }
                              />

                              {closed ? (
                                <Typography
                                  component="p"
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  Solo consulta
                                </Typography>
                              ) : null}
                            </Box>
                          </TableCell>

                          <TableCell>
                            <InfoCell
                              icon={
                                <AssignmentIndIcon fontSize="small" />
                              }
                              title={
                                encuestadorNombre
                              }
                              subtitle={
                                record
                                  .fechaEncuestaProgramada
                                || 'Sin fecha programada'
                              }
                            />
                          </TableCell>

                          <TableCell align="right">
                            <Box
                              sx={{
                                display:
                                  'flex',

                                justifyContent:
                                  'flex-end',

                                flexWrap:
                                  'wrap',

                                gap:
                                  0.75,

                                minWidth:
                                  230,
                              }}
                            >
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={
                                  <VisibilityIcon />
                                }
                                onClick={() => {
                                  openGestionCaso(
                                    record.id,
                                  );
                                }}
                              >
                                Gestionar
                              </Button>

                              <Button
                                size="small"
                                variant="contained"
                                startIcon={
                                  <EditIcon />
                                }
                                disabled={closed}
                                title={
                                  closed
                                    ? 'Los casos cerrados o cancelados no pueden editarse.'
                                    : 'Editar datos generales del caso.'
                                }
                                onClick={() => {
                                  openEditRecord(
                                    record,
                                  );
                                }}
                              >
                                Editar datos
                              </Button>
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    },
                  )}
                </TableBody>

                <TableFooter>
                  <TableRow>
                    <TablePagination
                      component="td"
                      colSpan={8}
                      count={total}
                      page={page}
                      rowsPerPage={size}
                      rowsPerPageOptions={[
                        10,
                        20,
                        50,
                        100,
                      ]}
                      onPageChange={
                        handlePageChange
                      }
                      onRowsPerPageChange={
                        handleRowsPerPageChange
                      }
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
        open={
          snackbar.open
        }
        autoHideDuration={5000}
        onClose={
          closeSnackbar
        }
        anchorOrigin={{
          vertical:
            'bottom',

          horizontal:
            'right',
        }}
      >
        <Alert
          severity={
            snackbar.severity
          }
          onClose={
            closeSnackbar
          }
          sx={{
            width:
              '100%',
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

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

function InfoCell({
  icon,
  title,
  subtitle,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <Box
      sx={{
        display:
          'flex',

        alignItems:
          'flex-start',

        gap:
          1,
      }}
    >
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

      <Box>
        <Typography
          component="p"
          variant="body2"
          sx={{
            fontWeight:
              700,
          }}
        >
          {title}
        </Typography>

        <Typography
          component="p"
          variant="caption"
          color="text.secondary"
        >
          {subtitle}
        </Typography>
      </Box>
    </Box>
  );
}

function getCallConnectionLabel(
  value?: boolean | null,
) {
  if (value === true) {
    return 'Llamada conectada';
  }

  if (value === false) {
    return 'Llamada no conectada';
  }

  return 'Sin gestión telefónica registrada';
}

function hasEncuestador(
  record: CallCenterResponse,
) {
  return Boolean(
    record.encuestadorAsignadoNombre
    || record.encuestadorProgramadoNombre,
  );
}

function isRecordClosed(
  record: CallCenterResponse,
) {
  const estadoCaso =
    normalizeCode(
      record.estadoCaso,
    );

  return (
    estadoCaso === 'CERRADO'
    || estadoCaso === 'CANCELADO'
  );
}

function getRecordIcon(
  record: CallCenterResponse,
) {
  const estadoCaso =
    normalizeCode(
      record.estadoCaso,
    );

  if (
    estadoCaso === 'CANCELADO'
  ) {
    return (
      <CancelIcon />
    );
  }

  if (
    estadoCaso === 'CERRADO'
  ) {
    return (
      <CheckCircleIcon />
    );
  }

  if (
    estadoCaso.includes(
      'NO_CONTACTADO',
    )
    || estadoCaso.includes(
      'NO_ATENDIDA',
    )
    || estadoCaso.includes(
      'REPROGRAMADO',
    )
    || estadoCaso.includes(
      'SIN_DISPOSICION',
    )
  ) {
    return (
      <WarningAmberIcon />
    );
  }

  return (
    <AssignmentIndIcon />
  );
}

function normalizeCode(
  value?: string | number | null,
) {
  return String(
    value ?? '',
  )
    .trim()
    .toUpperCase();
}

function formatLabel(
  value?: string | null,
) {
  return String(
    value ?? 'Sin dato',
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
    normalized.includes(
      'CANCELADO',
    )
    || normalized.includes(
      'SIN_DISPOSICION',
    )
    || normalized.includes(
      'NO_ACEPTA',
    )
  ) {
    return 'error';
  }

  if (
    normalized.includes(
      'REPROGRAMADO',
    )
    || normalized.includes(
      'NO_CONTACTADO',
    )
    || normalized.includes(
      'NO_ATENDIDA',
    )
  ) {
    return 'warning';
  }

  if (
    normalized.includes(
      'CERRADO',
    )
    || normalized.includes(
      'REALIZADA',
    )
    || normalized.includes(
      'CONTACTADO_ACEPTA',
    )
  ) {
    return 'success';
  }

  if (
    normalized.includes(
      'PENDIENTE',
    )
    || normalized.includes(
      'ASIGNADO',
    )
    || normalized.includes(
      'GESTION',
    )
    || normalized.includes(
      'PROGRAMADA',
    )
  ) {
    return 'info';
  }

  return 'default';
}