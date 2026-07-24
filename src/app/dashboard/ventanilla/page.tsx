'use client';

import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import EditIcon from '@mui/icons-material/Edit';
import FilterListIcon from '@mui/icons-material/FilterList';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import RestoreIcon from '@mui/icons-material/Restore';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { ChangeEvent, KeyboardEvent, MouseEvent, useEffect, useState } from 'react';

import LoadingState from '@/components/dashboard/LoadingState';
import SelectField from '@/components/operational/SelectField';
import AppSnackbar, {
  AppSnackbarState,
  initialSnackbarState,
} from '@/components/ui/AppSnackbar';
import ConfirmActionDialog from '@/components/ui/ConfirmActionDialog';
import { ApiClientError } from '@/lib/apiClient';
import {
  canDeleteVentanilla,
  canExport,
  canHardDeleteVentanilla,
  canManageVentanillaStatus,
  canWriteVentanilla,
  currentRole,
} from '@/lib/roleAccess';
import {
  getCategoriasOptions,
  getEstadosSolicitudOptions,
  getSolicitudesOptions,
} from '@/services/catalog.service';
import { exportVentanilla } from '@/services/export.service';
import {
  activateVentanilla,
  createVentanilla,
  deleteVentanilla,
  inactivateVentanilla,
  searchVentanilla,
  updateVentanilla,
  validateVentanillaBeforeSave,
} from '@/services/ventanilla.service';
import { PageResponse } from '@/types/api.types';
import { SelectOption } from '@/types/catalog.types';
import {
  VentanillaDailyValidationResponse,
  VentanillaFilter,
  VentanillaRequest,
  VentanillaResponse,
} from '@/types/operational.types';
import { getBarriosOptions } from '@/services/territory.service';

type FormState = {
  id?: number;
  fecha: string;
  numeroVentanilla: string;
  cedulaUsuario: string;
  nombreUsuario: string;
  telefono: string;
  categoriaId: string;
  direccion: string;
  barrioId: string;
  extranjero: boolean;
  solicitudId: string;
  estadoSolicitudId: string;
  observacion: string;
};

type PermissionsState = {
  write: boolean;
  export: boolean;
  delete: boolean;
  manageStatus: boolean;
  hardDelete: boolean;
};

type RecordStatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

type ConfirmActionType = 'INACTIVATE' | 'ACTIVATE' | 'HARD_DELETE';

type ChipColor =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'error'
  | 'info'
  | 'success'
  | 'warning';

const initialForm: FormState = {
  fecha: '',
  numeroVentanilla: '',
  cedulaUsuario: '',
  nombreUsuario: '',
  telefono: '',
  categoriaId: '',
  direccion: '',
  barrioId: '',
  extranjero: false,
  solicitudId: '',
  estadoSolicitudId: '',
  observacion: '',
};

const initialPermissions: PermissionsState = {
  write: false,
  export: false,
  delete: false,
  manageStatus: false,
  hardDelete: false,
};

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value?: string | null) {
  if (!value) {
    return '-';
  }

  const [year, month, day] = value.split('-');

  if (!year || !month || !day) {
    return value;
  }

  return `${day}/${month}/${year}`;
}

function normalizeSearchText(value?: string | null) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function normalizeTraceabilityColor(color?: string | null): ChipColor {
  const allowedColors: ChipColor[] = [
    'default',
    'primary',
    'secondary',
    'error',
    'info',
    'success',
    'warning',
  ];

  if (color && allowedColors.includes(color as ChipColor)) {
    return color as ChipColor;
  }

  return 'default';
}

function formatDaysFromLastVisit(days?: number | null) {
  if (days === undefined || days === null) {
    return 'Primera visita';
  }

  if (days === 0) {
    return 'Vino el mismo día';
  }

  if (days === 1) {
    return 'Hace 1 día';
  }

  return `Hace ${days} días`;
}

function getFrequencyText(row: VentanillaResponse) {
  const trace = row.trazabilidad;

  if (!trace) {
    return 'Sin frecuencia registrada';
  }

  if (trace.ciudadanoFrecuente) {
    return 'Frecuencia alta';
  }

  if (trace.visitasUltimos30Dias >= 2) {
    return 'Frecuencia media';
  }

  if (trace.totalVisitas <= 1) {
    return 'Primera atención';
  }

  return 'Frecuencia baja';
}

function buildFrequencyTooltip(row: VentanillaResponse) {
  const trace = row.trazabilidad;

  if (!trace) {
    return 'No hay información de frecuencia disponible para este ciudadano.';
  }

  const lastVisit = trace.ultimaVisitaAnterior
    ? `Última visita anterior: ${formatDate(trace.ultimaVisitaAnterior)}`
    : 'Sin visita anterior registrada';

  const timeText = formatDaysFromLastVisit(trace.diasDesdeUltimaVisitaAnterior);
  const frequencyText = getFrequencyText(row);

  return `${frequencyText}. ${timeText}. ${trace.descripcion} Total visitas: ${trace.totalVisitas}. Visitas en los últimos 30 días: ${trace.visitasUltimos30Dias}. ${lastVisit}.`;
}

function CitizenFrequencyField({ row }: { row: VentanillaResponse }) {
  const trace = row.trazabilidad;

  if (!trace) {
    return (
      <Box sx={{ minWidth: 210 }}>
        <Chip
          label="Sin trazabilidad"
          color="default"
          variant="outlined"
          size="small"
          sx={{ fontWeight: 700, mb: 0.5 }}
        />

        <Typography color="text.secondary" sx={{ fontSize: 12 }}>
          No hay datos de visitas.
        </Typography>
      </Box>
    );
  }

  const chipColor = normalizeTraceabilityColor(trace.color);
  const chipVariant = trace.nivel === 'PRIMERA_VISITA' ? 'filled' : 'outlined';
  const timeText = formatDaysFromLastVisit(trace.diasDesdeUltimaVisitaAnterior);
  const frequencyText = getFrequencyText(row);
  const lastVisitDate = trace.ultimaVisitaAnterior
    ? formatDate(trace.ultimaVisitaAnterior)
    : 'Sin visita anterior';

  return (
    <Tooltip title={buildFrequencyTooltip(row)} arrow placement="top">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 0.35,
          minWidth: 230,
        }}
      >
        <Box>
          <Chip
            label={trace.etiqueta}
            color={chipColor}
            variant={chipVariant}
            size="small"
            sx={{
              fontWeight: 800,
              width: 'fit-content',
            }}
          />
        </Box>

        <Typography
          sx={{
            fontWeight: 800,
            fontSize: 13,
            color: trace.ciudadanoFrecuente ? 'warning.main' : 'text.primary',
          }}
        >
          {timeText}
        </Typography>

        <Typography color="text.secondary" sx={{ fontSize: 12 }}>
          {frequencyText}
        </Typography>

        <Typography color="text.secondary" sx={{ fontSize: 12 }}>
          Última: {lastVisitDate}
        </Typography>

        <Typography color="text.secondary" sx={{ fontSize: 11 }}>
          Total: {trace.totalVisitas} visita(s) · 30 días: {trace.visitasUltimos30Dias}
        </Typography>
      </Box>
    </Tooltip>
  );
}

function getOptionalRecordValue(row: VentanillaResponse | null, key: string) {
  if (!row) {
    return '-';
  }

  const value = (row as unknown as Record<string, unknown>)[key];

  if (value === undefined || value === null || value === '') {
    return '-';
  }

  if (typeof value === 'boolean') {
    return value ? 'Sí' : 'No';
  }

  return String(value);
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value?: string | number | boolean | null;
}) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.5,
        borderRadius: 2.5,
        height: '100%',
        bgcolor: '#ffffff',
      }}
    >
      <Typography color="text.secondary" sx={{ fontSize: 12, fontWeight: 800 }}>
        {label}
      </Typography>

      <Typography sx={{ mt: 0.5, fontSize: 14, fontWeight: 700 }}>
        {value === undefined || value === null || value === '' ? '-' : String(value)}
      </Typography>
    </Paper>
  );
}

function CitizenDetailDialog({
  open,
  row,
  onClose,
}: {
  open: boolean;
  row: VentanillaResponse | null;
  onClose: () => void;
}) {
  const trace = row?.trazabilidad;
  const chipColor = normalizeTraceabilityColor(trace?.color);
  const lastVisitDate = trace?.ultimaVisitaAnterior
    ? formatDate(trace.ultimaVisitaAnterior)
    : 'Sin visita anterior';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle
        sx={{
          fontWeight: 900,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        Información completa del ciudadano
      </DialogTitle>

      <DialogContent sx={{ bgcolor: '#f8fafc', pt: 3 }}>
        {!row ? (
          <Alert severity="info">
            No hay información seleccionada.
          </Alert>
        ) : (
          <Stack spacing={3}>
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 3,
                bgcolor: '#ffffff',
              }}
            >
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.5}
                sx={{
                  alignItems: { xs: 'flex-start', sm: 'center' },
                  justifyContent: 'space-between',
                }}
              >
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 900 }}>
                    {row.nombreUsuario || 'Sin nombre registrado'}
                  </Typography>

                  <Typography color="text.secondary" sx={{ fontSize: 14 }}>
                    Cédula: <strong>{row.cedulaUsuario || '-'}</strong>
                    {' · '}
                    Teléfono: <strong>{row.telefono || 'Sin teléfono'}</strong>
                  </Typography>
                </Box>

                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
                  <Chip
                    label={row.estadoSolicitudNombre || 'Sin estado'}
                    color="primary"
                    variant="outlined"
                    sx={{ fontWeight: 800 }}
                  />

                  <Chip
                    label={row.activo ? 'Activo' : 'Inactivo'}
                    color={row.activo ? 'success' : 'warning'}
                    variant={row.activo ? 'outlined' : 'filled'}
                    sx={{ fontWeight: 800 }}
                  />
                </Stack>
              </Stack>
            </Paper>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, 1fr)',
                  md: 'repeat(3, 1fr)',
                },
                gap: 1.5,
              }}
            >
              <DetailItem label="Fecha" value={formatDate(row.fecha)} />
              <DetailItem label="N° Ventanilla" value={row.numeroVentanilla} />
              <DetailItem label="Funcionario" value={row.funcionarioUsername || 'Sin funcionario'} />

              <DetailItem label="Cédula" value={row.cedulaUsuario} />
              <DetailItem label="Ciudadano" value={row.nombreUsuario} />
              <DetailItem label="Teléfono" value={row.telefono || 'Sin teléfono'} />

              <DetailItem label="Solicitud" value={row.solicitudNombre || 'Sin solicitud'} />
              <DetailItem label="Categoría" value={row.categoriaNombre || 'Sin categoría'} />
              <DetailItem label="Estado solicitud" value={row.estadoSolicitudNombre || 'Sin estado'} />

              <DetailItem label="Dirección" value={row.direccion || 'Sin dirección'} />
              <DetailItem label="Barrio" value={row.barrioNombre || 'Sin barrio'} />
              <DetailItem label="Comuna" value={row.comunaNombre || 'Sin comuna'} />

              <DetailItem label="Extranjero" value={row.extranjero ? 'Sí' : 'No'} />
              <DetailItem label="Estado registro" value={row.activo ? 'Activo' : 'Inactivo'} />
              <DetailItem label="Motivo repetición" value={getOptionalRecordValue(row, 'motivoRepeticion')} />
            </Box>

            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 3,
                bgcolor: '#ffffff',
              }}
            >
              <Typography sx={{ fontWeight: 900, mb: 1 }}>
                Observación
              </Typography>

              <Typography color="text.secondary" sx={{ fontSize: 14 }}>
                {row.observacion || 'Sin observación registrada.'}
              </Typography>
            </Paper>

            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 3,
                bgcolor: '#ffffff',
              }}
            >
              <Stack spacing={1.5}>
                <Box>
                  <Typography sx={{ fontWeight: 900 }}>
                    Frecuencia / última visita
                  </Typography>

                  <Typography color="text.secondary" sx={{ fontSize: 13 }}>
                    Información de trazabilidad del ciudadano.
                  </Typography>
                </Box>

                {!trace ? (
                  <Alert severity="info">
                    Este ciudadano no tiene información de trazabilidad disponible.
                  </Alert>
                ) : (
                  <Stack spacing={1}>
                    <Box>
                      <Chip
                        label={trace.etiqueta}
                        color={chipColor}
                        variant={trace.nivel === 'PRIMERA_VISITA' ? 'filled' : 'outlined'}
                        sx={{ fontWeight: 800 }}
                      />
                    </Box>

                    <Typography sx={{ fontWeight: 800 }}>
                      {formatDaysFromLastVisit(trace.diasDesdeUltimaVisitaAnterior)}
                    </Typography>

                    <Typography color="text.secondary" sx={{ fontSize: 14 }}>
                      {trace.descripcion}
                    </Typography>

                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                          xs: '1fr',
                          sm: 'repeat(3, 1fr)',
                        },
                        gap: 1.5,
                      }}
                    >
                      <DetailItem label="Total visitas" value={trace.totalVisitas} />
                      <DetailItem label="Últimos 30 días" value={trace.visitasUltimos30Dias} />
                      <DetailItem label="Última visita anterior" value={lastVisitDate} />
                    </Box>
                  </Stack>
                )}
              </Stack>
            </Paper>
          </Stack>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          borderTop: '1px solid',
          borderColor: 'divider',
          px: 3,
          py: 2,
        }}
      >
        <Button variant="contained" onClick={onClose}>
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function VentanillaRegistrosPage() {
  const [filter, setFilter] = useState<VentanillaFilter>({
    page: 0,
    size: 10,
  });

  const [pageData, setPageData] = useState<PageResponse<VentanillaResponse> | null>(null);
  const [categorias, setCategorias] = useState<SelectOption[]>([]);
  const [solicitudes, setSolicitudes] = useState<SelectOption[]>([]);
  const [estados, setEstados] = useState<SelectOption[]>([]);
  const [barrios, setBarrios] = useState<SelectOption[]>([]);

  const [permissions, setPermissions] = useState<PermissionsState>(initialPermissions);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [canUseAdvancedFilters, setCanUseAdvancedFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<RecordStatusFilter>('ACTIVE');

  const [loading, setLoading] = useState(true);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [citizenLoading, setCitizenLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [processingAction, setProcessingAction] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<VentanillaResponse | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmActionType>('INACTIVATE');

  const [dailyValidationOpen, setDailyValidationOpen] = useState(false);
  const [dailyValidationSaving, setDailyValidationSaving] = useState(false);
  const [dailyValidation, setDailyValidation] = useState<VentanillaDailyValidationResponse | null>(null);
  const [pendingCreateRequest, setPendingCreateRequest] = useState<VentanillaRequest | null>(null);

  const [tableSearch, setTableSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [menuRecord, setMenuRecord] = useState<VentanillaResponse | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [detailRecord, setDetailRecord] = useState<VentanillaResponse | null>(null);

  const [form, setForm] = useState<FormState>(initialForm);
  const [barrioInputText, setBarrioInputText] = useState('');
  const [restricted, setRestricted] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState<AppSnackbarState>(initialSnackbarState);

  const totalRecords = pageData?.totalElements ?? 0;
  const currentPage = pageData?.page ?? 0;
  const currentSize = pageData?.size ?? 10;

  const visibleRows = (pageData?.content ?? []).filter((row) => {
    const searchText = tableSearch.trim().toLowerCase();

    if (!searchText) {
      return true;
    }

    return [
      row.fecha,
      row.numeroVentanilla,
      row.nombreUsuario,
      row.cedulaUsuario,
      row.solicitudNombre,
      row.categoriaNombre,
      row.estadoSolicitudNombre,
      row.direccion,
      row.barrioNombre,
      row.comunaNombre,
      isAdminUser ? row.funcionarioUsername : null,
      row.trazabilidad?.etiqueta,
      row.trazabilidad?.descripcion,
      row.trazabilidad?.nivel,
      row.trazabilidad?.ultimaVisitaAnterior,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(searchText));
  });

  const visibleSelectedCount = visibleRows.filter((row) => selectedIds.includes(row.id)).length;
  const allVisibleSelected = visibleRows.length > 0 && visibleSelectedCount === visibleRows.length;
  const menuOpen = Boolean(menuAnchorEl);
  const emptyTableColSpan = 8;

  const showSuccess = (message: string, title = 'Operación exitosa') => {
    setFeedback({
      open: true,
      type: 'success',
      title,
      message,
    });
  };

  const showError = (message: string, title = 'Error') => {
    setFeedback({
      open: true,
      type: 'error',
      title,
      message,
    });
  };

  const showWarning = (message: string, title = 'Atención') => {
    setFeedback({
      open: true,
      type: 'warning',
      title,
      message,
    });
  };

  const showInfo = (message: string, title = 'Información') => {
    setFeedback({
      open: true,
      type: 'info',
      title,
      message,
    });
  };

  const closeFeedback = () => {
    setFeedback(initialSnackbarState);
  };

  const getBarrioLabelById = (barrioId?: string | number | null) => {
    if (!barrioId) {
      return '';
    }

    return barrios.find((option) => String(option.id) === String(barrioId))?.label ?? '';
  };

  const getBarrioLabelByIdFromOptions = (
    options: SelectOption[],
    barrioId?: string | number | null
  ) => {
    if (!barrioId) {
      return '';
    }

    return options.find((option) => String(option.id) === String(barrioId))?.label ?? '';
  };

  const buildBackendFilter = (
    baseFilter: VentanillaFilter,
    admin: boolean = isAdminUser,
    selectedStatus: RecordStatusFilter = statusFilter
  ): VentanillaFilter => {
    const backendFilter: VentanillaFilter = {
      ...baseFilter,
      page: baseFilter.page ?? 0,
      size: baseFilter.size ?? 10,
    };

    if (!admin) {
      return {
        ...backendFilter,
        incluirInactivos: false,
        activo: true,
      };
    }

    if (selectedStatus === 'ALL') {
      return {
        ...backendFilter,
        incluirInactivos: true,
        activo: undefined,
      };
    }

    return {
      ...backendFilter,
      incluirInactivos: true,
      activo: selectedStatus === 'ACTIVE',
    };
  };

  const loadCatalogs = async () => {
    setCatalogLoading(true);

    try {
      const [categoriasData, solicitudesData, estadosData, barriosData] = await Promise.all([
        getCategoriasOptions(),
        getSolicitudesOptions(),
        getEstadosSolicitudOptions(),
        getBarriosOptions(),
      ]);

      setCategorias(categoriasData);
      setSolicitudes(solicitudesData);
      setEstados(estadosData);
      setBarrios(barriosData);
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : 'No fue posible cargar los catálogos.';

      setError(message);
      showError(message, 'Error al cargar catálogos');
    } finally {
      setCatalogLoading(false);
    }
  };

  const refreshBarriosCatalog = async () => {
    setCatalogLoading(true);

    try {
      const barriosData = await getBarriosOptions();

      setBarrios(barriosData);

      return barriosData;
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : 'No fue posible actualizar el listado de barrios.';

      setError(message);
      showError(message, 'Error al actualizar barrios');

      return barrios;
    } finally {
      setCatalogLoading(false);
    }
  };

  const load = async (
    customFilter: VentanillaFilter = filter,
    admin: boolean = isAdminUser,
    selectedStatus: RecordStatusFilter = statusFilter
  ) => {
    setLoading(true);
    setRestricted(false);
    setError('');

    try {
      const response = await searchVentanilla(
        buildBackendFilter(customFilter, admin, selectedStatus)
      );

      setPageData(response);
      setFilter(customFilter);
      setSelectedIds([]);
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 403) {
        setRestricted(true);
        showWarning('No tienes permisos para consultar esta información.');
      } else {
        const message = err instanceof Error
          ? err.message
          : 'No fue posible consultar los registros.';

        setError(message);
        showError(message, 'Error al consultar');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const role = currentRole();
    const admin = role === 'ADMIN';
    const supervisor = role === 'SUPERVISOR';
    const initialStatus: RecordStatusFilter = admin ? 'ALL' : 'ACTIVE';

    setIsAdminUser(admin);
    setCanUseAdvancedFilters(admin || supervisor);
    setStatusFilter(initialStatus);

    setPermissions({
      write: canWriteVentanilla(role),
      export: canExport(role),
      delete: canDeleteVentanilla(role),
      manageStatus: canManageVentanillaStatus(role),
      hardDelete: canHardDeleteVentanilla(role),
    });

    loadCatalogs();
    load(
      {
        page: 0,
        size: 10,
      },
      admin,
      initialStatus
    );
  }, []);

  useEffect(() => {
    if (!dialogOpen || !form.barrioId) {
      return;
    }

    const selectedBarrioLabel = getBarrioLabelById(form.barrioId);

    if (selectedBarrioLabel) {
      setBarrioInputText(selectedBarrioLabel);
    }
  }, [barrios, dialogOpen, form.barrioId]);

  const updateFilter = (key: keyof VentanillaFilter, value: string) => {
    setFilter((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const search = () => {
    load({
      ...filter,
      page: 0,
    });
  };

  const clearFilters = () => {
    const cleared = {
      page: 0,
      size: filter.size ?? 10,
    };

    setFilter(cleared);
    setTableSearch('');

    load(
      cleared,
      isAdminUser,
      statusFilter
    );
  };

  const changeStatusFilter = (value: RecordStatusFilter) => {
    setStatusFilter(value);

    load(
      {
        ...filter,
        page: 0,
      },
      isAdminUser,
      value
    );
  };

  const handleChangePage = (_: unknown, newPage: number) => {
    load({
      ...filter,
      page: newPage,
    });
  };

  const handleChangeRowsPerPage = (event: ChangeEvent<HTMLInputElement>) => {
    load({
      ...filter,
      page: 0,
      size: Number(event.target.value),
    });
  };

  const clearForm = () => {
    setBarrioInputText('');
    setForm({
      ...initialForm,
      fecha: getTodayDate(),
    });
  };

  const openCreate = async () => {
    setError('');
    clearForm();

    await refreshBarriosCatalog();

    setDialogOpen(true);
  };

  const closeFormDialog = () => {
    clearForm();
    setError('');
    setDialogOpen(false);
  };

  const handleFormDialogClose = (
    _: unknown,
    reason?: 'backdropClick' | 'escapeKeyDown'
  ) => {
    if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
      return;
    }

    closeFormDialog();
  };

  const openEdit = async (row: VentanillaResponse) => {
    const barriosActualizados = await refreshBarriosCatalog();

    const barrioId = row.barrioId ? String(row.barrioId) : '';
    const barrioLabel =
      getBarrioLabelByIdFromOptions(barriosActualizados, barrioId)
      || row.barrioNombre
      || getBarrioLabelById(barrioId);

    setError('');
    setBarrioInputText(barrioLabel);

    setForm({
      id: row.id,
      fecha: row.fecha,
      numeroVentanilla: row.numeroVentanilla ?? '',
      cedulaUsuario: row.cedulaUsuario ?? '',
      nombreUsuario: row.nombreUsuario ?? '',
      telefono: row.telefono ?? '',
      categoriaId: String(row.categoriaId),
      direccion: row.direccion ?? '',
      barrioId,
      extranjero: row.extranjero,
      solicitudId: String(row.solicitudId),
      estadoSolicitudId: String(row.estadoSolicitudId),
      observacion: row.observacion ?? '',
    });

    setDialogOpen(true);
  };

  const openConfirmDialog = (
    row: VentanillaResponse,
    action: ConfirmActionType
  ) => {
    setSelectedRecord(row);
    setConfirmAction(action);
    setConfirmDialogOpen(true);
  };

  const openRowMenu = (
    event: MouseEvent<HTMLButtonElement>,
    row: VentanillaResponse
  ) => {
    setMenuAnchorEl(event.currentTarget);
    setMenuRecord(row);
  };

  const closeRowMenu = () => {
    setMenuAnchorEl(null);
    setMenuRecord(null);
  };

  const openDetailDialog = (row: VentanillaResponse) => {
    setDetailRecord(row);
    setDetailDialogOpen(true);
  };

  const closeDetailDialog = () => {
    setDetailDialogOpen(false);
    setDetailRecord(null);
  };

  const toggleSelected = (id: number) => {
    setSelectedIds((current) => {
      if (current.includes(id)) {
        return current.filter((item) => item !== id);
      }

      return [...current, id];
    });
  };

  const toggleAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedIds((current) =>
        current.filter((id) => !visibleRows.some((row) => row.id === id))
      );

      return;
    }

    setSelectedIds((current) => {
      const ids = visibleRows.map((row) => row.id);
      const merged = new Set([...current, ...ids]);

      return Array.from(merged);
    });
  };

  const handleMenuEdit = () => {
    if (!menuRecord) {
      return;
    }

    const record = menuRecord;
    closeRowMenu();
    openEdit(record);
  };

  const handleMenuStatusAction = () => {
    if (!menuRecord) {
      return;
    }

    const record = menuRecord;
    closeRowMenu();

    if (permissions.manageStatus) {
      openConfirmDialog(record, record.activo ? 'INACTIVATE' : 'ACTIVATE');
      return;
    }

    openConfirmDialog(record, 'INACTIVATE');
  };

  const handleMenuHardDelete = () => {
    if (!menuRecord) {
      return;
    }

    const record = menuRecord;
    closeRowMenu();
    openConfirmDialog(record, 'HARD_DELETE');
  };

  const closeConfirmDialog = () => {
    if (processingAction) {
      return;
    }

    setSelectedRecord(null);
    setConfirmDialogOpen(false);
  };

  const confirmRecordAction = async () => {
    if (!selectedRecord) {
      return;
    }

    setProcessingAction(true);
    setError('');

    try {
      if (confirmAction === 'ACTIVATE') {
        await activateVentanilla(selectedRecord.id);

        showSuccess(
          'El registro fue activado correctamente y volverá a estar disponible.',
          'Registro activado'
        );
      }

      if (confirmAction === 'INACTIVATE') {
        await inactivateVentanilla(selectedRecord.id);

        showSuccess(
          'El registro fue marcado como inactivo y ya no aparecerá para los funcionarios.',
          'Registro inactivado'
        );
      }

      if (confirmAction === 'HARD_DELETE') {
        await deleteVentanilla(selectedRecord.id);

        showSuccess(
          'El registro fue eliminado definitivamente.',
          'Registro eliminado'
        );
      }

      setSelectedRecord(null);
      setConfirmDialogOpen(false);

      load({
        ...filter,
        page: 0,
      });
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : 'No fue posible procesar la acción solicitada.';

      setError(message);
      showError(message, 'Error del backend');
    } finally {
      setProcessingAction(false);
    }
  };

  const updateForm = (key: keyof FormState, value: string | boolean) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const findCitizenByCedula = async () => {
    const cedula = form.cedulaUsuario.trim();

    if (!cedula) {
      showWarning('Digita la cédula del ciudadano para buscar.');
      return;
    }

    setCitizenLoading(true);
    setError('');

    try {
      const response = await searchVentanilla({
        cedulaUsuario: cedula,
        page: 0,
        size: 1,
        incluirInactivos: false,
        activo: true,
      });

      const record = response.content[0];

      if (!record) {
        showInfo('No se encontraron registros activos anteriores para esta cédula.');
        return;
      }

      const barriosActualizados = await refreshBarriosCatalog();
      const recordBarrioId = record.barrioId ? String(record.barrioId) : '';
      const recordBarrioLabel =
        getBarrioLabelByIdFromOptions(barriosActualizados, recordBarrioId)
        || record.barrioNombre
        || getBarrioLabelById(recordBarrioId);

      setForm((current) => ({
        ...current,
        cedulaUsuario: cedula,
        nombreUsuario: record.nombreUsuario ?? current.nombreUsuario,
        telefono: record.telefono ?? current.telefono,
        direccion: record.direccion ?? current.direccion,
        barrioId: recordBarrioId || current.barrioId,
        categoriaId: record.categoriaId ? String(record.categoriaId) : current.categoriaId,
        extranjero: record.extranjero === true,
      }));

      if (recordBarrioLabel) {
        setBarrioInputText(recordBarrioLabel);
      }

      showSuccess(
        'Datos del ciudadano cargados correctamente, incluyendo categoría, barrio actualizado y condición de extranjero.',
        'Ciudadano encontrado'
      );
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : 'No fue posible buscar los datos del ciudadano.';

      setError(message);
      showError(message, 'Error al buscar ciudadano');
    } finally {
      setCitizenLoading(false);
    }
  };

  const handleCedulaKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter') {
      return;
    }

    event.preventDefault();
    findCitizenByCedula();
  };

  const buildRequest = (): VentanillaRequest => ({
    fecha: form.fecha,
    numeroVentanilla: form.numeroVentanilla.trim(),
    cedulaUsuario: form.cedulaUsuario.trim(),
    nombreUsuario: form.nombreUsuario.trim(),
    telefono: form.telefono.trim(),
    categoriaId: Number(form.categoriaId),
    direccion: form.direccion.trim(),
    barrioId: Number(form.barrioId),
    extranjero: form.extranjero,
    solicitudId: Number(form.solicitudId),
    estadoSolicitudId: Number(form.estadoSolicitudId),
    observacion: form.observacion.trim(),
  });

  const validateForm = () => {
    if (!form.fecha) {
      return 'La fecha es obligatoria.';
    }

    if (!form.numeroVentanilla.trim()) {
      return 'El número de ventanilla es obligatorio.';
    }

    if (!form.cedulaUsuario.trim()) {
      return 'La cédula del ciudadano es obligatoria.';
    }

    if (!form.nombreUsuario.trim()) {
      return 'El nombre del ciudadano es obligatorio.';
    }

    if (!form.categoriaId) {
      return 'Selecciona una categoría.';
    }

    if (!form.solicitudId) {
      return 'Selecciona el tipo de solicitud.';
    }

    if (!form.estadoSolicitudId) {
      return 'Selecciona el estado de la solicitud.';
    }

    if (!form.barrioId) {
      return 'Escribe y selecciona el barrio.';
    }

    return '';
  };

  const createRecord = async (request: VentanillaRequest) => {
    await createVentanilla(request);

    showSuccess(
      'La atención de ventanilla fue guardada correctamente. El formulario quedó listo para un nuevo registro.',
      'Registro guardado'
    );

    clearForm();
    load(filter);
  };

  const save = async () => {
    setError('');

    const validationMessage = validateForm();

    if (validationMessage) {
      setError(validationMessage);
      showWarning(validationMessage, 'Faltan datos');
      return;
    }

    const request = buildRequest();

    try {
      if (form.id) {
        await updateVentanilla(form.id, request);

        showSuccess(
          'La atención de ventanilla fue actualizada correctamente.',
          'Registro actualizado'
        );

        clearForm();
        setDialogOpen(false);
        load(filter);
        return;
      }

      const validation = await validateVentanillaBeforeSave({
        fecha: request.fecha,
        cedulaUsuario: request.cedulaUsuario,
        solicitudId: request.solicitudId,
      });

      if (!validation.puedeContinuar) {
        setDailyValidation(validation);
        showWarning(validation.mensaje, validation.titulo);
        return;
      }

      if (validation.requiereConfirmacion) {
        setDailyValidation(validation);
        setPendingCreateRequest(request);
        setDailyValidationOpen(true);
        return;
      }

      await createRecord(request);
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : 'No fue posible guardar el registro.';

      setError(message);
      showError(message, 'Error del backend');
    }
  };

  const closeDailyValidationDialog = () => {
    if (dailyValidationSaving) {
      return;
    }

    setDailyValidationOpen(false);
    setDailyValidation(null);
    setPendingCreateRequest(null);
  };

  const confirmDifferentDailyRequest = async () => {
    if (!pendingCreateRequest) {
      return;
    }

    setDailyValidationSaving(true);
    setError('');

    try {
      await createRecord(pendingCreateRequest);
      setDailyValidationOpen(false);
      setDailyValidation(null);
      setPendingCreateRequest(null);
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : 'No fue posible guardar el registro.';

      setError(message);
      showError(message, 'Error del backend');
    } finally {
      setDailyValidationSaving(false);
    }
  };

  const exportData = async () => {
    try {
      await exportVentanilla(
        buildBackendFilter({
          ...filter,
          page: undefined,
          size: undefined,
        })
      );

      showSuccess(
        'La exportación fue generada correctamente.',
        'Archivo descargado'
      );
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : 'No fue posible exportar la información.';

      setError(message);
      showError(message, 'Error al exportar');
    }
  };

  const getConfirmTitle = () => {
    if (confirmAction === 'ACTIVATE') {
      return 'Activar registro';
    }

    if (confirmAction === 'HARD_DELETE') {
      return 'Eliminar definitivamente';
    }

    return 'Inactivar registro';
  };

  const getConfirmText = () => {
    if (confirmAction === 'ACTIVATE') {
      return 'Activar';
    }

    if (confirmAction === 'HARD_DELETE') {
      return 'Eliminar definitivo';
    }

    return 'Eliminar';
  };

  const getConfirmColor = () => {
    if (confirmAction === 'ACTIVATE') {
      return 'success' as const;
    }

    return 'error' as const;
  };

  const getConfirmMessage = () => {
    if (!selectedRecord) {
      return 'Confirma la acción sobre este registro.';
    }

    if (confirmAction === 'ACTIVATE') {
      return `¿Seguro que deseas activar nuevamente el registro de ${selectedRecord.nombreUsuario} con cédula ${selectedRecord.cedulaUsuario}?`;
    }

    if (confirmAction === 'HARD_DELETE') {
      return `¿Seguro que deseas eliminar definitivamente el registro de ${selectedRecord.nombreUsuario} con cédula ${selectedRecord.cedulaUsuario}? Esta acción sí borra el registro de la base de datos.`;
    }

    return `¿Seguro que deseas retirar de la lista el registro de ${selectedRecord.nombreUsuario} con cédula ${selectedRecord.cedulaUsuario}? El registro no se borrará, solo quedará inactivo.`;
  };

  if (loading && !pageData) {
    return <LoadingState />;
  }

  return (
    <Stack spacing={3}>
      <Card
        sx={{
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        <CardContent
          sx={{
            p: { xs: 3, md: 4 },
            background:
              'linear-gradient(135deg, rgba(25, 118, 210, 0.10), rgba(25, 118, 210, 0.02))',
          }}
        >
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            sx={{
              alignItems: { xs: 'flex-start', md: 'center' },
              justifyContent: 'space-between',
            }}
          >
            <Box>
              <Chip
                label={isAdminUser ? 'Vista administrador' : 'Módulo operativo'}
                color={isAdminUser ? 'secondary' : 'primary'}
                variant="outlined"
                sx={{ mb: 1.5 }}
              />

              <Typography variant="h4" sx={{ fontWeight: 800 }}>
                Ventanilla
              </Typography>

              <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 720 }}>
                {isAdminUser
                  ? 'Consulta registros activos e inactivos, cambia su estado o elimina definitivamente cuando sea necesario.'
                  : 'Registra, consulta y actualiza las solicitudes atendidas en ventanilla.'}
              </Typography>
            </Box>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              {permissions.export ? (
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={exportData}
                >
                  Exportar
                </Button>
              ) : null}

              {permissions.write ? (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={openCreate}
                  disabled={catalogLoading}
                >
                  Nuevo registro
                </Button>
              ) : null}
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {isAdminUser ? (
        <Alert severity="info">
          Como administrador puedes ver registros activos e inactivos. Las acciones de activación,
          inactivación y eliminación definitiva quedan registradas en auditoría.
        </Alert>
      ) : null}

      {restricted ? (
        <Alert severity="warning">
          No tienes permisos para consultar esta información.
        </Alert>
      ) : null}

      {error ? (
        <Alert severity="error">
          {error}
        </Alert>
      ) : null}

      {canUseAdvancedFilters ? (
        <Card sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={1}
                sx={{
                  alignItems: { xs: 'flex-start', md: 'center' },
                  justifyContent: 'space-between',
                }}
              >
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Buscar registros
                  </Typography>

                  <Typography color="text.secondary" sx={{ fontSize: 14 }}>
                    Puedes buscar por fecha, cédula, número de ventanilla, estado, solicitud o barrio.
                  </Typography>
                </Box>

                <Chip
                  label={`${totalRecords} registro${totalRecords === 1 ? '' : 's'}`}
                  color="primary"
                  variant="outlined"
                />
              </Stack>

              {isAdminUser ? (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <Button
                    variant={statusFilter === 'ALL' ? 'contained' : 'outlined'}
                    startIcon={<VisibilityIcon />}
                    onClick={() => changeStatusFilter('ALL')}
                  >
                    Todos
                  </Button>

                  <Button
                    variant={statusFilter === 'ACTIVE' ? 'contained' : 'outlined'}
                    color="success"
                    onClick={() => changeStatusFilter('ACTIVE')}
                  >
                    Activos
                  </Button>

                  <Button
                    variant={statusFilter === 'INACTIVE' ? 'contained' : 'outlined'}
                    color="warning"
                    onClick={() => changeStatusFilter('INACTIVE')}
                  >
                    Inactivos
                  </Button>
                </Stack>
              ) : null}

              <Divider />

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    md: 'repeat(4, 1fr)',
                  },
                  gap: 2,
                }}
              >
                <TextField
                  label="Fecha inicio"
                  type="date"
                  size="small"
                  value={filter.fechaInicio ?? ''}
                  onChange={(event) => updateFilter('fechaInicio', event.target.value)}
                  slotProps={{
                    inputLabel: {
                      shrink: true,
                    },
                  }}
                />

                <TextField
                  label="Fecha fin"
                  type="date"
                  size="small"
                  value={filter.fechaFin ?? ''}
                  onChange={(event) => updateFilter('fechaFin', event.target.value)}
                  slotProps={{
                    inputLabel: {
                      shrink: true,
                    },
                  }}
                />

                <TextField
                  label="Cédula"
                  size="small"
                  value={filter.cedulaUsuario ?? ''}
                  onChange={(event) => updateFilter('cedulaUsuario', event.target.value)}
                />

                <TextField
                  label="Número ventanilla"
                  size="small"
                  value={filter.numeroVentanilla ?? ''}
                  onChange={(event) => updateFilter('numeroVentanilla', event.target.value)}
                />

                <SelectField
                  label="Estado solicitud"
                  value={filter.estadoSolicitudId ?? ''}
                  options={estados}
                  onChange={(value) => updateFilter('estadoSolicitudId', value)}
                />

                <SelectField
                  label="Solicitud"
                  value={filter.solicitudId ?? ''}
                  options={solicitudes}
                  onChange={(value) => updateFilter('solicitudId', value)}
                />

                <SelectField
                  label="Barrio"
                  value={filter.barrioId ?? ''}
                  options={barrios}
                  onChange={(value) => updateFilter('barrioId', value)}
                />

                <Stack direction="row" spacing={1}>
                  <Button
                    variant="contained"
                    startIcon={<SearchIcon />}
                    onClick={search}
                    disabled={loading}
                  >
                    Buscar
                  </Button>

                  <Button
                    variant="outlined"
                    startIcon={<RestartAltIcon />}
                    onClick={clearFilters}
                    disabled={loading}
                  >
                    Limpiar
                  </Button>
                </Stack>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      ) : null}

      <Card
        sx={{
          borderRadius: 4,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 16px 40px rgba(15, 23, 42, 0.08)',
        }}
      >
        <CardContent sx={{ p: 0 }}>
          <Box
            sx={{
              px: { xs: 2, md: 2.5 },
              py: 2,
              display: 'flex',
              gap: 2,
              alignItems: { xs: 'stretch', sm: 'center' },
              justifyContent: 'space-between',
              flexDirection: { xs: 'column', sm: 'row' },
              bgcolor: 'background.paper',
            }}
          >
            <TextField
              placeholder="Buscar ciudadano, cédula, categoría, solicitud, frecuencia..."
              size="small"
              value={tableSearch}
              onChange={(event) => setTableSearch(event.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{
                width: { xs: '100%', sm: 520, md: 620 },
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2.5,
                  bgcolor: '#ffffff',
                },
              }}
            />

            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Chip
                label={`${visibleRows.length} visible${visibleRows.length === 1 ? '' : 's'}`}
                size="small"
                color="primary"
                variant="outlined"
              />

              <IconButton
                onClick={search}
                disabled={loading}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                }}
              >
                <FilterListIcon />
              </IconButton>
            </Stack>
          </Box>

          <Box sx={{ overflowX: 'auto' }}>
            <Table
              sx={{
                minWidth: 1300,
                '& .MuiTableCell-root': {
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                },
                '& .MuiTableHead-root .MuiTableCell-root': {
                  bgcolor: '#f8fafc',
                  color: 'text.secondary',
                  fontSize: 13,
                  fontWeight: 800,
                  py: 1.6,
                },
                '& .MuiTableBody-root .MuiTableCell-root': {
                  py: 1.7,
                  fontSize: 14,
                },
                '& .MuiTableRow-root:hover': {
                  bgcolor: '#f8fafc',
                },
              }}
            >
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800, minWidth: 105 }}>
                    Fecha
                  </TableCell>

                  <TableCell sx={{ fontWeight: 800, minWidth: 125 }}>
                    N° Ventanilla
                  </TableCell>

                  <TableCell sx={{ fontWeight: 800, minWidth: 260 }}>
                    Ciudadano
                  </TableCell>

                  <TableCell sx={{ fontWeight: 800, minWidth: 180 }}>
                    Categoría
                  </TableCell>

                  <TableCell sx={{ fontWeight: 800, minWidth: 230 }}>
                    Solicitud
                  </TableCell>

                  <TableCell sx={{ fontWeight: 800, minWidth: 165 }}>
                    Estado solicitud
                  </TableCell>

                  <TableCell sx={{ fontWeight: 800, minWidth: 245 }}>
                    Frecuencia / última visita
                  </TableCell>

                  <TableCell align="center" sx={{ fontWeight: 800, minWidth: 135 }}>
                    Acciones
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {visibleRows.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell>
                      <Typography sx={{ fontWeight: 800, fontSize: 13, whiteSpace: 'nowrap' }}>
                        {formatDate(row.fecha)}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={row.numeroVentanilla || '-'}
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ fontWeight: 800 }}
                      />
                    </TableCell>

                    <TableCell>
                      <Box>
                        <Typography sx={{ fontWeight: 800, fontSize: 14 }}>
                          {row.nombreUsuario || 'Sin nombre'}
                        </Typography>

                        <Typography color="text.secondary" sx={{ fontSize: 12 }}>
                          CC {row.cedulaUsuario || '-'}
                        </Typography>

                        <Typography color="text.secondary" sx={{ fontSize: 12 }}>
                          {row.telefono || 'Sin teléfono'}
                        </Typography>
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={row.categoriaNombre || 'Sin categoría'}
                        size="small"
                        color="secondary"
                        variant="outlined"
                        sx={{
                          maxWidth: 170,
                          fontWeight: 800,
                          '& .MuiChip-label': {
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          },
                        }}
                      />
                    </TableCell>

                    <TableCell>
                      <Typography sx={{ fontWeight: 800, fontSize: 13, minWidth: 190 }}>
                        {row.solicitudNombre || 'Sin solicitud'}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Stack spacing={0.7} sx={{ minWidth: 145 }}>
                        <Chip
                          label={row.estadoSolicitudNombre || 'Sin estado'}
                          size="small"
                          variant="outlined"
                          color="primary"
                          sx={{ width: 'fit-content', fontWeight: 700 }}
                        />

                        {isAdminUser ? (
                          <Chip
                            label={row.activo ? 'Activo' : 'Inactivo'}
                            size="small"
                            color={row.activo ? 'success' : 'warning'}
                            variant={row.activo ? 'outlined' : 'filled'}
                            sx={{ width: 'fit-content', fontWeight: 700 }}
                          />
                        ) : null}
                      </Stack>
                    </TableCell>

                    <TableCell>
                      <CitizenFrequencyField row={row} />
                    </TableCell>

                    <TableCell align="center">
                      <Stack
                        direction="row"
                        spacing={0.5}
                        sx={{
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Tooltip title="Ver información completa" arrow>
                          <IconButton
                            onClick={() => openDetailDialog(row)}
                            sx={{
                              border: '1px solid',
                              borderColor: 'divider',
                              borderRadius: 2,
                              color: 'text.secondary',
                              '&:hover': {
                                color: 'primary.main',
                                bgcolor: 'rgba(25, 118, 210, 0.08)',
                              },
                            }}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        {permissions.write ? (
                          <Tooltip title="Más acciones" arrow>
                            <IconButton
                              onClick={(event) => openRowMenu(event, row)}
                              sx={{
                                borderRadius: 2,
                                color: 'text.secondary',
                              }}
                            >
                              <MoreVertIcon />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Typography color="text.secondary" sx={{ fontSize: 12 }}>
                            Solo lectura
                          </Typography>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}

                {!visibleRows.length ? (
                  <TableRow>
                    <TableCell colSpan={emptyTableColSpan}>
                      <Box sx={{ py: 5, textAlign: 'center' }}>
                        <Typography variant="h6">
                          No hay registros para mostrar
                        </Typography>

                        <Typography color="text.secondary" sx={{ mt: 1 }}>
                          Intenta limpiar los filtros o realizar una nueva búsqueda.
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </Box>

          <TablePagination
            component="div"
            count={totalRecords}
            page={currentPage}
            onPageChange={handleChangePage}
            rowsPerPage={currentSize}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[10, 20, 50]}
            labelRowsPerPage="Filas por página"
            labelDisplayedRows={({ from, to, count }) =>
              `${from}-${to} de ${count !== -1 ? count : `más de ${to}`}`
            }
            sx={{
              borderTop: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
            }}
          />

          <Menu
            anchorEl={menuAnchorEl}
            open={menuOpen}
            onClose={closeRowMenu}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            slotProps={{
              paper: {
                sx: {
                  mt: 1,
                  minWidth: 210,
                  borderRadius: 3,
                  boxShadow: '0 16px 40px rgba(15, 23, 42, 0.16)',
                },
              },
            }}
          >
            <MenuItem
              onClick={handleMenuEdit}
              sx={{
                gap: 1.5,
                color: 'info.main',
                fontWeight: 700,
              }}
            >
              <EditIcon fontSize="small" />
              Actualizar
            </MenuItem>

            {permissions.manageStatus || permissions.delete ? (
              <MenuItem
                onClick={handleMenuStatusAction}
                sx={{
                  gap: 1.5,
                  color: menuRecord?.activo ? 'error.main' : 'success.main',
                  fontWeight: 700,
                }}
              >
                {menuRecord?.activo ? (
                  <DeleteIcon fontSize="small" />
                ) : (
                  <RestoreIcon fontSize="small" />
                )}

                {permissions.manageStatus
                  ? menuRecord?.activo ? 'Inactivar' : 'Activar'
                  : 'Eliminar'}
              </MenuItem>
            ) : null}

            {permissions.hardDelete ? (
              <MenuItem
                onClick={handleMenuHardDelete}
                sx={{
                  gap: 1.5,
                  color: 'error.main',
                  fontWeight: 700,
                }}
              >
                <DeleteForeverIcon fontSize="small" />
                Eliminar definitivo
              </MenuItem>
            ) : null}
          </Menu>
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onClose={handleFormDialogClose}
        fullScreen
      >
        <DialogTitle
          sx={{
            px: { xs: 2, md: 4 },
            py: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Stack
            direction="row"
            spacing={2}
            sx={{
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                {form.id ? 'Editar atención de ventanilla' : 'Nueva atención de ventanilla'}
              </Typography>

              <Typography color="text.secondary" sx={{ fontSize: 14 }}>
                Completa la información del ciudadano y la solicitud atendida.
              </Typography>
            </Box>

            <IconButton
              onClick={closeFormDialog}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
              }}
            >
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent
          sx={{
            p: { xs: 2, md: 4 },
            bgcolor: '#f8fafc',
          }}
        >
          <Stack
            spacing={3}
            sx={{
              maxWidth: 1100,
              mx: 'auto',
              pt: 1,
            }}
          >
            <Card
              sx={{
                borderRadius: 4,
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: '1fr',
                      md: 'repeat(2, 1fr)',
                    },
                    gap: 2,
                  }}
                >
                  <TextField
                    label="Fecha"
                    disabled
                    type="date"
                    size="small"
                    required
                    value={form.fecha}
                    onChange={(event) => updateForm('fecha', event.target.value)}
                    slotProps={{
                      inputLabel: {
                        shrink: true,
                      },
                    }}
                  />

                  <TextField
                    label="Número ventanilla"
                    size="small"
                    required
                    value={form.numeroVentanilla}
                    onChange={(event) => updateForm('numeroVentanilla', event.target.value)}
                  />

                  <TextField
                    label="Cédula ciudadano"
                    size="small"
                    required
                    value={form.cedulaUsuario}
                    onChange={(event) => updateForm('cedulaUsuario', event.target.value)}
                    onKeyDown={handleCedulaKeyDown}
                    disabled={citizenLoading}
                    helperText={
                      citizenLoading
                        ? 'Buscando datos del ciudadano...'
                        : 'Digita la cédula y presiona Enter para cargar datos anteriores.'
                    }
                  />

                  <TextField
                    label="Nombre ciudadano"
                    size="small"
                    required
                    value={form.nombreUsuario}
                    onChange={(event) => updateForm('nombreUsuario', event.target.value)}
                  />

                  <TextField
                    label="Teléfono"
                    size="small"
                    value={form.telefono}
                    onChange={(event) => updateForm('telefono', event.target.value)}
                  />

                  <SelectField
                    label="Categoría"
                    value={form.categoriaId}
                    options={categorias}
                    required
                    onChange={(value) => updateForm('categoriaId', value)}
                  />

                  <SelectField
                    label="Solicitud"
                    value={form.solicitudId}
                    options={solicitudes}
                    required
                    onChange={(value) => updateForm('solicitudId', value)}
                  />

                  <SelectField
                    label="Estado solicitud"
                    value={form.estadoSolicitudId}
                    options={estados}
                    required
                    onChange={(value) => updateForm('estadoSolicitudId', value)}
                  />

                  <Autocomplete
                    options={barrios}
                    loading={catalogLoading}
                    onOpen={() => {
                      refreshBarriosCatalog();
                    }}
                    value={
                      barrios.find((option) => String(option.id) === String(form.barrioId)) ?? null
                    }
                    inputValue={barrioInputText}
                    onInputChange={(_, newInputValue, reason) => {
                      if (reason === 'input') {
                        setBarrioInputText(newInputValue);
                        updateForm('barrioId', '');
                        return;
                      }

                      if (reason === 'clear') {
                        setBarrioInputText('');
                        updateForm('barrioId', '');
                      }
                    }}
                    onChange={(_, selectedOption) => {
                      updateForm('barrioId', selectedOption ? String(selectedOption.id) : '');
                      setBarrioInputText(selectedOption?.label ?? '');
                    }}
                    getOptionLabel={(option) => option.label ?? ''}
                    isOptionEqualToValue={(option, value) =>
                      String(option.id) === String(value.id)
                    }
                    filterOptions={(options, state) => {
                      const searchText = normalizeSearchText(state.inputValue);

                      if (!searchText) {
                        return options;
                      }

                      return options.filter((option) =>
                        normalizeSearchText(option.label).includes(searchText)
                      );
                    }}
                    autoHighlight
                    clearOnEscape
                    noOptionsText="No se encontraron barrios"
                    loadingText="Actualizando barrios..."
                    clearText="Limpiar"
                    openText="Abrir"
                    closeText="Cerrar"
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Barrio"
                        size="small"
                        required
                        helperText={
                          catalogLoading
                            ? 'Actualizando barrios desde el módulo de Barrios...'
                            : 'Escribe letras del barrio y selecciona una opción.'
                        }
                      />
                    )}
                  />

                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={form.extranjero}
                        onChange={(event) => updateForm('extranjero', event.target.checked)}
                      />
                    }
                    label="Ciudadano extranjero"
                  />

                  <TextField
                    label="Dirección"
                    size="small"
                    value={form.direccion}
                    onChange={(event) => updateForm('direccion', event.target.value)}
                    sx={{ gridColumn: { md: '1 / -1' } }}
                  />

                  <TextField
                    label="Observación"
                    size="small"
                    multiline
                    minRows={3}
                    value={form.observacion}
                    onChange={(event) => updateForm('observacion', event.target.value)}
                    sx={{ gridColumn: { md: '1 / -1' } }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Stack>
        </DialogContent>

        <DialogActions
          sx={{
            px: { xs: 2, md: 4 },
            py: 2,
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            justifyContent: 'flex-end',
          }}
        >
          <Button
            variant="outlined"
            color="inherit"
            onClick={closeFormDialog}
          >
            Cancelar
          </Button>

          <Button
            variant="contained"
            color={form.id ? 'info' : 'primary'}
            onClick={save}
          >
            {form.id ? 'Actualizar registro' : 'Guardar registro'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={dailyValidationOpen}
        onClose={closeDailyValidationDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {dailyValidation?.titulo ?? 'Confirmar nueva solicitud'}
        </DialogTitle>

        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            {dailyValidation?.mensaje}
          </Alert>

          <Typography sx={{ fontWeight: 800, mb: 1 }}>
            Solicitudes registradas en esta misma fecha:
          </Typography>

          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Solicitud</TableCell>
                  <TableCell>Categoría</TableCell>
                  <TableCell>Estado</TableCell>

                  {isAdminUser ? (
                    <TableCell>Funcionario</TableCell>
                  ) : null}
                </TableRow>
              </TableHead>

              <TableBody>
                {(dailyValidation?.solicitudesMismaFecha ?? []).map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{formatDate(item.fecha)}</TableCell>
                    <TableCell>{item.solicitudNombre || 'Sin solicitud'}</TableCell>
                    <TableCell>{item.categoriaNombre || 'Sin categoría'}</TableCell>
                    <TableCell>{item.estadoSolicitudNombre || 'Sin estado'}</TableCell>

                    {isAdminUser ? (
                      <TableCell>{item.funcionarioUsername || 'Sin funcionario'}</TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button
            variant="outlined"
            color="inherit"
            onClick={closeDailyValidationDialog}
            disabled={dailyValidationSaving}
          >
            Cancelar
          </Button>

          <Button
            variant="contained"
            color="warning"
            onClick={confirmDifferentDailyRequest}
            disabled={dailyValidationSaving}
          >
            {dailyValidationSaving ? 'Guardando...' : 'Confirmar y guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      <CitizenDetailDialog
        open={detailDialogOpen}
        row={detailRecord}
        onClose={closeDetailDialog}
      />

      <ConfirmActionDialog
        open={confirmDialogOpen}
        title={getConfirmTitle()}
        message={getConfirmMessage()}
        confirmText={getConfirmText()}
        cancelText="Cancelar"
        confirmColor={getConfirmColor()}
        loading={processingAction}
        onCancel={closeConfirmDialog}
        onConfirm={confirmRecordAction}
      />

      <AppSnackbar
        feedback={feedback}
        onClose={closeFeedback}
      />
    </Stack>
  );
}