'use client';

import AddIcon from '@mui/icons-material/Add';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
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
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
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
import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';

import {
  activateCallCenterRegistro,
  createCallCenterRegistro,
  deactivateCallCenterRegistro,
  getMotivosNoContactoOptions,
  getMotivosNoDisposicionOptions,
  searchCallCenter,
  searchVentanillaForCallCenter,
  updateCallCenterRegistro,
} from '@/services/callcenter.service';
import {
  getCallCenterBarriosOptions,
  getCallCenterComunasOptions,
  getCallCenterEncuestadoresOptions,
} from '@/services/callcenter-support.service';


import {
  CallCenterFilter,
  CallCenterOrigenRegistro,
  CallCenterRequest,
  CallCenterResponse,
  VentanillaCallCenterFilter,
  VentanillaCallCenterResponse,
} from '@/types/callcenter.types';
import { SelectOption } from '@/types/catalog.types';


type SnackbarState = {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'warning' | 'info';
};

type ConfirmAction = 'ACTIVATE' | 'DEACTIVATE' | null;

type FormState = {
  id?: number;
  fechaLlamada: string;
  horaLlamada: string;
  tipoRegistro: string;
  origenRegistro: CallCenterOrigenRegistro;
  ventanillaRegistroId: string;
  cedulaSolicitante: string;
  nombreCompleto: string;
  telefono: string;
  llamadaConectada: string;
  motivoNoContactoId: string;
  motivoNoContactoTexto: string;
  encuestadorProgramadoId: string;
  fechaEncuestaProgramada: string;
  solicitoNuevaEncuesta: string;
  direccionTexto: string;
  barrioId: string;
  fechaAplicacionInformada: string;
  disposicionRecibirEncuesta: string;
  motivoNoDisposicionId: string;
  motivoNoDisposicionTexto: string;
  encuestadorAsignadoId: string;
  explicoInformanteCalificado: string;
  verificado: string;
  observacion: string;
  activo: boolean;
};

type FilterState = {
  q: string;
  origenRegistro: 'ALL' | CallCenterOrigenRegistro;
  llamadaConectada: 'ALL' | 'true' | 'false';
  activo: 'ALL' | 'true' | 'false';
  page: number;
  size: number;
};

type VentanillaSearchState = {
  q: string;
  cedulaUsuario: string;
  nombreUsuario: string;
  comunaId: string;
  barrioId: string;
  encuestadorAsignadoId: string;
  fechaEncuestaProgramada: string;
  page: number;
  size: number;
};

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const SOLICITUD_NUEVA_ENCUESTA_ID = 6;
const ESTADO_SOLICITUD_PENDIENTE_ID = 1;

const initialFilter: FilterState = {
  q: '',
  origenRegistro: 'ALL',
  llamadaConectada: 'ALL',
  activo: 'true',
  page: 0,
  size: 20,
};

const today = () => new Date().toISOString().slice(0, 10);

const nowTime = () => {
  const date = new Date();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${hours}:${minutes}`;
};

const initialForm: FormState = {
  fechaLlamada: today(),
  horaLlamada: nowTime(),
  tipoRegistro: 'LLAMADA',
  origenRegistro: 'MANUAL',
  ventanillaRegistroId: '',
  cedulaSolicitante: '',
  nombreCompleto: '',
  telefono: '',
  llamadaConectada: 'true',
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

const initialVentanillaSearch: VentanillaSearchState = {
  q: '',
  cedulaUsuario: '',
  nombreUsuario: '',
  comunaId: '',
  barrioId: '',
  encuestadorAsignadoId: '',
  fechaEncuestaProgramada: '',
  page: 0,
  size: 50,
};

function toBoolean(value: string): boolean | null {
  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return null;
}

function toOptionalNumber(value: string) {
  return value ? Number(value) : null;
}

function normalizeText(value?: string | null) {
  return value?.trim() ?? '';
}

function getPageContent<T>(page: unknown): T[] {
  const data = page as {
    content?: T[];
    items?: T[];
    data?: T[];
  };

  return data?.content ?? data?.items ?? data?.data ?? [];
}

function getTotalElements(page: unknown, currentLength: number) {
  const data = page as {
    totalElements?: number;
    total?: number;
    totalRecords?: number;
  };

  return data?.totalElements ?? data?.total ?? data?.totalRecords ?? currentLength;
}

function origenColor(origen?: string | null) {
  if (origen === 'VENTANILLA') {
    return 'primary' as const;
  }

  if (origen === 'IMPORTACION') {
    return 'secondary' as const;
  }

  return 'default' as const;
}

function buildFilter(filter: FilterState): CallCenterFilter {
  const llamadaConectada = toBoolean(filter.llamadaConectada);
  const activo = toBoolean(filter.activo);

  return {
    page: filter.page,
    size: filter.size,
    q: normalizeText(filter.q) || undefined,
    origenRegistro: filter.origenRegistro === 'ALL' ? undefined : filter.origenRegistro,
    llamadaConectada: llamadaConectada ?? undefined,
    activo: activo ?? undefined,
  };
}

function buildVentanillaFilter(
  search: VentanillaSearchState,
  page = search.page,
  size = search.size
): VentanillaCallCenterFilter {
  return {
    page,
    size,
    q: normalizeText(search.q) || undefined,
    cedulaUsuario: normalizeText(search.cedulaUsuario) || undefined,
    nombreUsuario: normalizeText(search.nombreUsuario) || undefined,
    comunaId: search.comunaId || undefined,
    barrioId: search.barrioId || undefined,
    solicitudId: SOLICITUD_NUEVA_ENCUESTA_ID,
    estadoSolicitudId: ESTADO_SOLICITUD_PENDIENTE_ID,
    activo: true,
  };
}

function recordToForm(record: CallCenterResponse): FormState {
  return {
    id: record.id,
    fechaLlamada: record.fechaLlamada ?? today(),
    horaLlamada: record.horaLlamada?.slice(0, 5) ?? '',
    tipoRegistro: record.tipoRegistro ?? 'LLAMADA',
    origenRegistro: (record.origenRegistro as CallCenterOrigenRegistro) ?? 'MANUAL',
    ventanillaRegistroId: record.ventanillaRegistroId ? String(record.ventanillaRegistroId) : '',
    cedulaSolicitante: record.cedulaSolicitante ?? '',
    nombreCompleto: record.nombreCompleto ?? '',
    telefono: record.telefono ?? '',
    llamadaConectada: String(record.llamadaConectada ?? true),
    motivoNoContactoId: record.motivoNoContactoId ? String(record.motivoNoContactoId) : '',
    motivoNoContactoTexto: record.motivoNoContactoTexto ?? '',
    encuestadorProgramadoId: record.encuestadorProgramadoId ? String(record.encuestadorProgramadoId) : '',
    fechaEncuestaProgramada: record.fechaEncuestaProgramada ?? '',
    solicitoNuevaEncuesta:
      record.solicitoNuevaEncuesta === null || record.solicitoNuevaEncuesta === undefined
        ? ''
        : String(record.solicitoNuevaEncuesta),
    direccionTexto: record.direccionTexto ?? '',
    barrioId: record.barrioId ? String(record.barrioId) : '',
    fechaAplicacionInformada: record.fechaAplicacionInformada ?? '',
    disposicionRecibirEncuesta:
      record.disposicionRecibirEncuesta === null || record.disposicionRecibirEncuesta === undefined
        ? ''
        : String(record.disposicionRecibirEncuesta),
    motivoNoDisposicionId: record.motivoNoDisposicionId ? String(record.motivoNoDisposicionId) : '',
    motivoNoDisposicionTexto: record.motivoNoDisposicionTexto ?? '',
    encuestadorAsignadoId: record.encuestadorAsignadoId ? String(record.encuestadorAsignadoId) : '',
    explicoInformanteCalificado:
      record.explicoInformanteCalificado === null || record.explicoInformanteCalificado === undefined
        ? ''
        : String(record.explicoInformanteCalificado),
    verificado:
      record.verificado === null || record.verificado === undefined
        ? ''
        : String(record.verificado),
    observacion: record.observacion ?? '',
    activo: record.activo !== false,
  };
}

function ventanillaToForm(record: VentanillaCallCenterResponse): FormState {
  return {
    ...initialForm,
    fechaLlamada: today(),
    horaLlamada: nowTime(),
    origenRegistro: 'VENTANILLA',
    ventanillaRegistroId: String(record.id),
    cedulaSolicitante: record.cedulaUsuario ?? '',
    nombreCompleto: record.nombreUsuario ?? '',
    telefono: record.telefono ?? '',
    direccionTexto: record.direccion ?? '',
    barrioId: record.barrioId ? String(record.barrioId) : '',
    solicitoNuevaEncuesta: 'true',
    observacion: [
      record.numeroVentanilla ? `Ventanilla: ${record.numeroVentanilla}` : '',
      record.fecha ? `Fecha ventanilla: ${record.fecha}` : '',
      record.solicitudNombre ? `Solicitud: ${record.solicitudNombre}` : '',
      record.estadoSolicitudNombre ? `Estado: ${record.estadoSolicitudNombre}` : '',
      record.barrioNombre ? `Barrio: ${record.barrioNombre}` : '',
      record.comunaNombre ? `Comuna: ${record.comunaNombre}` : '',
      record.observacion ? `Observación ventanilla: ${record.observacion}` : '',
    ]
      .filter(Boolean)
      .join(' | '),
  };
}

function ventanillaToRequest(
  record: VentanillaCallCenterResponse,
  search: VentanillaSearchState
): CallCenterRequest {
  const encuestadorAsignadoId = toOptionalNumber(search.encuestadorAsignadoId);
  const fechaEncuestaProgramada = search.fechaEncuestaProgramada || null;

  return {
    fechaLlamada: today(),
    horaLlamada: nowTime(),
    tipoRegistro: 'LLAMADA',
    origenRegistro: 'VENTANILLA',
    ventanillaRegistroId: record.id,
    cedulaSolicitante: normalizeText(record.cedulaUsuario) || '',
    nombreCompleto: normalizeText(record.nombreUsuario) || '',
    telefono: normalizeText(record.telefono) || null,
    llamadaConectada: true,
    motivoNoContactoId: null,
    motivoNoContactoTexto: null,
    encuestadorProgramadoId: encuestadorAsignadoId,
    fechaEncuestaProgramada,
    solicitoNuevaEncuesta: true,
    direccionTexto: normalizeText(record.direccion) || null,
    barrioId: record.barrioId ?? null,
    fechaAplicacionInformada: null,
    disposicionRecibirEncuesta: null,
    motivoNoDisposicionId: null,
    motivoNoDisposicionTexto: null,
    encuestadorAsignadoId,
    explicoInformanteCalificado: null,
    verificado: null,
    observacion: [
      record.numeroVentanilla ? `Ventanilla: ${record.numeroVentanilla}` : '',
      record.fecha ? `Fecha ventanilla: ${record.fecha}` : '',
      record.solicitudNombre ? `Solicitud: ${record.solicitudNombre}` : '',
      record.estadoSolicitudNombre ? `Estado: ${record.estadoSolicitudNombre}` : '',
      record.barrioNombre ? `Barrio: ${record.barrioNombre}` : '',
      record.comunaNombre ? `Comuna: ${record.comunaNombre}` : '',
      record.observacion ? `Observación ventanilla: ${record.observacion}` : '',
    ]
      .filter(Boolean)
      .join(' | ') || null,
    activo: true,
  };
}

export default function CallCenterRegistrosPage() {
  const [records, setRecords] = useState<CallCenterResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<FilterState>(initialFilter);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [ventanillaDialogOpen, setVentanillaDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(initialForm);

  const [ventanillaSearch, setVentanillaSearch] = useState<VentanillaSearchState>(initialVentanillaSearch);
  const [ventanillaRecords, setVentanillaRecords] = useState<VentanillaCallCenterResponse[]>([]);
  const [ventanillaTotal, setVentanillaTotal] = useState(0);
  const [ventanillaLoading, setVentanillaLoading] = useState(false);
  const [selectedVentanillaIds, setSelectedVentanillaIds] = useState<number[]>([]);

  const [motivosNoContacto, setMotivosNoContacto] = useState<SelectOption[]>([]);
  const [motivosNoDisposicion, setMotivosNoDisposicion] = useState<SelectOption[]>([]);
  const [barrios, setBarrios] = useState<SelectOption[]>([]);
  const [comunas, setComunas] = useState<SelectOption[]>([]);
  const [encuestadores, setEncuestadores] = useState<SelectOption[]>([]);

  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [selectedRecord, setSelectedRecord] = useState<CallCenterResponse | null>(null);

  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success',
  });

  const showMessage = (message: string, severity: SnackbarState['severity'] = 'success') => {
    setSnackbar({
      open: true,
      message,
      severity,
    });
  };

  const closeSnackbar = () => {
    setSnackbar((current) => ({
      ...current,
      open: false,
    }));
  };

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const page = await searchCallCenter(buildFilter(filter));
      const content = getPageContent<CallCenterResponse>(page);

      setRecords(content);
      setTotal(getTotalElements(page, content.length));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No fue posible cargar los registros de Call Center.';
      showMessage(message, 'error');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const loadVentanilla = useCallback(async () => {
    setVentanillaLoading(true);

    try {
      const page = await searchVentanillaForCallCenter(buildVentanillaFilter(ventanillaSearch));
      const content = getPageContent<VentanillaCallCenterResponse>(page);

      setVentanillaRecords(content);
      setVentanillaTotal(getTotalElements(page, content.length));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No fue posible cargar los registros de ventanilla.';
      showMessage(message, 'error');
    } finally {
      setVentanillaLoading(false);
    }
  }, [ventanillaSearch]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    Promise.all([
      getMotivosNoContactoOptions(),
      getMotivosNoDisposicionOptions(),
      getCallCenterBarriosOptions(),
      getCallCenterComunasOptions(),
      getCallCenterEncuestadoresOptions(),
    ])
      .then(([noContacto, noDisposicion, barriosData, comunasData, encuestadoresData]) => {
        setMotivosNoContacto(noContacto);
        setMotivosNoDisposicion(noDisposicion);
        setBarrios(barriosData);
        setComunas(comunasData);
        setEncuestadores(encuestadoresData);
      })
      .catch(() => {
        showMessage('No fue posible cargar algunos catálogos de Call Center.', 'warning');
      });
  }, []);

  useEffect(() => {
    if (ventanillaDialogOpen) {
      loadVentanilla();
    }
  }, [ventanillaDialogOpen, loadVentanilla]);

  const isNoContact = form.llamadaConectada === 'false';
  const isConnected = form.llamadaConectada === 'true';
  const hasNoDisposition = form.disposicionRecibirEncuesta === 'false';

  const selectedVentanillaRecords = useMemo(
    () => ventanillaRecords.filter((record) => selectedVentanillaIds.includes(record.id)),
    [selectedVentanillaIds, ventanillaRecords]
  );

  const allVisibleVentanillaSelected = ventanillaRecords.length > 0
    && ventanillaRecords.every((record) => selectedVentanillaIds.includes(record.id));

  const someVisibleVentanillaSelected = ventanillaRecords.some((record) =>
    selectedVentanillaIds.includes(record.id)
  );

  const stats = useMemo(() => {
    const ventanilla = records.filter((item) => item.origenRegistro === 'VENTANILLA').length;
    const manual = records.filter((item) => item.origenRegistro === 'MANUAL').length;
    const connected = records.filter((item) => item.llamadaConectada).length;

    return {
      ventanilla,
      manual,
      connected,
    };
  }, [records]);

  const updateForm = (field: keyof FormState, value: string | boolean) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const updateFilter = (field: keyof FilterState, value: string | number) => {
    setFilter((current) => ({
      ...current,
      [field]: value,
      page: field === 'page' || field === 'size' ? current.page : 0,
    }));
  };

  const updateVentanillaFilter = (field: keyof VentanillaSearchState, value: string | number) => {
    setVentanillaSearch((current) => ({
      ...current,
      [field]: value,
      page: field === 'page' || field === 'size' ? current.page : 0,
    }));
    setSelectedVentanillaIds([]);
  };

  const openManualDialog = () => {
    setForm({
      ...initialForm,
      fechaLlamada: today(),
      horaLlamada: nowTime(),
      origenRegistro: 'MANUAL',
      solicitoNuevaEncuesta: 'true',
    });
    setDialogOpen(true);
  };

  const openEditDialog = (record: CallCenterResponse) => {
    setForm(recordToForm(record));
    setDialogOpen(true);
  };

  const openVentanillaDialog = () => {
    setVentanillaSearch(initialVentanillaSearch);
    setSelectedVentanillaIds([]);
    setVentanillaDialogOpen(true);
  };

  const selectVentanillaRecord = (record: VentanillaCallCenterResponse) => {
    setForm({
      ...ventanillaToForm(record),
      encuestadorAsignadoId: ventanillaSearch.encuestadorAsignadoId,
      encuestadorProgramadoId: ventanillaSearch.encuestadorAsignadoId,
      fechaEncuestaProgramada: ventanillaSearch.fechaEncuestaProgramada,
    });
    setVentanillaDialogOpen(false);
    setDialogOpen(true);
  };

  const buildRequest = (): CallCenterRequest => ({
    fechaLlamada: form.fechaLlamada,
    horaLlamada: form.horaLlamada || null,
    tipoRegistro: form.tipoRegistro || 'LLAMADA',
    origenRegistro: form.origenRegistro,
    ventanillaRegistroId: toOptionalNumber(form.ventanillaRegistroId),
    cedulaSolicitante: normalizeText(form.cedulaSolicitante),
    nombreCompleto: normalizeText(form.nombreCompleto),
    telefono: normalizeText(form.telefono) || null,
    llamadaConectada: form.llamadaConectada === 'true',
    motivoNoContactoId: toOptionalNumber(form.motivoNoContactoId),
    motivoNoContactoTexto: normalizeText(form.motivoNoContactoTexto) || null,
    encuestadorProgramadoId: toOptionalNumber(form.encuestadorProgramadoId),
    fechaEncuestaProgramada: form.fechaEncuestaProgramada || null,
    solicitoNuevaEncuesta: toBoolean(form.solicitoNuevaEncuesta),
    direccionTexto: normalizeText(form.direccionTexto) || null,
    barrioId: toOptionalNumber(form.barrioId),
    fechaAplicacionInformada: form.fechaAplicacionInformada || null,
    disposicionRecibirEncuesta: toBoolean(form.disposicionRecibirEncuesta),
    motivoNoDisposicionId: toOptionalNumber(form.motivoNoDisposicionId),
    motivoNoDisposicionTexto: normalizeText(form.motivoNoDisposicionTexto) || null,
    encuestadorAsignadoId: toOptionalNumber(form.encuestadorAsignadoId),
    explicoInformanteCalificado: toBoolean(form.explicoInformanteCalificado),
    verificado: toBoolean(form.verificado),
    observacion: normalizeText(form.observacion) || null,
    activo: form.activo,
  });

  const validateForm = () => {
    if (!form.fechaLlamada) {
      return 'La fecha de llamada es obligatoria.';
    }

    if (!normalizeText(form.cedulaSolicitante)) {
      return 'La cédula del solicitante es obligatoria.';
    }

    if (!normalizeText(form.nombreCompleto)) {
      return 'El nombre completo es obligatorio.';
    }

    if (form.origenRegistro === 'VENTANILLA' && !form.ventanillaRegistroId) {
      return 'El origen VENTANILLA requiere un registro de ventanilla relacionado.';
    }

    if (form.solicitoNuevaEncuesta === 'true' && !form.encuestadorAsignadoId) {
      return 'Selecciona el encuestador que realizará la nueva encuesta.';
    }

    if (isNoContact && !form.motivoNoContactoId && !normalizeText(form.motivoNoContactoTexto)) {
      return 'Registra el motivo por el cual no se logró conectar la llamada.';
    }

    if (isConnected && hasNoDisposition && !form.motivoNoDisposicionId && !normalizeText(form.motivoNoDisposicionTexto)) {
      return 'Registra el motivo por el cual no se confirmó la disposición.';
    }

    return '';
  };

  const save = async () => {
    const validationMessage = validateForm();

    if (validationMessage) {
      showMessage(validationMessage, 'warning');
      return;
    }

    setSaving(true);

    try {
      if (form.id) {
        await updateCallCenterRegistro(form.id, buildRequest());
        showMessage('Registro Call Center actualizado correctamente.', 'success');
      } else {
        await createCallCenterRegistro(buildRequest());
        showMessage('Registro Call Center creado correctamente.', 'success');
      }

      setDialogOpen(false);
      load();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No fue posible guardar el registro.';
      showMessage(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleVentanillaRecord = (id: number) => {
    setSelectedVentanillaIds((current) =>
      current.includes(id)
        ? current.filter((currentId) => currentId !== id)
        : [...current, id]
    );
  };

  const toggleAllVisibleVentanilla = () => {
    setSelectedVentanillaIds((current) => {
      const visibleIds = ventanillaRecords.map((record) => record.id);

      if (allVisibleVentanillaSelected) {
        return current.filter((id) => !visibleIds.includes(id));
      }

      return Array.from(new Set([...current, ...visibleIds]));
    });
  };

  const createFromVentanillaRows = async (rows: VentanillaCallCenterResponse[]) => {
    if (rows.length === 0) {
      showMessage('Selecciona al menos un usuario de ventanilla.', 'warning');
      return;
    }

    if (!ventanillaSearch.encuestadorAsignadoId) {
      showMessage('Selecciona el encuestador que realizará la nueva encuesta.', 'warning');
      return;
    }

    setSaving(true);

    let created = 0;
    let failed = 0;

    for (const row of rows) {
      try {
        await createCallCenterRegistro(ventanillaToRequest(row, ventanillaSearch));
        created += 1;
      } catch {
        failed += 1;
      }
    }

    setSaving(false);

    if (failed > 0) {
      showMessage(`Se crearon ${created} registros. No fue posible crear ${failed}.`, 'warning');
    } else {
      showMessage(`Se crearon ${created} registros de Call Center.`, 'success');
    }

    setSelectedVentanillaIds([]);
    setVentanillaDialogOpen(false);
    load();
  };

  const createSelectedVentanillaRecords = () => {
    createFromVentanillaRows(selectedVentanillaRecords);
  };

  const createAllFilteredVentanillaRecords = async () => {
    if (!ventanillaSearch.encuestadorAsignadoId) {
      showMessage('Selecciona el encuestador que realizará la nueva encuesta.', 'warning');
      return;
    }

    setVentanillaLoading(true);

    try {
      const allRecords: VentanillaCallCenterResponse[] = [];
      let page = 0;
      const size = 200;
      let total = 0;

      do {
        const response = await searchVentanillaForCallCenter(
          buildVentanillaFilter(ventanillaSearch, page, size)
        );

        const content = getPageContent<VentanillaCallCenterResponse>(response);
        total = getTotalElements(response, allRecords.length + content.length);

        allRecords.push(...content);

        if (content.length === 0) {
          break;
        }

        page += 1;
      } while (allRecords.length < total);

      if (allRecords.length === 0) {
        showMessage('No hay usuarios para crear con los filtros actuales.', 'warning');
        return;
      }

      await createFromVentanillaRows(allRecords);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No fue posible crear los registros filtrados.';
      showMessage(message, 'error');
    } finally {
      setVentanillaLoading(false);
    }
  };

  const openConfirm = (record: CallCenterResponse, action: ConfirmAction) => {
    setSelectedRecord(record);
    setConfirmAction(action);
  };

  const closeConfirm = () => {
    setSelectedRecord(null);
    setConfirmAction(null);
  };

  const confirmStatusChange = async () => {
    if (!selectedRecord || !confirmAction) {
      return;
    }

    try {
      if (confirmAction === 'ACTIVATE') {
        await activateCallCenterRegistro(selectedRecord.id);
        showMessage('Registro activado correctamente.', 'success');
      }

      if (confirmAction === 'DEACTIVATE') {
        await deactivateCallCenterRegistro(selectedRecord.id);
        showMessage('Registro inactivado correctamente.', 'success');
      }

      closeConfirm();
      load();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No fue posible cambiar el estado del registro.';
      showMessage(message, 'error');
    }
  };

  const handlePageChange = (_: unknown, page: number) => {
    setFilter((current) => ({
      ...current,
      page,
    }));
  };

  const handleRowsPerPageChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFilter((current) => ({
      ...current,
      page: 0,
      size: Number(event.target.value),
    }));
  };

  const handleVentanillaPageChange = (_: unknown, page: number) => {
    setVentanillaSearch((current) => ({
      ...current,
      page,
    }));
  };

  const handleVentanillaRowsPerPageChange = (event: ChangeEvent<HTMLInputElement>) => {
    setVentanillaSearch((current) => ({
      ...current,
      page: 0,
      size: Number(event.target.value),
    }));
    setSelectedVentanillaIds([]);
  };

  return (
    <Box>
      <Stack spacing={3}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          sx={{ justifyContent: 'space-between' }}
        >
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              Registros Call Center
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Gestión de llamadas, registros manuales y cargue desde ventanilla para asignación de encuestas.
            </Typography>
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={load}
              disabled={loading}
            >
              Actualizar
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<SourceIcon />}
              onClick={openVentanillaDialog}
            >
              Cargar desde Ventanilla
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={openManualDialog}
            >
              Nuevo registro manual
            </Button>
          </Stack>
        </Stack>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Total página
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                {records.length}
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Desde ventanilla
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                {stats.ventanilla}
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Manuales
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                {stats.manual}
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Conectadas
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                {stats.connected}
              </Typography>
            </CardContent>
          </Card>
        </Stack>

        <Paper sx={{ p: 2 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              label="Buscar"
              value={filter.q}
              onChange={(event) => updateFilter('q', event.target.value)}
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
              label="Origen"
              select
              value={filter.origenRegistro}
              onChange={(event) => updateFilter('origenRegistro', event.target.value)}
              sx={{ minWidth: 180 }}
              size="small"
            >
              <MenuItem value="ALL">Todos</MenuItem>
              <MenuItem value="VENTANILLA">Ventanilla</MenuItem>
              <MenuItem value="MANUAL">Manual</MenuItem>
              <MenuItem value="IMPORTACION">Importación</MenuItem>
            </TextField>

            <TextField
              label="Llamada"
              select
              value={filter.llamadaConectada}
              onChange={(event) => updateFilter('llamadaConectada', event.target.value)}
              sx={{ minWidth: 180 }}
              size="small"
            >
              <MenuItem value="ALL">Todas</MenuItem>
              <MenuItem value="true">Conectada</MenuItem>
              <MenuItem value="false">No conectada</MenuItem>
            </TextField>

            <TextField
              label="Estado"
              select
              value={filter.activo}
              onChange={(event) => updateFilter('activo', event.target.value)}
              sx={{ minWidth: 160 }}
              size="small"
            >
              <MenuItem value="true">Activos</MenuItem>
              <MenuItem value="false">Inactivos</MenuItem>
              <MenuItem value="ALL">Todos</MenuItem>
            </TextField>

            <Button
              variant="outlined"
              startIcon={<RestartAltIcon />}
              onClick={() => setFilter(initialFilter)}
            >
              Limpiar
            </Button>
          </Stack>
        </Paper>

        {loading ? (
          <Paper sx={{ p: 3 }}>
            <Alert severity="info">
              Cargando registros de Call Center...
            </Alert>
          </Paper>
        ) : records.length === 0 ? (
          <Paper sx={{ p: 3 }}>
            <Alert severity="info">
              Sin registros. No se encontraron registros de Call Center con los filtros actuales.
            </Alert>
          </Paper>
        ) : (
          <Paper>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Origen</TableCell>
                    <TableCell>Ciudadano</TableCell>
                    <TableCell>Teléfono</TableCell>
                    <TableCell>Dirección</TableCell>
                    <TableCell>Llamada</TableCell>
                    <TableCell>Encuestador</TableCell>
                    <TableCell>Visita</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell align="right">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {record.fechaLlamada}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {record.horaLlamada?.slice(0, 5) || 'Sin hora'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Stack spacing={0.5}>
                          <Chip
                            size="small"
                            label={record.origenRegistro || 'MANUAL'}
                            color={origenColor(record.origenRegistro)}
                          />
                          {record.ventanillaNumeroVentanilla && (
                            <Typography variant="caption" color="text.secondary">
                              Vent. {record.ventanillaNumeroVentanilla}
                            </Typography>
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {record.nombreCompleto}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          C.C. {record.cedulaSolicitante}
                        </Typography>
                      </TableCell>
                      <TableCell>{record.telefono || 'Sin dato'}</TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {record.direccionTexto || 'Sin dirección'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {record.barrioNombre || 'Sin barrio'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          color={record.llamadaConectada ? 'success' : 'warning'}
                          label={record.llamadaConectada ? 'Conectada' : 'No conectada'}
                        />
                      </TableCell>
                      <TableCell>{record.encuestadorAsignadoNombre || record.encuestadorProgramadoNombre || 'Sin asignar'}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          variant="outlined"
                          label={record.estadoVisita || 'PENDIENTE'}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          color={record.activo ? 'success' : 'default'}
                          label={record.activo ? 'Activo' : 'Inactivo'}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Editar">
                          <IconButton size="small" onClick={() => openEditDialog(record)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {record.activo ? (
                          <Tooltip title="Inactivar">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => openConfirm(record, 'DEACTIVATE')}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Tooltip title="Activar">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => openConfirm(record, 'ACTIVATE')}
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
                      count={total}
                      page={filter.page}
                      rowsPerPage={filter.size}
                      rowsPerPageOptions={PAGE_SIZE_OPTIONS}
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
      </Stack>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="lg">
        <DialogTitle>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            sx={{ justifyContent: 'space-between' }}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                {form.id ? 'Editar registro Call Center' : 'Nuevo registro Call Center'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {form.origenRegistro === 'VENTANILLA'
                  ? 'Registro creado desde información de ventanilla.'
                  : 'Registro digitado manualmente por funcionario.'}
              </Typography>
            </Box>
            <IconButton onClick={() => setDialogOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent dividers>
          <Stack spacing={3}>
            <Alert severity={form.origenRegistro === 'VENTANILLA' ? 'info' : 'success'}>
              Origen actual: <strong>{form.origenRegistro}</strong>
              {form.ventanillaRegistroId ? ` | Registro ventanilla ID: ${form.ventanillaRegistroId}` : ''}
            </Alert>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                label="Fecha llamada"
                type="date"
                value={form.fechaLlamada}
                onChange={(event) => updateForm('fechaLlamada', event.target.value)}
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="Hora llamada"
                type="time"
                value={form.horaLlamada}
                onChange={(event) => updateForm('horaLlamada', event.target.value)}
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="Origen"
                select
                value={form.origenRegistro}
                onChange={(event) => updateForm('origenRegistro', event.target.value)}
                fullWidth
                disabled={Boolean(form.ventanillaRegistroId)}
              >
                <MenuItem value="MANUAL">Manual</MenuItem>
                <MenuItem value="VENTANILLA">Ventanilla</MenuItem>
                <MenuItem value="IMPORTACION">Importación</MenuItem>
              </TextField>
              <TextField
                label="ID ventanilla"
                value={form.ventanillaRegistroId}
                onChange={(event) => updateForm('ventanillaRegistroId', event.target.value)}
                fullWidth
                disabled={form.origenRegistro !== 'VENTANILLA'}
              />
            </Stack>

            <Divider />

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                label="Cédula solicitante"
                value={form.cedulaSolicitante}
                onChange={(event) => updateForm('cedulaSolicitante', event.target.value)}
                fullWidth
                required
              />
              <TextField
                label="Nombre completo"
                value={form.nombreCompleto}
                onChange={(event) => updateForm('nombreCompleto', event.target.value)}
                fullWidth
                required
              />
              <TextField
                label="Teléfono"
                value={form.telefono}
                onChange={(event) => updateForm('telefono', event.target.value)}
                fullWidth
              />
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                label="Dirección"
                value={form.direccionTexto}
                onChange={(event) => updateForm('direccionTexto', event.target.value)}
                fullWidth
              />
              <TextField
                label="Barrio"
                select
                value={form.barrioId}
                onChange={(event) => updateForm('barrioId', event.target.value)}
                fullWidth
              >
                <MenuItem value="">Sin seleccionar</MenuItem>
                {barrios.map((option) => (
                  <MenuItem key={option.id} value={option.id}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>

            <Divider />

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                label="¿Se logró conectar?"
                select
                value={form.llamadaConectada}
                onChange={(event) => updateForm('llamadaConectada', event.target.value)}
                fullWidth
              >
                <MenuItem value="true">Sí</MenuItem>
                <MenuItem value="false">No</MenuItem>
              </TextField>

              <TextField
                label="Motivo no contacto"
                select
                value={form.motivoNoContactoId}
                onChange={(event) => updateForm('motivoNoContactoId', event.target.value)}
                fullWidth
                disabled={!isNoContact}
              >
                <MenuItem value="">Sin seleccionar</MenuItem>
                {motivosNoContacto.map((option) => (
                  <MenuItem key={option.id} value={option.id}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Motivo no contacto texto"
                value={form.motivoNoContactoTexto}
                onChange={(event) => updateForm('motivoNoContactoTexto', event.target.value)}
                fullWidth
                disabled={!isNoContact}
              />
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                label="Solicitó nueva encuesta"
                select
                value={form.solicitoNuevaEncuesta}
                onChange={(event) => updateForm('solicitoNuevaEncuesta', event.target.value)}
                fullWidth
              >
                <MenuItem value="">Sin dato</MenuItem>
                <MenuItem value="true">Sí</MenuItem>
                <MenuItem value="false">No</MenuItem>
              </TextField>

              <TextField
                label="Fecha aplicación informada"
                type="date"
                value={form.fechaAplicacionInformada}
                onChange={(event) => updateForm('fechaAplicacionInformada', event.target.value)}
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
              />

              <TextField
                label="Disposición para recibir encuesta"
                select
                value={form.disposicionRecibirEncuesta}
                onChange={(event) => updateForm('disposicionRecibirEncuesta', event.target.value)}
                fullWidth
              >
                <MenuItem value="">Sin dato</MenuItem>
                <MenuItem value="true">Sí</MenuItem>
                <MenuItem value="false">No</MenuItem>
              </TextField>
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                label="Motivo no disposición"
                select
                value={form.motivoNoDisposicionId}
                onChange={(event) => updateForm('motivoNoDisposicionId', event.target.value)}
                fullWidth
                disabled={!hasNoDisposition}
              >
                <MenuItem value="">Sin seleccionar</MenuItem>
                {motivosNoDisposicion.map((option) => (
                  <MenuItem key={option.id} value={option.id}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Motivo no disposición texto"
                value={form.motivoNoDisposicionTexto}
                onChange={(event) => updateForm('motivoNoDisposicionTexto', event.target.value)}
                fullWidth
                disabled={!hasNoDisposition}
              />
            </Stack>

            <Divider />

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                label="Encuestador programado"
                select
                value={form.encuestadorProgramadoId}
                onChange={(event) => updateForm('encuestadorProgramadoId', event.target.value)}
                fullWidth
              >
                <MenuItem value="">Sin seleccionar</MenuItem>
                {encuestadores.map((option) => (
                  <MenuItem key={option.id} value={option.id}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Fecha encuesta programada"
                type="date"
                value={form.fechaEncuestaProgramada}
                onChange={(event) => updateForm('fechaEncuestaProgramada', event.target.value)}
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="Encuestador asignado"
                select
                value={form.encuestadorAsignadoId}
                onChange={(event) => {
                  updateForm('encuestadorAsignadoId', event.target.value);
                  if (!form.encuestadorProgramadoId) {
                    updateForm('encuestadorProgramadoId', event.target.value);
                  }
                }}
                fullWidth
              >
                <MenuItem value="">Sin seleccionar</MenuItem>
                {encuestadores.map((option) => (
                  <MenuItem key={option.id} value={option.id}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                label="Explicó informante calificado"
                select
                value={form.explicoInformanteCalificado}
                onChange={(event) => updateForm('explicoInformanteCalificado', event.target.value)}
                fullWidth
              >
                <MenuItem value="">Sin dato</MenuItem>
                <MenuItem value="true">Sí</MenuItem>
                <MenuItem value="false">No</MenuItem>
              </TextField>

              <TextField
                label="Verificado"
                select
                value={form.verificado}
                onChange={(event) => updateForm('verificado', event.target.value)}
                fullWidth
              >
                <MenuItem value="">Sin dato</MenuItem>
                <MenuItem value="true">Sí</MenuItem>
                <MenuItem value="false">No</MenuItem>
              </TextField>

              <TextField
                label="Activo"
                select
                value={String(form.activo)}
                onChange={(event) => updateForm('activo', event.target.value === 'true')}
                fullWidth
              >
                <MenuItem value="true">Activo</MenuItem>
                <MenuItem value="false">Inactivo</MenuItem>
              </TextField>
            </Stack>

            <TextField
              label="Observación"
              value={form.observacion}
              onChange={(event) => updateForm('observacion', event.target.value)}
              fullWidth
              multiline
              minRows={3}
            />
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={save} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={ventanillaDialogOpen} onClose={() => setVentanillaDialogOpen(false)} fullWidth maxWidth="xl">
        <DialogTitle>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            sx={{ justifyContent: 'space-between' }}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                Cargar usuarios con Nueva Encuesta pendiente
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Filtra por comuna o barrio, selecciona los usuarios y crea los registros de Call Center.
              </Typography>
            </Box>
            <IconButton onClick={() => setVentanillaDialogOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent dividers>
          <Stack spacing={2}>
            <Alert severity="info">
              Esta búsqueda trae únicamente registros activos de Ventanilla con solicitud NUEVA ENCUESTA y estado PENDIENTE.
            </Alert>

            <Paper sx={{ p: 2 }} variant="outlined">
              <Stack spacing={2}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  Filtros de Ventanilla
                </Typography>

                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <TextField
                    label="Comuna"
                    select
                    value={ventanillaSearch.comunaId}
                    onChange={(event) => updateVentanillaFilter('comunaId', event.target.value)}
                    fullWidth
                    size="small"
                  >
                    <MenuItem value="">Todas las comunas</MenuItem>
                    {comunas.map((option) => (
                      <MenuItem key={option.id} value={option.id}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    label="Barrio"
                    select
                    value={ventanillaSearch.barrioId}
                    onChange={(event) => updateVentanillaFilter('barrioId', event.target.value)}
                    fullWidth
                    size="small"
                  >
                    <MenuItem value="">Todos los barrios</MenuItem>
                    {barrios.map((option) => (
                      <MenuItem key={option.id} value={option.id}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    label="Cédula"
                    value={ventanillaSearch.cedulaUsuario}
                    onChange={(event) => updateVentanillaFilter('cedulaUsuario', event.target.value)}
                    fullWidth
                    size="small"
                  />

                  <TextField
                    label="Nombre"
                    value={ventanillaSearch.nombreUsuario}
                    onChange={(event) => updateVentanillaFilter('nombreUsuario', event.target.value)}
                    fullWidth
                    size="small"
                  />
                </Stack>

                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <TextField
                    label="Búsqueda general"
                    value={ventanillaSearch.q}
                    onChange={(event) => updateVentanillaFilter('q', event.target.value)}
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

                  <Button variant="outlined" startIcon={<SearchIcon />} onClick={loadVentanilla}>
                    Buscar
                  </Button>

                  <Button
                    variant="outlined"
                    startIcon={<RestartAltIcon />}
                    onClick={() => {
                      setVentanillaSearch(initialVentanillaSearch);
                      setSelectedVentanillaIds([]);
                    }}
                  >
                    Limpiar
                  </Button>
                </Stack>
              </Stack>
            </Paper>

            <Paper sx={{ p: 2 }} variant="outlined">
              <Stack spacing={2}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  Datos para crear los registros seleccionados
                </Typography>

                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <TextField
                    label="Encuestador que realizará la encuesta"
                    select
                    value={ventanillaSearch.encuestadorAsignadoId}
                    onChange={(event) => updateVentanillaFilter('encuestadorAsignadoId', event.target.value)}
                    fullWidth
                    size="small"
                    required
                  >
                    <MenuItem value="">Selecciona un encuestador</MenuItem>
                    {encuestadores.map((option) => (
                      <MenuItem key={option.id} value={option.id}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    label="Fecha encuesta programada"
                    type="date"
                    value={ventanillaSearch.fechaEncuestaProgramada}
                    onChange={(event) => updateVentanillaFilter('fechaEncuestaProgramada', event.target.value)}
                    fullWidth
                    size="small"
                    slotProps={{ inputLabel: { shrink: true } }}
                  />

                  <Button
                    variant="contained"
                    startIcon={<AssignmentTurnedInIcon />}
                    onClick={createSelectedVentanillaRecords}
                    disabled={saving || selectedVentanillaRecords.length === 0}
                  >
                    Crear seleccionados ({selectedVentanillaRecords.length})
                  </Button>

                  <Button
                    variant="outlined"
                    color="secondary"
                    onClick={createAllFilteredVentanillaRecords}
                    disabled={saving || ventanillaLoading}
                  >
                    Crear todos filtrados
                  </Button>
                </Stack>
              </Stack>
            </Paper>

            {ventanillaLoading ? (
              <Paper sx={{ p: 3 }}>
                <Alert severity="info">
                  Buscando registros de ventanilla...
                </Alert>
              </Paper>
            ) : ventanillaRecords.length === 0 ? (
              <Paper sx={{ p: 3 }}>
                <Alert severity="info">
                  Sin resultados. No se encontraron usuarios con solicitud NUEVA ENCUESTA pendiente para los filtros actuales.
                </Alert>
              </Paper>
            ) : (
              <Paper variant="outlined">
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={allVisibleVentanillaSelected}
                            indeterminate={!allVisibleVentanillaSelected && someVisibleVentanillaSelected}
                            onChange={toggleAllVisibleVentanilla}
                          />
                        </TableCell>
                        <TableCell>Fecha</TableCell>
                        <TableCell>Ventanilla</TableCell>
                        <TableCell>Ciudadano</TableCell>
                        <TableCell>Teléfono</TableCell>
                        <TableCell>Barrio / Comuna</TableCell>
                        <TableCell>Solicitud</TableCell>
                        <TableCell align="right">Acción</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {ventanillaRecords.map((record) => (
                        <TableRow key={record.id} hover selected={selectedVentanillaIds.includes(record.id)}>
                          <TableCell padding="checkbox">
                            <Checkbox
                              checked={selectedVentanillaIds.includes(record.id)}
                              onChange={() => toggleVentanillaRecord(record.id)}
                            />
                          </TableCell>
                          <TableCell>{record.fecha || 'Sin fecha'}</TableCell>
                          <TableCell>{record.numeroVentanilla || record.id}</TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              {record.nombreUsuario || 'Sin nombre'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              C.C. {record.cedulaUsuario || 'Sin cédula'}
                            </Typography>
                          </TableCell>
                          <TableCell>{record.telefono || 'Sin dato'}</TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {record.barrioNombre || 'Sin barrio'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {record.comunaNombre || 'Sin comuna'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {record.solicitudNombre || 'Nueva encuesta'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {record.estadoSolicitudNombre || 'Pendiente'}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Button
                              size="small"
                              variant="contained"
                              startIcon={<AssignmentTurnedInIcon />}
                              onClick={() => selectVentanillaRecord(record)}
                            >
                              Revisar individual
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow>
                        <TablePagination
                          count={ventanillaTotal}
                          page={ventanillaSearch.page}
                          rowsPerPage={ventanillaSearch.size}
                          rowsPerPageOptions={[10, 20, 50, 100]}
                          onPageChange={handleVentanillaPageChange}
                          onRowsPerPageChange={handleVentanillaRowsPerPageChange}
                          labelRowsPerPage="Filas"
                        />
                      </TableRow>
                    </TableFooter>
                  </Table>
                </TableContainer>
              </Paper>
            )}
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setVentanillaDialogOpen(false)}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(confirmAction)} onClose={closeConfirm} fullWidth maxWidth="xs">
        <DialogTitle>
          {confirmAction === 'ACTIVATE' ? 'Activar registro' : 'Inactivar registro'}
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2">
            Confirma la acción para el registro de{' '}
            <strong>{selectedRecord?.nombreCompleto}</strong>.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeConfirm}>Cancelar</Button>
          <Button
            variant="contained"
            color={confirmAction === 'ACTIVATE' ? 'success' : 'error'}
            onClick={confirmStatusChange}
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} onClose={closeSnackbar} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
