'use client';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  InputAdornment,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import {
  createCallCenterRegistro,
  findAsignacionPendienteNuevaEncuesta,
  findVentanillaByCedulaForCallCenter,
  getCallCenterBarriosOptions,
  getCallCenterEncuestadoresOptions,
  getCallCenterRegistro,
  getMotivosNoContactoOptions,
  getMotivosNoDisposicionOptions,
  updateCallCenterRegistro,
} from '@/services/callcenter.service';

import {
  CallCenterOrigenRegistro,
  CallCenterRequest,
  CallCenterResponse,
  VentanillaCallCenterResponse,
} from '@/types/callcenter.types';
import { SelectOption } from '@/types/catalog.types';


type SnackbarState = {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'warning' | 'info';
};

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
  solicitoNuevaEncuesta: 'true',
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

function getEncuestadorName(record?: CallCenterResponse | null) {
  return record?.encuestadorAsignadoNombre
    || record?.encuestadorProgramadoNombre
    || 'sin encuestador registrado';
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

function ventanillaToForm(record: VentanillaCallCenterResponse, current: FormState): FormState {
  return {
    ...current,
    origenRegistro: 'VENTANILLA',
    ventanillaRegistroId: String(record.id),
    cedulaSolicitante: record.cedulaUsuario ?? current.cedulaSolicitante,
    nombreCompleto: record.nombreUsuario ?? current.nombreCompleto,
    telefono: record.telefono ?? current.telefono,
    direccionTexto: record.direccion ?? current.direccionTexto,
    barrioId: record.barrioId ? String(record.barrioId) : current.barrioId,
    solicitoNuevaEncuesta: 'true',
    observacion: [
      current.observacion,
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

export default function NuevoRegistroCallCenterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');

  const [form, setForm] = useState<FormState>(initialForm);
  const [saving, setSaving] = useState(false);
  const [searchingCedula, setSearchingCedula] = useState(false);
  const [checkingAsignacion, setCheckingAsignacion] = useState(false);
  const [pendingAssignment, setPendingAssignment] = useState<CallCenterResponse | null>(null);

  const [motivosNoContacto, setMotivosNoContacto] = useState<SelectOption[]>([]);
  const [motivosNoDisposicion, setMotivosNoDisposicion] = useState<SelectOption[]>([]);
  const [barrios, setBarrios] = useState<SelectOption[]>([]);
  const [encuestadores, setEncuestadores] = useState<SelectOption[]>([]);

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

  const updateForm = (field: keyof FormState, value: string | boolean) => {
    if (
      field === 'cedulaSolicitante'
      || field === 'ventanillaRegistroId'
      || field === 'encuestadorAsignadoId'
      || field === 'encuestadorProgramadoId'
    ) {
      setPendingAssignment(null);
    }

    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const loadCatalogs = useCallback(async () => {
    try {
      const [
        noContacto,
        noDisposicion,
        barriosData,
        encuestadoresData,
      ] = await Promise.all([
        getMotivosNoContactoOptions(),
        getMotivosNoDisposicionOptions(),
        getCallCenterBarriosOptions(),
        getCallCenterEncuestadoresOptions(),
      ]);

      setMotivosNoContacto(noContacto);
      setMotivosNoDisposicion(noDisposicion);
      setBarrios(barriosData);
      setEncuestadores(encuestadoresData);
    } catch {
      showMessage('No fue posible cargar algunos catálogos.', 'warning');
    }
  }, []);

  const checkPendingAssignment = useCallback(async (candidate: FormState, showWarning = true) => {
    if (candidate.solicitoNuevaEncuesta !== 'true') {
      setPendingAssignment(null);
      return null;
    }

    const cedula = normalizeText(candidate.cedulaSolicitante);
    const ventanillaRegistroId = toOptionalNumber(candidate.ventanillaRegistroId);

    if (!cedula && !ventanillaRegistroId) {
      setPendingAssignment(null);
      return null;
    }

    setCheckingAsignacion(true);

    try {
      const pending = await findAsignacionPendienteNuevaEncuesta({
        cedulaSolicitante: cedula,
        ventanillaRegistroId,
        excludeId: candidate.id,
      });

      setPendingAssignment(pending);

      if (pending && showWarning) {
        showMessage(
          `Este usuario ya tiene una nueva encuesta pendiente asignada al encuestador ${getEncuestadorName(pending)}.`,
          'warning'
        );
      }

      return pending;
    } finally {
      setCheckingAsignacion(false);
    }
  }, []);

  const loadEditRecord = useCallback(async () => {
    if (!editId) {
      return;
    }

    try {
      const record = await getCallCenterRegistro(Number(editId));
      const nextForm = recordToForm(record);
      setForm(nextForm);
      checkPendingAssignment(nextForm, false);
    } catch {
      showMessage('No fue posible cargar el registro para editar.', 'error');
    }
  }, [editId, checkPendingAssignment]);

  useEffect(() => {
    loadCatalogs();
    loadEditRecord();
  }, [loadCatalogs, loadEditRecord]);

  const isNoContact = form.llamadaConectada === 'false';
  const isConnected = form.llamadaConectada === 'true';
  const hasNoDisposition = form.disposicionRecibirEncuesta === 'false';

  const searchPersonByCedula = async () => {
    const cedula = normalizeText(form.cedulaSolicitante);

    if (!cedula) {
      showMessage('Digita una cédula para buscar en Ventanilla.', 'warning');
      return;
    }

    setSearchingCedula(true);

    try {
      const record = await findVentanillaByCedulaForCallCenter(cedula);

      if (!record) {
        showMessage('No se encontró esta cédula en Ventanilla. Puedes continuar el registro manual.', 'info');
        await checkPendingAssignment(form, true);
        return;
      }

      const nextForm = ventanillaToForm(record, form);
      setForm(nextForm);
      await checkPendingAssignment(nextForm, true);

      showMessage('Datos cargados desde Ventanilla.', 'success');
    } catch {
      showMessage('No fue posible consultar la cédula en Ventanilla.', 'error');
    } finally {
      setSearchingCedula(false);
    }
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

    if (pendingAssignment) {
      return `Este usuario ya tiene una nueva encuesta pendiente asignada al encuestador ${getEncuestadorName(pendingAssignment)}.`;
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

    const pending = await checkPendingAssignment(form, true);

    if (pending) {
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

      router.push('/dashboard/callcenter/registros');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No fue posible guardar el registro.';
      showMessage(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setPendingAssignment(null);
    setForm({
      ...initialForm,
      fechaLlamada: today(),
      horaLlamada: nowTime(),
    });
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
              {form.id ? 'Editar registro Call Center' : 'Nuevo registro manual'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Digita la cédula para consultar datos en Ventanilla y verificar si ya tiene una encuesta pendiente.
            </Typography>
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => router.push('/dashboard/callcenter/registros')}
            >
              Volver
            </Button>
            <Button
              variant="outlined"
              startIcon={<RestartAltIcon />}
              onClick={resetForm}
              disabled={saving}
            >
              Limpiar
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={save}
              disabled={saving || checkingAsignacion || Boolean(pendingAssignment)}
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </Stack>
        </Stack>

        {pendingAssignment && (
          <Alert severity="warning">
            Este usuario ya tiene una nueva encuesta pendiente asignada al encuestador{' '}
            <strong>{getEncuestadorName(pendingAssignment)}</strong>. Mientras no se marque como realizada,
            no se puede asignar a otro encuestador.
          </Alert>
        )}

        <Card>
          <CardContent>
            <Stack spacing={3}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  1. Identificación del ciudadano
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Al buscar la cédula, si existe en Ventanilla se cargan nombre, teléfono, dirección y barrio.
                </Typography>
              </Box>

              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <TextField
                  label="Cédula solicitante"
                  value={form.cedulaSolicitante}
                  onChange={(event) => updateForm('cedulaSolicitante', event.target.value)}
                  onBlur={searchPersonByCedula}
                  fullWidth
                  required
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
                <Button
                  variant="outlined"
                  startIcon={<SearchIcon />}
                  onClick={searchPersonByCedula}
                  disabled={searchingCedula || checkingAsignacion}
                  sx={{ minWidth: 220 }}
                >
                  {searchingCedula || checkingAsignacion ? 'Buscando...' : 'Buscar en Ventanilla'}
                </Button>
              </Stack>

              {form.ventanillaRegistroId && (
                <Alert severity="success">
                  Datos relacionados con Ventanilla ID: <strong>{form.ventanillaRegistroId}</strong>.
                </Alert>
              )}

              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
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
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack spacing={3}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  2. Programación de la nueva encuesta
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Selecciona el encuestador y la fecha programada. Si el ciudadano ya está asignado, el sistema no permite guardar.
                </Typography>
              </Box>

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
                  label="Encuestador que realizará la encuesta"
                  select
                  value={form.encuestadorAsignadoId}
                  onChange={(event) => {
                    updateForm('encuestadorAsignadoId', event.target.value);
                    if (!form.encuestadorProgramadoId) {
                      updateForm('encuestadorProgramadoId', event.target.value);
                    }
                  }}
                  fullWidth
                  required={form.solicitoNuevaEncuesta === 'true'}
                  disabled={Boolean(pendingAssignment)}
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
                  value={form.fechaEncuestaProgramada}
                  onChange={(event) => updateForm('fechaEncuestaProgramada', event.target.value)}
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Stack>

              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <TextField
                  label="Encuestador programado"
                  select
                  value={form.encuestadorProgramadoId}
                  onChange={(event) => updateForm('encuestadorProgramadoId', event.target.value)}
                  fullWidth
                  disabled={Boolean(pendingAssignment)}
                >
                  <MenuItem value="">Sin seleccionar</MenuItem>
                  {encuestadores.map((option) => (
                    <MenuItem key={option.id} value={option.id}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  label="Fecha aplicación informada"
                  type="date"
                  value={form.fechaAplicacionInformada}
                  onChange={(event) => updateForm('fechaAplicacionInformada', event.target.value)}
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack spacing={3}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  3. Gestión de llamada
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Registra solo lo necesario de la llamada. Los motivos se habilitan según la respuesta.
                </Typography>
              </Box>

              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <TextField
                  label="Fecha llamada"
                  type="date"
                  value={form.fechaLlamada}
                  onChange={(event) => updateForm('fechaLlamada', event.target.value)}
                  fullWidth
                  required
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
                  label="¿Se logró conectar?"
                  select
                  value={form.llamadaConectada}
                  onChange={(event) => updateForm('llamadaConectada', event.target.value)}
                  fullWidth
                >
                  <MenuItem value="true">Sí</MenuItem>
                  <MenuItem value="false">No</MenuItem>
                </TextField>
              </Stack>

              {isNoContact && (
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <TextField
                    label="Motivo no contacto"
                    select
                    value={form.motivoNoContactoId}
                    onChange={(event) => updateForm('motivoNoContactoId', event.target.value)}
                    fullWidth
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
                  />
                </Stack>
              )}

              {isConnected && (
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
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
                </Stack>
              )}

              {hasNoDisposition && (
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <TextField
                    label="Motivo no disposición"
                    select
                    value={form.motivoNoDisposicionId}
                    onChange={(event) => updateForm('motivoNoDisposicionId', event.target.value)}
                    fullWidth
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
                  />
                </Stack>
              )}

              <Divider />

              <TextField
                label="Observación"
                value={form.observacion}
                onChange={(event) => updateForm('observacion', event.target.value)}
                fullWidth
                multiline
                minRows={3}
              />
            </Stack>
          </CardContent>
        </Card>

        <Paper sx={{ p: 2 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => router.push('/dashboard/callcenter/registros')}
            >
              Cancelar
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={save}
              disabled={saving || checkingAsignacion || Boolean(pendingAssignment)}
            >
              {saving ? 'Guardando...' : 'Guardar registro'}
            </Button>
          </Stack>
        </Paper>
      </Stack>

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
