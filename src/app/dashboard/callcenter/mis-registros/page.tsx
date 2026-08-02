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
  ChangeEvent,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { getMisRegistrosCallCenter } from '@/services/callcenter.service';
import { PageResponse } from '@/types/api.types';
import { CallCenterResponse } from '@/types/callcenter.types';

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
  'ASIGNADO_ENCUESTADOR',
  'VISITA_PROGRAMADA',
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

/**
 * Bandeja de trabajo del funcionario Call Center autenticado.
 *
 * La vista consulta únicamente el endpoint de casos personales y delega
 * en backend la paginación, búsqueda y aplicación de filtros.
 */
export default function MisRegistrosCallCenterPage() {
  const router = useRouter();

  const [pageData, setPageData] =
    useState<PageResponse<CallCenterResponse> | null>(null);

  const [loading, setLoading] = useState(true);

  const [searchText, setSearchText] = useState('');
  const [estadoCasoFiltro, setEstadoCasoFiltro] = useState('TODOS');
  const [tipoSolicitudFiltro, setTipoSolicitudFiltro] = useState('TODOS');
  const [condicionFiltro, setCondicionFiltro] = useState('TODOS');

  const [appliedFilters, setAppliedFilters] =
    useState<RegistroFilterState>(initialFilters);

  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success',
  });

  const records = pageData?.content ?? [];
  const page = pageData?.page ?? 0;
  const size = pageData?.size ?? 20;
  const total = pageData?.totalElements ?? 0;

  const casosAbiertos = useMemo(
    () => records.filter((record) => !isRecordClosed(record)).length,
    [records],
  );

  const casosCerrados = useMemo(
    () => records.filter((record) => isRecordClosed(record)).length,
    [records],
  );

  const casosConEncuestador = useMemo(
    () => records.filter((record) => hasEncuestador(record)).length,
    [records],
  );

  const casosSinConexion = useMemo(
    () =>
      records.filter(
        (record) =>
          !isRecordClosed(record) &&
          record.llamadaConectada === false,
      ).length,
    [records],
  );

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

  async function load(
    nextPage = 0,
    nextSize = 20,
    filters: RegistroFilterState = initialFilters,
  ) {
    setLoading(true);

    try {
      const response = await getMisRegistrosCallCenter({
        page: nextPage,
        size: nextSize,
        q: filters.q.trim() || undefined,
        estadoCaso: filters.estadoCaso,
        tipoSolicitudCallcenter: filters.tipoSolicitud,
        condicion: filters.condicion,
      });

      setPageData(response);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'No fue posible cargar los casos asignados.';

      showMessage(message, 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(0, 20, initialFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSearch() {
    const nextFilters: RegistroFilterState = {
      q: searchText,
      estadoCaso: estadoCasoFiltro,
      tipoSolicitud: tipoSolicitudFiltro,
      condicion: condicionFiltro,
    };

    setAppliedFilters(nextFilters);
    void load(0, size, nextFilters);
  }

  function clearFilters() {
    setSearchText('');
    setEstadoCasoFiltro('TODOS');
    setTipoSolicitudFiltro('TODOS');
    setCondicionFiltro('TODOS');
    setAppliedFilters(initialFilters);

    void load(0, size, initialFilters);
  }

  function handlePageChange(_: unknown, nextPage: number) {
    void load(nextPage, size, appliedFilters);
  }

  function handleRowsPerPageChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    void load(0, Number(event.target.value), appliedFilters);
  }

  function refresh() {
    void load(page, size, appliedFilters);
  }

  function openGestionCaso(id: number) {
    router.push(`/dashboard/callcenter/mis-registros/${id}`);
  }

  if (loading && records.length === 0) {
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
            justifyContent: 'space-between',
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
              sx={{ color: 'text.secondary', mt: 0.5 }}
            >
              Bandeja personal para registrar llamadas, confirmar información
              y coordinar las visitas de los casos asignados.
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
            La llamada no condiciona la visita.
          </Typography>

          <Typography component="p" variant="body2">
            Cuando el ciudadano no contesta, registra el intento de llamada.
            Si ya existe una visita programada, esta continúa y el encuestador
            debe realizarla en la fecha asignada.
          </Typography>
        </Alert>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: '1fr 1fr',
              lg: 'repeat(4, minmax(0, 1fr))',
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
            value={casosAbiertos}
          />

          <SummaryCard
            label="Sin conexión telefónica"
            value={casosSinConexion}
          />

          <SummaryCard
            label="Con encuestador"
            value={casosConEncuestador}
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
                  sx={{ color: 'text.secondary' }}
                >
                  Los filtros se aplican directamente sobre la consulta del
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
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Nombre, cédula, teléfono, dirección, barrio o caso"
                  fullWidth
                  size="small"
                />

                <FormControl fullWidth size="small">
                  <InputLabel>Estado del caso</InputLabel>

                  <Select
                    label="Estado del caso"
                    value={estadoCasoFiltro}
                    onChange={(event) =>
                      setEstadoCasoFiltro(String(event.target.value))
                    }
                  >
                    <MenuItem value="TODOS">
                      Todos
                    </MenuItem>

                    {ESTADOS_CASO_FILTRO.map((estado) => (
                      <MenuItem key={estado} value={estado}>
                        {formatLabel(estado)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth size="small">
                  <InputLabel>Tipo de solicitud</InputLabel>

                  <Select
                    label="Tipo de solicitud"
                    value={tipoSolicitudFiltro}
                    onChange={(event) =>
                      setTipoSolicitudFiltro(String(event.target.value))
                    }
                  >
                    <MenuItem value="TODOS">
                      Todas
                    </MenuItem>

                    {TIPOS_SOLICITUD_FILTRO.map((tipo) => (
                      <MenuItem key={tipo} value={tipo}>
                        {formatLabel(tipo)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth size="small">
                  <InputLabel>Situación</InputLabel>

                  <Select
                    label="Situación"
                    value={condicionFiltro}
                    onChange={(event) =>
                      setCondicionFiltro(String(event.target.value))
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

        <Alert severity="info">
          Selecciona <strong>Gestionar caso</strong> para registrar una llamada,
          actualizar la información confirmada o revisar la programación de la
          visita. Los casos finalizados permanecen disponibles en modo consulta.
        </Alert>

        {records.length === 0 ? (
          <Paper sx={{ p: 3 }}>
            <Alert severity="info">
              No se encontraron casos con los filtros aplicados.
            </Alert>
          </Paper>
        ) : (
          <Paper sx={{ opacity: loading ? 0.65 : 1 }}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Caso</TableCell>
                    <TableCell>Ciudadano</TableCell>
                    <TableCell>Contacto y ubicación</TableCell>
                    <TableCell>Gestión telefónica</TableCell>
                    <TableCell>Programación de visita</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell>Próxima acción</TableCell>
                    <TableCell align="right">Acción</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {records.map((record) => {
                    const closed = isRecordClosed(record);
                    const cancelled = isRecordCancelled(record);
                    const nextAction = getNextAction(record);

                    const encuestadorNombre =
                      record.encuestadorAsignadoNombre ||
                      record.encuestadorProgramadoNombre ||
                      'Sin asignar';

                    return (
                      <TableRow key={record.id} hover>
                        <TableCell>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                            }}
                          >
                            <Avatar
                              sx={{
                                width: 34,
                                height: 34,
                              }}
                            >
                              {getRecordIcon(record)}
                            </Avatar>

                            <Box>
                              <Typography
                                component="p"
                                variant="body2"
                                sx={{ fontWeight: 800 }}
                              >
                                {`Caso #${record.id}`}
                              </Typography>

                              <Typography
                                component="p"
                                variant="caption"
                                sx={{ color: 'text.secondary' }}
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
                            icon={<PersonIcon fontSize="small" />}
                            title={
                              record.nombreCompleto ||
                              'Ciudadano sin nombre'
                            }
                            subtitle={`C.C. ${
                              record.cedulaSolicitante || 'Sin dato'
                            }`}
                          />
                        </TableCell>

                        <TableCell>
                          <Box
                            sx={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 1,
                            }}
                          >
                            <InfoCell
                              icon={<PhoneIcon fontSize="small" />}
                              title={
                                record.telefono ||
                                'Sin teléfono'
                              }
                              subtitle="Contacto registrado"
                            />

                            <InfoCell
                              icon={<HomeWorkIcon fontSize="small" />}
                              title={
                                record.direccionTexto ||
                                'Sin dirección'
                              }
                              subtitle={getTerritoryLabel(record)}
                            />
                          </Box>
                        </TableCell>

                        <TableCell>
                          <Box
                            sx={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'flex-start',
                              gap: 0.5,
                            }}
                          >
                            <Chip
                              size="small"
                              color={getPhoneStatusColor(record)}
                              label={getPhoneStatusLabel(record)}
                            />

                            <Typography
                              component="p"
                              variant="caption"
                              sx={{ color: 'text.secondary' }}
                            >
                              {record.fechaLlamada || 'Sin fecha registrada'}
                              {record.horaLlamada
                                ? ` · ${record.horaLlamada.slice(0, 5)}`
                                : ''}
                            </Typography>
                          </Box>
                        </TableCell>

                        <TableCell>
                          <InfoCell
                            icon={<AssignmentIndIcon fontSize="small" />}
                            title={encuestadorNombre}
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
                            label={formatLabel(
                              record.estadoVisita || 'PENDIENTE',
                            )}
                          />
                        </TableCell>

                        <TableCell>
                          <Box
                            sx={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'flex-start',
                              gap: 0.5,
                            }}
                          >
                            <Chip
                              size="small"
                              color={getStatusColor(record.estadoCaso)}
                              label={formatLabel(
                                record.estadoCaso ||
                                  'ASIGNADO_CALLCENTER',
                              )}
                            />

                            {(closed || cancelled) && (
                              <Typography
                                component="p"
                                variant="caption"
                                sx={{ color: 'text.secondary' }}
                              >
                                Disponible para consulta
                              </Typography>
                            )}
                          </Box>
                        </TableCell>

                        <TableCell>
                          <Box
                            sx={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'flex-start',
                              gap: 0.5,
                              minWidth: 180,
                            }}
                          >
                            <Chip
                              size="small"
                              color={nextAction.color}
                              label={nextAction.label}
                            />

                            <Typography
                              component="p"
                              variant="caption"
                              sx={{ color: 'text.secondary' }}
                            >
                              {nextAction.detail}
                            </Typography>
                          </Box>
                        </TableCell>

                        <TableCell align="right">
                          <Button
                            size="small"
                            variant={closed ? 'outlined' : 'contained'}
                            startIcon={<VisibilityIcon />}
                            onClick={() => openGestionCaso(record.id)}
                          >
                            {closed ? 'Ver detalle' : 'Gestionar caso'}
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

        {casosCerrados > 0 && (
          <Alert severity="success">
            En esta página hay {casosCerrados} caso(s) finalizado(s) o
            cancelado(s). Estos registros se mantienen visibles para consulta.
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
          severity={snackbar.severity}
          onClose={closeSnackbar}
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
          sx={{ color: 'text.secondary' }}
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
        }}
      >
        {icon}
      </Box>

      <Box sx={{ minWidth: 0 }}>
        <Typography
          component="p"
          variant="body2"
          sx={{ fontWeight: 700 }}
        >
          {title}
        </Typography>

        <Typography
          component="p"
          variant="caption"
          sx={{ color: 'text.secondary' }}
        >
          {subtitle}
        </Typography>
      </Box>
    </Box>
  );
}

function hasEncuestador(record: CallCenterResponse) {
  return Boolean(
    record.encuestadorAsignadoId ||
      record.encuestadorProgramadoId ||
      record.encuestadorAsignadoNombre ||
      record.encuestadorProgramadoNombre,
  );
}

function isRecordCancelled(record: CallCenterResponse) {
  const estadoCaso = normalizeCode(record.estadoCaso);
  const estadoVisita = normalizeCode(record.estadoVisita);

  return (
    estadoCaso === 'CANCELADO' ||
    estadoVisita === 'CANCELADA'
  );
}

function isRecordClosed(record: CallCenterResponse) {
  const estadoCaso = normalizeCode(record.estadoCaso);
  const estadoVisita = normalizeCode(record.estadoVisita);

  return (
    record.encuestaRealizada === true ||
    estadoCaso === 'CERRADO' ||
    estadoCaso === 'CANCELADO' ||
    estadoVisita === 'REALIZADA' ||
    estadoVisita === 'CANCELADA'
  );
}

function getRecordIcon(record: CallCenterResponse) {
  const estadoCaso = normalizeCode(record.estadoCaso);
  const estadoVisita = normalizeCode(record.estadoVisita);

  if (isRecordCancelled(record)) {
    return <CancelIcon />;
  }

  if (isRecordClosed(record)) {
    return <CheckCircleIcon />;
  }

  if (
    estadoCaso.includes('NO_CONTACTADO') ||
    estadoCaso.includes('NO_ATENDIDA') ||
    estadoCaso.includes('REPROGRAMADO') ||
    estadoVisita.includes('NO_ATENDIDA') ||
    estadoVisita.includes('REPROGRAMADO')
  ) {
    return <WarningAmberIcon />;
  }

  return <AssignmentIndIcon />;
}

function getPhoneStatusLabel(record: CallCenterResponse) {
  if (record.llamadaConectada === true) {
    return 'Llamada conectada';
  }

  if (record.llamadaConectada === false) {
    return 'Llamada no conectada';
  }

  return 'Sin resultado telefónico';
}

function getPhoneStatusColor(
  record: CallCenterResponse,
): ChipColor {
  if (record.llamadaConectada === true) {
    return 'success';
  }

  if (record.llamadaConectada === false) {
    return 'warning';
  }

  return 'default';
}

function getTerritoryLabel(record: CallCenterResponse) {
  const barrio = record.barrioNombre || 'Sin barrio';
  const comuna = record.comunaNombre
    ? ` / ${record.comunaNombre}`
    : '';

  return `${barrio}${comuna}`;
}

function getNextAction(
  record: CallCenterResponse,
): NextActionInfo {
  const estadoCaso = normalizeCode(record.estadoCaso);
  const estadoVisita = normalizeCode(record.estadoVisita);

  if (isRecordCancelled(record)) {
    return {
      label: 'Solo consultar',
      detail: 'El caso o la visita se encuentra cancelado.',
      color: 'default',
    };
  }

  if (isRecordClosed(record)) {
    return {
      label: 'Caso finalizado',
      detail: 'Consulta el detalle y el resultado registrado.',
      color: 'success',
    };
  }

  if (
    estadoCaso === 'VISITA_NO_ATENDIDA' ||
    estadoCaso === 'REPROGRAMADO' ||
    estadoVisita.includes('NO_ATENDIDA') ||
    estadoVisita.includes('REPROGRAMADO')
  ) {
    return {
      label: 'Revisar visita',
      detail: 'Consulta el resultado y la posible reprogramación.',
      color: 'warning',
    };
  }

  if (
    record.fechaEncuestaProgramada ||
    hasEncuestador(record) ||
    estadoCaso === 'VISITA_PROGRAMADA' ||
    estadoCaso === 'ASIGNADO_ENCUESTADOR'
  ) {
    return {
      label: 'Seguimiento de visita',
      detail: 'La programación continúa aunque no haya contacto telefónico.',
      color: 'info',
    };
  }

  if (
    estadoCaso === 'NO_CONTACTADO' ||
    record.llamadaConectada === false
  ) {
    return {
      label: 'Registrar nuevo intento',
      detail: 'Guarda el intento sin cancelar una visita existente.',
      color: 'warning',
    };
  }

  return {
    label: 'Gestionar llamada',
    detail: 'Registra el intento y confirma la información disponible.',
    color: 'primary',
  };
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
  return String(value ?? 'Sin dato')
    .split('_')
    .join(' ')
    .toLowerCase()
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

function getStatusColor(
  value?: string | null,
): ChipColor {
  const normalized = normalizeCode(value);

  /*
   * Los estados negativos se evalúan primero porque
   * NO_CONTACTADO también contiene el texto CONTACTADO.
   */
  if (
    normalized.includes('CANCELADO') ||
    normalized.includes('SIN_DISPOSICION') ||
    normalized.includes('NO_ACEPTA')
  ) {
    return 'error';
  }

  if (
    normalized.includes('REPROGRAMADO') ||
    normalized.includes('NO_CONTACTADO') ||
    normalized.includes('NO_ATENDIDA')
  ) {
    return 'warning';
  }

  if (
    normalized.includes('CERRADO') ||
    normalized.includes('REALIZADA') ||
    normalized === 'CONTACTADO'
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