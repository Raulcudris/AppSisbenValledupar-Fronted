'use client';

import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
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
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type ReactNode,
} from 'react';

import { getMisRegistrosCallCenter } from '@/services/callcenter.service';
import type { PageResponse } from '@/types/api.types';
import type { CallCenterResponse } from '@/types/callcenter.types';

type SnackbarState = {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'warning' | 'info';
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

type NextActionInfo = {
  label: string;
  detail: string;
  color: ChipColor;
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
  'VISITA_REALIZADA',
  'VISITA_NO_ATENDIDA',
  'REPROGRAMADO',
  'CERRADO',
  'CANCELADO',
];

const TIPOS_SOLICITUD_FILTRO = [
  'NUEVA_ENCUESTA',
  'INCLUSION',
  'VERIFICACION',
  'OTRO',
];

const PAGE_SIZE_OPTIONS = [
  10,
  20,
  50,
  100,
];

/**
 * Bandeja personal del funcionario Call Center autenticado.
 *
 * Esta pantalla usa únicamente la información resumida entregada
 * por el endpoint personal. El historial completo de llamadas y
 * visitas se consulta en el detalle de cada caso.
 */
export default function MisRegistrosCallCenterPage() {
  const router = useRouter();

  const [pageData, setPageData] =
    useState<PageResponse<CallCenterResponse> | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [searchText, setSearchText] =
    useState('');

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

  const [snackbar, setSnackbar] =
    useState<SnackbarState>({
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

  /**
   * Los indicadores corresponden solamente a la página cargada.
   */
  const stats = useMemo(() => {
    const abiertos =
      records.filter(
        (record) =>
          !isCaseFinalized(record),
      ).length;

    const finalizados =
      records.filter((record) =>
        isCaseFinalized(record),
      ).length;

    const pendientesLlamada =
      records.filter(
        (record) =>
          !isCaseFinalized(record) &&
          !hasPhoneManagement(record),
      ).length;

    const pendientesProgramacion =
      records.filter(
        (record) =>
          !isCaseFinalized(record) &&
          !isVisitFinalResult(record) &&
          !hasVisitProgramming(record),
      ).length;

    const conVisitaProgramada =
      records.filter(
        (record) =>
          !isCaseFinalized(record) &&
          !isVisitFinalResult(record) &&
          hasVisitProgramming(record),
      ).length;

    const pendientesCierre =
      records.filter(
        (record) =>
          !isCaseFinalized(record) &&
          isVisitFinalResult(record),
      ).length;

    return {
      abiertos,
      finalizados,
      pendientesLlamada,
      pendientesProgramacion,
      conVisitaProgramada,
      pendientesCierre,
    };
  }, [records]);

  const hasActiveFilters = Boolean(
    searchText.trim() ||
      estadoCasoFiltro !== 'TODOS' ||
      tipoSolicitudFiltro !== 'TODOS' ||
      condicionFiltro !== 'TODOS',
  );

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

  function closeSnackbar() {
    setSnackbar((current) => ({
      ...current,
      open: false,
    }));
  }

  /**
   * Consulta únicamente los casos del funcionario autenticado.
   */
  async function load(
    nextPage = 0,
    nextSize = 20,
    filters: RegistroFilterState = initialFilters,
  ) {
    setLoading(true);

    try {
      const response =
        await getMisRegistrosCallCenter({
          page: nextPage,
          size: nextSize,
          q:
            filters.q.trim() ||
            undefined,
          estadoCaso:
            filters.estadoCaso,
          tipoSolicitudCallcenter:
            filters.tipoSolicitud,
          condicion:
            filters.condicion,
        });

      setPageData(response);
    } catch (error) {
      showMessage(
        getErrorMessage(
          error,
          'No fue posible cargar los casos asignados.',
        ),
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
    const nextFilters: RegistroFilterState = {
      q: searchText.trim(),
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
    event: ChangeEvent<
      HTMLInputElement |
      HTMLTextAreaElement
    >,
  ) {
    void load(
      0,
      Number(event.target.value),
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

  if (
    loading &&
    records.length === 0
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
          Cargando tus casos asignados...
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
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
            gap: 2,
            justifyContent:
              'space-between',
          }}
        >
          <Box>
            <Typography
              component="h1"
              variant="h5"
              sx={{ fontWeight: 800 }}
            >
              Casos por gestionar
            </Typography>

            <Typography
              component="p"
              variant="body2"
              sx={{
                color: 'text.secondary',
                mt: 0.5,
              }}
            >
              Bandeja personal para registrar llamadas y asignar
              el encuestador, la fecha y la hora de visita.
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

        <Alert severity="info">
          <Typography
            component="p"
            variant="body2"
            sx={{ fontWeight: 800 }}
          >
            La llamada no condiciona la visita.
          </Typography>

          <Typography
            component="p"
            variant="body2"
          >
            Cuando el ciudadano no contesta, registra el intento
            y continúa con la asignación del encuestador y la
            programación de la visita.
          </Typography>
        </Alert>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, minmax(0, 1fr))',
              lg: 'repeat(3, minmax(0, 1fr))',
              xl: 'repeat(6, minmax(0, 1fr))',
            },
            gap: 1.5,
          }}
        >
          <SummaryCard
            label="Casos en esta página"
            value={records.length}
          />

          <SummaryCard
            label="Abiertos en esta página"
            value={stats.abiertos}
          />

          <SummaryCard
            label="Pendientes de llamada"
            value={stats.pendientesLlamada}
          />

          <SummaryCard
            label="Pendientes de programación"
            value={stats.pendientesProgramacion}
          />

          <SummaryCard
            label="Con visita programada"
            value={stats.conVisitaProgramada}
          />

          <SummaryCard
            label="Pendientes de cierre"
            value={stats.pendientesCierre}
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
                  Buscar casos
                </Typography>

                <Typography
                  component="p"
                  variant="body2"
                  sx={{
                    color: 'text.secondary',
                  }}
                >
                  Los filtros se aplican sobre la consulta del
                  backend al pulsar Buscar.
                </Typography>
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    md: '2fr 1fr 1fr',
                    lg: '2fr 1fr 1fr 1fr',
                  },
                  gap: 1.5,
                }}
              >
                <TextField
                  label="Ciudadano o caso"
                  value={searchText}
                  onChange={(event) =>
                    setSearchText(
                      event.target.value,
                    )
                  }
                  placeholder="Nombre, cédula, teléfono, dirección, barrio o caso"
                  fullWidth
                  size="small"
                />

                <FormControl
                  fullWidth
                  size="small"
                >
                  <InputLabel>
                    Estado del caso
                  </InputLabel>

                  <Select
                    label="Estado del caso"
                    value={
                      estadoCasoFiltro
                    }
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
                          {formatLabel(
                            estado,
                          )}
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
                    Tipo de solicitud
                  </InputLabel>

                  <Select
                    label="Tipo de solicitud"
                    value={
                      tipoSolicitudFiltro
                    }
                    onChange={(event) =>
                      setTipoSolicitudFiltro(
                        String(
                          event.target.value,
                        ),
                      )
                    }
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
                          {formatLabel(
                            tipo,
                          )}
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
                    value={
                      condicionFiltro
                    }
                    onChange={(event) =>
                      setCondicionFiltro(
                        String(
                          event.target.value,
                        ),
                      )
                    }
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
                  display: 'flex',
                  justifyContent:
                    'space-between',
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
                  sx={{
                    color: 'text.secondary',
                  }}
                >
                  {loading
                    ? 'Actualizando casos...'
                    : `Mostrando ${records.length} de ${total} caso(s).`}
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
                    startIcon={
                      <SearchIcon />
                    }
                    onClick={
                      handleSearch
                    }
                    disabled={loading}
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

        <Alert severity="info">
          Selecciona <strong>Gestionar caso</strong> para registrar
          la llamada o intento y asignar el encuestador, la fecha
          y la hora de visita. Los casos cerrados permanecen
          disponibles para consulta.
        </Alert>

        {records.length === 0 ? (
          <Paper sx={{ p: 3 }}>
            <Alert severity="info">
              No se encontraron casos con los filtros aplicados.
            </Alert>
          </Paper>
        ) : (
          <Paper
            sx={{
              opacity:
                loading
                  ? 0.65
                  : 1,
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
                      Contacto y ubicación
                    </TableCell>

                    <TableCell>
                      Gestión telefónica
                    </TableCell>

                    <TableCell>
                      Programación de visita
                    </TableCell>

                    <TableCell>
                      Estado
                    </TableCell>

                    <TableCell>
                      Próxima acción
                    </TableCell>

                    <TableCell align="right">
                      Acción
                    </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {records.map((record) => {
                    const finalized =
                      isCaseFinalized(
                        record,
                      );

                    const nextAction =
                      getNextAction(
                        record,
                      );

                    const encuestadorNombre =
                      record.encuestadorAsignadoNombre ||
                      record.encuestadorProgramadoNombre ||
                      'Sin asignar';

                    return (
                      <TableRow
                        key={record.id}
                        hover
                      >
                        <TableCell>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems:
                                'center',
                              gap: 1,
                            }}
                          >
                            <Avatar
                              sx={{
                                width: 34,
                                height: 34,
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
                                  fontWeight: 800,
                                }}
                              >
                                {`Caso #${record.id}`}
                              </Typography>

                              <Typography
                                component="p"
                                variant="caption"
                                sx={{
                                  color:
                                    'text.secondary',
                                }}
                              >
                                {formatLabel(
                                  record.tipoSolicitudCallcenter ||
                                    'NUEVA_ENCUESTA',
                                )}
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
                              record.nombreCompleto ||
                              'Ciudadano sin nombre'
                            }
                            subtitle={
                              `C.C. ${
                                record.cedulaSolicitante ||
                                'Sin dato'
                              }`
                            }
                          />
                        </TableCell>

                        <TableCell>
                          <Box
                            sx={{
                              display: 'flex',
                              flexDirection:
                                'column',
                              gap: 1,
                            }}
                          >
                            <InfoCell
                              icon={
                                <PhoneIcon fontSize="small" />
                              }
                              title={
                                record.telefono ||
                                'Sin teléfono'
                              }
                              subtitle="Contacto registrado"
                            />

                            <InfoCell
                              icon={
                                <HomeWorkIcon fontSize="small" />
                              }
                              title={
                                record.direccionTexto ||
                                'Sin dirección'
                              }
                              subtitle={
                                getTerritoryLabel(
                                  record,
                                )
                              }
                            />
                          </Box>
                        </TableCell>

                        <TableCell>
                          <Box
                            sx={{
                              display: 'flex',
                              flexDirection:
                                'column',
                              alignItems:
                                'flex-start',
                              gap: 0.5,
                            }}
                          >
                            <Chip
                              size="small"
                              color={
                                getPhoneStatusColor(
                                  record,
                                )
                              }
                              label={
                                getPhoneStatusLabel(
                                  record,
                                )
                              }
                            />

                            <Typography
                              component="p"
                              variant="caption"
                              sx={{
                                color:
                                  'text.secondary',
                              }}
                            >
                              {hasPhoneManagement(
                                record,
                              )
                                ? formatPhoneManagementDate(
                                    record,
                                  )
                                : 'Sin intento registrado en el resumen'}
                            </Typography>
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
                              record.fechaEncuestaProgramada
                                ? `Fecha: ${record.fechaEncuestaProgramada}`
                                : 'Sin fecha programada'
                            }
                          />

                          <Chip
                            size="small"
                            variant="outlined"
                            sx={{ mt: 1 }}
                            color={
                              getStatusColor(
                                record.estadoVisita,
                              )
                            }
                            label={formatLabel(
                              record.estadoVisita ||
                                'PENDIENTE',
                            )}
                          />
                        </TableCell>

                        <TableCell>
                          <Box
                            sx={{
                              display: 'flex',
                              flexDirection:
                                'column',
                              alignItems:
                                'flex-start',
                              gap: 0.5,
                            }}
                          >
                            <Chip
                              size="small"
                              color={
                                getStatusColor(
                                  record.estadoCaso,
                                )
                              }
                              label={formatLabel(
                                record.estadoCaso ||
                                  'ASIGNADO_CALLCENTER',
                              )}
                            />

                            {finalized && (
                              <Typography
                                component="p"
                                variant="caption"
                                sx={{
                                  color:
                                    'text.secondary',
                                }}
                              >
                                Disponible para consulta
                              </Typography>
                            )}

                            {!finalized &&
                              isVisitFinalResult(
                                record,
                              ) && (
                                <Typography
                                  component="p"
                                  variant="caption"
                                  sx={{
                                    color:
                                      'warning.main',
                                  }}
                                >
                                  Resultado registrado; cierre pendiente
                                </Typography>
                              )}
                          </Box>
                        </TableCell>

                        <TableCell>
                          <Box
                            sx={{
                              display: 'flex',
                              flexDirection:
                                'column',
                              alignItems:
                                'flex-start',
                              gap: 0.5,
                              minWidth: 190,
                            }}
                          >
                            <Chip
                              size="small"
                              color={
                                nextAction.color
                              }
                              label={
                                nextAction.label
                              }
                            />

                            <Typography
                              component="p"
                              variant="caption"
                              sx={{
                                color:
                                  'text.secondary',
                              }}
                            >
                              {nextAction.detail}
                            </Typography>
                          </Box>
                        </TableCell>

                        <TableCell align="right">
                          <Button
                            size="small"
                            variant={
                              finalized
                                ? 'outlined'
                                : 'contained'
                            }
                            startIcon={
                              <VisibilityIcon />
                            }
                            onClick={() =>
                              openGestionCaso(
                                record.id,
                              )
                            }
                          >
                            {finalized
                              ? 'Ver detalle'
                              : 'Gestionar caso'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>

                <TableFooter>
                  <TableRow>
                    <TablePagination
                      component="td"
                      colSpan={8}
                      count={total}
                      page={page}
                      rowsPerPage={size}
                      rowsPerPageOptions={
                        PAGE_SIZE_OPTIONS
                      }
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

        {stats.finalizados > 0 && (
          <Alert severity="success">
            En esta página hay {stats.finalizados} caso(s)
            cerrado(s) o cancelado(s). Se mantienen visibles para
            consulta y trazabilidad.
          </Alert>
        )}
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={closeSnackbar}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
      >
        <Alert
          severity={
            snackbar.severity
          }
          onClose={
            closeSnackbar
          }
          sx={{ width: '100%' }}
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
          sx={{
            color: 'text.secondary',
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
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1,
      }}
    >
      <Box
        sx={{
          color: 'text.secondary',
          mt: 0.2,
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>

      <Box sx={{ minWidth: 0 }}>
        <Typography
          component="p"
          variant="body2"
          sx={{
            fontWeight: 700,
            overflowWrap: 'anywhere',
          }}
        >
          {title}
        </Typography>

        <Typography
          component="p"
          variant="caption"
          sx={{
            color: 'text.secondary',
            overflowWrap: 'anywhere',
          }}
        >
          {subtitle}
        </Typography>
      </Box>
    </Box>
  );
}

/**
 * Determina si el resumen del caso evidencia una gestión telefónica.
 *
 * No intenta contar llamadas porque el endpoint de la bandeja no
 * entrega el historial completo.
 */
function hasPhoneManagement(
  record: CallCenterResponse,
) {
  const estadoCaso =
    normalizeCode(
      record.estadoCaso,
    );

  const phoneManagedStates = [
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

  return Boolean(
    record.fechaLlamada ||
      record.horaLlamada ||
      record.llamadaConectada === true ||
      phoneManagedStates.includes(
        estadoCaso,
      ),
  );
}

function hasEncuestador(
  record: CallCenterResponse,
) {
  return Boolean(
    record.encuestadorAsignadoId ||
      record.encuestadorProgramadoId ||
      record.encuestadorAsignadoNombre ||
      record.encuestadorProgramadoNombre,
  );
}

/**
 * Determina si existe programación de visita usando únicamente
 * campos confirmados en CallCenterResponse.
 */
function hasVisitProgramming(
  record: CallCenterResponse,
) {
  const estadoCaso =
    normalizeCode(
      record.estadoCaso,
    );

  const estadoVisita =
    normalizeCode(
      record.estadoVisita,
    );

  return Boolean(
    record.fechaEncuestaProgramada ||
      hasEncuestador(record) ||
      estadoCaso ===
        'ASIGNADO_ENCUESTADOR' ||
      estadoCaso ===
        'VISITA_PROGRAMADA' ||
      estadoCaso ===
        'REPROGRAMADO' ||
      estadoVisita ===
        'PROGRAMADA' ||
      estadoVisita ===
        'REPROGRAMADA',
  );
}

/**
 * Resultado de campo definitivo que todavía puede requerir el
 * cierre formal del caso.
 */
function isVisitFinalResult(
  record: CallCenterResponse,
) {
  const estadoVisita =
    normalizeCode(
      record.estadoVisita,
    );

  return (
    record.encuestaRealizada === true ||
    estadoVisita === 'REALIZADA' ||
    estadoVisita === 'NO_ATENDIDA' ||
    estadoVisita === 'CANCELADA'
  );
}

function isVisitReprogrammed(
  record: CallCenterResponse,
) {
  const estadoCaso =
    normalizeCode(
      record.estadoCaso,
    );

  const estadoVisita =
    normalizeCode(
      record.estadoVisita,
    );

  return (
    estadoCaso === 'REPROGRAMADO' ||
    estadoVisita === 'REPROGRAMADA'
  );
}

/**
 * El caso solo se considera finalizado cuando estadoCaso lo indica.
 * El frontend no convierte automáticamente un resultado de visita
 * en un cierre administrativo.
 */
function isCaseFinalized(
  record: CallCenterResponse,
) {
  const estadoCaso =
    normalizeCode(
      record.estadoCaso,
    );

  return (
    estadoCaso === 'CERRADO' ||
    estadoCaso === 'CANCELADO'
  );
}

function isCaseCancelled(
  record: CallCenterResponse,
) {
  return (
    normalizeCode(
      record.estadoCaso,
    ) === 'CANCELADO'
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
    isCaseCancelled(record)
  ) {
    return <CancelIcon />;
  }

  if (
    estadoCaso === 'CERRADO'
  ) {
    return <CheckCircleIcon />;
  }

  if (
    isVisitFinalResult(record) ||
    isVisitReprogrammed(record) ||
    estadoCaso === 'NO_CONTACTADO'
  ) {
    return <WarningAmberIcon />;
  }

  return <AssignmentIndIcon />;
}

function getPhoneStatusLabel(
  record: CallCenterResponse,
) {
  if (
    !hasPhoneManagement(record)
  ) {
    return 'Sin gestión telefónica';
  }

  if (
    record.llamadaConectada === true
  ) {
    return 'Llamada conectada';
  }

  if (
    record.llamadaConectada === false ||
    normalizeCode(
      record.estadoCaso,
    ) === 'NO_CONTACTADO'
  ) {
    return 'Llamada no conectada';
  }

  return 'Gestión telefónica registrada';
}

function getPhoneStatusColor(
  record: CallCenterResponse,
): ChipColor {
  if (
    !hasPhoneManagement(record)
  ) {
    return 'default';
  }

  if (
    record.llamadaConectada === true
  ) {
    return 'success';
  }

  if (
    record.llamadaConectada === false ||
    normalizeCode(
      record.estadoCaso,
    ) === 'NO_CONTACTADO'
  ) {
    return 'warning';
  }

  return 'info';
}

function formatPhoneManagementDate(
  record: CallCenterResponse,
) {
  if (!record.fechaLlamada) {
    return 'Consulta el historial en el detalle';
  }

  return record.horaLlamada
    ? `${record.fechaLlamada} · ${record.horaLlamada.slice(0, 5)}`
    : record.fechaLlamada;
}

function getTerritoryLabel(
  record: CallCenterResponse,
) {
  const barrio =
    record.barrioNombre ||
    'Sin barrio';

  const comuna =
    record.comunaNombre
      ? ` / ${record.comunaNombre}`
      : ' / Sin comuna';

  return `${barrio}${comuna}`;
}

/**
 * Próxima acción calculada exclusivamente con el resumen recibido
 * por la bandeja personal.
 */
function getNextAction(
  record: CallCenterResponse,
): NextActionInfo {
  if (
    isCaseCancelled(record)
  ) {
    return {
      label: 'Solo consultar',
      detail:
        'El caso se encuentra cancelado.',
      color: 'default',
    };
  }

  if (
    normalizeCode(
      record.estadoCaso,
    ) === 'CERRADO'
  ) {
    return {
      label: 'Caso cerrado',
      detail:
        'Consulta la llamada, la visita y el resultado registrado.',
      color: 'success',
    };
  }

  if (
    isVisitReprogrammed(record)
  ) {
    return {
      label: 'Revisar reprogramación',
      detail:
        'El caso permanece abierto y debe continuar en la nueva fecha.',
      color: 'warning',
    };
  }

  if (
    isVisitFinalResult(record)
  ) {
    return {
      label: 'Pendiente de cierre',
      detail:
        'Existe un resultado definitivo de visita, pero el caso continúa abierto.',
      color: 'warning',
    };
  }

  const hasPhone =
    hasPhoneManagement(record);

  const hasProgramming =
    hasVisitProgramming(record);

  if (
    !hasPhone &&
    !hasProgramming
  ) {
    return {
      label: 'Llamar y programar',
      detail:
        'Registra el intento y asigna encuestador, fecha y hora.',
      color: 'primary',
    };
  }

  if (
    !hasPhone &&
    hasProgramming
  ) {
    return {
      label: 'Registrar llamada pendiente',
      detail:
        'La visita está programada, pero falta registrar el intento telefónico.',
      color: 'warning',
    };
  }

  if (
    hasPhone &&
    !hasProgramming
  ) {
    return {
      label: 'Asignar encuestador',
      detail:
        'La gestión telefónica existe; falta definir encuestador, fecha y hora.',
      color: 'warning',
    };
  }

  return {
    label: 'Seguimiento de visita',
    detail:
      'La llamada y la programación están registradas. La visita continúa aunque no haya contacto.',
    color: 'info',
  };
}

function getErrorMessage(
  error: unknown,
  fallback: string,
) {
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }

  return fallback;
}

function normalizeCode(
  value?: string | number | null,
) {
  return String(value ?? '')
    .trim()
    .toUpperCase();
}

function formatLabel(
  value?: string | null,
) {
  return String(
    value ??
      'Sin dato',
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
    normalized.includes('CANCELADO') ||
    normalized.includes('CANCELADA') ||
    normalized.includes('SIN_DISPOSICION') ||
    normalized.includes('NO_ACEPTA')
  ) {
    return 'error';
  }

  if (
    normalized.includes('REPROGRAMADO') ||
    normalized.includes('REPROGRAMADA') ||
    normalized.includes('NO_CONTACTADO') ||
    normalized.includes('NO_ATENDIDA')
  ) {
    return 'warning';
  }

  if (
    normalized.includes('CERRADO') ||
    normalized.includes('REALIZADA') ||
    normalized ===
      'CONTACTADO_ACEPTA_VISITA'
  ) {
    return 'success';
  }

  if (
    normalized.includes('PENDIENTE') ||
    normalized.includes('ASIGNADO') ||
    normalized.includes('GESTION') ||
    normalized.includes('PROGRAMADA')
  ) {
    return 'info';
  }

  return 'default';
}