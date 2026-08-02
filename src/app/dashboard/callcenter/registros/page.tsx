'use client';

import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import RefreshIcon from '@mui/icons-material/Refresh';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SearchIcon from '@mui/icons-material/Search';
import SourceIcon from '@mui/icons-material/Source';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
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
  Tooltip,
  Typography,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import {
  ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  activateCallCenterRegistro,
  deactivateCallCenterRegistro,
  getCallCenterEncuestadoresOptions,
  getFuncionariosCallCenterOptions,
  searchCallCenter,
} from '@/services/callcenter.service';
import type { CallCenterUserOptionResponse } from '@/types/callcenter-assignment.types';
import type {
  CallCenterFilter,
  CallCenterOrigenRegistro,
  CallCenterResponse,
} from '@/types/callcenter.types';
import type { SelectOption } from '@/types/catalog.types';

type ChipColor =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'error'
  | 'info'
  | 'success'
  | 'warning';

type SnackbarState = {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'warning' | 'info';
};

type ConfirmAction =
  | 'ACTIVATE'
  | 'DEACTIVATE'
  | null;

type FilterState = {
  q: string;
  fechaInicio: string;
  fechaFin: string;
  funcionarioCallcenterAsignadoId: string;
  encuestadorAsignadoId: string;
  origenRegistro: 'ALL' | CallCenterOrigenRegistro;
  llamadaConectada: 'ALL' | 'true' | 'false';
  estadoCaso: string;
  estadoVisita: string;
  tipoSolicitudCallcenter: string;
  activo: 'ALL' | 'true' | 'false';
  page: number;
  size: number;
};

const PAGE_SIZE_OPTIONS = [
  10,
  20,
  50,
  100,
];

const ESTADOS_CASO = [
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

const ESTADOS_VISITA = [
  'PENDIENTE',
  'PROGRAMADA',
  'REALIZADA',
  'NO_ATENDIDA',
  'REPROGRAMADA',
  'CANCELADA',
];

const TIPOS_SOLICITUD = [
  'NUEVA_ENCUESTA',
  'INCLUSION',
  'VERIFICACION',
  'OTRO',
];

const initialFilter: FilterState = {
  q: '',
  fechaInicio: '',
  fechaFin: '',
  funcionarioCallcenterAsignadoId: '',
  encuestadorAsignadoId: '',
  origenRegistro: 'ALL',
  llamadaConectada: 'ALL',
  estadoCaso: 'ALL',
  estadoVisita: 'ALL',
  tipoSolicitudCallcenter: 'ALL',
  activo: 'true',
  page: 0,
  size: 20,
};

/**
 * Control administrativo global del módulo Call Center.
 *
 * Esta pantalla no reemplaza las bandejas operativas del funcionario
 * Call Center ni del encuestador.
 */
export default function CallCenterRegistrosPage() {
  const router = useRouter();

  const [records, setRecords] =
    useState<CallCenterResponse[]>([]);

  const [total, setTotal] =
    useState(0);

  const [draftFilter, setDraftFilter] =
    useState<FilterState>(initialFilter);

  const [appliedFilter, setAppliedFilter] =
    useState<FilterState>(initialFilter);

  const [loading, setLoading] =
    useState(false);

  const [funcionarios, setFuncionarios] =
    useState<CallCenterUserOptionResponse[]>([]);

  const [encuestadores, setEncuestadores] =
    useState<SelectOption[]>([]);

  const [confirmAction, setConfirmAction] =
    useState<ConfirmAction>(null);

  const [selectedRecord, setSelectedRecord] =
    useState<CallCenterResponse | null>(null);

  const [snackbar, setSnackbar] =
    useState<SnackbarState>({
      open: false,
      message: '',
      severity: 'success',
    });

  const showMessage = useCallback(
    (
      message: string,
      severity: SnackbarState['severity'] = 'success',
    ) => {
      setSnackbar({
        open: true,
        message,
        severity,
      });
    },
    [],
  );

  const closeSnackbar = () => {
    setSnackbar((current) => ({
      ...current,
      open: false,
    }));
  };

  /**
   * Consulta los registros globales usando los filtros aplicados.
   */
  const load = useCallback(async () => {
    setLoading(true);

    try {
      const response = await searchCallCenter(
        buildFilter(appliedFilter),
      );

      const content =
        getPageContent<CallCenterResponse>(
          response,
        );

      setRecords(content);
      setTotal(
        getTotalElements(
          response,
          content.length,
        ),
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'No fue posible cargar los casos de Call Center.';

      showMessage(
        message,
        'error',
      );
    } finally {
      setLoading(false);
    }
  }, [
    appliedFilter,
    showMessage,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * Carga catálogos administrativos.
   */
  useEffect(() => {
    void getFuncionariosCallCenterOptions()
      .then(setFuncionarios)
      .catch(() => {
        showMessage(
          'No fue posible cargar el catálogo de funcionarios Call Center.',
          'warning',
        );
      });

    void getCallCenterEncuestadoresOptions()
      .then(setEncuestadores)
      .catch(() => {
        showMessage(
          'No fue posible cargar el catálogo de encuestadores.',
          'warning',
        );
      });
  }, [showMessage]);

  /**
   * Indicadores calculados únicamente sobre la página cargada.
   */
  const stats = useMemo(() => {
    const abiertos =
      records.filter(
        (record) =>
          !isRecordClosed(record),
      ).length;

    const sinFuncionario =
      records.filter(
        (record) =>
          !record.funcionarioCallcenterAsignadoId,
      ).length;

    const conVisitaProgramada =
      records.filter((record) =>
        hasScheduledVisit(record),
      ).length;

    const visitasNoAtendidas =
      records.filter((record) =>
        hasUnattendedVisit(record),
      ).length;

    const cerrados =
      records.filter((record) =>
        isRecordClosed(record),
      ).length;

    return {
      abiertos,
      sinFuncionario,
      conVisitaProgramada,
      visitasNoAtendidas,
      cerrados,
    };
  }, [records]);

  const hasDraftFilters = useMemo(
    () =>
      Boolean(
        draftFilter.q.trim() ||
          draftFilter.fechaInicio ||
          draftFilter.fechaFin ||
          draftFilter.funcionarioCallcenterAsignadoId ||
          draftFilter.encuestadorAsignadoId ||
          draftFilter.origenRegistro !== 'ALL' ||
          draftFilter.llamadaConectada !== 'ALL' ||
          draftFilter.estadoCaso !== 'ALL' ||
          draftFilter.estadoVisita !== 'ALL' ||
          draftFilter.tipoSolicitudCallcenter !== 'ALL' ||
          draftFilter.activo !== 'true',
      ),
    [draftFilter],
  );

  function updateFilter(
    field: keyof FilterState,
    value: string | number,
  ) {
    setDraftFilter((current) => ({
      ...current,
      [field]: value,
    }));
  }

  /**
   * Aplica la consulta únicamente al pulsar Buscar.
   */
  function handleSearch() {
    if (
      draftFilter.fechaInicio &&
      draftFilter.fechaFin &&
      draftFilter.fechaInicio >
        draftFilter.fechaFin
    ) {
      showMessage(
        'La fecha inicial no puede ser posterior a la fecha final.',
        'warning',
      );
      return;
    }

    const nextFilter: FilterState = {
      ...draftFilter,
      q: draftFilter.q.trim(),
      page: 0,
    };

    setDraftFilter(nextFilter);
    setAppliedFilter(nextFilter);
  }

  /**
   * Limpia los filtros conservando el tamaño de página.
   */
  function clearFilters() {
    const cleanFilter: FilterState = {
      ...initialFilter,
      size: appliedFilter.size,
    };

    setDraftFilter(cleanFilter);
    setAppliedFilter(cleanFilter);
  }

  function openConfirm(
    record: CallCenterResponse,
    action: ConfirmAction,
  ) {
    setSelectedRecord(record);
    setConfirmAction(action);
  }

  function closeConfirm() {
    setSelectedRecord(null);
    setConfirmAction(null);
  }

  /**
   * Activa o inactiva administrativamente un registro.
   */
  async function confirmStatusChange() {
    if (
      !selectedRecord ||
      !confirmAction
    ) {
      return;
    }

    try {
      if (
        confirmAction === 'ACTIVATE'
      ) {
        await activateCallCenterRegistro(
          selectedRecord.id,
        );

        showMessage(
          'Caso activado correctamente.',
          'success',
        );
      }

      if (
        confirmAction === 'DEACTIVATE'
      ) {
        await deactivateCallCenterRegistro(
          selectedRecord.id,
        );

        showMessage(
          'Caso inactivado correctamente.',
          'success',
        );
      }

      closeConfirm();
      await load();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'No fue posible cambiar el estado del caso.';

      showMessage(
        message,
        'error',
      );
    }
  }

  function handlePageChange(
    _: unknown,
    nextPage: number,
  ) {
    setDraftFilter((current) => ({
      ...current,
      page: nextPage,
    }));

    setAppliedFilter((current) => ({
      ...current,
      page: nextPage,
    }));
  }

  function handleRowsPerPageChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const nextSize =
      Number(event.target.value);

    setDraftFilter((current) => ({
      ...current,
      page: 0,
      size: nextSize,
    }));

    setAppliedFilter((current) => ({
      ...current,
      page: 0,
      size: nextSize,
    }));
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
              lg: 'row',
            },
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Box>
            <Typography
              component="h1"
              variant="h5"
              sx={{ fontWeight: 800 }}
            >
              Control general de casos
            </Typography>

            <Typography
              component="p"
              variant="body2"
              sx={{
                color: 'text.secondary',
                mt: 0.5,
              }}
            >
              Consulta global de ciudadanos, funcionarios,
              llamadas, encuestadores, visitas y estados del
              proceso Call Center.
            </Typography>
          </Box>

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
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => void load()}
              disabled={loading}
            >
              Actualizar
            </Button>

            <Button
              variant="outlined"
              color="secondary"
              startIcon={<SourceIcon />}
              onClick={() =>
                router.push(
                  '/dashboard/callcenter/registros/cargar-ventanilla',
                )
              }
            >
              Importar desde Ventanilla
            </Button>

            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() =>
                router.push(
                  '/dashboard/callcenter/registros/nuevo',
                )
              }
            >
              Registrar caso manual
            </Button>
          </Box>
        </Box>

        <Alert severity="info">
          <Typography
            component="p"
            variant="body2"
            sx={{ fontWeight: 800 }}
          >
            Esta es una vista administrativa.
          </Typography>

          <Typography
            component="p"
            variant="body2"
          >
            La gestión telefónica se registra en
            <strong> Casos por gestionar</strong> y el
            resultado de campo en
            <strong> Visitas asignadas</strong>. Una llamada
            no conectada no cancela una visita programada.
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
            label="Abiertos"
            value={stats.abiertos}
          />

          <SummaryCard
            label="Sin funcionario"
            value={stats.sinFuncionario}
          />

          <SummaryCard
            label="Con visita programada"
            value={stats.conVisitaProgramada}
          />

          <SummaryCard
            label="Visita no atendida"
            value={stats.visitasNoAtendidas}
          />

          <SummaryCard
            label="Cerrados o cancelados"
            value={stats.cerrados}
          />
        </Box>

        <Paper sx={{ p: 2 }}>
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
                Filtros administrativos
              </Typography>

              <Typography
                component="p"
                variant="body2"
                sx={{ color: 'text.secondary' }}
              >
                Selecciona los criterios y pulsa Buscar. Los
                filtros y la paginación se ejecutan en el
                backend.
              </Typography>
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  md: 'repeat(2, minmax(0, 1fr))',
                  xl: 'repeat(4, minmax(0, 1fr))',
                },
                gap: 1.5,
              }}
            >
              <TextField
                label="Ciudadano o caso"
                value={draftFilter.q}
                onChange={(event) =>
                  updateFilter(
                    'q',
                    event.target.value,
                  )
                }
                placeholder="Nombre, cédula, teléfono, dirección, barrio o caso"
                fullWidth
                size="small"
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  },
                }}
              />

              <TextField
                label="Funcionario Call Center"
                select
                value={
                  draftFilter.funcionarioCallcenterAsignadoId
                }
                onChange={(event) =>
                  updateFilter(
                    'funcionarioCallcenterAsignadoId',
                    event.target.value,
                  )
                }
                fullWidth
                size="small"
              >
                <MenuItem value="">
                  Todos los funcionarios
                </MenuItem>

                {funcionarios.map(
                  (funcionario) => (
                    <MenuItem
                      key={funcionario.id}
                      value={String(
                        funcionario.id,
                      )}
                    >
                      {funcionarioLabel(
                        funcionario,
                      )}
                    </MenuItem>
                  ),
                )}
              </TextField>

              <TextField
                label="Encuestador"
                select
                value={
                  draftFilter.encuestadorAsignadoId
                }
                onChange={(event) =>
                  updateFilter(
                    'encuestadorAsignadoId',
                    event.target.value,
                  )
                }
                fullWidth
                size="small"
              >
                <MenuItem value="">
                  Todos los encuestadores
                </MenuItem>

                {encuestadores.map(
                  (option) => (
                    <MenuItem
                      key={option.id}
                      value={String(
                        option.id,
                      )}
                    >
                      {option.label}
                    </MenuItem>
                  ),
                )}
              </TextField>

              <TextField
                label="Origen"
                select
                value={
                  draftFilter.origenRegistro
                }
                onChange={(event) =>
                  updateFilter(
                    'origenRegistro',
                    event.target.value,
                  )
                }
                fullWidth
                size="small"
              >
                <MenuItem value="ALL">
                  Todos los orígenes
                </MenuItem>
                <MenuItem value="VENTANILLA">
                  Ventanilla
                </MenuItem>
                <MenuItem value="MANUAL">
                  Manual
                </MenuItem>
                <MenuItem value="IMPORTACION">
                  Importación
                </MenuItem>
              </TextField>

              <TextField
                label="Estado del caso"
                select
                value={
                  draftFilter.estadoCaso
                }
                onChange={(event) =>
                  updateFilter(
                    'estadoCaso',
                    event.target.value,
                  )
                }
                fullWidth
                size="small"
              >
                <MenuItem value="ALL">
                  Todos los estados
                </MenuItem>

                {ESTADOS_CASO.map(
                  (estado) => (
                    <MenuItem
                      key={estado}
                      value={estado}
                    >
                      {formatLabel(estado)}
                    </MenuItem>
                  ),
                )}
              </TextField>

              <TextField
                label="Estado de visita"
                select
                value={
                  draftFilter.estadoVisita
                }
                onChange={(event) =>
                  updateFilter(
                    'estadoVisita',
                    event.target.value,
                  )
                }
                fullWidth
                size="small"
              >
                <MenuItem value="ALL">
                  Todos los estados
                </MenuItem>

                {ESTADOS_VISITA.map(
                  (estado) => (
                    <MenuItem
                      key={estado}
                      value={estado}
                    >
                      {formatLabel(estado)}
                    </MenuItem>
                  ),
                )}
              </TextField>

              <TextField
                label="Tipo de solicitud"
                select
                value={
                  draftFilter.tipoSolicitudCallcenter
                }
                onChange={(event) =>
                  updateFilter(
                    'tipoSolicitudCallcenter',
                    event.target.value,
                  )
                }
                fullWidth
                size="small"
              >
                <MenuItem value="ALL">
                  Todos los tipos
                </MenuItem>

                {TIPOS_SOLICITUD.map(
                  (tipo) => (
                    <MenuItem
                      key={tipo}
                      value={tipo}
                    >
                      {formatLabel(tipo)}
                    </MenuItem>
                  ),
                )}
              </TextField>

              <TextField
                label="Resultado telefónico"
                select
                value={
                  draftFilter.llamadaConectada
                }
                onChange={(event) =>
                  updateFilter(
                    'llamadaConectada',
                    event.target.value,
                  )
                }
                fullWidth
                size="small"
              >
                <MenuItem value="ALL">
                  Todos
                </MenuItem>
                <MenuItem value="true">
                  Llamada conectada
                </MenuItem>
                <MenuItem value="false">
                  Llamada no conectada
                </MenuItem>
              </TextField>

              <TextField
                label="Estado lógico"
                select
                value={
                  draftFilter.activo
                }
                onChange={(event) =>
                  updateFilter(
                    'activo',
                    event.target.value,
                  )
                }
                fullWidth
                size="small"
              >
                <MenuItem value="true">
                  Activos
                </MenuItem>
                <MenuItem value="false">
                  Inactivos
                </MenuItem>
                <MenuItem value="ALL">
                  Todos
                </MenuItem>
              </TextField>

              <TextField
                label="Fecha de llamada desde"
                type="date"
                value={
                  draftFilter.fechaInicio
                }
                onChange={(event) =>
                  updateFilter(
                    'fechaInicio',
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
                label="Fecha de llamada hasta"
                type="date"
                value={
                  draftFilter.fechaFin
                }
                onChange={(event) =>
                  updateFilter(
                    'fechaFin',
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
                flexDirection: {
                  xs: 'column',
                  sm: 'row',
                },
                justifyContent: 'space-between',
                gap: 1,
              }}
            >
              <Typography
                component="p"
                variant="body2"
                sx={{ color: 'text.secondary' }}
              >
                {loading
                  ? 'Actualizando control general...'
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
                  startIcon={<RestartAltIcon />}
                  onClick={clearFilters}
                  disabled={
                    !hasDraftFilters ||
                    loading
                  }
                >
                  Limpiar filtros
                </Button>
              </Box>
            </Box>
          </Box>
        </Paper>

        {loading &&
        records.length === 0 ? (
          <Paper sx={{ p: 3 }}>
            <Alert severity="info">
              Cargando casos de Call Center...
            </Alert>
          </Paper>
        ) : records.length === 0 ? (
          <Paper sx={{ p: 3 }}>
            <Alert severity="info">
              No se encontraron casos con los filtros
              aplicados.
            </Alert>
          </Paper>
        ) : (
          <Paper
            sx={{
              opacity: loading
                ? 0.65
                : 1,
            }}
          >
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>
                      Caso y ciudadano
                    </TableCell>
                    <TableCell>
                      Origen
                    </TableCell>
                    <TableCell>
                      Contacto y ubicación
                    </TableCell>
                    <TableCell>
                      Funcionario Call Center
                    </TableCell>
                    <TableCell>
                      Gestión telefónica
                    </TableCell>
                    <TableCell>
                      Encuestador y programación
                    </TableCell>
                    <TableCell>
                      Estado del caso
                    </TableCell>
                    <TableCell>
                      Visita y estado lógico
                    </TableCell>
                    <TableCell align="right">
                      Acciones
                    </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {records.map((record) => (
                    <TableRow
                      key={record.id}
                      hover
                    >
                      <TableCell>
                        <Typography
                          component="p"
                          variant="body2"
                          sx={{ fontWeight: 800 }}
                        >
                          {`Caso #${record.id}`}
                        </Typography>

                        <Typography
                          component="p"
                          variant="body2"
                          sx={{
                            fontWeight: 700,
                            mt: 0.5,
                          }}
                        >
                          {record.nombreCompleto ||
                            'Ciudadano sin nombre'}
                        </Typography>

                        <Typography
                          component="p"
                          variant="caption"
                          sx={{
                            color: 'text.secondary',
                          }}
                        >
                          C.C.{' '}
                          {record.cedulaSolicitante ||
                            'Sin dato'}
                        </Typography>
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
                            label={
                              record.origenRegistro ||
                              'MANUAL'
                            }
                            color={origenColor(
                              record.origenRegistro,
                            )}
                          />

                          {record.ventanillaNumeroVentanilla && (
                            <Typography
                              component="p"
                              variant="caption"
                              sx={{
                                color: 'text.secondary',
                              }}
                            >
                              Ventanilla{' '}
                              {
                                record.ventanillaNumeroVentanilla
                              }
                            </Typography>
                          )}

                          <Typography
                            component="p"
                            variant="caption"
                            sx={{
                              color: 'text.secondary',
                            }}
                          >
                            {formatLabel(
                              record.tipoSolicitudCallcenter ||
                                'NUEVA_ENCUESTA',
                            )}
                          </Typography>
                        </Box>
                      </TableCell>

                      <TableCell>
                        <Typography
                          component="p"
                          variant="body2"
                          sx={{ fontWeight: 700 }}
                        >
                          {record.telefono ||
                            'Sin teléfono'}
                        </Typography>

                        <Typography
                          component="p"
                          variant="body2"
                        >
                          {record.direccionTexto ||
                            'Sin dirección'}
                        </Typography>

                        <Typography
                          component="p"
                          variant="caption"
                          sx={{
                            color: 'text.secondary',
                          }}
                        >
                          {getTerritoryLabel(record)}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography
                          component="p"
                          variant="body2"
                          sx={{ fontWeight: 700 }}
                        >
                          {record.funcionarioCallcenterAsignadoNombre ||
                            record.funcionarioCallcenterAsignadoUsername ||
                            'Sin asignar'}
                        </Typography>

                        <Typography
                          component="p"
                          variant="caption"
                          sx={{
                            color: 'text.secondary',
                          }}
                        >
                          {record.fechaAsignacionCallcenter
                            ? `Asignado: ${record.fechaAsignacionCallcenter}`
                            : 'Sin fecha de asignación'}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Chip
                          size="small"
                          color={
                            record.llamadaConectada
                              ? 'success'
                              : 'warning'
                          }
                          label={
                            record.llamadaConectada
                              ? 'Conectada'
                              : 'No conectada'
                          }
                        />

                        <Typography
                          component="p"
                          variant="caption"
                          sx={{
                            color: 'text.secondary',
                            mt: 0.5,
                          }}
                        >
                          {formatDateTime(
                            record.fechaLlamada,
                            record.horaLlamada,
                          )}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography
                          component="p"
                          variant="body2"
                          sx={{ fontWeight: 700 }}
                        >
                          {record.encuestadorAsignadoNombre ||
                            record.encuestadorProgramadoNombre ||
                            'Sin asignar'}
                        </Typography>

                        <Typography
                          component="p"
                          variant="caption"
                          sx={{
                            color: 'text.secondary',
                          }}
                        >
                          {record.fechaEncuestaProgramada
                            ? `Programada: ${record.fechaEncuestaProgramada}`
                            : 'Sin fecha programada'}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Chip
                          size="small"
                          color={getStatusColor(
                            record.estadoCaso,
                          )}
                          label={formatLabel(
                            record.estadoCaso ||
                              'PENDIENTE_ENRUTAMIENTO',
                          )}
                        />
                      </TableCell>

                      <TableCell>
                        <Box
                          sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            gap: 0.75,
                          }}
                        >
                          <Chip
                            size="small"
                            variant="outlined"
                            color={getStatusColor(
                              record.estadoVisita,
                            )}
                            label={formatLabel(
                              record.estadoVisita ||
                                'PENDIENTE',
                            )}
                          />

                          <Chip
                            size="small"
                            color={
                              record.activo
                                ? 'success'
                                : 'default'
                            }
                            label={
                              record.activo
                                ? 'Activo'
                                : 'Inactivo'
                            }
                          />
                        </Box>
                      </TableCell>

                      <TableCell align="right">
                        <Tooltip title="Editar caso">
                          <IconButton
                            size="small"
                            onClick={() =>
                              router.push(
                                `/dashboard/callcenter/registros/nuevo?id=${record.id}`,
                              )
                            }
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        {record.activo ? (
                          <Tooltip title="Inactivar caso">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() =>
                                openConfirm(
                                  record,
                                  'DEACTIVATE',
                                )
                              }
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Tooltip title="Activar caso">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() =>
                                openConfirm(
                                  record,
                                  'ACTIVATE',
                                )
                              }
                            >
                              <CheckCircleIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>

                <TableFooter>
                  <TableRow>
                    <TablePagination
                      component="td"
                      colSpan={9}
                      count={total}
                      page={appliedFilter.page}
                      rowsPerPage={appliedFilter.size}
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
      </Box>

      <Dialog
        open={Boolean(confirmAction)}
        onClose={closeConfirm}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>
          {confirmAction === 'ACTIVATE'
            ? 'Activar caso'
            : 'Inactivar caso'}
        </DialogTitle>

        <DialogContent dividers>
          <Typography variant="body2">
            Confirma la acción administrativa para el
            caso de{' '}
            <strong>
              {selectedRecord?.nombreCompleto}
            </strong>
            .
          </Typography>

          {confirmAction === 'DEACTIVATE' && (
            <Alert
              severity="warning"
              sx={{ mt: 2 }}
            >
              La inactivación retira el caso de las consultas
              activas. No elimina su información ni su
              trazabilidad.
            </Alert>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={closeConfirm}>
            Cancelar
          </Button>

          <Button
            variant="contained"
            color={
              confirmAction === 'ACTIVATE'
                ? 'success'
                : 'error'
            }
            onClick={() =>
              void confirmStatusChange()
            }
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>

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

function buildFilter(
  filter: FilterState,
): CallCenterFilter {
  const llamadaConectada =
    toBoolean(filter.llamadaConectada);

  const activo =
    toBoolean(filter.activo);

  return {
    page: filter.page,
    size: filter.size,
    q:
      normalizeText(filter.q) ||
      undefined,
    fechaInicio:
      filter.fechaInicio ||
      undefined,
    fechaFin:
      filter.fechaFin ||
      undefined,
    funcionarioCallcenterAsignadoId:
      filter.funcionarioCallcenterAsignadoId ||
      undefined,
    encuestadorAsignadoId:
      filter.encuestadorAsignadoId ||
      undefined,
    origenRegistro:
      filter.origenRegistro === 'ALL'
        ? undefined
        : filter.origenRegistro,
    llamadaConectada:
      llamadaConectada ??
      undefined,
    estadoCaso:
      filter.estadoCaso === 'ALL'
        ? undefined
        : filter.estadoCaso,
    estadoVisita:
      filter.estadoVisita === 'ALL'
        ? undefined
        : filter.estadoVisita,
    tipoSolicitudCallcenter:
      filter.tipoSolicitudCallcenter === 'ALL'
        ? undefined
        : filter.tipoSolicitudCallcenter,
    activo:
      activo ??
      undefined,
  };
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

function funcionarioLabel(
  funcionario: CallCenterUserOptionResponse,
) {
  const fullName =
    funcionario.nombreCompleto?.trim();

  if (fullName) {
    return `${fullName} (${funcionario.username})`;
  }

  return funcionario.username;
}

function toBoolean(
  value: string,
): boolean | null {
  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return null;
}

function normalizeText(
  value?: string | null,
) {
  return value?.trim() ?? '';
}

function normalizeCode(
  value?: string | number | null,
) {
  return String(value ?? '')
    .trim()
    .toUpperCase();
}

function getPageContent<T>(
  page: unknown,
): T[] {
  const data =
    page as {
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

function getTotalElements(
  page: unknown,
  currentLength: number,
) {
  const data =
    page as {
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
    currentLength
  );
}

function origenColor(
  origen?: string | null,
): ChipColor {
  if (
    origen === 'VENTANILLA'
  ) {
    return 'primary';
  }

  if (
    origen === 'IMPORTACION'
  ) {
    return 'secondary';
  }

  return 'default';
}

function isRecordClosed(
  record: CallCenterResponse,
) {
  const estadoCaso =
    normalizeCode(record.estadoCaso);

  const estadoVisita =
    normalizeCode(record.estadoVisita);

  return (
    record.encuestaRealizada === true ||
    estadoCaso === 'CERRADO' ||
    estadoCaso === 'CANCELADO' ||
    estadoVisita === 'REALIZADA' ||
    estadoVisita === 'CANCELADA'
  );
}

function hasScheduledVisit(
  record: CallCenterResponse,
) {
  const estadoCaso =
    normalizeCode(record.estadoCaso);

  const estadoVisita =
    normalizeCode(record.estadoVisita);

  return Boolean(
    record.fechaEncuestaProgramada ||
      record.encuestadorAsignadoId ||
      record.encuestadorProgramadoId ||
      estadoCaso === 'VISITA_PROGRAMADA' ||
      estadoCaso === 'ASIGNADO_ENCUESTADOR' ||
      estadoVisita === 'PROGRAMADA',
  );
}

function hasUnattendedVisit(
  record: CallCenterResponse,
) {
  const estadoCaso =
    normalizeCode(record.estadoCaso);

  const estadoVisita =
    normalizeCode(record.estadoVisita);

  return (
    estadoCaso === 'VISITA_NO_ATENDIDA' ||
    estadoVisita === 'NO_ATENDIDA'
  );
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

function formatDateTime(
  date?: string | null,
  time?: string | null,
) {
  if (!date) {
    return 'Sin fecha registrada';
  }

  return time
    ? `${date} · ${time.slice(0, 5)}`
    : date;
}

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

function getStatusColor(
  value?: string | null,
): ChipColor {
  const normalized =
    normalizeCode(value);

  /*
   * Los estados negativos se evalúan primero porque
   * NO_CONTACTADO contiene el texto CONTACTADO.
   */
  if (
    normalized.includes('CANCELADO') ||
    normalized.includes('CANCELADA') ||
    normalized.includes('NO_ACEPTA') ||
    normalized.includes('SIN_DISPOSICION')
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
    normalized.includes('REALIZADA') ||
    normalized.includes('CERRADO') ||
    normalized === 'CONTACTADO_ACEPTA_VISITA'
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