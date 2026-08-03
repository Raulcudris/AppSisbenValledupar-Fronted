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
  CircularProgress,
  InputAdornment,
  MenuItem,
  Paper,
  Snackbar,
  TextField,
  Typography,
} from '@mui/material';
import {
  useRouter,
  useSearchParams,
} from 'next/navigation';
import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import CallCenterRegistroCompletoForm from '@/components/callcenter/CallCenterRegistroCompletoForm';
import {
  findVentanillaByCedulaForCallCenter,
  getCallCenterBarriosOptions,
  getCallCenterRegistro,
  searchCallCenter,
  updateCallCenterRegistro,
} from '@/services/callcenter.service';
import type {
  CallCenterOrigenRegistro,
  CallCenterRequest,
  CallCenterResponse,
  CallCenterTipoSolicitud,
  VentanillaCallCenterResponse,
} from '@/types/callcenter.types';
import type { SelectOption } from '@/types/catalog.types';

type SnackbarState = {
  open: boolean;
  message: string;
  severity:
    | 'success'
    | 'error'
    | 'warning'
    | 'info';
};

type FormState = {
  id?: number;
  fechaLlamada: string;
  origenRegistro: CallCenterOrigenRegistro;
  ventanillaRegistroId: string;
  tipoSolicitudCallcenter:
    | CallCenterTipoSolicitud
    | string;
  estadoCaso: string;
  cedulaSolicitante: string;
  nombreCompleto: string;
  telefono: string;
  direccionTexto: string;
  barrioId: string;
  observacion: string;
  activo: boolean;
};

type EditFormProps = {
  editId: string;
};

const ESTADO_PENDIENTE_ENRUTAMIENTO =
  'PENDIENTE_ENRUTAMIENTO';

const TIPO_SOLICITUD_NUEVA_ENCUESTA =
  'NUEVA_ENCUESTA';

function getLocalDateISO(
  date = new Date(),
) {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1,
    ).padStart(2, '0');

  const day =
    String(
      date.getDate(),
    ).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function today() {
  return getLocalDateISO();
}

function buildInitialForm(): FormState {
  return {
    fechaLlamada:
      today(),

    origenRegistro:
      'MANUAL',

    ventanillaRegistroId:
      '',

    tipoSolicitudCallcenter:
      TIPO_SOLICITUD_NUEVA_ENCUESTA,

    estadoCaso:
      ESTADO_PENDIENTE_ENRUTAMIENTO,

    cedulaSolicitante:
      '',

    nombreCompleto:
      '',

    telefono:
      '',

    direccionTexto:
      '',

    barrioId:
      '',

    observacion:
      '',

    activo:
      true,
  };
}

function normalizeText(
  value?: string | null,
) {
  return value?.trim() ?? '';
}

function toOptionalNumber(
  value: string,
) {
  return value
    ? Number(value)
    : null;
}

function getPageContent<T>(
  page: unknown,
): T[] {
  const data = page as {
    content?: T[];
    items?: T[];
    data?: T[];
  };

  return (
    data?.content
    ?? data?.items
    ?? data?.data
    ?? []
  );
}

function isOpenCallCenterCase(
  record: CallCenterResponse,
) {
  const estadoCaso =
    String(
      record.estadoCaso ?? '',
    )
      .trim()
      .toUpperCase();

  if (
    record.activo === false
  ) {
    return false;
  }

  return (
    estadoCaso !== 'CERRADO'
    && estadoCaso !== 'CANCELADO'
  );
}

function normalizeOrigenRegistro(
  value: CallCenterResponse['origenRegistro'],
): CallCenterOrigenRegistro {
  const normalized = String(value ?? '')
    .trim()
    .toUpperCase();

  if (normalized === 'VENTANILLA') {
    return 'VENTANILLA';
  }

  if (normalized === 'IMPORTACION') {
    return 'IMPORTACION';
  }

  return 'MANUAL';
}

function recordToForm(
  record: CallCenterResponse,
): FormState {
  return {
    id: record.id,

    fechaLlamada:
      record.fechaLlamada || today(),

    origenRegistro:
      normalizeOrigenRegistro(
        record.origenRegistro,
      ),

    ventanillaRegistroId:
      record.ventanillaRegistroId == null
        ? ''
        : String(record.ventanillaRegistroId),

    tipoSolicitudCallcenter:
      record.tipoSolicitudCallcenter
      || TIPO_SOLICITUD_NUEVA_ENCUESTA,

    estadoCaso:
      record.estadoCaso
      || ESTADO_PENDIENTE_ENRUTAMIENTO,

    cedulaSolicitante:
      record.cedulaSolicitante || '',

    nombreCompleto:
      record.nombreCompleto || '',

    telefono:
      record.telefono || '',

    direccionTexto:
      record.direccionTexto || '',

    barrioId:
      record.barrioId == null
        ? ''
        : String(record.barrioId),

    observacion:
      record.observacion || '',

    activo:
      record.activo !== false,
  };
}

function ventanillaToForm(
  record: VentanillaCallCenterResponse,
  current: FormState,
): FormState {
  return {
    ...current,

    origenRegistro:
      'VENTANILLA',

    ventanillaRegistroId:
      String(record.id),

    tipoSolicitudCallcenter:
      TIPO_SOLICITUD_NUEVA_ENCUESTA,

    cedulaSolicitante:
      record.cedulaUsuario
      ?? current.cedulaSolicitante,

    nombreCompleto:
      record.nombreUsuario
      ?? current.nombreCompleto,

    telefono:
      record.telefono
      ?? current.telefono,

    direccionTexto:
      record.direccion
      ?? current.direccionTexto,

    barrioId:
      record.barrioId
        ? String(record.barrioId)
        : current.barrioId,

    observacion: [
      current.observacion,

      'Datos cargados desde Ventanilla para actualizar el caso Call Center',

      record.numeroVentanilla
        ? `Ventanilla: ${record.numeroVentanilla}`
        : '',

      record.fecha
        ? `Fecha ventanilla: ${record.fecha}`
        : '',

      record.solicitudNombre
        ? `Solicitud: ${record.solicitudNombre}`
        : '',

      record.estadoSolicitudNombre
        ? `Estado: ${record.estadoSolicitudNombre}`
        : '',

      record.barrioNombre
        ? `Barrio: ${record.barrioNombre}`
        : '',

      record.comunaNombre
        ? `Comuna: ${record.comunaNombre}`
        : '',

      record.observacion
        ? `Observación ventanilla: ${record.observacion}`
        : '',
    ]
      .filter(Boolean)
      .join(' | '),
  };
}

/**
 * Entrada principal de la ruta.
 *
 * Sin ID muestra el formulario transaccional completo.
 * Con ID conserva la edición administrativa existente.
 */
export default function NuevoRegistroCallCenterPage() {
  const searchParams =
    useSearchParams();

  const editId =
    searchParams.get('id');

  if (!editId) {
    return (
      <CallCenterRegistroCompletoForm />
    );
  }

  return (
    <EditarRegistroCallCenterPage
      editId={editId}
    />
  );
}

/**
 * Edición administrativa de un caso existente.
 *
 * No registra llamadas, no asigna visitas y no altera
 * directamente los estados operativos.
 */
function EditarRegistroCallCenterPage({
  editId,
}: EditFormProps) {
  const router =
    useRouter();

  const [
    form,
    setForm,
  ] = useState<FormState>(
    buildInitialForm,
  );

  const [
    originalRecord,
    setOriginalRecord,
  ] = useState<
    CallCenterResponse | null
  >(null);

  const [
    loadingRecord,
    setLoadingRecord,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    searchingCedula,
    setSearchingCedula,
  ] = useState(false);

  const [
    checkingCase,
    setCheckingCase,
  ] = useState(false);

  const [
    existingOpenCase,
    setExistingOpenCase,
  ] = useState<
    CallCenterResponse | null
  >(null);

  const [
    barrios,
    setBarrios,
  ] = useState<SelectOption[]>([]);

  const [
    snackbar,
    setSnackbar,
  ] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success',
  });

  function showMessage(
    message: string,
    severity:
      SnackbarState['severity'] =
      'success',
  ) {
    setSnackbar({
      open: true,
      message,
      severity,
    });
  }

  function closeSnackbar() {
    setSnackbar(
      (current) => ({
        ...current,
        open: false,
      }),
    );
  }

  function updateForm(
    field: keyof FormState,
    value: string | boolean,
  ) {
    if (
      field === 'cedulaSolicitante'
      || field === 'ventanillaRegistroId'
      || field === 'tipoSolicitudCallcenter'
    ) {
      setExistingOpenCase(null);
    }

    setForm(
      (current) => ({
        ...current,
        [field]: value,
      }),
    );
  }

  const loadCatalogs =
    useCallback(async () => {
      try {
        const barriosData =
          await getCallCenterBarriosOptions();

        setBarrios(
          barriosData,
        );
      } catch {
        showMessage(
          'No fue posible cargar el catálogo de barrios.',
          'warning',
        );
      }
    }, []);

  const checkExistingOpenCase =
    useCallback(
      async (
        candidate: FormState,
        showWarning = true,
      ) => {
        const cedula =
          normalizeText(
            candidate.cedulaSolicitante,
          );

        const ventanillaRegistroId =
          toOptionalNumber(
            candidate.ventanillaRegistroId,
          );

        if (
          !cedula
          && !ventanillaRegistroId
        ) {
          setExistingOpenCase(null);
          return null;
        }

        setCheckingCase(true);

        try {
          if (
            ventanillaRegistroId
          ) {
            const byVentanilla =
              await searchCallCenter({
                page: 0,
                size: 5,
                ventanillaRegistroId,
                activo: true,
              });

            const foundByVentanilla =
              getPageContent<
                CallCenterResponse
              >(byVentanilla)
                .find(
                  (record) =>
                    record.id
                      !== candidate.id
                    && isOpenCallCenterCase(
                      record,
                    ),
                );

            if (
              foundByVentanilla
            ) {
              setExistingOpenCase(
                foundByVentanilla,
              );

              if (showWarning) {
                showMessage(
                  'Ya existe otro caso Call Center abierto para este registro de Ventanilla.',
                  'warning',
                );
              }

              return foundByVentanilla;
            }
          }

          if (cedula) {
            const byCedula =
              await searchCallCenter({
                page: 0,
                size: 5,
                cedulaSolicitante:
                  cedula,

                tipoSolicitudCallcenter:
                  candidate
                    .tipoSolicitudCallcenter,

                activo:
                  true,
              });

            const foundByCedula =
              getPageContent<
                CallCenterResponse
              >(byCedula)
                .find(
                  (record) =>
                    record.id
                      !== candidate.id
                    && isOpenCallCenterCase(
                      record,
                    ),
                );

            setExistingOpenCase(
              foundByCedula
              ?? null,
            );

            if (
              foundByCedula
              && showWarning
            ) {
              showMessage(
                'Ya existe otro caso Call Center abierto para esta cédula.',
                'warning',
              );
            }

            return (
              foundByCedula
              ?? null
            );
          }

          setExistingOpenCase(null);
          return null;
        } finally {
          setCheckingCase(false);
        }
      },
      [],
    );

  const loadEditRecord =
    useCallback(async () => {
      setLoadingRecord(true);

      try {
        const record =
          await getCallCenterRegistro(
            Number(editId),
          );

        const nextForm =
          recordToForm(record);

        setOriginalRecord(
          record,
        );

        setForm(
          nextForm,
        );

        await checkExistingOpenCase(
          nextForm,
          false,
        );
      } catch {
        showMessage(
          'No fue posible cargar el registro para editar.',
          'error',
        );
      } finally {
        setLoadingRecord(false);
      }
    }, [
      editId,
      checkExistingOpenCase,
    ]);

  useEffect(() => {
    void Promise.all([
      loadCatalogs(),
      loadEditRecord(),
    ]);
  }, [
    loadCatalogs,
    loadEditRecord,
  ]);

  async function searchPersonByCedula() {
    const cedula =
      normalizeText(
        form.cedulaSolicitante,
      );

    if (!cedula) {
      showMessage(
        'Digita una cédula para buscar en Ventanilla.',
        'warning',
      );

      return;
    }

    setSearchingCedula(true);

    try {
      const record =
        await findVentanillaByCedulaForCallCenter(
          cedula,
        );

      if (!record) {
        showMessage(
          'No se encontró esta cédula en Ventanilla.',
          'info',
        );

        await checkExistingOpenCase(
          form,
          true,
        );

        return;
      }

      const nextForm =
        ventanillaToForm(
          record,
          form,
        );

      setForm(nextForm);

      await checkExistingOpenCase(
        nextForm,
        true,
      );

      showMessage(
        'Datos cargados desde Ventanilla.',
        'success',
      );
    } catch {
      showMessage(
        'No fue posible consultar la cédula en Ventanilla.',
        'error',
      );
    } finally {
      setSearchingCedula(false);
    }
  }

  /**
   * Construye el request preservando los campos
   * operativos protegidos.
   */
  function buildRequest():
    CallCenterRequest {
    return {
      marcaTemporal:
        originalRecord
          ?.marcaTemporal
        ?? null,

      fechaLlamada:
        originalRecord
          ?.fechaLlamada
        ?? form.fechaLlamada,

      horaLlamada:
        originalRecord
          ?.horaLlamada
        ?? null,

      tipoRegistro:
        originalRecord
          ?.tipoRegistro
        ?? 'LLAMADA',

      origenRegistro:
        form.origenRegistro,

      ventanillaRegistroId:
        toOptionalNumber(
          form.ventanillaRegistroId,
        ),

      cedulaSolicitante:
        normalizeText(
          form.cedulaSolicitante,
        ),

      nombreCompleto:
        normalizeText(
          form.nombreCompleto,
        ),

      telefono:
        normalizeText(
          form.telefono,
        )
        || null,

      llamadaConectada:
        originalRecord
          ?.llamadaConectada
        ?? (
          null as unknown as boolean
        ),

      motivoNoContactoId:
        originalRecord
          ?.motivoNoContactoId
        ?? null,

      motivoNoContactoTexto:
        originalRecord
          ?.motivoNoContactoTexto
        ?? null,

      encuestadorProgramadoId:
        originalRecord
          ?.encuestadorProgramadoId
        ?? null,

      fechaEncuestaProgramada:
        originalRecord
          ?.fechaEncuestaProgramada
        ?? null,

      solicitoNuevaEncuesta:
        originalRecord
          ?.solicitoNuevaEncuesta
        ?? (
          form.tipoSolicitudCallcenter
          ===
          TIPO_SOLICITUD_NUEVA_ENCUESTA
        ),

      direccionTexto:
        normalizeText(
          form.direccionTexto,
        )
        || null,

      barrioId:
        toOptionalNumber(
          form.barrioId,
        ),

      fechaAplicacionInformada:
        originalRecord
          ?.fechaAplicacionInformada
        ?? null,

      disposicionRecibirEncuesta:
        originalRecord
          ?.disposicionRecibirEncuesta
        ?? null,

      motivoNoDisposicionId:
        originalRecord
          ?.motivoNoDisposicionId
        ?? null,

      motivoNoDisposicionTexto:
        originalRecord
          ?.motivoNoDisposicionTexto
        ?? null,

      encuestadorAsignadoId:
        originalRecord
          ?.encuestadorAsignadoId
        ?? null,

      explicoInformanteCalificado:
        originalRecord
          ?.explicoInformanteCalificado
        ?? null,

      verificado:
        originalRecord
          ?.verificado
        ?? null,

      estadoCaso:
        originalRecord
          ?.estadoCaso
        ?? ESTADO_PENDIENTE_ENRUTAMIENTO,

      tipoSolicitudCallcenter:
        form.tipoSolicitudCallcenter
        || TIPO_SOLICITUD_NUEVA_ENCUESTA,

      observacion:
        originalRecord
          ?.observacion
        ?? null,

      activo:
        originalRecord
          ?.activo
        !== false,
    };
  }

  function validateForm() {
    if (
      !normalizeText(
        form.cedulaSolicitante,
      )
    ) {
      return 'La cédula del solicitante es obligatoria.';
    }

    if (
      !normalizeText(
        form.nombreCompleto,
      )
    ) {
      return 'El nombre completo es obligatorio.';
    }

    if (
      !normalizeText(
        form.tipoSolicitudCallcenter,
      )
    ) {
      return 'Selecciona el tipo de solicitud.';
    }

    if (
      form.origenRegistro
        === 'VENTANILLA'
      && !form.ventanillaRegistroId
    ) {
      return 'Debe relacionarse un registro de Ventanilla para utilizar este origen.';
    }

    if (existingOpenCase) {
      return 'Ya existe otro caso Call Center abierto para este ciudadano o registro de Ventanilla.';
    }

    return '';
  }

  async function save() {
    if (!form.id) {
      showMessage(
        'No fue posible identificar el caso que será actualizado.',
        'error',
      );

      return;
    }

    const validationMessage =
      validateForm();

    if (validationMessage) {
      showMessage(
        validationMessage,
        'warning',
      );

      return;
    }

    const existing =
      await checkExistingOpenCase(
        form,
        true,
      );

    if (existing) {
      return;
    }

    setSaving(true);

    try {
      const updated =
        await updateCallCenterRegistro(
          form.id,
          buildRequest(),
        );

      showMessage(
        'Caso Call Center actualizado correctamente.',
        'success',
      );

      router.push(
        `/dashboard/callcenter/mis-registros/${updated.id}`,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'No fue posible actualizar el caso Call Center.';

      showMessage(
        message,
        'error',
      );
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setExistingOpenCase(null);

    if (originalRecord) {
      setForm(
        recordToForm(
          originalRecord,
        ),
      );
    }
  }

  if (loadingRecord) {
    return (
      <Paper
        variant="outlined"
        sx={{
          p: 4,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <CircularProgress />

          <Typography>
            Cargando caso Call Center...
          </Typography>
        </Box>
      </Paper>
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
              sx={{
                fontWeight: 800,
              }}
            >
              Editar datos administrativos del caso
            </Typography>

            <Typography
              component="p"
              variant="body2"
              sx={{
                color:
                  'text.secondary',
              }}
            >
              Actualiza únicamente los datos generales.
              Las llamadas, visitas y estados se gestionan
              mediante sus operaciones formales.
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
              startIcon={
                <ArrowBackIcon />
              }
              onClick={() =>
                router.push(
                  '/dashboard/callcenter/registros',
                )
              }
            >
              Volver
            </Button>

            <Button
              variant="outlined"
              startIcon={
                <RestartAltIcon />
              }
              onClick={
                resetForm
              }
              disabled={saving}
            >
              Restablecer
            </Button>

            <Button
              variant="contained"
              startIcon={
                <SaveIcon />
              }
              onClick={() =>
                void save()
              }
              disabled={
                saving
                || checkingCase
                || Boolean(
                  existingOpenCase,
                )
              }
            >
              {saving
                ? 'Guardando...'
                : 'Guardar cambios'}
            </Button>
          </Box>
        </Box>

        <Alert severity="info">
          Esta pantalla solo actualiza datos administrativos.
          No registra llamadas, no asigna encuestadores,
          no programa visitas y no cambia directamente
          el estado operativo.
        </Alert>

        <Alert severity="warning">
          Se preservan la fecha original, el estado del caso,
          los resultados telefónicos, las asignaciones,
          las visitas y las observaciones operativas.
        </Alert>

        {existingOpenCase && (
          <Alert severity="warning">
            Ya existe otro caso Call Center abierto para
            este ciudadano o registro de Ventanilla.
          </Alert>
        )}

        <Card>
          <CardContent>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 3,
              }}
            >
              <Box>
                <Typography
                  component="h2"
                  variant="h6"
                  sx={{
                    fontWeight: 800,
                  }}
                >
                  1. Identificación del ciudadano
                </Typography>

                <Typography
                  component="p"
                  variant="body2"
                  sx={{
                    color:
                      'text.secondary',
                  }}
                >
                  Actualiza los datos generales o consulta
                  nuevamente la información de Ventanilla.
                </Typography>
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  flexDirection: {
                    xs: 'column',
                    md: 'row',
                  },
                  gap: 2,
                }}
              >
                <TextField
                  label="Cédula solicitante"
                  value={
                    form.cedulaSolicitante
                  }
                  onChange={(event) =>
                    updateForm(
                      'cedulaSolicitante',
                      event.target.value,
                    )
                  }
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
                  startIcon={
                    <SearchIcon />
                  }
                  onClick={() =>
                    void searchPersonByCedula()
                  }
                  disabled={
                    searchingCedula
                    || checkingCase
                  }
                  sx={{
                    minWidth: 220,
                  }}
                >
                  {searchingCedula
                    || checkingCase
                    ? 'Buscando...'
                    : 'Buscar en Ventanilla'}
                </Button>
              </Box>

              {form.ventanillaRegistroId && (
                <Alert severity="success">
                  Registro relacionado con Ventanilla ID:{' '}
                  <strong>
                    {form.ventanillaRegistroId}
                  </strong>
                </Alert>
              )}

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    md: 'repeat(2, minmax(0, 1fr))',
                  },
                  gap: 2,
                }}
              >
                <TextField
                  label="Nombre completo"
                  value={
                    form.nombreCompleto
                  }
                  onChange={(event) =>
                    updateForm(
                      'nombreCompleto',
                      event.target.value,
                    )
                  }
                  fullWidth
                  required
                />

                <TextField
                  label="Teléfono"
                  value={
                    form.telefono
                  }
                  onChange={(event) =>
                    updateForm(
                      'telefono',
                      event.target.value,
                    )
                  }
                  fullWidth
                />

                <TextField
                  label="Dirección"
                  value={
                    form.direccionTexto
                  }
                  onChange={(event) =>
                    updateForm(
                      'direccionTexto',
                      event.target.value,
                    )
                  }
                  fullWidth
                />

                <TextField
                  label="Barrio"
                  select
                  value={
                    form.barrioId
                  }
                  onChange={(event) =>
                    updateForm(
                      'barrioId',
                      event.target.value,
                    )
                  }
                  fullWidth
                >
                  <MenuItem value="">
                    Sin seleccionar
                  </MenuItem>

                  {barrios.map(
                    (option) => (
                      <MenuItem
                        key={option.id}
                        value={
                          String(
                            option.id,
                          )
                        }
                      >
                        {option.label}
                      </MenuItem>
                    ),
                  )}
                </TextField>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 3,
              }}
            >
              <Box>
                <Typography
                  component="h2"
                  variant="h6"
                  sx={{
                    fontWeight: 800,
                  }}
                >
                  2. Datos administrativos del caso
                </Typography>

                <Typography
                  component="p"
                  variant="body2"
                  sx={{
                    color:
                      'text.secondary',
                  }}
                >
                  Actualiza el origen y el tipo de solicitud.
                  El estado operativo no se modifica aquí.
                </Typography>
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    md: 'repeat(3, minmax(0, 1fr))',
                  },
                  gap: 2,
                }}
              >
                <TextField
                  label="Fecha del caso"
                  type="date"
                  value={
                    form.fechaLlamada
                  }
                  fullWidth
                  disabled
                  helperText="La fecha original no puede modificarse desde la edición administrativa."
                  slotProps={{
                    inputLabel: {
                      shrink: true,
                    },
                  }}
                />

                <TextField
                  label="Origen"
                  select
                  value={
                    form.origenRegistro
                  }
                  onChange={(event) =>
                    updateForm(
                      'origenRegistro',
                      event.target.value,
                    )
                  }
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
                  value={
                    form.tipoSolicitudCallcenter
                  }
                  onChange={(event) =>
                    updateForm(
                      'tipoSolicitudCallcenter',
                      event.target.value,
                    )
                  }
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
                  value={
                    formatLabel(
                      form.estadoCaso,
                    )
                  }
                  fullWidth
                  disabled
                  helperText="El estado cambia mediante las operaciones formales del flujo."
                />

                <TextField
                  label="Ventanilla ID"
                  value={
                    form.ventanillaRegistroId
                  }
                  onChange={(event) =>
                    updateForm(
                      'ventanillaRegistroId',
                      event.target.value,
                    )
                  }
                  fullWidth
                  disabled={
                    form.origenRegistro
                    !== 'VENTANILLA'
                  }
                />

                <TextField
                  label="Estado lógico"
                  value={
                    form.activo
                      ? 'Activo'
                      : 'Inactivo'
                  }
                  fullWidth
                  disabled
                  helperText="La activación e inactivación se gestiona desde el listado."
                />
              </Box>

              <TextField
                label="Observación operativa"
                value={
                  form.observacion
                }
                fullWidth
                multiline
                minRows={3}
                disabled
                helperText="La observación operativa no se modifica desde la edición administrativa."
              />
            </Box>
          </CardContent>
        </Card>

        <Paper
          variant="outlined"
          sx={{
            p: 2,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: {
                xs: 'column',
                sm: 'row',
              },
              gap: 1,
              justifyContent:
                'flex-end',
            }}
          >
            <Button
              variant="outlined"
              startIcon={
                <ArrowBackIcon />
              }
              onClick={() =>
                router.push(
                  '/dashboard/callcenter/registros',
                )
              }
            >
              Cancelar
            </Button>

            <Button
              variant="contained"
              startIcon={
                <SaveIcon />
              }
              onClick={() =>
                void save()
              }
              disabled={
                saving
                || checkingCase
                || Boolean(
                  existingOpenCase,
                )
              }
            >
              {saving
                ? 'Guardando...'
                : 'Guardar cambios'}
            </Button>
          </Box>
        </Paper>
      </Box>

      <Snackbar
        open={
          snackbar.open
        }
        autoHideDuration={5000}
        onClose={
          closeSnackbar
        }
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
          sx={{
            width: '100%',
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

function formatLabel(
  value?: string | null,
) {
  return String(
    value ?? 'Sin dato',
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