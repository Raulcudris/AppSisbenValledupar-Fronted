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

/**
 * Estado local para mostrar mensajes informativos, exitosos o de error.
 */
type SnackbarState = {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'warning' | 'info';
};

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
 * Estado local de filtros de la pantalla.
 *
 * Se separan los filtros escritos en pantalla de los filtros aplicados
 * para que la búsqueda se ejecute únicamente al pulsar el botón Buscar.
 */
type RegistroFilterState = {
  q: string;
  estadoCaso: string;
  tipoSolicitud: string;
  condicion: string;
};

/**
 * Filtros iniciales de la pantalla.
 */
const initialFilters: RegistroFilterState = {
  q: '',
  estadoCaso: 'TODOS',
  tipoSolicitud: 'TODOS',
  condicion: 'TODOS',
};

/**
 * Estados formales más usados en el flujo de Call Center.
 */
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

/**
 * Tipos de solicitud disponibles para el filtro de Mis registros.
 */
const TIPOS_SOLICITUD_FILTRO = [
  'NUEVA_ENCUESTA',
  'INCLUSION',
  'VERIFICACION',
  'OTRO',
];

/**
 * Página de casos asignados al funcionario Call Center autenticado.
 *
 * Esta pantalla lista los casos asignados, permite aplicar filtros desde
 * backend y abrir la gestión operativa del caso. El registro de llamadas y
 * la asignación de visita se realizan desde la pantalla de detalle.
 */
export default function MisRegistrosCallCenterPage() {
  const router = useRouter();

  const [pageData, setPageData] = useState<PageResponse<CallCenterResponse> | null>(null);
  const [loading, setLoading] = useState(true);

  const [searchText, setSearchText] = useState('');
  const [estadoCasoFiltro, setEstadoCasoFiltro] = useState('TODOS');
  const [tipoSolicitudFiltro, setTipoSolicitudFiltro] = useState('TODOS');
  const [condicionFiltro, setCondicionFiltro] = useState('TODOS');
  const [appliedFilters, setAppliedFilters] = useState<RegistroFilterState>(initialFilters);

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

  const hasActiveFilters = Boolean(
    searchText.trim()
    || estadoCasoFiltro !== 'TODOS'
    || tipoSolicitudFiltro !== 'TODOS'
    || condicionFiltro !== 'TODOS'
  );

  /**
   * Muestra un mensaje de estado al usuario.
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
   * Cierra el mensaje emergente.
   */
  function closeSnackbar() {
    setSnackbar((current) => ({
      ...current,
      open: false,
    }));
  }

  /**
   * Carga los registros asignados al funcionario Call Center autenticado
   * aplicando filtros desde backend.
   *
   * @param nextPage página solicitada.
   * @param nextSize tamaño de página.
   * @param filters filtros aplicados.
   */
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
        q: filters.q,
        estadoCaso: filters.estadoCaso,
        tipoSolicitudCallcenter: filters.tipoSolicitud,
        condicion: filters.condicion,
      });

      setPageData(response);
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'No fue posible cargar tus registros asignados.';

      showMessage(message, 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(0, 20, initialFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Ejecuta la búsqueda con los filtros seleccionados contra backend.
   */
  function handleSearch() {
    const nextFilters: RegistroFilterState = {
      q: searchText,
      estadoCaso: estadoCasoFiltro,
      tipoSolicitud: tipoSolicitudFiltro,
      condicion: condicionFiltro,
    };

    setAppliedFilters(nextFilters);
    load(0, size, nextFilters);
  }

  /**
   * Limpia los filtros visuales y vuelve a consultar sin filtros.
   */
  function clearFilters() {
    setSearchText('');
    setEstadoCasoFiltro('TODOS');
    setTipoSolicitudFiltro('TODOS');
    setCondicionFiltro('TODOS');
    setAppliedFilters(initialFilters);
    load(0, size, initialFilters);
  }

  /**
   * Cambia la página de la tabla conservando filtros backend.
   *
   * @param _ evento no utilizado.
   * @param nextPage página siguiente.
   */
  function handlePageChange(_: unknown, nextPage: number) {
    load(nextPage, size, appliedFilters);
  }

  /**
   * Cambia el tamaño de página conservando filtros backend.
   *
   * @param event evento del selector de tamaño.
   */
  function handleRowsPerPageChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    load(0, Number(event.target.value), appliedFilters);
  }

  /**
   * Refresca la página actual conservando filtros backend.
   */
  function refresh() {
    load(page, size, appliedFilters);
  }

  /**
   * Abre la pantalla de gestión formal del caso.
   *
   * @param id identificador del caso Call Center.
   */
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
          Cargando tus registros asignados...
        </Typography>
      </Box>
    );
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
              Mis registros Call Center
            </Typography>

            <Typography component="p" variant="body2" sx={{ color: 'text.secondary' }}>
              Casos asignados a tu cuenta para gestionar llamadas y coordinar visitas.
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
              lg: '1fr 1fr 1fr 1fr',
            },
            gap: 1.5,
          }}
        >
          <SummaryCard label="Registros cargados" value={records.length} />
          <SummaryCard label="Abiertos" value={casosAbiertos} />
          <SummaryCard label="Cerrados / cancelados" value={casosCerrados} />
          <SummaryCard label="Con encuestador" value={casosConEncuestador} />
        </Box>

        <Card variant="outlined">
          <CardContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography component="h2" variant="h6" sx={{ fontWeight: 800 }}>
                  Filtros de búsqueda
                </Typography>

                <Typography component="p" variant="body2" sx={{ color: 'text.secondary' }}>
                  Selecciona los filtros y pulsa Buscar. La consulta se realiza directamente en base de datos.
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
                  label="Buscar"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Nombre, cédula, teléfono, dirección, barrio o caso"
                  fullWidth
                />

                <FormControl fullWidth>
                  <InputLabel>Estado caso</InputLabel>

                  <Select
                    label="Estado caso"
                    value={estadoCasoFiltro}
                    onChange={(event) => setEstadoCasoFiltro(String(event.target.value))}
                  >
                    <MenuItem value="TODOS">Todos</MenuItem>

                    {ESTADOS_CASO_FILTRO.map((estado) => (
                      <MenuItem key={estado} value={estado}>
                        {formatLabel(estado)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth>
                  <InputLabel>Tipo solicitud</InputLabel>

                  <Select
                    label="Tipo solicitud"
                    value={tipoSolicitudFiltro}
                    onChange={(event) => setTipoSolicitudFiltro(String(event.target.value))}
                  >
                    <MenuItem value="TODOS">Todas</MenuItem>

                    {TIPOS_SOLICITUD_FILTRO.map((tipo) => (
                      <MenuItem key={tipo} value={tipo}>
                        {formatLabel(tipo)}
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
                    <MenuItem value="TODOS">Todas</MenuItem>
                    <MenuItem value="ABIERTOS">Casos abiertos</MenuItem>
                    <MenuItem value="CERRADOS">Cerrados / cancelados</MenuItem>
                    <MenuItem value="CON_ENCUESTADOR">Con encuestador</MenuItem>
                    <MenuItem value="SIN_ENCUESTADOR">Sin encuestador</MenuItem>
                  </Select>
                </FormControl>
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
                  {loading
                    ? 'Actualizando registros...'
                    : `Mostrando ${records.length} de ${total} registro(s).`}
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

        <Alert severity="info">
          Desde esta vista solo se consultan tus casos asignados. Para registrar llamadas o asignar una visita,
          usa el botón <strong>Gestionar</strong>.
        </Alert>

        {records.length === 0 ? (
          <Paper sx={{ p: 3 }}>
            <Alert severity="info">
              No se encontraron registros con los filtros aplicados.
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
                    <TableCell>Contacto</TableCell>
                    <TableCell>Dirección</TableCell>
                    <TableCell>Solicitud</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell>Encuestador</TableCell>
                    <TableCell align="right">Acciones</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {records.map((record) => {
                    const closed = isRecordClosed(record);
                    const encuestadorNombre = record.encuestadorAsignadoNombre
                      || record.encuestadorProgramadoNombre
                      || 'Sin asignar';

                    return (
                      <TableRow key={record.id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ width: 34, height: 34 }}>
                              {getRecordIcon(record)}
                            </Avatar>

                            <Box>
                              <Typography component="p" variant="body2" sx={{ fontWeight: 800 }}>
                                {`Caso #${record.id}`}
                              </Typography>

                              <Typography component="p" variant="caption" sx={{ color: 'text.secondary' }}>
                                {record.fechaLlamada || 'Sin fecha'} · {record.horaLlamada?.slice(0, 5) || 'Sin hora'}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>

                        <TableCell>
                          <InfoCell
                            icon={<PersonIcon fontSize="small" />}
                            title={record.nombreCompleto || 'Sin nombre'}
                            subtitle={`C.C. ${record.cedulaSolicitante || 'Sin dato'}`}
                          />
                        </TableCell>

                        <TableCell>
                          <InfoCell
                            icon={<PhoneIcon fontSize="small" />}
                            title={record.telefono || 'Sin teléfono'}
                            subtitle={record.llamadaConectada === true ? 'Llamada conectada' : 'Sin conexión confirmada'}
                          />
                        </TableCell>

                        <TableCell>
                          <InfoCell
                            icon={<HomeWorkIcon fontSize="small" />}
                            title={record.direccionTexto || 'Sin dirección'}
                            subtitle={`${record.barrioNombre || 'Sin barrio'}${record.comunaNombre ? ` / ${record.comunaNombre}` : ''}`}
                          />
                        </TableCell>

                        <TableCell>
                          <Chip
                            size="small"
                            variant="outlined"
                            label={formatLabel(record.tipoSolicitudCallcenter || 'NUEVA_ENCUESTA')}
                          />
                        </TableCell>

                        <TableCell>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'flex-start' }}>
                            <Chip
                              size="small"
                              color={getStatusColor(record.estadoCaso)}
                              label={formatLabel(record.estadoCaso || 'ASIGNADO_CALLCENTER')}
                            />

                            {closed && (
                              <Typography component="p" variant="caption" sx={{ color: 'text.secondary' }}>
                                Solo consulta
                              </Typography>
                            )}
                          </Box>
                        </TableCell>

                        <TableCell>
                          <InfoCell
                            icon={<AssignmentIndIcon fontSize="small" />}
                            title={encuestadorNombre}
                            subtitle={record.fechaEncuestaProgramada || 'Sin fecha programada'}
                          />
                        </TableCell>

                        <TableCell align="right">
                          <Button
                            size="small"
                            variant={closed ? 'outlined' : 'contained'}
                            startIcon={<VisibilityIcon />}
                            onClick={() => openGestionCaso(record.id)}
                          >
                            Gestionar
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
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
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
 * Celda auxiliar con icono, título y subtítulo.
 */
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
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
      <Box sx={{ color: 'text.secondary', mt: 0.2 }}>
        {icon}
      </Box>

      <Box>
        <Typography component="p" variant="body2" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>

        <Typography component="p" variant="caption" sx={{ color: 'text.secondary' }}>
          {subtitle}
        </Typography>
      </Box>
    </Box>
  );
}

/**
 * Valida si el registro tiene encuestador asociado.
 *
 * @param record registro evaluado.
 * @returns true si tiene encuestador.
 */
function hasEncuestador(record: CallCenterResponse) {
  return Boolean(record.encuestadorAsignadoNombre || record.encuestadorProgramadoNombre);
}

/**
 * Valida si el caso está cerrado o cancelado.
 *
 * @param record registro evaluado.
 * @returns true si el caso está cerrado.
 */
function isRecordClosed(record: CallCenterResponse) {
  const estadoCaso = normalizeCode(record.estadoCaso);
  const estadoVisita = normalizeCode(record.estadoVisita);

  return record.encuestaRealizada === true
    || estadoCaso === 'CERRADO'
    || estadoCaso === 'CANCELADO'
    || estadoVisita === 'REALIZADA'
    || estadoVisita === 'CANCELADA';
}

/**
 * Obtiene un icono representativo según el estado del caso.
 *
 * @param record registro evaluado.
 * @returns icono visual.
 */
function getRecordIcon(record: CallCenterResponse) {
  const estadoCaso = normalizeCode(record.estadoCaso);

  if (isRecordClosed(record)) {
    return <CheckCircleIcon />;
  }

  if (estadoCaso.includes('CANCELADO')) {
    return <CancelIcon />;
  }

  if (
    estadoCaso.includes('NO_CONTACTADO')
    || estadoCaso.includes('NO_ATENDIDA')
    || estadoCaso.includes('REPROGRAMADO')
  ) {
    return <WarningAmberIcon />;
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
 * Convierte códigos técnicos en etiquetas legibles.
 *
 * @param value código técnico.
 * @returns etiqueta visible.
 */
function formatLabel(value?: string | null) {
  return String(value ?? 'Sin dato')
    .split('_')
    .join(' ')
    .toLowerCase()
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

/**
 * Define el color visual de los estados del caso.
 *
 * @param value estado técnico.
 * @returns color del chip.
 */
function getStatusColor(value?: string | null): ChipColor {
  const normalized = String(value ?? '').toUpperCase();

  if (
    normalized.includes('CERRADO')
    || normalized.includes('REALIZADA')
    || normalized.includes('CONTACTADO')
  ) {
    return 'success';
  }

  if (
    normalized.includes('PENDIENTE')
    || normalized.includes('ASIGNADO')
    || normalized.includes('GESTION')
    || normalized.includes('PROGRAMADA')
  ) {
    return 'info';
  }

  if (
    normalized.includes('REPROGRAMADO')
    || normalized.includes('NO_CONTACTADO')
    || normalized.includes('NO_ATENDIDA')
  ) {
    return 'warning';
  }

  if (
    normalized.includes('CANCELADO')
    || normalized.includes('SIN_DISPOSICION')
    || normalized.includes('NO_ACEPTA')
  ) {
    return 'error';
  }

  return 'default';
}