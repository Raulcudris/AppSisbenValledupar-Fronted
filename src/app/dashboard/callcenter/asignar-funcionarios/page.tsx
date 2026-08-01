'use client';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import PersonIcon from '@mui/icons-material/Person';
import PhoneIcon from '@mui/icons-material/Phone';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
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
import { ChangeEvent, useEffect, useMemo, useState, type ReactNode } from 'react';

import {
  asignarFuncionarioCallCenter,
  getFuncionariosCallCenterOptions,
  getPendientesAsignarFuncionarioCallCenter,
  searchCallCenter,
} from '@/services/callcenter.service';
import { PageResponse } from '@/types/api.types';
import { CallCenterUserOptionResponse } from '@/types/callcenter-assignment.types';
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
 * Filtros para consultar registros ya asignados a un funcionario Call Center.
 */
type AssignedFilterState = {
  funcionarioId: string;
  q: string;
};

/**
 * Filtros iniciales de la consulta de registros asignados.
 */
const initialAssignedFilters: AssignedFilterState = {
  funcionarioId: '',
  q: '',
};

/**
 * Página de asignación de casos Call Center a funcionarios.
 *
 * Esta vista pertenece al flujo del Coordinador / Enrutador Call Center.
 * Permite asignar casos pendientes a funcionarios Call Center y consultar
 * los ciudadanos que ya fueron asignados a cada funcionario.
 */
export default function AsignarFuncionariosCallCenterPage() {
  const router = useRouter();

  const [pageData, setPageData] = useState<PageResponse<CallCenterResponse> | null>(null);
  const [assignedPageData, setAssignedPageData] = useState<PageResponse<CallCenterResponse> | null>(null);

  const [funcionarios, setFuncionarios] = useState<CallCenterUserOptionResponse[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [funcionarioId, setFuncionarioId] = useState('');

  const [assignedFuncionarioId, setAssignedFuncionarioId] = useState('');
  const [assignedSearchText, setAssignedSearchText] = useState('');
  const [appliedAssignedFilters, setAppliedAssignedFilters] = useState<AssignedFilterState>(initialAssignedFilters);

  const [loadingPending, setLoadingPending] = useState(false);
  const [loadingAssigned, setLoadingAssigned] = useState(false);
  const [saving, setSaving] = useState(false);

  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success',
  });

  const records = pageData?.content ?? [];
  const page = pageData?.page ?? 0;
  const size = pageData?.size ?? 20;
  const total = pageData?.totalElements ?? 0;

  const assignedRecords = assignedPageData?.content ?? [];
  const assignedPage = assignedPageData?.page ?? 0;
  const assignedSize = assignedPageData?.size ?? 10;
  const assignedTotal = assignedPageData?.totalElements ?? 0;

  const allVisibleSelected = records.length > 0
    && records.every((record) => selectedIds.includes(record.id));

  const someVisibleSelected = records.some((record) => selectedIds.includes(record.id));

  const selectedCount = useMemo(() => selectedIds.length, [selectedIds]);

  const selectedFuncionarioName = useMemo(
    () => getFuncionarioLabel(funcionarios.find((item) => String(item.id) === funcionarioId)),
    [funcionarios, funcionarioId],
  );

  const assignedFuncionarioName = useMemo(
    () => getFuncionarioLabel(funcionarios.find((item) => String(item.id) === assignedFuncionarioId)),
    [funcionarios, assignedFuncionarioId],
  );

  const assignedHasFilters = Boolean(assignedFuncionarioId || assignedSearchText.trim());

  useEffect(() => {
    void loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Carga datos iniciales de la vista.
   */
  async function loadInitialData() {
    await Promise.all([
      loadCatalogs(),
      loadPending(0, 20),
    ]);
  }

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
   * Cierra el mensaje emergente.
   */
  function closeSnackbar() {
    setSnackbar((current) => ({
      ...current,
      open: false,
    }));
  }

  /**
   * Carga el catálogo de funcionarios Call Center activos.
   */
  async function loadCatalogs() {
    try {
      const data = await getFuncionariosCallCenterOptions();

      setFuncionarios(data);
    } catch {
      showMessage('No fue posible cargar funcionarios Call Center.', 'warning');
    }
  }

  /**
   * Carga los casos pendientes por asignar a funcionarios Call Center.
   *
   * @param nextPage página solicitada.
   * @param nextSize cantidad de registros por página.
   */
  async function loadPending(nextPage = 0, nextSize = 20) {
    setLoadingPending(true);

    try {
      const response = await getPendientesAsignarFuncionarioCallCenter({
        page: nextPage,
        size: nextSize,
      });

      setPageData(response);
      setSelectedIds([]);
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'No fue posible cargar los pendientes de asignación.';

      showMessage(message, 'error');
    } finally {
      setLoadingPending(false);
    }
  }

  /**
   * Consulta los registros ya asignados a un funcionario Call Center.
   *
   * @param nextPage página solicitada.
   * @param nextSize cantidad de registros por página.
   * @param filters filtros aplicados.
   */
  async function loadAssigned(
    nextPage = 0,
    nextSize = 10,
    filters: AssignedFilterState = appliedAssignedFilters,
  ) {
    if (!filters.funcionarioId) {
      setAssignedPageData(null);
      return;
    }

    setLoadingAssigned(true);

    try {
      const response = await searchCallCenter({
        page: nextPage,
        size: nextSize,
        q: filters.q,
        funcionarioCallcenterAsignadoId: Number(filters.funcionarioId),
        activo: true,
      });

      setAssignedPageData(response);
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'No fue posible consultar los registros asignados al funcionario.';

      showMessage(message, 'error');
    } finally {
      setLoadingAssigned(false);
    }
  }

  /**
   * Selecciona o deselecciona un registro pendiente.
   *
   * @param id identificador del registro.
   */
  function toggleRecord(id: number) {
    setSelectedIds((current) => (
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    ));
  }

  /**
   * Selecciona o deselecciona todos los registros visibles.
   */
  function toggleAllVisible() {
    const visibleIds = records.map((record) => record.id);

    if (allVisibleSelected) {
      setSelectedIds((current) => current.filter((id) => !visibleIds.includes(id)));
      return;
    }

    setSelectedIds((current) => Array.from(new Set([...current, ...visibleIds])));
  }

  /**
   * Asigna los casos seleccionados al funcionario Call Center elegido.
   */
  async function assign() {
    if (!funcionarioId) {
      showMessage('Selecciona el funcionario Call Center.', 'warning');
      return;
    }

    if (selectedIds.length === 0) {
      showMessage('Selecciona al menos un registro.', 'warning');
      return;
    }

    setSaving(true);

    try {
      await asignarFuncionarioCallCenter({
        funcionarioCallcenterId: Number(funcionarioId),
        registroIds: selectedIds,
      });

      showMessage(`Registros asignados correctamente a ${selectedFuncionarioName}.`, 'success');

      const nextAssignedFilters: AssignedFilterState = {
        funcionarioId,
        q: '',
      };

      setAssignedFuncionarioId(funcionarioId);
      setAssignedSearchText('');
      setAppliedAssignedFilters(nextAssignedFilters);
      setFuncionarioId('');

      await Promise.all([
        loadPending(page, size),
        loadAssigned(0, assignedSize, nextAssignedFilters),
      ]);
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'No fue posible asignar los registros.';

      showMessage(message, 'error');
    } finally {
      setSaving(false);
    }
  }

  /**
   * Ejecuta la búsqueda de registros asignados al funcionario seleccionado.
   */
  function searchAssigned() {
    if (!assignedFuncionarioId) {
      showMessage('Selecciona un funcionario para consultar sus registros asignados.', 'warning');
      return;
    }

    const nextFilters: AssignedFilterState = {
      funcionarioId: assignedFuncionarioId,
      q: assignedSearchText,
    };

    setAppliedAssignedFilters(nextFilters);
    void loadAssigned(0, assignedSize, nextFilters);
  }

  /**
   * Limpia la consulta de registros asignados.
   */
  function clearAssignedFilters() {
    setAssignedFuncionarioId('');
    setAssignedSearchText('');
    setAppliedAssignedFilters(initialAssignedFilters);
    setAssignedPageData(null);
  }

  /**
   * Cambia la página de la tabla de pendientes.
   *
   * @param _ evento no utilizado.
   * @param nextPage página siguiente.
   */
  function handlePageChange(_: unknown, nextPage: number) {
    void loadPending(nextPage, size);
  }

  /**
   * Cambia la cantidad de pendientes por página.
   *
   * @param event evento del selector de filas.
   */
  function handleRowsPerPageChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    void loadPending(0, Number(event.target.value));
  }

  /**
   * Cambia la página de la tabla de asignados.
   *
   * @param _ evento no utilizado.
   * @param nextPage página siguiente.
   */
  function handleAssignedPageChange(_: unknown, nextPage: number) {
    void loadAssigned(nextPage, assignedSize, appliedAssignedFilters);
  }

  /**
   * Cambia la cantidad de asignados por página.
   *
   * @param event evento del selector de filas.
   */
  function handleAssignedRowsPerPageChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    void loadAssigned(0, Number(event.target.value), appliedAssignedFilters);
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
              Asignar funcionarios Call Center
            </Typography>

            <Typography component="p" variant="body2" sx={{ color: 'text.secondary' }}>
              Asigna casos pendientes y consulta los ciudadanos asignados a cada funcionario Call Center.
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
              onClick={() => loadPending(page, size)}
              disabled={loadingPending}
            >
              Actualizar pendientes
            </Button>
          </Box>
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
          <SummaryCard label="Pendientes cargados" value={records.length} />
          <SummaryCard label="Seleccionados" value={selectedCount} />
          <SummaryCard label="Funcionarios activos" value={funcionarios.length} />
          <SummaryCard label="Asignados consultados" value={assignedRecords.length} />
        </Box>

        <Card variant="outlined">
          <CardContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography component="h2" variant="h6" sx={{ fontWeight: 800 }}>
                  Asignación de pendientes
                </Typography>

                <Typography component="p" variant="body2" sx={{ color: 'text.secondary' }}>
                  Selecciona uno o varios ciudadanos pendientes y elige el funcionario que realizará la gestión.
                </Typography>
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    md: '2fr auto',
                  },
                  gap: 1.5,
                  alignItems: 'center',
                }}
              >
                <FormControl fullWidth size="small">
                  <InputLabel>Funcionario Call Center</InputLabel>

                  <Select
                    label="Funcionario Call Center"
                    value={funcionarioId}
                    onChange={(event) => setFuncionarioId(String(event.target.value))}
                  >
                    <MenuItem value="">
                      Selecciona un funcionario
                    </MenuItem>

                    {funcionarios.map((item) => (
                      <MenuItem key={item.id} value={String(item.id)}>
                        {getFuncionarioLabel(item)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Button
                  variant="contained"
                  startIcon={<AssignmentIndIcon />}
                  onClick={assign}
                  disabled={saving || selectedCount === 0 || !funcionarioId}
                >
                  {saving ? 'Asignando...' : `Asignar seleccionados (${selectedCount})`}
                </Button>
              </Box>

              {funcionarioId && (
                <Alert severity="info">
                  Los registros seleccionados se asignarán a <strong>{selectedFuncionarioName}</strong>.
                </Alert>
              )}
            </Box>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography component="h2" variant="h6" sx={{ fontWeight: 800 }}>
                  Consultar asignados por funcionario
                </Typography>

                <Typography component="p" variant="body2" sx={{ color: 'text.secondary' }}>
                  Permite que el administrador o coordinador vea los ciudadanos asignados a cada funcionario Call Center.
                </Typography>
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    md: '1.5fr 2fr auto auto',
                  },
                  gap: 1.5,
                  alignItems: 'center',
                }}
              >
                <FormControl fullWidth size="small">
                  <InputLabel>Funcionario asignado</InputLabel>

                  <Select
                    label="Funcionario asignado"
                    value={assignedFuncionarioId}
                    onChange={(event) => setAssignedFuncionarioId(String(event.target.value))}
                  >
                    <MenuItem value="">
                      Selecciona un funcionario
                    </MenuItem>

                    {funcionarios.map((item) => (
                      <MenuItem key={item.id} value={String(item.id)}>
                        {getFuncionarioLabel(item)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  label="Buscar usuario asignado"
                  value={assignedSearchText}
                  onChange={(event) => setAssignedSearchText(event.target.value)}
                  placeholder="Nombre, cédula, teléfono, barrio o dirección"
                  size="small"
                  fullWidth
                />

                <Button
                  variant="contained"
                  startIcon={<SearchIcon />}
                  onClick={searchAssigned}
                  disabled={loadingAssigned || !assignedFuncionarioId}
                >
                  Buscar
                </Button>

                <Button
                  variant="text"
                  startIcon={<FilterAltOffIcon />}
                  onClick={clearAssignedFilters}
                  disabled={loadingAssigned || !assignedHasFilters}
                >
                  Limpiar
                </Button>
              </Box>

              {appliedAssignedFilters.funcionarioId && (
                <Alert severity="success">
                  Mostrando ciudadanos asignados a <strong>{assignedFuncionarioName}</strong>.
                </Alert>
              )}
            </Box>
          </CardContent>
        </Card>

        <PendingRecordsTable
          records={records}
          loading={loadingPending}
          selectedIds={selectedIds}
          allVisibleSelected={allVisibleSelected}
          someVisibleSelected={someVisibleSelected}
          total={total}
          page={page}
          size={size}
          onToggleRecord={toggleRecord}
          onToggleAllVisible={toggleAllVisible}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
        />

        <AssignedRecordsTable
          records={assignedRecords}
          loading={loadingAssigned}
          total={assignedTotal}
          page={assignedPage}
          size={assignedSize}
          hasFuncionarioFilter={Boolean(appliedAssignedFilters.funcionarioId)}
          onPageChange={handleAssignedPageChange}
          onRowsPerPageChange={handleAssignedRowsPerPageChange}
        />
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
 * Propiedades de la tabla de registros pendientes.
 */
type PendingRecordsTableProps = {
  records: CallCenterResponse[];
  loading: boolean;
  selectedIds: number[];
  allVisibleSelected: boolean;
  someVisibleSelected: boolean;
  total: number;
  page: number;
  size: number;
  onToggleRecord: (id: number) => void;
  onToggleAllVisible: () => void;
  onPageChange: (_: unknown, nextPage: number) => void;
  onRowsPerPageChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
};

/**
 * Tabla de registros pendientes por asignar a funcionario Call Center.
 */
function PendingRecordsTable({
  records,
  loading,
  selectedIds,
  allVisibleSelected,
  someVisibleSelected,
  total,
  page,
  size,
  onToggleRecord,
  onToggleAllVisible,
  onPageChange,
  onRowsPerPageChange,
}: PendingRecordsTableProps) {
  if (loading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Alert severity="info">
          Cargando pendientes...
        </Alert>
      </Paper>
    );
  }

  if (records.length === 0) {
    return (
      <Paper sx={{ p: 3 }}>
        <Alert severity="info">
          No hay registros pendientes por asignar a funcionario Call Center.
        </Alert>
      </Paper>
    );
  }

  return (
    <Paper>
      <Box sx={{ p: 2 }}>
        <Typography component="h2" variant="h6" sx={{ fontWeight: 800 }}>
          Pendientes por asignar
        </Typography>

        <Typography component="p" variant="body2" sx={{ color: 'text.secondary' }}>
          Estos registros aún no tienen funcionario Call Center asignado.
        </Typography>
      </Box>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={allVisibleSelected}
                  indeterminate={!allVisibleSelected && someVisibleSelected}
                  onChange={onToggleAllVisible}
                />
              </TableCell>

              <TableCell>Caso</TableCell>
              <TableCell>Ciudadano</TableCell>
              <TableCell>Contacto</TableCell>
              <TableCell>Barrio / Comuna</TableCell>
              <TableCell>Solicitud</TableCell>
              <TableCell>Estado</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {records.map((record) => {
              const estadoCaso = getStringField(record, 'estadoCaso') || 'PENDIENTE_ENRUTAMIENTO';
              const tipoSolicitud = getStringField(record, 'tipoSolicitudCallcenter') || 'NUEVA_ENCUESTA';

              return (
                <TableRow
                  key={record.id}
                  hover
                  selected={selectedIds.includes(record.id)}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedIds.includes(record.id)}
                      onChange={() => onToggleRecord(record.id)}
                    />
                  </TableCell>

                  <TableCell>
                    <Typography component="p" variant="body2" sx={{ fontWeight: 800 }}>
                      {`Caso #${record.id}`}
                    </Typography>

                    <Typography component="p" variant="caption" sx={{ color: 'text.secondary' }}>
                      {record.fechaLlamada || 'Sin fecha'}
                    </Typography>
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
                      subtitle={record.direccionTexto || 'Sin dirección'}
                    />
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
                    <Chip
                      size="small"
                      variant="outlined"
                      label={formatLabel(tipoSolicitud)}
                    />
                  </TableCell>

                  <TableCell>
                    <Chip
                      size="small"
                      color={getStatusColor(estadoCaso)}
                      label={formatLabel(estadoCaso)}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>

          <TableFooter>
            <TableRow>
              <TablePagination
                component="td"
                colSpan={7}
                count={total}
                page={page}
                rowsPerPage={size}
                rowsPerPageOptions={[10, 20, 50, 100]}
                onPageChange={onPageChange}
                onRowsPerPageChange={onRowsPerPageChange}
                labelRowsPerPage="Filas"
              />
            </TableRow>
          </TableFooter>
        </Table>
      </TableContainer>
    </Paper>
  );
}

/**
 * Propiedades de la tabla de registros asignados.
 */
type AssignedRecordsTableProps = {
  records: CallCenterResponse[];
  loading: boolean;
  total: number;
  page: number;
  size: number;
  hasFuncionarioFilter: boolean;
  onPageChange: (_: unknown, nextPage: number) => void;
  onRowsPerPageChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
};

/**
 * Tabla de ciudadanos ya asignados a un funcionario Call Center.
 */
function AssignedRecordsTable({
  records,
  loading,
  total,
  page,
  size,
  hasFuncionarioFilter,
  onPageChange,
  onRowsPerPageChange,
}: AssignedRecordsTableProps) {
  if (!hasFuncionarioFilter) {
    return (
      <Paper sx={{ p: 3 }}>
        <Alert severity="info">
          Selecciona un funcionario Call Center para ver los ciudadanos que tiene asignados.
        </Alert>
      </Paper>
    );
  }

  if (loading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Alert severity="info">
          Consultando registros asignados...
        </Alert>
      </Paper>
    );
  }

  if (records.length === 0) {
    return (
      <Paper sx={{ p: 3 }}>
        <Alert severity="warning">
          No se encontraron ciudadanos asignados al funcionario seleccionado.
        </Alert>
      </Paper>
    );
  }

  return (
    <Paper>
      <Box sx={{ p: 2 }}>
        <Typography component="h2" variant="h6" sx={{ fontWeight: 800 }}>
          Ciudadanos asignados al funcionario
        </Typography>

        <Typography component="p" variant="body2" sx={{ color: 'text.secondary' }}>
          Consulta de registros ya enrutados para gestión telefónica.
        </Typography>
      </Box>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Funcionario</TableCell>
              <TableCell>Ciudadano</TableCell>
              <TableCell>Contacto</TableCell>
              <TableCell>Barrio / Comuna</TableCell>
              <TableCell>Solicitud</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Fecha asignación</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {records.map((record) => {
              const funcionarioNombre = getStringField(record, 'funcionarioCallcenterAsignadoNombre')
                || getStringField(record, 'funcionarioCallcenterAsignadoUsername')
                || 'Sin funcionario';

              const estadoCaso = getStringField(record, 'estadoCaso') || 'ASIGNADO_CALLCENTER';
              const tipoSolicitud = getStringField(record, 'tipoSolicitudCallcenter') || 'NUEVA_ENCUESTA';
              const fechaAsignacion = getStringField(record, 'fechaAsignacionCallcenter');

              return (
                <TableRow key={record.id} hover>
                  <TableCell>
                    <Typography component="p" variant="body2" sx={{ fontWeight: 800 }}>
                      {funcionarioNombre}
                    </Typography>

                    <Typography component="p" variant="caption" sx={{ color: 'text.secondary' }}>
                      {`Caso #${record.id}`}
                    </Typography>
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
                      subtitle={record.direccionTexto || 'Sin dirección'}
                    />
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
                    <Chip
                      size="small"
                      variant="outlined"
                      label={formatLabel(tipoSolicitud)}
                    />
                  </TableCell>

                  <TableCell>
                    <Chip
                      size="small"
                      color={getStatusColor(estadoCaso)}
                      label={formatLabel(estadoCaso)}
                    />
                  </TableCell>

                  <TableCell>
                    {formatDateTime(fechaAsignacion)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>

          <TableFooter>
            <TableRow>
              <TablePagination
                component="td"
                colSpan={7}
                count={total}
                page={page}
                rowsPerPage={size}
                rowsPerPageOptions={[10, 20, 50, 100]}
                onPageChange={onPageChange}
                onRowsPerPageChange={onRowsPerPageChange}
                labelRowsPerPage="Filas"
              />
            </TableRow>
          </TableFooter>
        </Table>
      </TableContainer>
    </Paper>
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
 * Construye la etiqueta visible de un funcionario Call Center.
 *
 * @param item funcionario seleccionado.
 * @returns etiqueta visible.
 */
function getFuncionarioLabel(item?: CallCenterUserOptionResponse) {
  if (!item) {
    return 'Sin funcionario';
  }

  return item.nombreCompleto || item.username || `Funcionario #${item.id}`;
}

/**
 * Obtiene un campo string opcional desde la respuesta sin romper el tipado.
 *
 * @param record registro Call Center.
 * @param field nombre técnico del campo.
 * @returns valor string o null.
 */
function getStringField(record: CallCenterResponse, field: string) {
  const data = record as unknown as Record<string, unknown>;
  const value = data[field];

  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Convierte códigos técnicos en etiquetas legibles.
 *
 * @param value código técnico.
 * @returns etiqueta visible.
 */
function formatLabel(value: string) {
  return value
    .split('_')
    .join(' ')
    .toLowerCase()
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

/**
 * Formatea una fecha y hora técnica para la tabla.
 *
 * @param value valor de fecha recibido desde backend.
 * @returns fecha visible.
 */
function formatDateTime(value?: string | null) {
  if (!value) {
    return 'Sin fecha';
  }

  return value.replace('T', ' ').slice(0, 16);
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