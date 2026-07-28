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
  InputAdornment,
  MenuItem,
  Paper,
  Snackbar,
  TextField,
  Typography,
} from '@mui/material';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import {
  createCallCenterRegistro,
  findVentanillaByCedulaForCallCenter,
  getCallCenterBarriosOptions,
  getCallCenterRegistro,
  searchCallCenter,
  updateCallCenterRegistro,
} from '@/services/callcenter.service';
import {
  CallCenterOrigenRegistro,
  CallCenterRequest,
  CallCenterResponse,
  CallCenterTipoSolicitud,
  VentanillaCallCenterResponse,
} from '@/types/callcenter.types';
import { SelectOption } from '@/types/catalog.types';

/**
 * Estado local para mostrar mensajes temporales en pantalla.
 */
type SnackbarState = {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'warning' | 'info';
};

/**
 * Estado del formulario administrativo de creación de caso Call Center.
 *
 * Esta pantalla no registra llamadas ni asigna encuestadores. Solo crea
 * o actualiza datos básicos del caso maestro.
 */
type FormState = {
  id?: number;
  fechaLlamada: string;
  origenRegistro: CallCenterOrigenRegistro;
  ventanillaRegistroId: string;
  tipoSolicitudCallcenter: CallCenterTipoSolicitud | string;
  estadoCaso: string;
  cedulaSolicitante: string;
  nombreCompleto: string;
  telefono: string;
  direccionTexto: string;
  barrioId: string;
  observacion: string;
  activo: boolean;
};

const ESTADO_PENDIENTE_ENRUTAMIENTO = 'PENDIENTE_ENRUTAMIENTO';
const TIPO_SOLICITUD_NUEVA_ENCUESTA = 'NUEVA_ENCUESTA';

/**
 * Obtiene la fecha actual en formato yyyy-MM-dd.
 *
 * @returns fecha actual.
 */
function today() {
  return new Date().toISOString().slice(0, 10);
}

const initialForm: FormState = {
  fechaLlamada: today(),
  origenRegistro: 'MANUAL',
  ventanillaRegistroId: '',
  tipoSolicitudCallcenter: TIPO_SOLICITUD_NUEVA_ENCUESTA,
  estadoCaso: ESTADO_PENDIENTE_ENRUTAMIENTO,
  cedulaSolicitante: '',
  nombreCompleto: '',
  telefono: '',
  direccionTexto: '',
  barrioId: '',
  observacion: '',
  activo: true,
};

/**
 * Normaliza un texto eliminando espacios iniciales y finales.
 *
 * @param value texto recibido.
 * @returns texto normalizado.
 */
function normalizeText(value?: string | null) {
  return value?.trim() ?? '';
}

/**
 * Convierte un valor string a number o null.
 *
 * @param value valor del formulario.
 * @returns número o null.
 */
function toOptionalNumber(value: string) {
  return value ? Number(value) : null;
}

/**
 * Extrae el contenido de una respuesta paginada.
 *
 * @param page respuesta paginada.
 * @returns contenido encontrado.
 */
function getPageContent<T>(page: unknown): T[] {
  const data = page as {
    content?: T[];
    items?: T[];
    data?: T[];
  };

  return data?.content ?? data?.items ?? data?.data ?? [];
}

/**
 * Determina si un caso Call Center está abierto.
 *
 * @param record caso Call Center.
 * @returns true si el caso no está cerrado ni cancelado.
 */
function isOpenCallCenterCase(record: CallCenterResponse) {
  const estadoCaso = String(record.estadoCaso ?? '').trim().toUpperCase();

  if (record.activo === false) {
    return false;
  }

  return estadoCaso !== 'CERRADO' && estadoCaso !== 'CANCELADO';
}

/**
 * Convierte una respuesta Call Center en estado de formulario.
 *
 * @param record caso recibido desde backend.
 * @returns estado de formulario.
 */
function recordToForm(record: CallCenterResponse): FormState {
  return {
    id: record.id,
    fechaLlamada: record.fechaLlamada ?? today(),
    origenRegistro: (record.origenRegistro as CallCenterOrigenRegistro) ?? 'MANUAL',
    ventanillaRegistroId: record.ventanillaRegistroId ? String(record.ventanillaRegistroId) : '',
    tipoSolicitudCallcenter: record.tipoSolicitudCallcenter ?? TIPO_SOLICITUD_NUEVA_ENCUESTA,
    estadoCaso: record.estadoCaso ?? ESTADO_PENDIENTE_ENRUTAMIENTO,
    cedulaSolicitante: record.cedulaSolicitante ?? '',
    nombreCompleto: record.nombreCompleto ?? '',
    telefono: record.telefono ?? '',
    direccionTexto: record.direccionTexto ?? '',
    barrioId: record.barrioId ? String(record.barrioId) : '',
    observacion: record.observacion ?? '',
    activo: record.activo !== false,
  };
}

/**
 * Aplica datos de Ventanilla al formulario manual.
 *
 * @param record registro de Ventanilla.
 * @param current estado actual del formulario.
 * @returns formulario actualizado.
 */
function ventanillaToForm(
  record: VentanillaCallCenterResponse,
  current: FormState,
): FormState {
  return {
    ...current,
    origenRegistro: 'VENTANILLA',
    ventanillaRegistroId: String(record.id),
    tipoSolicitudCallcenter: TIPO_SOLICITUD_NUEVA_ENCUESTA,
    estadoCaso: ESTADO_PENDIENTE_ENRUTAMIENTO,
    cedulaSolicitante: record.cedulaUsuario ?? current.cedulaSolicitante,
    nombreCompleto: record.nombreUsuario ?? current.nombreCompleto,
    telefono: record.telefono ?? current.telefono,
    direccionTexto: record.direccion ?? current.direccionTexto,
    barrioId: record.barrioId ? String(record.barrioId) : current.barrioId,
    observacion: [
      current.observacion,
      'Datos cargados desde Ventanilla para crear caso Call Center',
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

/**
 * Página administrativa para crear o editar casos Call Center manuales.
 *
 * Esta pantalla deja el caso pendiente de enrutamiento. No asigna encuestador,
 * no registra llamada y no programa visita.
 */
export default function NuevoRegistroCallCenterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');

  const [form, setForm] = useState<FormState>(initialForm);
  const [originalRecord, setOriginalRecord] = useState<CallCenterResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchingCedula, setSearchingCedula] = useState(false);
  const [checkingCase, setCheckingCase] = useState(false);
  const [existingOpenCase, setExistingOpenCase] = useState<CallCenterResponse | null>(null);

  const [barrios, setBarrios] = useState<SelectOption[]>([]);

  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success',
  });

  /**
   * Muestra un mensaje temporal.
   *
   * @param message mensaje visible.
   * @param severity severidad del mensaje.
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
   * Cierra el mensaje temporal.
   */
  function closeSnackbar() {
    setSnackbar((current) => ({
      ...current,
      open: false,
    }));
  }

  /**
   * Actualiza un campo del formulario.
   *
   * @param field campo a modificar.
   * @param value valor nuevo.
   */
  function updateForm(field: keyof FormState, value: string | boolean) {
    if (
      field === 'cedulaSolicitante'
      || field === 'ventanillaRegistroId'
      || field === 'tipoSolicitudCallcenter'
    ) {
      setExistingOpenCase(null);
    }

    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  /**
   * Carga catálogos necesarios para el formulario.
   */
  const loadCatalogs = useCallback(async () => {
    try {
      const barriosData = await getCallCenterBarriosOptions();
      setBarrios(barriosData);
    } catch {
      showMessage('No fue posible cargar el catálogo de barrios.', 'warning');
    }
  }, []);

  /**
   * Busca un caso abierto existente por Ventanilla o cédula.
   *
   * @param candidate formulario a validar.
   * @param showWarning indica si debe mostrar alerta.
   * @returns caso abierto encontrado o null.
   */
  const checkExistingOpenCase = useCallback(async (
    candidate: FormState,
    showWarning = true,
  ) => {
    const cedula = normalizeText(candidate.cedulaSolicitante);
    const ventanillaRegistroId = toOptionalNumber(candidate.ventanillaRegistroId);

    if (!cedula && !ventanillaRegistroId) {
      setExistingOpenCase(null);
      return null;
    }

    setCheckingCase(true);

    try {
      if (ventanillaRegistroId) {
        const byVentanilla = await searchCallCenter({
          page: 0,
          size: 5,
          ventanillaRegistroId,
          activo: true,
        });

        const foundByVentanilla = getPageContent<CallCenterResponse>(byVentanilla)
          .find((record) => record.id !== candidate.id && isOpenCallCenterCase(record));

        if (foundByVentanilla) {
          setExistingOpenCase(foundByVentanilla);

          if (showWarning) {
            showMessage('Ya existe un caso Call Center abierto para este registro de Ventanilla.', 'warning');
          }

          return foundByVentanilla;
        }
      }

      if (cedula) {
        const byCedula = await searchCallCenter({
          page: 0,
          size: 5,
          cedulaSolicitante: cedula,
          tipoSolicitudCallcenter: candidate.tipoSolicitudCallcenter,
          activo: true,
        });

        const foundByCedula = getPageContent<CallCenterResponse>(byCedula)
          .find((record) => record.id !== candidate.id && isOpenCallCenterCase(record));

        setExistingOpenCase(foundByCedula ?? null);

        if (foundByCedula && showWarning) {
          showMessage('Ya existe un caso Call Center abierto para esta cédula.', 'warning');
        }

        return foundByCedula ?? null;
      }

      setExistingOpenCase(null);
      return null;
    } finally {
      setCheckingCase(false);
    }
  }, []);

  /**
   * Carga el caso cuando la pantalla está en modo edición.
   */
  const loadEditRecord = useCallback(async () => {
    if (!editId) {
      return;
    }

    try {
      const record = await getCallCenterRegistro(Number(editId));
      const nextForm = recordToForm(record);

      setOriginalRecord(record);
      setForm(nextForm);
      await checkExistingOpenCase(nextForm, false);
    } catch {
      showMessage('No fue posible cargar el registro para editar.', 'error');
    }
  }, [editId, checkExistingOpenCase]);

  useEffect(() => {
    loadCatalogs();
    loadEditRecord();
  }, [loadCatalogs, loadEditRecord]);

  /**
   * Busca la cédula en Ventanilla para precargar datos.
   */
  async function searchPersonByCedula() {
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
        await checkExistingOpenCase(form, true);
        return;
      }

      const nextForm = ventanillaToForm(record, form);

      setForm(nextForm);
      await checkExistingOpenCase(nextForm, true);

      showMessage('Datos cargados desde Ventanilla.', 'success');
    } catch {
      showMessage('No fue posible consultar la cédula en Ventanilla.', 'error');
    } finally {
      setSearchingCedula(false);
    }
  }

  /**
   * Construye el request enviado al backend.
   *
   * En registros nuevos se crea un caso pendiente de enrutamiento sin llamada
   * y sin encuestador. En edición se preservan datos legacy que ya existan
   * para evitar borrarlos desde esta pantalla administrativa.
   *
   * @returns request para crear o actualizar.
   */
  function buildRequest(): CallCenterRequest {
    const isNewRecord = !form.id;

    return {
      marcaTemporal: originalRecord?.marcaTemporal ?? null,
      fechaLlamada: form.fechaLlamada,
      horaLlamada: isNewRecord ? null : originalRecord?.horaLlamada ?? null,
      tipoRegistro: originalRecord?.tipoRegistro ?? 'LLAMADA',
      origenRegistro: form.origenRegistro,
      ventanillaRegistroId: toOptionalNumber(form.ventanillaRegistroId),
      cedulaSolicitante: normalizeText(form.cedulaSolicitante),
      nombreCompleto: normalizeText(form.nombreCompleto),
      telefono: normalizeText(form.telefono) || null,

      /**
       * Esta vista no registra llamada. La llamada real se gestiona desde:
       * /dashboard/callcenter/mis-registros/[id]
       */
      llamadaConectada: isNewRecord
        ? null as unknown as boolean
        : originalRecord?.llamadaConectada ?? null as unknown as boolean,

      motivoNoContactoId: isNewRecord ? null : originalRecord?.motivoNoContactoId ?? null,
      motivoNoContactoTexto: isNewRecord ? null : originalRecord?.motivoNoContactoTexto ?? null,
      encuestadorProgramadoId: isNewRecord ? null : originalRecord?.encuestadorProgramadoId ?? null,
      fechaEncuestaProgramada: isNewRecord ? null : originalRecord?.fechaEncuestaProgramada ?? null,
      solicitoNuevaEncuesta: form.tipoSolicitudCallcenter === TIPO_SOLICITUD_NUEVA_ENCUESTA,
      direccionTexto: normalizeText(form.direccionTexto) || null,
      barrioId: toOptionalNumber(form.barrioId),
      fechaAplicacionInformada: isNewRecord ? null : originalRecord?.fechaAplicacionInformada ?? null,
      disposicionRecibirEncuesta: isNewRecord ? null : originalRecord?.disposicionRecibirEncuesta ?? null,
      motivoNoDisposicionId: isNewRecord ? null : originalRecord?.motivoNoDisposicionId ?? null,
      motivoNoDisposicionTexto: isNewRecord ? null : originalRecord?.motivoNoDisposicionTexto ?? null,
      encuestadorAsignadoId: isNewRecord ? null : originalRecord?.encuestadorAsignadoId ?? null,
      explicoInformanteCalificado: isNewRecord ? null : originalRecord?.explicoInformanteCalificado ?? null,
      verificado: isNewRecord ? null : originalRecord?.verificado ?? null,
      estadoCaso: form.estadoCaso || ESTADO_PENDIENTE_ENRUTAMIENTO,
      tipoSolicitudCallcenter: form.tipoSolicitudCallcenter || TIPO_SOLICITUD_NUEVA_ENCUESTA,
      observacion: normalizeText(form.observacion) || null,
      activo: form.activo,
    };
  }

  /**
   * Valida los datos mínimos para guardar el caso.
   *
   * @returns mensaje de validación o vacío.
   */
  function validateForm() {
    if (!form.fechaLlamada) {
      return 'La fecha del caso es obligatoria.';
    }

    if (!normalizeText(form.cedulaSolicitante)) {
      return 'La cédula del solicitante es obligatoria.';
    }

    if (!normalizeText(form.nombreCompleto)) {
      return 'El nombre completo es obligatorio.';
    }

    if (!normalizeText(form.tipoSolicitudCallcenter)) {
      return 'Selecciona el tipo de solicitud.';
    }

    if (!normalizeText(form.estadoCaso)) {
      return 'Selecciona el estado del caso.';
    }

    if (existingOpenCase) {
      return 'Ya existe un caso Call Center abierto para este ciudadano o registro de Ventanilla.';
    }

    return '';
  }

  /**
   * Guarda el caso.
   */
  async function save() {
    const validationMessage = validateForm();

    if (validationMessage) {
      showMessage(validationMessage, 'warning');
      return;
    }

    const existing = await checkExistingOpenCase(form, true);

    if (existing) {
      return;
    }

    setSaving(true);

    try {
      if (form.id) {
        await updateCallCenterRegistro(form.id, buildRequest());
        showMessage('Caso Call Center actualizado correctamente.', 'success');
      } else {
        await createCallCenterRegistro(buildRequest());
        showMessage('Caso Call Center creado para enrutamiento correctamente.', 'success');
      }

      router.push('/dashboard/callcenter/asignar-funcionarios');
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'No fue posible guardar el caso Call Center.';

      showMessage(message, 'error');
    } finally {
      setSaving(false);
    }
  }

  /**
   * Reinicia el formulario.
   */
  function resetForm() {
    setExistingOpenCase(null);
    setOriginalRecord(null);
    setForm({
      ...initialForm,
      fechaLlamada: today(),
    });
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
              {form.id ? 'Editar caso Call Center' : 'Nuevo caso manual'}
            </Typography>

            <Typography component="p" variant="body2" sx={{ color: 'text.secondary' }}>
              Crea un caso pendiente de enrutamiento. La llamada y la visita se gestionan después por el funcionario Call Center.
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
              disabled={saving || checkingCase || Boolean(existingOpenCase)}
            >
              {saving ? 'Guardando...' : 'Guardar caso'}
            </Button>
          </Box>
        </Box>

        <Alert severity="info">
          Esta pantalla solo crea o edita el caso maestro. No asigna encuestador, no registra llamada
          y no programa visita. El caso queda disponible para el Coordinador / Enrutador.
        </Alert>

        {existingOpenCase && (
          <Alert severity="warning">
            Ya existe un caso Call Center abierto para este ciudadano o registro de Ventanilla.
            Debes cerrar o cancelar el caso existente antes de crear otro.
          </Alert>
        )}

        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography component="h2" variant="h6" sx={{ fontWeight: 800 }}>
                  1. Identificación del ciudadano
                </Typography>

                <Typography component="p" variant="body2" sx={{ color: 'text.secondary' }}>
                  Puedes digitar la información manualmente o buscar la cédula en Ventanilla para precargar datos.
                </Typography>
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', md: 'row' },
                  gap: 2,
                }}
              >
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
                  disabled={searchingCedula || checkingCase}
                  sx={{ minWidth: 220 }}
                >
                  {searchingCedula || checkingCase ? 'Buscando...' : 'Buscar en Ventanilla'}
                </Button>
              </Box>

              {form.ventanillaRegistroId && (
                <Alert severity="success">
                  Datos relacionados con Ventanilla ID: <strong>{form.ventanillaRegistroId}</strong>.
                </Alert>
              )}

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    md: '1fr 1fr',
                  },
                  gap: 2,
                }}
              >
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
                  <MenuItem value="">
                    Sin seleccionar
                  </MenuItem>

                  {barrios.map((option) => (
                    <MenuItem key={option.id} value={option.id}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography component="h2" variant="h6" sx={{ fontWeight: 800 }}>
                  2. Datos del caso
                </Typography>

                <Typography component="p" variant="body2" sx={{ color: 'text.secondary' }}>
                  Define el origen, tipo de solicitud y estado inicial del caso.
                </Typography>
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    md: '1fr 1fr 1fr',
                  },
                  gap: 2,
                }}
              >
                <TextField
                  label="Fecha del caso"
                  type="date"
                  value={form.fechaLlamada}
                  onChange={(event) => updateForm('fechaLlamada', event.target.value)}
                  fullWidth
                  required
                  slotProps={{ inputLabel: { shrink: true } }}
                />

                <TextField
                  label="Origen"
                  select
                  value={form.origenRegistro}
                  onChange={(event) => updateForm('origenRegistro', event.target.value)}
                  fullWidth
                >
                  <MenuItem value="MANUAL">
                    Manual
                  </MenuItem>

                  <MenuItem value="VENTANILLA">
                    Ventanilla
                  </MenuItem>

                  <MenuItem value="IMPORTACION">
                    Importación
                  </MenuItem>
                </TextField>

                <TextField
                  label="Tipo de solicitud"
                  select
                  value={form.tipoSolicitudCallcenter}
                  onChange={(event) => updateForm('tipoSolicitudCallcenter', event.target.value)}
                  fullWidth
                  required
                >
                  <MenuItem value="NUEVA_ENCUESTA">
                    Nueva encuesta
                  </MenuItem>

                  <MenuItem value="INCLUSION">
                    Inclusión
                  </MenuItem>

                  <MenuItem value="VERIFICACION">
                    Verificación
                  </MenuItem>

                  <MenuItem value="OTRO">
                    Otro
                  </MenuItem>
                </TextField>

                <TextField
                  label="Estado del caso"
                  select
                  value={form.estadoCaso}
                  onChange={(event) => updateForm('estadoCaso', event.target.value)}
                  fullWidth
                  required
                >
                  <MenuItem value="PENDIENTE_ENRUTAMIENTO">
                    Pendiente de enrutamiento
                  </MenuItem>

                  {form.id && (
                    <MenuItem value="ASIGNADO_CALLCENTER">
                      Asignado a funcionario Call Center
                    </MenuItem>
                  )}

                  {form.id && (
                    <MenuItem value="EN_GESTION_LLAMADA">
                      En gestión de llamada
                    </MenuItem>
                  )}

                  {form.id && (
                    <MenuItem value="CERRADO">
                      Cerrado
                    </MenuItem>
                  )}

                  {form.id && (
                    <MenuItem value="CANCELADO">
                      Cancelado
                    </MenuItem>
                  )}
                </TextField>

                <TextField
                  label="Ventanilla ID"
                  value={form.ventanillaRegistroId}
                  onChange={(event) => updateForm('ventanillaRegistroId', event.target.value)}
                  fullWidth
                  disabled={form.origenRegistro !== 'VENTANILLA'}
                />

                <TextField
                  label="Estado lógico"
                  select
                  value={String(form.activo)}
                  onChange={(event) => updateForm('activo', event.target.value === 'true')}
                  fullWidth
                >
                  <MenuItem value="true">
                    Activo
                  </MenuItem>

                  <MenuItem value="false">
                    Inactivo
                  </MenuItem>
                </TextField>
              </Box>

              <TextField
                label="Observación"
                value={form.observacion}
                onChange={(event) => updateForm('observacion', event.target.value)}
                fullWidth
                multiline
                minRows={3}
              />
            </Box>
          </CardContent>
        </Card>

        <Paper sx={{ p: 2 }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 1,
              justifyContent: 'flex-end',
            }}
          >
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
              disabled={saving || checkingCase || Boolean(existingOpenCase)}
            >
              {saving ? 'Guardando...' : 'Guardar caso'}
            </Button>
          </Box>
        </Paper>
      </Box>

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