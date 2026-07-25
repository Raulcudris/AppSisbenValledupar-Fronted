'use client';

import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import FilterListIcon from '@mui/icons-material/FilterList';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import RestoreIcon from '@mui/icons-material/Restore';
import SearchIcon from '@mui/icons-material/Search';
import ToggleOffIcon from '@mui/icons-material/ToggleOff';
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
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { ChangeEvent, MouseEvent, useEffect, useMemo, useState } from 'react';

import AccessMessage from '@/components/dashboard/AccessMessage';
import LoadingState from '@/components/dashboard/LoadingState';
import CrudPageHeader from '@/components/operational/CrudPageHeader';
import { canWriteCallCenter, currentRole } from '@/lib/roleAccess';
import {
  activateCallCenterRegistro,
  createCallCenterRegistro,
  deactivateCallCenterRegistro,
  getMotivosNoContactoOptions,
  getMotivosNoDisposicionOptions,
  searchCallCenter,
  updateCallCenterRegistro,
} from '@/services/callcenter.service';
import { getEncuestadoresOptions } from '@/services/catalog.service';
import { getBarriosOptions } from '@/services/territory.service';
import { PageResponse } from '@/types/api.types';
import { SelectOption } from '@/types/catalog.types';
import {
  BooleanFilterValue,
  CallCenterFilter,
  CallCenterRequest,
  CallCenterResponse,
  StatusFilterValue,
} from '@/types/callcenter.types';

type FormState = {
  id?: number;
  fechaLlamada: string;
  horaLlamada: string;
  tipoRegistro: string;
  cedulaSolicitante: string;
  nombreCompleto: string;
  telefono: string;
  llamadaConectada: 'YES' | 'NO';
  motivoNoContactoId: string;
  motivoNoContactoTexto: string;
  encuestadorProgramadoId: string;
  fechaEncuestaProgramada: string;
  solicitoNuevaEncuesta: '' | 'YES' | 'NO';
  direccionTexto: string;
  barrioId: string;
  fechaAplicacionInformada: string;
  disposicionRecibirEncuesta: '' | 'YES' | 'NO';
  motivoNoDisposicionId: string;
  motivoNoDisposicionTexto: string;
  encuestadorAsignadoId: string;
  explicoInformanteCalificado: '' | 'YES' | 'NO';
  verificado: '' | 'YES' | 'NO';
  observacion: string;
  activo: boolean;
};

type SnackbarSeverity = 'success' | 'error' | 'warning' | 'info';
type ConfirmAction = 'ACTIVATE' | 'DEACTIVATE';

const initialForm: FormState = {
  fechaLlamada: '',
  horaLlamada: '',
  tipoRegistro: 'LLAMADA',
  cedulaSolicitante: '',
  nombreCompleto: '',
  telefono: '',
  llamadaConectada: 'NO',
  motivoNoContactoId: '',
  motivoNoContactoTexto: '',
  encuestadorProgramadoId: '',
  fechaEncuestaProgramada: '',
  solicitoNuevaEncuesta: '',
  direccionTexto: '',
  barrioId: '',
  fechaAplicacionInformada: '',
  disposicionRecibirEncuesta: '',
  motivoNoDisposicionId: '',
  motivoNoDisposicionTexto: '',
  encuestadorAsignadoId: '',
  explicoInformanteCalificado: '',
  verificado: '',
  observacion: '',
  activo: true,
};

function normalizeSearchText(value?: string | number | boolean | null) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function matchesByFirstLetters(
  value: string | number | boolean | null | undefined,
  searchValue: string
) {
  const searchText = normalizeSearchText(searchValue);

  if (!searchText) {
    return true;
  }

  const normalizedValue = normalizeSearchText(value);

  if (!normalizedValue) {
    return false;
  }

  return normalizedValue
    .split(/[\s\-_.]+/)
    .filter(Boolean)
    .some((word) => word.startsWith(searchText));
}

function matchesAnyByFirstLetters(
  searchValue: string,
  values: Array<string | number | boolean | null | undefined>
) {
  const searchText = normalizeSearchText(searchValue);

  if (!searchText) {
    return true;
  }

  return values.some((value) => matchesByFirstLetters(value, searchText));
}

function clean(value: string) {
  const safeValue = value.trim();

  return safeValue ? safeValue : null;
}

function upper(value: string) {
  return value.trim().replace(/\s+/g, ' ').toUpperCase();
}

function parseNumber(value: string) {
  return value ? Number(value) : null;
}

function fromBooleanOption(value: '' | 'YES' | 'NO') {
  if (value === 'YES') return true;
  if (value === 'NO') return false;

  return null;
}

function toBooleanOption(value?: boolean | null): '' | 'YES' | 'NO' {
  if (value === true) return 'YES';
  if (value === false) return 'NO';

  return '';
}

function getBooleanFilter(value: BooleanFilterValue) {
  if (value === 'YES') return true;
  if (value === 'NO') return false;

  return undefined;
}

function getActivoFilter(value: StatusFilterValue) {
  if (value === 'ACTIVE') return true;
  if (value === 'INACTIVE') return false;

  return undefined;
}

function booleanLabel(value?: boolean | null) {
  if (value === true) return 'Sí';
  if (value === false) return 'No';

  return '-';
}

function currentDateValue() {
  return new Date().toISOString().slice(0, 10);
}

function currentTimeValue() {
  return new Date().toTimeString().slice(0, 5);
}

export default function CallCenterRegistrosPage() {
  const [filter, setFilter] = useState<CallCenterFilter>({
    page: 0,
    size: 20,
  });
  const [connectionFilter, setConnectionFilter] = useState<BooleanFilterValue>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>('ALL');
  const [pageData, setPageData] = useState<PageResponse<CallCenterResponse> | null>(null);
  const [barrios, setBarrios] = useState<SelectOption[]>([]);
  const [encuestadores, setEncuestadores] = useState<SelectOption[]>([]);
  const [motivosNoContacto, setMotivosNoContacto] = useState<SelectOption[]>([]);
  const [motivosNoDisposicion, setMotivosNoDisposicion] = useState<SelectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [restricted, setRestricted] = useState(false);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(initialForm);
  const [tableSearch, setTableSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [menuRecord, setMenuRecord] = useState<CallCenterResponse | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmRecord, setConfirmRecord] = useState<CallCenterResponse | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>('DEACTIVATE');
  const [processingAction, setProcessingAction] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: SnackbarSeverity;
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const allowWrite = useMemo(() => canWriteCallCenter(currentRole()), []);

  const totalRecords = pageData?.totalElements ?? 0;
  const currentPage = pageData?.page ?? 0;
  const currentSize = pageData?.size ?? 20;
  const menuOpen = Boolean(menuAnchorEl);

  const visibleRows = (pageData?.content ?? []).filter((row) =>
    matchesAnyByFirstLetters(tableSearch, [
      row.fechaLlamada,
      row.cedulaSolicitante,
      row.nombreCompleto,
      row.telefono,
      row.barrioNombre,
      row.comunaNombre,
      row.encuestadorAsignadoNombre,
      row.encuestadorProgramadoNombre,
      row.estadoVisita,
      row.llamadaConectada ? 'si conectada' : 'no conectada',
      row.activo ? 'activo' : 'inactivo',
    ])
  );

  const visibleSelectedCount = visibleRows.filter((row) =>
    selectedIds.includes(row.id)
  ).length;

  const allVisibleSelected = visibleRows.length > 0
    && visibleSelectedCount === visibleRows.length;

  const showSnackbar = (message: string, severity: SnackbarSeverity = 'success') => {
    setSnackbar({
      open: true,
      message,
      severity,
    });
  };

  const closeSnackbar = () => {
    setSnackbar({
      open: false,
      message: '',
      severity: 'success',
    });
  };

  const findOption = (options: SelectOption[], id: string | number | null | undefined) =>
    options.find((option) => String(option.id) === String(id ?? '')) ?? null;

  const filterOptionsByFirstLetters = (options: SelectOption[], inputValue: string) => {
    const searchText = normalizeSearchText(inputValue);

    if (!searchText) {
      return options;
    }

    return options.filter((option) => matchesByFirstLetters(option.label, searchText));
  };

  const loadCatalogs = async () => {
    setCatalogLoading(true);

    try {
      const [
        barriosData,
        encuestadoresData,
        motivosContactoData,
        motivosDisposicionData,
      ] = await Promise.all([
        getBarriosOptions(),
        getEncuestadoresOptions(),
        getMotivosNoContactoOptions(),
        getMotivosNoDisposicionOptions(),
      ]);

      setBarrios(barriosData);
      setEncuestadores(encuestadoresData);
      setMotivosNoContacto(motivosContactoData);
      setMotivosNoDisposicion(motivosDisposicionData);
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : 'No fue posible cargar los catálogos del formulario.';

      setError(message);
      showSnackbar(message, 'error');
    } finally {
      setCatalogLoading(false);
    }
  };

  const load = async (
    customFilter: CallCenterFilter = filter,
    customConnection: BooleanFilterValue = connectionFilter,
    customStatus: StatusFilterValue = statusFilter
  ) => {
    setLoading(true);
    setRestricted(false);
    setError('');

    try {
      const response = await searchCallCenter({
        ...customFilter,
        llamadaConectada: getBooleanFilter(customConnection),
        activo: getActivoFilter(customStatus),
      });

      setPageData(response);
      setFilter(customFilter);
      setConnectionFilter(customConnection);
      setStatusFilter(customStatus);
      setSelectedIds([]);
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : 'No fue posible consultar los registros Call Center.';

      if (message.toLowerCase().includes('forbidden') || message.includes('403')) {
        setRestricted(true);
      } else {
        setError(message);
        showSnackbar(message, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCatalogs();
    void load({
      page: 0,
      size: 20,
    }, 'ALL', 'ALL');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateFilter = (key: keyof CallCenterFilter, value: string) => {
    setFilter((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const updateForm = (key: keyof FormState, value: string | boolean) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const search = () => {
    void load({
      ...filter,
      page: 0,
    }, connectionFilter, statusFilter);
  };

  const clearFilters = () => {
    const cleared = {
      page: 0,
      size: filter.size ?? 20,
    };

    setFilter(cleared);
    setConnectionFilter('ALL');
    setStatusFilter('ALL');
    setTableSearch('');
    setSelectedIds([]);
    void load(cleared, 'ALL', 'ALL');
  };

  const handleChangePage = (_: unknown, newPage: number) => {
    void load({
      ...filter,
      page: newPage,
    }, connectionFilter, statusFilter);
  };

  const handleChangeRowsPerPage = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    void load({
      ...filter,
      page: 0,
      size: Number(event.target.value),
    }, connectionFilter, statusFilter);
  };

  const openCreate = () => {
    setError('');
    setForm({
      ...initialForm,
      fechaLlamada: currentDateValue(),
      horaLlamada: currentTimeValue(),
    });
    setDialogOpen(true);
  };

  const openEdit = (row: CallCenterResponse) => {
    setError('');
    setForm({
      id: row.id,
      fechaLlamada: row.fechaLlamada ?? '',
      horaLlamada: row.horaLlamada ? row.horaLlamada.slice(0, 5) : '',
      tipoRegistro: row.tipoRegistro ?? 'LLAMADA',
      cedulaSolicitante: row.cedulaSolicitante ?? '',
      nombreCompleto: row.nombreCompleto ?? '',
      telefono: row.telefono ?? '',
      llamadaConectada: row.llamadaConectada ? 'YES' : 'NO',
      motivoNoContactoId: row.motivoNoContactoId ? String(row.motivoNoContactoId) : '',
      motivoNoContactoTexto: row.motivoNoContactoTexto ?? '',
      encuestadorProgramadoId: row.encuestadorProgramadoId ? String(row.encuestadorProgramadoId) : '',
      fechaEncuestaProgramada: row.fechaEncuestaProgramada ?? '',
      solicitoNuevaEncuesta: toBooleanOption(row.solicitoNuevaEncuesta),
      direccionTexto: row.direccionTexto ?? '',
      barrioId: row.barrioId ? String(row.barrioId) : '',
      fechaAplicacionInformada: row.fechaAplicacionInformada ?? '',
      disposicionRecibirEncuesta: toBooleanOption(row.disposicionRecibirEncuesta),
      motivoNoDisposicionId: row.motivoNoDisposicionId ? String(row.motivoNoDisposicionId) : '',
      motivoNoDisposicionTexto: row.motivoNoDisposicionTexto ?? '',
      encuestadorAsignadoId: row.encuestadorAsignadoId ? String(row.encuestadorAsignadoId) : '',
      explicoInformanteCalificado: toBooleanOption(row.explicoInformanteCalificado),
      verificado: toBooleanOption(row.verificado),
      observacion: row.observacion ?? '',
      activo: row.activo,
    });
    setDialogOpen(true);
  };

  const closeFormDialog = () => {
    setDialogOpen(false);
    setForm(initialForm);
    setError('');
  };

  const openRowMenu = (event: MouseEvent<HTMLButtonElement>, row: CallCenterResponse) => {
    setMenuAnchorEl(event.currentTarget);
    setMenuRecord(row);
  };

  const closeRowMenu = () => {
    setMenuAnchorEl(null);
    setMenuRecord(null);
  };

  const handleMenuEdit = () => {
    if (!menuRecord) {
      return;
    }

    const record = menuRecord;
    closeRowMenu();
    openEdit(record);
  };

  const openConfirmDialog = (row: CallCenterResponse, action: ConfirmAction) => {
    setConfirmRecord(row);
    setConfirmAction(action);
    setConfirmDialogOpen(true);
  };

  const handleMenuStatus = () => {
    if (!menuRecord) {
      return;
    }

    const record = menuRecord;
    closeRowMenu();
    openConfirmDialog(record, record.activo ? 'DEACTIVATE' : 'ACTIVATE');
  };

  const closeConfirmDialog = () => {
    if (processingAction) {
      return;
    }

    setConfirmDialogOpen(false);
    setConfirmRecord(null);
  };

  const confirmStatusAction = async () => {
    if (!confirmRecord) {
      return;
    }

    setProcessingAction(true);
    setError('');

    try {
      if (confirmAction === 'ACTIVATE') {
        await activateCallCenterRegistro(confirmRecord.id);
        showSnackbar('Registro Call Center activado correctamente.', 'success');
      } else {
        await deactivateCallCenterRegistro(confirmRecord.id);
        showSnackbar('Registro Call Center inactivado correctamente.', 'success');
      }

      setConfirmDialogOpen(false);
      setConfirmRecord(null);

      await load({
        ...filter,
        page: 0,
      }, connectionFilter, statusFilter);
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : 'No fue posible cambiar el estado del registro.';

      setError(message);
      showSnackbar(message, 'error');
    } finally {
      setProcessingAction(false);
    }
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

  const validateForm = () => {
    if (!form.fechaLlamada) {
      return 'La fecha de llamada es obligatoria.';
    }

    if (!form.cedulaSolicitante.trim()) {
      return 'La cédula del solicitante es obligatoria.';
    }

    if (!form.nombreCompleto.trim()) {
      return 'El nombre completo es obligatorio.';
    }

    if (form.llamadaConectada === 'NO') {
      const hasMotivo = Boolean(form.motivoNoContactoId)
        || Boolean(form.motivoNoContactoTexto.trim());

      if (!hasMotivo) {
        return 'Debe registrar el motivo por el cual no se logró conectar la llamada.';
      }
    }

    if (
      form.llamadaConectada === 'YES'
      && form.disposicionRecibirEncuesta === 'NO'
    ) {
      const hasMotivo = Boolean(form.motivoNoDisposicionId)
        || Boolean(form.motivoNoDisposicionTexto.trim());

      if (!hasMotivo) {
        return 'Debe registrar el motivo por el cual no se confirmó la disposición.';
      }
    }

    return '';
  };

  const buildRequest = (): CallCenterRequest => {
    const llamadaConectada = form.llamadaConectada === 'YES';

    return {
      fechaLlamada: form.fechaLlamada,
      horaLlamada: clean(form.horaLlamada),
      tipoRegistro: clean(form.tipoRegistro) ?? 'LLAMADA',
      cedulaSolicitante: clean(form.cedulaSolicitante) ?? '',
      nombreCompleto: upper(form.nombreCompleto),
      telefono: clean(form.telefono),
      llamadaConectada,
      motivoNoContactoId: llamadaConectada ? null : parseNumber(form.motivoNoContactoId),
      motivoNoContactoTexto: llamadaConectada ? null : clean(form.motivoNoContactoTexto),
      encuestadorProgramadoId: llamadaConectada ? null : parseNumber(form.encuestadorProgramadoId),
      fechaEncuestaProgramada: llamadaConectada ? null : clean(form.fechaEncuestaProgramada),
      solicitoNuevaEncuesta: llamadaConectada ? fromBooleanOption(form.solicitoNuevaEncuesta) : null,
      direccionTexto: llamadaConectada ? clean(form.direccionTexto) : null,
      barrioId: llamadaConectada ? parseNumber(form.barrioId) : null,
      fechaAplicacionInformada: llamadaConectada ? clean(form.fechaAplicacionInformada) : null,
      disposicionRecibirEncuesta: llamadaConectada ? fromBooleanOption(form.disposicionRecibirEncuesta) : null,
      motivoNoDisposicionId: llamadaConectada ? parseNumber(form.motivoNoDisposicionId) : null,
      motivoNoDisposicionTexto: llamadaConectada ? clean(form.motivoNoDisposicionTexto) : null,
      encuestadorAsignadoId: llamadaConectada ? parseNumber(form.encuestadorAsignadoId) : null,
      explicoInformanteCalificado: llamadaConectada ? fromBooleanOption(form.explicoInformanteCalificado) : null,
      verificado: fromBooleanOption(form.verificado),
      observacion: clean(form.observacion),
      activo: form.activo,
    };
  };

  const save = async () => {
    setError('');

    const validationMessage = validateForm();

    if (validationMessage) {
      setError(validationMessage);
      showSnackbar(validationMessage, 'warning');
      return;
    }

    try {
      if (form.id) {
        await updateCallCenterRegistro(form.id, buildRequest());
        showSnackbar('Registro Call Center actualizado correctamente.', 'success');
      } else {
        await createCallCenterRegistro(buildRequest());
        showSnackbar('Registro Call Center creado correctamente.', 'success');
      }

      setDialogOpen(false);
      setForm(initialForm);

      await load({
        ...filter,
        page: 0,
      }, connectionFilter, statusFilter);
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : 'No fue posible guardar el registro Call Center.';

      setError(message);
      showSnackbar(message, 'error');
    }
  };

  if (loading && !pageData) {
    return <LoadingState />;
  }

  return (
    <Stack spacing={3}>
      <CrudPageHeader
        title="Registros Call Center"
        subtitle="Consulta, filtra, crea y actualiza llamadas de seguimiento a usuarios."
        primaryAction={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openCreate}
            disabled={!allowWrite || catalogLoading}
          >
            Nuevo registro
          </Button>
        }
      />

      {!allowWrite ? (
        <Alert severity="info">
          Tu rol permite consultar, pero no crear ni actualizar registros Call Center.
        </Alert>
      ) : null}

      {restricted ? <AccessMessage /> : null}

      {error ? (
        <Alert severity="error">
          {error}
        </Alert>
      ) : null}

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
                  Filtra por fecha, texto, conexión y estado.
                </Typography>
              </Box>

              <Chip
                label={`${totalRecords} registro${totalRecords === 1 ? '' : 's'}`}
                color="primary"
                variant="outlined"
              />
            </Stack>

            <Divider />

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  md: 'repeat(6, 1fr)',
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
                label="Buscar"
                size="small"
                value={filter.q ?? ''}
                onChange={(event) => updateFilter('q', event.target.value)}
                placeholder="Cédula, nombre o teléfono"
              />

              <TextField
                select
                label="Conectada"
                size="small"
                value={connectionFilter}
                onChange={(event) => {
                  const value = event.target.value as BooleanFilterValue;
                  setConnectionFilter(value);
                  void load({ ...filter, page: 0 }, value, statusFilter);
                }}
              >
                <MenuItem value="ALL">Todas</MenuItem>
                <MenuItem value="YES">Sí</MenuItem>
                <MenuItem value="NO">No</MenuItem>
              </TextField>

              <TextField
                select
                label="Estado"
                size="small"
                value={statusFilter}
                onChange={(event) => {
                  const value = event.target.value as StatusFilterValue;
                  setStatusFilter(value);
                  void load({ ...filter, page: 0 }, connectionFilter, value);
                }}
              >
                <MenuItem value="ALL">Todos</MenuItem>
                <MenuItem value="ACTIVE">Activos</MenuItem>
                <MenuItem value="INACTIVE">Inactivos</MenuItem>
              </TextField>

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
              placeholder="Buscar en la tabla por primeras letras..."
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

              {visibleSelectedCount > 0 ? (
                <Chip
                  label={`${visibleSelectedCount} seleccionado${visibleSelectedCount === 1 ? '' : 's'}`}
                  size="small"
                  color="success"
                  variant="outlined"
                />
              ) : null}

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
                minWidth: 1320,
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
                  <TableCell padding="checkbox">
                    <Checkbox
                      size="small"
                      checked={allVisibleSelected}
                      indeterminate={visibleSelectedCount > 0 && !allVisibleSelected}
                      onChange={toggleAllVisible}
                    />
                  </TableCell>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Solicitante</TableCell>
                  <TableCell>Teléfono</TableCell>
                  <TableCell>Conectada</TableCell>
                  <TableCell>Resultado llamada</TableCell>
                  <TableCell>Barrio/Dirección</TableCell>
                  <TableCell>Encuestador</TableCell>
                  <TableCell>Visita</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {visibleRows.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell padding="checkbox">
                      <Checkbox
                        size="small"
                        checked={selectedIds.includes(row.id)}
                        onChange={() => toggleSelected(row.id)}
                      />
                    </TableCell>

                    <TableCell>
                      <Typography sx={{ fontWeight: 700 }}>
                        {row.fechaLlamada}
                      </Typography>

                      <Typography color="text.secondary" sx={{ fontSize: 12 }}>
                        {row.horaLlamada || '-'}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography sx={{ fontWeight: 700, minWidth: 220 }}>
                        {row.nombreCompleto}
                      </Typography>

                      <Typography color="text.secondary" sx={{ fontSize: 12 }}>
                        C.C. {row.cedulaSolicitante}
                      </Typography>
                    </TableCell>

                    <TableCell>{row.telefono || '-'}</TableCell>

                    <TableCell>
                      <Chip
                        label={booleanLabel(row.llamadaConectada)}
                        size="small"
                        color={row.llamadaConectada ? 'success' : 'warning'}
                        variant="outlined"
                        sx={{ fontWeight: 700 }}
                      />
                    </TableCell>

                    <TableCell>
                      {row.llamadaConectada ? (
                        <Chip
                          label={`Disposición: ${booleanLabel(row.disposicionRecibirEncuesta)}`}
                          size="small"
                          color={row.disposicionRecibirEncuesta ? 'success' : 'default'}
                          variant="outlined"
                        />
                      ) : (
                        <Typography color="text.secondary" sx={{ minWidth: 180 }}>
                          {row.motivoNoContactoNombre || row.motivoNoContactoTexto || '-'}
                        </Typography>
                      )}
                    </TableCell>

                    <TableCell>
                      <Typography sx={{ minWidth: 180 }}>
                        {row.barrioNombre || row.direccionTexto || '-'}
                      </Typography>
                      <Typography color="text.secondary" sx={{ fontSize: 12 }}>
                        {row.comunaNombre || ''}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      {row.encuestadorAsignadoNombre || row.encuestadorProgramadoNombre || '-'}
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={row.estadoVisita || 'PENDIENTE'}
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 700 }}
                      />
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={row.activo ? 'Activo' : 'Inactivo'}
                        size="small"
                        color={row.activo ? 'success' : 'warning'}
                        variant="outlined"
                        sx={{ fontWeight: 700 }}
                      />
                    </TableCell>

                    <TableCell align="center">
                      {allowWrite ? (
                        <IconButton
                          onClick={(event) => openRowMenu(event, row)}
                          sx={{
                            borderRadius: 2,
                            color: 'text.secondary',
                          }}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      ) : (
                        <Typography color="text.secondary" sx={{ fontSize: 13 }}>
                          Solo lectura
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}

                {!visibleRows.length ? (
                  <TableRow>
                    <TableCell colSpan={11}>
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
            rowsPerPageOptions={[10, 20, 50, 100]}
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
                  minWidth: 190,
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
              Modificar
            </MenuItem>

            <MenuItem
              onClick={handleMenuStatus}
              sx={{
                gap: 1.5,
                color: menuRecord?.activo ? 'error.main' : 'success.main',
                fontWeight: 700,
              }}
            >
              {menuRecord?.activo ? (
                <ToggleOffIcon fontSize="small" />
              ) : (
                <RestoreIcon fontSize="small" />
              )}
              {menuRecord?.activo ? 'Inactivar' : 'Activar'}
            </MenuItem>
          </Menu>
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onClose={(_, reason) => {
          if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
            return;
          }

          closeFormDialog();
        }}
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
                {form.id ? 'Editar registro Call Center' : 'Nuevo registro Call Center'}
              </Typography>

              <Typography color="text.secondary" sx={{ fontSize: 14 }}>
                Completa la información de la llamada y el seguimiento realizado.
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
              maxWidth: 1180,
              mx: 'auto',
              pt: 1,
            }}
          >
            <Card sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                <Typography sx={{ fontWeight: 900, mb: 2 }}>
                  Información de la llamada
                </Typography>

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
                    label="Fecha de llamada"
                    type="date"
                    size="small"
                    required
                    value={form.fechaLlamada}
                    onChange={(event) => updateForm('fechaLlamada', event.target.value)}
                    slotProps={{
                      inputLabel: {
                        shrink: true,
                      },
                    }}
                  />

                  <TextField
                    label="Hora"
                    type="time"
                    size="small"
                    value={form.horaLlamada}
                    onChange={(event) => updateForm('horaLlamada', event.target.value)}
                    slotProps={{
                      inputLabel: {
                        shrink: true,
                      },
                    }}
                  />

                  <TextField
                    select
                    label="Tipo registro"
                    size="small"
                    value={form.tipoRegistro}
                    onChange={(event) => updateForm('tipoRegistro', event.target.value)}
                  >
                    <MenuItem value="LLAMADA">Llamada</MenuItem>
                    <MenuItem value="BASE_ENCUESTADOR">Base encuestador</MenuItem>
                  </TextField>

                  <TextField
                    select
                    label="¿Se logró conectar?"
                    size="small"
                    required
                    value={form.llamadaConectada}
                    onChange={(event) => updateForm('llamadaConectada', event.target.value)}
                  >
                    <MenuItem value="YES">Sí</MenuItem>
                    <MenuItem value="NO">No</MenuItem>
                  </TextField>
                </Box>
              </CardContent>
            </Card>

            <Card sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                <Typography sx={{ fontWeight: 900, mb: 2 }}>
                  Datos del solicitante
                </Typography>

                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: '1fr',
                      md: 'repeat(3, 1fr)',
                    },
                    gap: 2,
                  }}
                >
                  <TextField
                    label="Cédula solicitante"
                    size="small"
                    required
                    value={form.cedulaSolicitante}
                    onChange={(event) => updateForm('cedulaSolicitante', event.target.value)}
                  />

                  <TextField
                    label="Nombre completo"
                    size="small"
                    required
                    value={form.nombreCompleto}
                    onChange={(event) => updateForm('nombreCompleto', event.target.value)}
                  />

                  <TextField
                    label="Teléfono"
                    size="small"
                    value={form.telefono}
                    onChange={(event) => updateForm('telefono', event.target.value)}
                  />
                </Box>
              </CardContent>
            </Card>

            {form.llamadaConectada === 'NO' ? (
              <Card sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
                <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                  <Typography sx={{ fontWeight: 900, mb: 2 }}>
                    Llamada no conectada
                  </Typography>

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
                    <Autocomplete
                      options={motivosNoContacto}
                      loading={catalogLoading}
                      value={findOption(motivosNoContacto, form.motivoNoContactoId)}
                      onChange={(_, selectedOption) =>
                        updateForm('motivoNoContactoId', selectedOption ? String(selectedOption.id) : '')
                      }
                      getOptionLabel={(option) => option.label ?? ''}
                      isOptionEqualToValue={(option, value) => String(option.id) === String(value.id)}
                      filterOptions={(options, state) => filterOptionsByFirstLetters(options, state.inputValue)}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Motivo no contacto"
                          size="small"
                          helperText="Selecciona un motivo o escribe una observación en el campo siguiente."
                        />
                      )}
                    />

                    <Autocomplete
                      options={encuestadores}
                      loading={catalogLoading}
                      value={findOption(encuestadores, form.encuestadorProgramadoId)}
                      onChange={(_, selectedOption) =>
                        updateForm('encuestadorProgramadoId', selectedOption ? String(selectedOption.id) : '')
                      }
                      getOptionLabel={(option) => option.label ?? ''}
                      isOptionEqualToValue={(option, value) => String(option.id) === String(value.id)}
                      filterOptions={(options, state) => filterOptionsByFirstLetters(options, state.inputValue)}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Encuestador programado"
                          size="small"
                        />
                      )}
                    />

                    <TextField
                      label="Fecha encuesta programada"
                      type="date"
                      size="small"
                      value={form.fechaEncuestaProgramada}
                      onChange={(event) => updateForm('fechaEncuestaProgramada', event.target.value)}
                      slotProps={{
                        inputLabel: {
                          shrink: true,
                        },
                      }}
                    />

                    <TextField
                      label="Motivo no contacto texto"
                      size="small"
                      value={form.motivoNoContactoTexto}
                      onChange={(event) => updateForm('motivoNoContactoTexto', event.target.value)}
                      multiline
                      minRows={2}
                    />
                  </Box>
                </CardContent>
              </Card>
            ) : (
              <Card sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
                <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                  <Typography sx={{ fontWeight: 900, mb: 2 }}>
                    Llamada conectada
                  </Typography>

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
                      select
                      label="¿Solicitó nueva encuesta?"
                      size="small"
                      value={form.solicitoNuevaEncuesta}
                      onChange={(event) => updateForm('solicitoNuevaEncuesta', event.target.value)}
                    >
                      <MenuItem value="">Sin definir</MenuItem>
                      <MenuItem value="YES">Sí</MenuItem>
                      <MenuItem value="NO">No</MenuItem>
                    </TextField>

                    <TextField
                      label="Fecha informada para aplicación"
                      type="date"
                      size="small"
                      value={form.fechaAplicacionInformada}
                      onChange={(event) => updateForm('fechaAplicacionInformada', event.target.value)}
                      slotProps={{
                        inputLabel: {
                          shrink: true,
                        },
                      }}
                    />

                    <TextField
                      label="Dirección / validación de datos"
                      size="small"
                      value={form.direccionTexto}
                      onChange={(event) => updateForm('direccionTexto', event.target.value)}
                      multiline
                      minRows={2}
                    />

                    <Autocomplete
                      options={barrios}
                      loading={catalogLoading}
                      value={findOption(barrios, form.barrioId)}
                      onChange={(_, selectedOption) =>
                        updateForm('barrioId', selectedOption ? String(selectedOption.id) : '')
                      }
                      getOptionLabel={(option) => option.label ?? ''}
                      isOptionEqualToValue={(option, value) => String(option.id) === String(value.id)}
                      filterOptions={(options, state) => filterOptionsByFirstLetters(options, state.inputValue)}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Barrio"
                          size="small"
                          helperText="Escribe las primeras letras para buscar."
                        />
                      )}
                    />

                    <TextField
                      select
                      label="¿Tiene disposición?"
                      size="small"
                      value={form.disposicionRecibirEncuesta}
                      onChange={(event) => updateForm('disposicionRecibirEncuesta', event.target.value)}
                    >
                      <MenuItem value="">Sin definir</MenuItem>
                      <MenuItem value="YES">Sí</MenuItem>
                      <MenuItem value="NO">No</MenuItem>
                    </TextField>

                    <Autocomplete
                      options={encuestadores}
                      loading={catalogLoading}
                      value={findOption(encuestadores, form.encuestadorAsignadoId)}
                      onChange={(_, selectedOption) =>
                        updateForm('encuestadorAsignadoId', selectedOption ? String(selectedOption.id) : '')
                      }
                      getOptionLabel={(option) => option.label ?? ''}
                      isOptionEqualToValue={(option, value) => String(option.id) === String(value.id)}
                      filterOptions={(options, state) => filterOptionsByFirstLetters(options, state.inputValue)}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Encuestador asignado"
                          size="small"
                        />
                      )}
                    />

                    {form.disposicionRecibirEncuesta === 'NO' ? (
                      <>
                        <Autocomplete
                          options={motivosNoDisposicion}
                          loading={catalogLoading}
                          value={findOption(motivosNoDisposicion, form.motivoNoDisposicionId)}
                          onChange={(_, selectedOption) =>
                            updateForm('motivoNoDisposicionId', selectedOption ? String(selectedOption.id) : '')
                          }
                          getOptionLabel={(option) => option.label ?? ''}
                          isOptionEqualToValue={(option, value) => String(option.id) === String(value.id)}
                          filterOptions={(options, state) => filterOptionsByFirstLetters(options, state.inputValue)}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Motivo no disposición"
                              size="small"
                            />
                          )}
                        />

                        <TextField
                          label="Motivo no disposición texto"
                          size="small"
                          value={form.motivoNoDisposicionTexto}
                          onChange={(event) => updateForm('motivoNoDisposicionTexto', event.target.value)}
                          multiline
                          minRows={2}
                        />
                      </>
                    ) : null}

                    <TextField
                      select
                      label="¿Explicó informante calificado?"
                      size="small"
                      value={form.explicoInformanteCalificado}
                      onChange={(event) => updateForm('explicoInformanteCalificado', event.target.value)}
                    >
                      <MenuItem value="">Sin definir</MenuItem>
                      <MenuItem value="YES">Sí</MenuItem>
                      <MenuItem value="NO">No</MenuItem>
                    </TextField>

                    <TextField
                      select
                      label="Verificada"
                      size="small"
                      value={form.verificado}
                      onChange={(event) => updateForm('verificado', event.target.value)}
                    >
                      <MenuItem value="">Sin definir</MenuItem>
                      <MenuItem value="YES">Sí</MenuItem>
                      <MenuItem value="NO">No</MenuItem>
                    </TextField>
                  </Box>
                </CardContent>
              </Card>
            )}

            <Card sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                <Typography sx={{ fontWeight: 900, mb: 2 }}>
                  Observación y estado
                </Typography>

                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: '1fr',
                      md: '2fr 1fr',
                    },
                    gap: 2,
                  }}
                >
                  <TextField
                    label="Observación"
                    size="small"
                    value={form.observacion}
                    onChange={(event) => updateForm('observacion', event.target.value)}
                    multiline
                    minRows={3}
                  />

                  <TextField
                    select
                    label="Estado"
                    size="small"
                    value={form.activo ? 'ACTIVE' : 'INACTIVE'}
                    onChange={(event) => updateForm('activo', event.target.value === 'ACTIVE')}
                  >
                    <MenuItem value="ACTIVE">Activo</MenuItem>
                    <MenuItem value="INACTIVE">Inactivo</MenuItem>
                  </TextField>
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
            disabled={!allowWrite}
          >
            {form.id ? 'Actualizar registro' : 'Guardar registro'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={confirmDialogOpen}
        onClose={closeConfirmDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle
          sx={{
            fontWeight: 900,
            color: confirmAction === 'ACTIVATE' ? 'success.main' : 'error.main',
          }}
        >
          {confirmAction === 'ACTIVATE' ? 'Activar registro' : 'Inactivar registro'}
        </DialogTitle>

        <DialogContent>
          <Stack spacing={2}>
            <Alert severity={confirmAction === 'ACTIVATE' ? 'info' : 'warning'}>
              {confirmAction === 'ACTIVATE'
                ? 'El registro volverá a estar disponible para consulta y reportes activos.'
                : 'El registro quedará inactivo, pero se conservará para trazabilidad.'}
            </Alert>

            <Box
              sx={{
                p: 2,
                borderRadius: 3,
                bgcolor: '#F8FAFC',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography sx={{ fontWeight: 900 }}>
                {confirmRecord?.nombreCompleto ?? 'Registro seleccionado'}
              </Typography>

              <Typography color="text.secondary" sx={{ fontSize: 14 }}>
                Cédula: {confirmRecord?.cedulaSolicitante ?? '-'} · Fecha: {confirmRecord?.fechaLlamada ?? '-'}
              </Typography>
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button
            variant="outlined"
            color="inherit"
            onClick={closeConfirmDialog}
            disabled={processingAction}
          >
            Cancelar
          </Button>

          <Button
            variant="contained"
            color={confirmAction === 'ACTIVATE' ? 'success' : 'error'}
            onClick={confirmStatusAction}
            disabled={processingAction}
          >
            {processingAction
              ? 'Procesando...'
              : confirmAction === 'ACTIVATE' ? 'Activar' : 'Inactivar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3500}
        onClose={() => closeSnackbar()}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
          onClose={closeSnackbar}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
