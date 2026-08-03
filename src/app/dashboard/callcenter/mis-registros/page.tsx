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

<<<<<<< HEAD
/**
 * Estado local para mostrar mensajes.
 */
=======
>>>>>>> 83e17bb7f2fd68dff7a999a1ba42ab0a993e0ee8
type SnackbarState = {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'warning' | 'info';
};

<<<<<<< HEAD
/**
 * Color permitido para chips.
 */
=======
>>>>>>> 83e17bb7f2fd68dff7a999a1ba42ab0a993e0ee8
type ChipColor =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'error'
  | 'info'
  | 'success'
  | 'warning';

<<<<<<< HEAD
/**
 * Estado local de filtros.
 */
=======
>>>>>>> 83e17bb7f2fd68dff7a999a1ba42ab0a993e0ee8
type RegistroFilterState = {
  q: string;
  estadoCaso: string;
  tipoSolicitud: string;
  condicion: string;
};

<<<<<<< HEAD
=======
type NextActionInfo = {
  label: string;
  detail: string;
  color: ChipColor;
};

>>>>>>> 83e17bb7f2fd68dff7a999a1ba42ab0a993e0ee8
const initialFilters: RegistroFilterState = {
  q: '',
  estadoCaso: 'TODOS',
  tipoSolicitud: 'TODOS',
  condicion: 'TODOS',
};

<<<<<<< HEAD
/**
 * Estados formales disponibles en el filtro.
 */
=======
>>>>>>> 83e17bb7f2fd68dff7a999a1ba42ab0a993e0ee8
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
  'VISITA_REALIZADA',
  'CERRADO',
  'CANCELADO',
];

<<<<<<< HEAD
/**
 * Tipos de solicitud disponibles.
 */
=======
>>>>>>> 83e17bb7f2fd68dff7a999a1ba42ab0a993e0ee8
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
<<<<<<< HEAD
 * Página de casos asignados al funcionario Call Center.
=======
 * Bandeja personal del funcionario Call Center autenticado.
 *
 * Esta pantalla usa únicamente la información resumida entregada
 * por el endpoint personal. El historial completo de llamadas y
 * visitas se consulta en el detalle de cada caso.
>>>>>>> 83e17bb7f2fd68dff7a999a1ba42ab0a993e0ee8
 */
export default function MisRegistrosCallCenterPage() {
  const router = useRouter();

  const [pageData, setPageData] =
    useState<PageResponse<CallCenterResponse> | null>(null);
<<<<<<< HEAD
  const [loading, setLoading] = useState(true);

  const [searchText, setSearchText] = useState('');
  const [estadoCasoFiltro, setEstadoCasoFiltro] = useState('TODOS');
  const [tipoSolicitudFiltro, setTipoSolicitudFiltro] =
    useState('TODOS');
  const [condicionFiltro, setCondicionFiltro] = useState('TODOS');
  const [appliedFilters, setAppliedFilters] =
    useState<RegistroFilterState>(initialFilters);
=======

  const [loading, setLoading] =
    useState(true);
>>>>>>> 83e17bb7f2fd68dff7a999a1ba42ab0a993e0ee8

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

<<<<<<< HEAD
  const hasActiveFilters = Boolean(
    searchText.trim()
    || estadoCasoFiltro !== 'TODOS'
    || tipoSolicitudFiltro !== 'TODOS'
    || condicionFiltro !== 'TODOS',
  );

=======
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

>>>>>>> 83e17bb7f2fd68dff7a999a1ba42ab0a993e0ee8
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

<<<<<<< HEAD
=======
  /**
   * Consulta únicamente los casos del funcionario autenticado.
   */
>>>>>>> 83e17bb7f2fd68dff7a999a1ba42ab0a993e0ee8
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
<<<<<<< HEAD
    setAppliedFilters(initialFilters);

    load(0, size, initialFilters);
  }

  function handlePageChange(_: unknown, nextPage: number) {
    load(nextPage, size, appliedFilters);
  }

  function handleRowsPerPageChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    load(
=======
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
>>>>>>> 83e17bb7f2fd68dff7a999a1ba42ab0a993e0ee8
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

<<<<<<< HEAD
  function openGestionCaso(id: number) {
    router.push(`/dashboard/callcenter/mis-registros/${id}`);
=======
  function openGestionCaso(
    id: number,
  ) {
    router.push(
      `/dashboard/callcenter/mis-registros/${id}`,
    );
>>>>>>> 83e17bb7f2fd68dff7a999a1ba42ab0a993e0ee8
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
<<<<<<< HEAD
              Mis registros Call Center
=======
              Casos por gestionar
>>>>>>> 83e17bb7f2fd68dff7a999a1ba42ab0a993e0ee8
            </Typography>

            <Typography
              component="p"
              variant="body2"
<<<<<<< HEAD
              sx={{ color: 'text.secondary' }}
            >
              Casos asignados a tu cuenta para gestionar llamadas y coordinar visitas.
=======
              sx={{
                color: 'text.secondary',
                mt: 0.5,
              }}
            >
              Bandeja personal para registrar llamadas y asignar
              el encuestador, la fecha y la hora de visita.
>>>>>>> 83e17bb7f2fd68dff7a999a1ba42ab0a993e0ee8
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
<<<<<<< HEAD
            label="Registros en página"
=======
            label="Casos en esta página"
>>>>>>> 83e17bb7f2fd68dff7a999a1ba42ab0a993e0ee8
            value={records.length}
          />

          <SummaryCard
<<<<<<< HEAD
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
=======
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
>>>>>>> 83e17bb7f2fd68dff7a999a1ba42ab0a993e0ee8
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
<<<<<<< HEAD
                  Filtros de búsqueda
=======
                  Buscar casos
>>>>>>> 83e17bb7f2fd68dff7a999a1ba42ab0a993e0ee8
                </Typography>

                <Typography
                  component="p"
                  variant="body2"
<<<<<<< HEAD
                  sx={{ color: 'text.secondary' }}
                >
                  Selecciona los filtros y pulsa Buscar. La consulta se realiza en backend.
=======
                  sx={{
                    color: 'text.secondary',
                  }}
                >
                  Los filtros se aplican sobre la consulta del
                  backend al pulsar Buscar.
>>>>>>> 83e17bb7f2fd68dff7a999a1ba42ab0a993e0ee8
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
<<<<<<< HEAD
                  onChange={(event) => {
                    setSearchText(event.target.value);
                  }}
=======
                  onChange={(event) =>
                    setSearchText(
                      event.target.value,
                    )
                  }
>>>>>>> 83e17bb7f2fd68dff7a999a1ba42ab0a993e0ee8
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
<<<<<<< HEAD
                    label="Estado caso"
                    value={estadoCasoFiltro}
                    onChange={(event) => {
                      setEstadoCasoFiltro(
                        String(event.target.value),
                      );
                    }}
=======
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
>>>>>>> 83e17bb7f2fd68dff7a999a1ba42ab0a993e0ee8
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
<<<<<<< HEAD
                    label="Tipo solicitud"
                    value={tipoSolicitudFiltro}
                    onChange={(event) => {
                      setTipoSolicitudFiltro(
                        String(event.target.value),
                      );
                    }}
=======
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
>>>>>>> 83e17bb7f2fd68dff7a999a1ba42ab0a993e0ee8
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
<<<<<<< HEAD
                    label="Condición"
                    value={condicionFiltro}
                    onChange={(event) => {
                      setCondicionFiltro(
                        String(event.target.value),
                      );
                    }}
=======
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
>>>>>>> 83e17bb7f2fd68dff7a999a1ba42ab0a993e0ee8
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
<<<<<<< HEAD
                  sx={{ color: 'text.secondary' }}
=======
                  sx={{
                    color: 'text.secondary',
                  }}
>>>>>>> 83e17bb7f2fd68dff7a999a1ba42ab0a993e0ee8
                >
                  {loading
                    ? 'Actualizando casos...'
                    : `Mostrando ${records.length} de ${total} caso(s).`}
                </Typography>

                <Box
                  sx={{
                    display: 'flex',
<<<<<<< HEAD
                    gap: 1,
                    justifyContent: {
                      xs: 'stretch',
                      sm: 'flex-end',
                    },
=======
                    flexDirection: {
                      xs: 'column',
                      sm: 'row',
                    },
                    gap: 1,
>>>>>>> 83e17bb7f2fd68dff7a999a1ba42ab0a993e0ee8
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
<<<<<<< HEAD
          Desde esta vista solo se consultan tus casos asignados.
          Para registrar llamadas o asignar una visita, usa el botón{' '}
          <strong>Gestionar</strong>.
=======
          Selecciona <strong>Gestionar caso</strong> para registrar
          la llamada o intento y asignar el encuestador, la fecha
          y la hora de visita. Los casos cerrados permanecen
          disponibles para consulta.
>>>>>>> 83e17bb7f2fd68dff7a999a1ba42ab0a993e0ee8
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
<<<<<<< HEAD
                    <TableCell>Caso</TableCell>
                    <TableCell>Ciudadano</TableCell>
                    <TableCell>Contacto</TableCell>
                    <TableCell>Dirección</TableCell>
                    <TableCell>Solicitud</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell>Encuestador</TableCell>
                    <TableCell align="right">
                      Acciones
=======
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
>>>>>>> 83e17bb7f2fd68dff7a999a1ba42ab0a993e0ee8
                    </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {records.map((record) => {
<<<<<<< HEAD
                    const closed = isRecordClosed(record);
                    const encuestadorNombre =
                      record.encuestadorAsignadoNombre
                      || record.encuestadorProgramadoNombre
                      || 'Sin asignar';
=======
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
>>>>>>> 83e17bb7f2fd68dff7a999a1ba42ab0a993e0ee8

                    return (
                      <TableRow
                        key={record.id}
                        hover
                      >
                        <TableCell>
                          <Box
                            sx={{
                              display: 'flex',
<<<<<<< HEAD
                              alignItems: 'center',
=======
                              alignItems:
                                'center',
>>>>>>> 83e17bb7f2fd68dff7a999a1ba42ab0a993e0ee8
                              gap: 1,
                            }}
                          >
                            <Avatar
                              sx={{
                                width: 34,
                                height: 34,
                              }}
                            >
<<<<<<< HEAD
                              {getRecordIcon(record)}
=======
                              {getRecordIcon(
                                record,
                              )}
>>>>>>> 83e17bb7f2fd68dff7a999a1ba42ab0a993e0ee8
                            </Avatar>

                            <Box>
                              <Typography
                                component="p"
                                variant="body2"
<<<<<<< HEAD
                                sx={{ fontWeight: 800 }}
=======
                                sx={{
                                  fontWeight: 800,
                                }}
>>>>>>> 83e17bb7f2fd68dff7a999a1ba42ab0a993e0ee8
                              >
                                {`Caso #${record.id}`}
                              </Typography>

                              <Typography
                                component="p"
                                variant="caption"
<<<<<<< HEAD
                                sx={{ color: 'text.secondary' }}
                              >
                                {record.fechaLlamada || 'Sin fecha'}
=======
                                sx={{
                                  color:
                                    'text.secondary',
                                }}
                              >
                                {formatLabel(
                                  record.tipoSolicitudCallcenter ||
                                    'NUEVA_ENCUESTA',
                                )}
>>>>>>> 83e17bb7f2fd68dff7a999a1ba42ab0a993e0ee8
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>

                        <TableCell>
                          <InfoCell
<<<<<<< HEAD
                            icon={<PersonIcon fontSize="small" />}
                            title={
                              record.nombreCompleto
                              || 'Sin nombre'
                            }
                            subtitle={`C.C. ${
                              record.cedulaSolicitante
                              || 'Sin dato'
                            }`}
=======
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
>>>>>>> 83e17bb7f2fd68dff7a999a1ba42ab0a993e0ee8
                          />
                        </TableCell>

                        <TableCell>
<<<<<<< HEAD
                          <InfoCell
                            icon={<PhoneIcon fontSize="small" />}
                            title={
                              record.telefono
                              || 'Sin teléfono'
                            }
                            subtitle={getCallConnectionLabel(
                              record.llamadaConectada,
                            )}
                          />
                        </TableCell>

                        <TableCell>
                          <InfoCell
                            icon={<HomeWorkIcon fontSize="small" />}
                            title={
                              record.direccionTexto
                              || 'Sin dirección'
                            }
                            subtitle={`${record.barrioNombre || 'Sin barrio'}${
                              record.comunaNombre
                                ? ` / ${record.comunaNombre}`
                                : ''
                            }`}
                          />
                        </TableCell>

                        <TableCell>
                          <Chip
                            size="small"
                            variant="outlined"
                            label={formatLabel(
                              record.tipoSolicitudCallcenter
                              || 'SIN_DATO',
                            )}
                          />
                        </TableCell>

                        <TableCell>
                          <Box
                            sx={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 0.5,
                              alignItems: 'flex-start',
                            }}
                          >
                            <Chip
                              size="small"
                              color={getStatusColor(record.estadoCaso)}
                              label={formatLabel(
                                record.estadoCaso || 'SIN_ESTADO',
                              )}
                            />

                            {closed ? (
                              <Typography
                                component="p"
                                variant="caption"
                                sx={{ color: 'text.secondary' }}
                              >
                                Solo consulta
                              </Typography>
                            ) : null}
=======
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
>>>>>>> 83e17bb7f2fd68dff7a999a1ba42ab0a993e0ee8
                          </Box>
                        </TableCell>

                        <TableCell>
                          <InfoCell
                            icon={
                              <AssignmentIndIcon fontSize="small" />
                            }
<<<<<<< HEAD
                            title={encuestadorNombre}
                            subtitle={
                              record.fechaEncuestaProgramada
                              || 'Sin fecha programada'
=======
                            title={
                              encuestadorNombre
                            }
                            subtitle={
                              record.fechaEncuestaProgramada
                                ? `Fecha: ${record.fechaEncuestaProgramada}`
                                : 'Sin fecha programada'
>>>>>>> 83e17bb7f2fd68dff7a999a1ba42ab0a993e0ee8
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
<<<<<<< HEAD
                              closed
                                ? 'outlined'
                                : 'contained'
                            }
                            startIcon={<VisibilityIcon />}
                            onClick={() => {
                              openGestionCaso(record.id);
                            }}
=======
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
>>>>>>> 83e17bb7f2fd68dff7a999a1ba42ab0a993e0ee8
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
<<<<<<< HEAD
                      rowsPerPageOptions={[
                        10,
                        20,
                        50,
                        100,
                      ]}
                      onPageChange={handlePageChange}
=======
                      rowsPerPageOptions={
                        PAGE_SIZE_OPTIONS
                      }
                      onPageChange={
                        handlePageChange
                      }
>>>>>>> 83e17bb7f2fd68dff7a999a1ba42ab0a993e0ee8
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
<<<<<<< HEAD
          sx={{ color: 'text.secondary' }}
=======
          sx={{
            color: 'text.secondary',
          }}
>>>>>>> 83e17bb7f2fd68dff7a999a1ba42ab0a993e0ee8
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
<<<<<<< HEAD
=======
          flexShrink: 0,
>>>>>>> 83e17bb7f2fd68dff7a999a1ba42ab0a993e0ee8
        }}
      >
        {icon}
      </Box>

<<<<<<< HEAD
      <Box>
        <Typography
          component="p"
          variant="body2"
          sx={{ fontWeight: 700 }}
=======
      <Box sx={{ minWidth: 0 }}>
        <Typography
          component="p"
          variant="body2"
          sx={{
            fontWeight: 700,
            overflowWrap: 'anywhere',
          }}
>>>>>>> 83e17bb7f2fd68dff7a999a1ba42ab0a993e0ee8
        >
          {title}
        </Typography>

        <Typography
          component="p"
          variant="caption"
<<<<<<< HEAD
          sx={{ color: 'text.secondary' }}
=======
          sx={{
            color: 'text.secondary',
            overflowWrap: 'anywhere',
          }}
>>>>>>> 83e17bb7f2fd68dff7a999a1ba42ab0a993e0ee8
        >
          {subtitle}
        </Typography>
      </Box>
    </Box>
  );
}

<<<<<<< HEAD
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

function hasEncuestador(record: CallCenterResponse) {
  return Boolean(
    record.encuestadorAsignadoNombre
    || record.encuestadorProgramadoNombre,
  );
}

function isRecordClosed(record: CallCenterResponse) {
  const estadoCaso = normalizeCode(record.estadoCaso);

  return estadoCaso === 'CERRADO'
    || estadoCaso === 'CANCELADO';
}

function getRecordIcon(record: CallCenterResponse) {
  const estadoCaso = normalizeCode(record.estadoCaso);

  if (estadoCaso === 'CANCELADO') {
    return <CancelIcon />;
  }

  if (estadoCaso === 'CERRADO') {
    return <CheckCircleIcon />;
  }

  if (
    estadoCaso.includes('NO_CONTACTADO')
    || estadoCaso.includes('NO_ATENDIDA')
    || estadoCaso.includes('REPROGRAMADO')
    || estadoCaso.includes('SIN_DISPOSICION')
=======
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
>>>>>>> 83e17bb7f2fd68dff7a999a1ba42ab0a993e0ee8
  ) {
    return <WarningAmberIcon />;
  }

  return <AssignmentIndIcon />;
}

<<<<<<< HEAD
function normalizeCode(
  value?: string | number | null,
) {
  return String(value ?? '')
    .trim()
    .toUpperCase();
}

function formatLabel(value?: string | null) {
  return String(value ?? 'Sin dato')
    .split('_')
    .join(' ')
    .toLowerCase()
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

function getStatusColor(value?: string | null): ChipColor {
  const normalized = normalizeCode(value);

  if (
    normalized.includes('CANCELADO')
    || normalized.includes('SIN_DISPOSICION')
    || normalized.includes('NO_ACEPTA')
  ) {
    return 'error';
  }

  if (
    normalized.includes('REPROGRAMADO')
    || normalized.includes('NO_CONTACTADO')
    || normalized.includes('NO_ATENDIDA')
  ) {
    return 'warning';
  }

  if (
    normalized.includes('CERRADO')
    || normalized.includes('REALIZADA')
    || normalized.includes('CONTACTADO_ACEPTA')
=======
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
>>>>>>> 83e17bb7f2fd68dff7a999a1ba42ab0a993e0ee8
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

<<<<<<< HEAD
=======
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

>>>>>>> 83e17bb7f2fd68dff7a999a1ba42ab0a993e0ee8
  return 'default';
}