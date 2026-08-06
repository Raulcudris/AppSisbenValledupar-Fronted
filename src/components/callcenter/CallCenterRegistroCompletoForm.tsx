'use client';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
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
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material';

import { useRouter } from 'next/navigation';

import {
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  createCallCenterRegistroCompleto,
  getCallCenterRegistroCompleto,
  updateCallCenterRegistroCompleto,
} from '@/services/callcenter-registro-completo.service';

import {
  findVentanillaByCedulaForCallCenter,
  getCallCenterBarriosOptions,
  getCallCenterEncuestadoresOptions,
  getMotivosNoContactoOptions,
  getMotivosNoDisposicionOptions,
  searchCallCenter,
} from '@/services/callcenter.service';

import {
  getCallCenterResultadosLlamada,
} from '@/services/callcenter-workflow.service';

import type {
  CallCenterRegistroCompletoRequest,
  CallCenterRegistroCompletoResponse,
} from '@/types/callcenter-registro-completo.types';

import type {
  CallCenterOrigenRegistro,
  CallCenterResponse,
  CallCenterTipoSolicitud,
  VentanillaCallCenterResponse,
} from '@/types/callcenter.types';

import type {
  CallCenterResultadoLlamadaResponse,
} from '@/types/callcenter-workflow.types';

import type {
  SelectOption,
} from '@/types/catalog.types';

type YesNoValue =
  | ''
  | 'SI'
  | 'NO';

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
  fechaLlamada: string;
  horaLlamada: string;

  origenRegistro: CallCenterOrigenRegistro;
  ventanillaRegistroId: string;

  tipoSolicitudCallcenter:
    | CallCenterTipoSolicitud
    | string;

  cedulaSolicitante: string;
  nombreCompleto: string;
  telefono: string;
  direccionTexto: string;
  barrioId: string;
  observacionCaso: string;

  llamadaConectada: YesNoValue;
  resultadoLlamada: string;
  motivoNoContactoId: string;
  motivoNoDisposicionId: string;
  fechaReprogramacionLlamada: string;
  horaReprogramacionLlamada: string;
  observacionLlamada: string;

  encuestadorId: string;
  fechaProgramada: string;
  horaProgramada: string;
  observacionVisita: string;

  fechaAplicacionInformada: string;
  disposicionRecibirEncuesta: YesNoValue;
  explicoInformanteCalificado: YesNoValue;
};

type CallCenterRegistroCompletoFormProps = {
  registroId?: number;
};

const STEPS = [
  'Ciudadano',
  'Llamada',
  'Programación',
  'Confirmaciones',
  'Resumen',
];

const TIPOS_SOLICITUD = [
  {
    value: 'NUEVA_ENCUESTA',
    label: 'Nueva encuesta',
  },
  {
    value: 'INCLUSION',
    label: 'Inclusión',
  },
  {
    value: 'VERIFICACION',
    label: 'Verificación',
  },
  {
    value: 'OTRO',
    label: 'Otro',
  },
];

const VENTANILLA_OBSERVATION_PREFIXES = [
  'Ventanilla:',
  'Fecha Ventanilla:',
  'Solicitud:',
  'Estado:',
  'Observación Ventanilla:',
];

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

function getLocalTime(
  date = new Date(),
) {
  const hours =
    String(
      date.getHours(),
    ).padStart(2, '0');

  const minutes =
    String(
      date.getMinutes(),
    ).padStart(2, '0');

  return `${hours}:${minutes}`;
}

function buildInitialForm(): FormState {
  const now =
    new Date();

  return {
    fechaLlamada:
      getLocalDateISO(now),

    horaLlamada:
      getLocalTime(now),

    origenRegistro:
      'MANUAL',

    ventanillaRegistroId:
      '',

    tipoSolicitudCallcenter:
      'NUEVA_ENCUESTA',

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

    observacionCaso:
      '',

    llamadaConectada:
      '',

    resultadoLlamada:
      '',

    motivoNoContactoId:
      '',

    motivoNoDisposicionId:
      '',

    fechaReprogramacionLlamada:
      '',

    horaReprogramacionLlamada:
      '',

    observacionLlamada:
      '',

    encuestadorId:
      '',

    fechaProgramada:
      '',

    horaProgramada:
      '',

    observacionVisita:
      '',

    fechaAplicacionInformada:
      '',

    disposicionRecibirEncuesta:
      '',

    explicoInformanteCalificado:
      '',
  };
}

function normalizeText(
  value?: string | null,
) {
  return value?.trim() ?? '';
}

/**
 * Convierte nombres de personas a mayúsculas.
 *
 * No elimina espacios mientras el usuario escribe.
 */
function toUppercasePersonName(
  value?: string | null,
) {
  return String(
    value ?? '',
  ).toLocaleUpperCase(
    'es-CO',
  );
}

function normalizeCode(
  value?: string | null,
) {
  return String(value ?? '')
    .trim()
    .toUpperCase();
}

function normalizeOrigenRegistro(
  value?: string | null,
): CallCenterOrigenRegistro {
  const normalized =
    normalizeCode(value);

  if (
    normalized === 'VENTANILLA'
  ) {
    return 'VENTANILLA';
  }

  if (
    normalized === 'IMPORTACION'
  ) {
    return 'IMPORTACION';
  }

  return 'MANUAL';
}

function removeVentanillaObservationParts(
  value?: string | null,
) {
  return String(value ?? '')
    .split('|')
    .map(
      (part) =>
        part.trim(),
    )
    .filter(Boolean)
    .filter(
      (part) =>
        !VENTANILLA_OBSERVATION_PREFIXES
          .some(
            (prefix) =>
              part.startsWith(
                prefix,
              ),
          ),
    )
    .join(' | ');
}

function toOptionalNumber(
  value: string,
) {
  if (!value) {
    return null;
  }

  const number =
    Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}

function toNullableBoolean(
  value: YesNoValue,
) {
  if (value === 'SI') {
    return true;
  }

  if (value === 'NO') {
    return false;
  }

  return null;
}

function toYesNoValue(
  value?: boolean | null,
): YesNoValue {
  if (value === true) {
    return 'SI';
  }

  if (value === false) {
    return 'NO';
  }

  return '';
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
    data?.content
    ?? data?.items
    ?? data?.data
    ?? []
  );
}

function isPendingNewSurvey(
  record: CallCenterResponse,
) {
  return (
    record.activo !== false
    && record.solicitoNuevaEncuesta === true
    && record.encuestaRealizada !== true
  );
}

function isEditableRecord(
  record: CallCenterResponse,
) {
  const estadoCaso =
    normalizeCode(
      record.estadoCaso,
    );

  return (
    record.activo !== false
    && estadoCaso !== 'CERRADO'
    && estadoCaso !== 'CANCELADO'
  );
}

function ventanillaToForm(
  record: VentanillaCallCenterResponse,
  current: FormState,
): FormState {
  const manualObservation =
    removeVentanillaObservationParts(
      current.observacionCaso,
    );

  return {
    ...current,

    origenRegistro:
      'VENTANILLA',

    ventanillaRegistroId:
      String(record.id),

    cedulaSolicitante:
      normalizeText(
        record.cedulaUsuario,
      )
      || current.cedulaSolicitante,

    nombreCompleto:
      toUppercasePersonName(
        normalizeText(
          record.nombreUsuario,
        ),
      ),

    telefono:
      normalizeText(
        record.telefono,
      ),

    direccionTexto:
      normalizeText(
        record.direccion,
      ),

    barrioId:
      record.barrioId
        ? String(record.barrioId)
        : '',

    observacionCaso: [
      manualObservation,

      record.numeroVentanilla
        ? `Ventanilla: ${record.numeroVentanilla}`
        : '',

      record.fecha
        ? `Fecha Ventanilla: ${record.fecha}`
        : '',

      record.solicitudNombre
        ? `Solicitud: ${record.solicitudNombre}`
        : '',

      record.estadoSolicitudNombre
        ? `Estado: ${record.estadoSolicitudNombre}`
        : '',

      record.observacion
        ? `Observación Ventanilla: ${record.observacion}`
        : '',
    ]
      .filter(Boolean)
      .join(' | '),
  };
}

function registroCompletoToForm(
  data: CallCenterRegistroCompletoResponse,
): FormState {
  const {
    registro,
    llamada,
    visita,
  } = data;

  return {
    fechaLlamada:
      llamada.fechaLlamada
      || registro.fechaLlamada
      || '',

    horaLlamada:
      llamada.horaLlamada
      || registro.horaLlamada
      || '',

    origenRegistro:
      normalizeOrigenRegistro(
        registro.origenRegistro,
      ),

    ventanillaRegistroId:
      registro.ventanillaRegistroId == null
        ? ''
        : String(
          registro.ventanillaRegistroId,
        ),

    tipoSolicitudCallcenter:
      registro.tipoSolicitudCallcenter
      || 'NUEVA_ENCUESTA',

    cedulaSolicitante:
      registro.cedulaSolicitante
      || '',

    nombreCompleto:
      toUppercasePersonName(
        registro.nombreCompleto,
      ),

    telefono:
      registro.telefono
      || '',

    direccionTexto:
      registro.direccionTexto
      || '',

    barrioId:
      registro.barrioId == null
        ? ''
        : String(
          registro.barrioId,
        ),

    observacionCaso:
      registro.observacion
      || '',

    llamadaConectada:
      toYesNoValue(
        llamada.llamadaConectada,
      ),

    resultadoLlamada:
      llamada.resultadoLlamada
      || '',

    motivoNoContactoId:
      llamada.motivoNoContactoId == null
        ? ''
        : String(
          llamada.motivoNoContactoId,
        ),

    motivoNoDisposicionId:
      llamada.motivoNoDisposicionId == null
        ? ''
        : String(
          llamada.motivoNoDisposicionId,
        ),

    fechaReprogramacionLlamada:
      llamada.fechaReprogramacionLlamada
      || '',

    horaReprogramacionLlamada:
      llamada.horaReprogramacionLlamada
      || '',

    observacionLlamada:
      llamada.observacion
      || '',

    encuestadorId:
      visita.encuestadorId == null
        ? ''
        : String(
          visita.encuestadorId,
        ),

    fechaProgramada:
      visita.fechaProgramada
      || registro.fechaEncuestaProgramada
      || '',

    horaProgramada:
      visita.horaProgramada
      || '',

    observacionVisita:
      visita.observacionEncuestador
      || '',

    fechaAplicacionInformada:
      registro.fechaAplicacionInformada
      || '',

    disposicionRecibirEncuesta:
      toYesNoValue(
        registro.disposicionRecibirEncuesta,
      ),

    explicoInformanteCalificado:
      toYesNoValue(
        registro.explicoInformanteCalificado,
      ),
  };
}

export default function CallCenterRegistroCompletoForm({
  registroId,
}: CallCenterRegistroCompletoFormProps) {
  const router =
    useRouter();

  const isEditMode =
    typeof registroId === 'number'
    && Number.isSafeInteger(registroId)
    && registroId > 0;

  const cedulaInputRef =
    useRef<HTMLInputElement>(null);

  const [
    activeStep,
    setActiveStep,
  ] = useState(0);

  const [
    form,
    setForm,
  ] = useState<FormState>(
    buildInitialForm,
  );

  const [
    originalForm,
    setOriginalForm,
  ] = useState<FormState | null>(
    null,
  );

  const [
    barrios,
    setBarrios,
  ] = useState<SelectOption[]>([]);

  const [
    encuestadores,
    setEncuestadores,
  ] = useState<SelectOption[]>([]);

  const [
    motivosNoContacto,
    setMotivosNoContacto,
  ] = useState<SelectOption[]>([]);

  const [
    motivosNoDisposicion,
    setMotivosNoDisposicion,
  ] = useState<SelectOption[]>([]);

  const [
    resultadosLlamada,
    setResultadosLlamada,
  ] = useState<
    CallCenterResultadoLlamadaResponse[]
  >([]);

  const [
    loadingCatalogs,
    setLoadingCatalogs,
  ] = useState(true);

  const [
    loadingRecord,
    setLoadingRecord,
  ] = useState(
    isEditMode,
  );

  const [
    recordLoadError,
    setRecordLoadError,
  ] = useState<string | null>(
    null,
  );

  const [
    searchingVentanilla,
    setSearchingVentanilla,
  ] = useState(false);

  const [
    checkingDuplicate,
    setCheckingDuplicate,
  ] = useState(false);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    existingOpenCase,
    setExistingOpenCase,
  ] = useState<CallCenterResponse | null>(
    null,
  );

  const [
    validationMessage,
    setValidationMessage,
  ] = useState<string | null>(
    null,
  );

  const [
    snackbar,
    setSnackbar,
  ] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success',
  });

  const isConnected =
    form.llamadaConectada === 'SI';

  const isNotConnected =
    form.llamadaConectada === 'NO';

  const resultCode =
    normalizeCode(
      form.resultadoLlamada,
    );

  const requiresNoDisposition =
    resultCode ===
      'CONTACTADO_NO_ACEPTA_VISITA'
    || (
      isConnected
      && form.disposicionRecibirEncuesta
        === 'NO'
    );

  const requiresCallReprogramming =
    resultCode ===
      'REPROGRAMAR_LLAMADA';

  const availableResults =
    useMemo(
      () =>
        resultadosLlamada.filter(
          (result) => {
            const suggestedState =
              normalizeCode(
                result.estadoCasoSugerido,
              );

            return (
              result.activo !== false
              && suggestedState !== 'CERRADO'
              && suggestedState !== 'CANCELADO'
            );
          },
        ),
      [resultadosLlamada],
    );

  const selectedResult =
    useMemo(
      () =>
        resultadosLlamada.find(
          (result) =>
            normalizeCode(
              result.codigo,
            ) === resultCode,
        ) ?? null,
      [
        resultadosLlamada,
        resultCode,
      ],
    );

  const selectedBarrioLabel =
    getOptionLabel(
      barrios,
      form.barrioId,
      'Sin barrio',
    );

  const selectedEncuestadorLabel =
    getOptionLabel(
      encuestadores,
      form.encuestadorId,
      'Sin encuestador',
    );

  const selectedNoContactLabel =
    getOptionLabel(
      motivosNoContacto,
      form.motivoNoContactoId,
      'Sin motivo',
    );

  const selectedNoDispositionLabel =
    getOptionLabel(
      motivosNoDisposicion,
      form.motivoNoDisposicionId,
      'Sin motivo',
    );

  const loadCatalogs =
    useCallback(async () => {
      setLoadingCatalogs(true);

      try {
        const [
          barriosData,
          encuestadoresData,
          noContactoData,
          noDisposicionData,
          resultadosData,
        ] = await Promise.all([
          getCallCenterBarriosOptions(),
          getCallCenterEncuestadoresOptions(),
          getMotivosNoContactoOptions(),
          getMotivosNoDisposicionOptions(),
          getCallCenterResultadosLlamada(),
        ]);

        setBarrios(
          barriosData,
        );

        setEncuestadores(
          encuestadoresData,
        );

        setMotivosNoContacto(
          noContactoData,
        );

        setMotivosNoDisposicion(
          noDisposicionData,
        );

        setResultadosLlamada(
          resultadosData,
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'No fue posible cargar los catálogos del formulario.';

        showMessage(
          message,
          'error',
        );
      } finally {
        setLoadingCatalogs(false);
      }
    }, []);

  useEffect(() => {
    void loadCatalogs();
  }, [loadCatalogs]);

  useEffect(() => {
    if (
      !isEditMode
      || typeof registroId !== 'number'
    ) {
      setLoadingRecord(false);
      setRecordLoadError(null);
      return;
    }

    const currentRegistroId =
      registroId;

    let cancelled =
      false;

    async function loadRecord() {
      setLoadingRecord(true);
      setRecordLoadError(null);
      setValidationMessage(null);

      try {
        const data =
          await getCallCenterRegistroCompleto(
            currentRegistroId,
          );

        if (cancelled) {
          return;
        }

        if (
          !data?.registro
          || !data?.llamada
          || !data?.visita
        ) {
          throw new Error(
            'El registro no contiene el caso, la llamada y la visita requeridos para la edición completa.',
          );
        }

        if (
          !isEditableRecord(
            data.registro,
          )
        ) {
          throw new Error(
            'El caso está cerrado, cancelado o inactivo y permanece disponible únicamente para consulta.',
          );
        }

        const nextForm =
          registroCompletoToForm(
            data,
          );

        setForm(
          nextForm,
        );

        setOriginalForm({
          ...nextForm,
        });

        setExistingOpenCase(
          null,
        );

        setActiveStep(
          0,
        );
      } catch (error) {
        if (cancelled) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : 'No fue posible cargar el registro completo.';

        setRecordLoadError(
          message,
        );
      } finally {
        if (!cancelled) {
          setLoadingRecord(false);
        }
      }
    }

    void loadRecord();

    return () => {
      cancelled =
        true;
    };
  }, [
    isEditMode,
    registroId,
  ]);

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

  function goBack() {
    if (
      isEditMode
      && registroId
    ) {
      router.push(
        `/dashboard/callcenter/mis-registros/${registroId}`,
      );

      return;
    }

    router.push(
      '/dashboard/callcenter/registros',
    );
  }

  function focusCedulaAndScrollTop() {
    window.requestAnimationFrame(
      () => {
        window.scrollTo({
          top: 0,
          behavior: 'smooth',
        });

        cedulaInputRef
          .current
          ?.focus();
      },
    );
  }

  function updateForm(
    field: keyof FormState,
    value: string,
  ) {
    setValidationMessage(null);

    if (
      field === 'cedulaSolicitante'
      || field === 'tipoSolicitudCallcenter'
      || field === 'ventanillaRegistroId'
    ) {
      setExistingOpenCase(null);
    }

    setForm((current) => {
      const next: FormState = {
        ...current,
        [field]: value,
      };

      if (
        field === 'cedulaSolicitante'
        && current.ventanillaRegistroId
        && normalizeText(value)
          !== normalizeText(
            current.cedulaSolicitante,
          )
      ) {
        next.origenRegistro =
          'MANUAL';

        next.ventanillaRegistroId =
          '';

        next.nombreCompleto =
          '';

        next.telefono =
          '';

        next.direccionTexto =
          '';

        next.barrioId =
          '';

        next.observacionCaso =
          removeVentanillaObservationParts(
            current.observacionCaso,
          );
      }

      if (
        field === 'llamadaConectada'
      ) {
        if (value === 'SI') {
          next.motivoNoContactoId =
            '';
        }

        if (value === 'NO') {
          next.motivoNoDisposicionId =
            '';

          next.fechaAplicacionInformada =
            '';

          next.disposicionRecibirEncuesta =
            '';

          next.explicoInformanteCalificado =
            '';
        }
      }

      if (
        field === 'resultadoLlamada'
        && normalizeCode(value)
          !== 'REPROGRAMAR_LLAMADA'
      ) {
        next.fechaReprogramacionLlamada =
          '';

        next.horaReprogramacionLlamada =
          '';
      }

      return next;
    });
  }

  async function searchPersonByCedula() {
    if (searchingVentanilla) {
      return;
    }

    const cedula =
      normalizeText(
        form.cedulaSolicitante,
      );

    if (!cedula) {
      showMessage(
        'Digita una cédula y presiona Enter.',
        'warning',
      );

      return;
    }

    setSearchingVentanilla(true);
    setValidationMessage(null);

    try {
      const record =
        await findVentanillaByCedulaForCallCenter(
          cedula,
        );

      if (!record) {
        const hadVentanillaData =
          Boolean(
            form.ventanillaRegistroId,
          )
          || form.origenRegistro
            === 'VENTANILLA';

        const nextForm: FormState = {
          ...form,

          cedulaSolicitante:
            cedula,

          origenRegistro:
            'MANUAL',

          ventanillaRegistroId:
            '',

          nombreCompleto:
            hadVentanillaData
              ? ''
              : form.nombreCompleto,

          telefono:
            hadVentanillaData
              ? ''
              : form.telefono,

          direccionTexto:
            hadVentanillaData
              ? ''
              : form.direccionTexto,

          barrioId:
            hadVentanillaData
              ? ''
              : form.barrioId,

          observacionCaso:
            removeVentanillaObservationParts(
              form.observacionCaso,
            ),
        };

        setForm(nextForm);

        showMessage(
          'La cédula no está registrada en Ventanilla. Completa los datos para continuar como registro manual.',
          'info',
        );

        await checkPendingNewSurvey(
          nextForm,
          false,
        );

        return;
      }

      const nextForm =
        ventanillaToForm(
          record,
          form,
        );

      setForm(nextForm);

      showMessage(
        'Ciudadano encontrado. Los datos fueron cargados desde Ventanilla.',
        'success',
      );

      await checkPendingNewSurvey(
        nextForm,
        true,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'No fue posible consultar la cédula en Ventanilla.';

      showMessage(
        message,
        'error',
      );
    } finally {
      setSearchingVentanilla(false);
    }
  }

  async function checkPendingNewSurvey(
    candidate: FormState,
    showWarning = true,
  ) {
    if (
      normalizeCode(
        candidate.tipoSolicitudCallcenter,
      ) !== 'NUEVA_ENCUESTA'
    ) {
      setExistingOpenCase(null);
      return null;
    }

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

    setCheckingDuplicate(true);

    try {
      if (ventanillaRegistroId) {
        const response =
          await searchCallCenter({
            page: 0,
            size: 20,
            ventanillaRegistroId,
            solicitoNuevaEncuesta:
              true,
            encuestaRealizada:
              false,
            activo:
              true,
          });

        const found =
          getPageContent<CallCenterResponse>(
            response,
          ).find(
            (record) =>
              record.id !== registroId
              && isPendingNewSurvey(
                record,
              ),
          );

        if (found) {
          setExistingOpenCase(
            found,
          );

          if (showWarning) {
            showMessage(
              `Ya existe otra nueva encuesta activa y pendiente para este registro de Ventanilla: caso #${found.id}.`,
              'warning',
            );
          }

          return found;
        }
      }

      if (cedula) {
        const response =
          await searchCallCenter({
            page: 0,
            size: 20,

            cedulaSolicitante:
              cedula,

            solicitoNuevaEncuesta:
              true,

            encuestaRealizada:
              false,

            activo:
              true,
          });

        const found =
          getPageContent<CallCenterResponse>(
            response,
          ).find(
            (record) =>
              record.id !== registroId
              && isPendingNewSurvey(
                record,
              ),
          );

        setExistingOpenCase(
          found ?? null,
        );

        if (
          found
          && showWarning
        ) {
          showMessage(
            `Ya existe otra nueva encuesta activa y pendiente para esta cédula: caso #${found.id}.`,
            'warning',
          );
        }

        return found ?? null;
      }

      setExistingOpenCase(null);
      return null;
    } catch {
      showMessage(
        'No fue posible ejecutar la validación preventiva de duplicidad. El backend volverá a validarla al guardar.',
        'info',
      );

      return null;
    } finally {
      setCheckingDuplicate(false);
    }
  }

  function validateStep(
    step: number,
  ) {
    if (step === 0) {
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
          form.direccionTexto,
        )
      ) {
        return 'La dirección del ciudadano es obligatoria.';
      }

      if (
        !normalizeText(
          form.tipoSolicitudCallcenter,
        )
      ) {
        return 'Selecciona el tipo de solicitud.';
      }

      if (
        form.origenRegistro === 'VENTANILLA'
        && !form.ventanillaRegistroId
      ) {
        return 'La cédula debe estar vinculada a un registro válido de Ventanilla.';
      }

      if (existingOpenCase) {
        return 'Ya existe otra nueva encuesta activa y pendiente para este ciudadano.';
      }

      return '';
    }

    if (step === 1) {
      if (!form.fechaLlamada) {
        return 'La fecha de la llamada es obligatoria.';
      }

      if (!form.horaLlamada) {
        return 'La hora de la llamada es obligatoria.';
      }

      if (!form.llamadaConectada) {
        return 'Indica si se logró conectar la llamada.';
      }

      if (!form.resultadoLlamada) {
        return 'Selecciona el resultado de la llamada.';
      }

      const suggestedState =
        normalizeCode(
          selectedResult
            ?.estadoCasoSugerido,
        );

      if (
        suggestedState === 'CERRADO'
        || suggestedState === 'CANCELADO'
      ) {
        return 'El resultado seleccionado finaliza el caso y no permite conservar una visita programada.';
      }

      if (
        isNotConnected
        && !form.motivoNoContactoId
      ) {
        return 'Selecciona el motivo de no contacto.';
      }

      if (
        resultCode ===
          'CONTACTADO_NO_ACEPTA_VISITA'
        && !form.motivoNoDisposicionId
      ) {
        return 'Selecciona el motivo de no disposición.';
      }

      if (
        requiresCallReprogramming
        && !form.fechaReprogramacionLlamada
      ) {
        return 'Selecciona la fecha del próximo intento de llamada.';
      }

      if (
        requiresCallReprogramming
        && !form.horaReprogramacionLlamada
      ) {
        return 'Selecciona la hora del próximo intento de llamada.';
      }

      return '';
    }

    if (step === 2) {
      if (!form.encuestadorId) {
        return 'Selecciona el encuestador.';
      }

      if (!form.fechaProgramada) {
        return 'La fecha programada de la visita es obligatoria.';
      }

      if (!form.horaProgramada) {
        return 'La hora programada de la visita es obligatoria.';
      }

      return '';
    }

    if (step === 3) {
      if (!isConnected) {
        return '';
      }

      if (
        !normalizeText(
          form.direccionTexto,
        )
      ) {
        return 'Confirma la dirección del ciudadano.';
      }

      if (
        !form.disposicionRecibirEncuesta
      ) {
        return 'Indica si el ciudadano tiene disposición para recibir la encuesta.';
      }

      if (
        form.disposicionRecibirEncuesta
          === 'NO'
        && !form.motivoNoDisposicionId
      ) {
        return 'Selecciona el motivo de no disposición.';
      }

      if (
        !form.fechaAplicacionInformada
      ) {
        return 'Registra la fecha de aplicación informada al ciudadano.';
      }

      if (
        !form.explicoInformanteCalificado
      ) {
        return 'Indica si se explicó el concepto de informante calificado.';
      }

      return '';
    }

    return '';
  }

  async function handleNext() {
    const validation =
      validateStep(
        activeStep,
      );

    if (validation) {
      setValidationMessage(
        validation,
      );

      return;
    }

    if (activeStep === 0) {
      const existing =
        await checkPendingNewSurvey(
          form,
          true,
        );

      if (existing) {
        setValidationMessage(
          'No es posible continuar porque existe otra nueva encuesta activa y pendiente.',
        );

        return;
      }
    }

    if (
      activeStep === 2
      && isConnected
      && !form.fechaAplicacionInformada
    ) {
      setForm(
        (current) => ({
          ...current,

          fechaAplicacionInformada:
            current.fechaProgramada,
        }),
      );
    }

    setValidationMessage(null);

    setActiveStep(
      (current) =>
        Math.min(
          current + 1,
          STEPS.length - 1,
        ),
    );
  }

  function handleBack() {
    setValidationMessage(null);

    setActiveStep(
      (current) =>
        Math.max(
          current - 1,
          0,
        ),
    );
  }

  function validateCompleteForm() {
    for (
      let step = 0;
      step <= 3;
      step += 1
    ) {
      const message =
        validateStep(step);

      if (message) {
        return {
          step,
          message,
        };
      }
    }

    return null;
  }

  function buildRequest():
    CallCenterRegistroCompletoRequest {
    return {
      registro: {
        fechaLlamada:
          form.fechaLlamada,

        horaLlamada:
          form.horaLlamada,

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
          toUppercasePersonName(
            normalizeText(
              form.nombreCompleto,
            ),
          ),

        telefono:
          normalizeText(
            form.telefono,
          ) || null,

        direccionTexto:
          normalizeText(
            form.direccionTexto,
          ),

        barrioId:
          toOptionalNumber(
            form.barrioId,
          ),

        tipoSolicitudCallcenter:
          form.tipoSolicitudCallcenter,

        observacion:
          normalizeText(
            form.observacionCaso,
          ) || null,
      },

      llamada: {
        fechaLlamada:
          form.fechaLlamada,

        horaLlamada:
          form.horaLlamada,

        llamadaConectada:
          isConnected,

        resultadoLlamada:
          form.resultadoLlamada,

        motivoNoContactoId:
          isNotConnected
            ? toOptionalNumber(
              form.motivoNoContactoId,
            )
            : null,

        motivoNoDisposicionId:
          requiresNoDisposition
            ? toOptionalNumber(
              form.motivoNoDisposicionId,
            )
            : null,

        fechaReprogramacionLlamada:
          requiresCallReprogramming
            ? form.fechaReprogramacionLlamada
              || null
            : null,

        horaReprogramacionLlamada:
          requiresCallReprogramming
            ? form.horaReprogramacionLlamada
              || null
            : null,

        solicitoNuevaEncuesta:
          normalizeCode(
            form.tipoSolicitudCallcenter,
          ) === 'NUEVA_ENCUESTA',

        direccionTexto:
          isConnected
            ? normalizeText(
              form.direccionTexto,
            )
            : null,

        fechaAplicacionInformada:
          isConnected
            ? form.fechaAplicacionInformada
              || null
            : null,

        disposicionRecibirEncuesta:
          isConnected
            ? toNullableBoolean(
              form.disposicionRecibirEncuesta,
            )
            : null,

        explicoInformanteCalificado:
          isConnected
            ? toNullableBoolean(
              form.explicoInformanteCalificado,
            )
            : null,

        observacion:
          normalizeText(
            form.observacionLlamada,
          ) || null,
      },

      visita: {
        encuestadorId:
          Number(
            form.encuestadorId,
          ),

        fechaProgramada:
          form.fechaProgramada,

        horaProgramada:
          form.horaProgramada,

        observacion:
          normalizeText(
            form.observacionVisita,
          ) || null,
      },
    };
  }

  async function save() {
    const validation =
      validateCompleteForm();

    if (validation) {
      setActiveStep(
        validation.step,
      );

      setValidationMessage(
        validation.message,
      );

      return;
    }

    const existing =
      await checkPendingNewSurvey(
        form,
        true,
      );

    if (existing) {
      setActiveStep(0);

      setValidationMessage(
        'No es posible guardar porque existe otra nueva encuesta activa y pendiente.',
      );

      return;
    }

    setSaving(true);
    setValidationMessage(null);

    try {
      const request =
        buildRequest();

      if (
        isEditMode
        && typeof registroId === 'number'
      ) {
        const updated =
          await updateCallCenterRegistroCompleto(
            registroId,
            request,
          );

        showMessage(
          `Caso #${updated.registro.id}, llamada y visita actualizados correctamente.`,
          'success',
        );

        router.push(
          `/dashboard/callcenter/mis-registros/${updated.registro.id}`,
        );

        return;
      }

      const created =
        await createCallCenterRegistroCompleto(
          request,
        );

      resetForm();

      showMessage(
        `Caso #${created.registro.id} registrado correctamente. El formulario está listo para registrar otro ciudadano.`,
        'success',
      );

      focusCedulaAndScrollTop();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : isEditMode
            ? 'No fue posible actualizar el registro completo.'
            : 'No fue posible registrar el caso completo.';

      setValidationMessage(
        message,
      );

      showMessage(
        message,
        'error',
      );
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    if (
      isEditMode
      && originalForm
    ) {
      setForm({
        ...originalForm,
      });

      setActiveStep(0);
      setExistingOpenCase(null);
      setValidationMessage(null);

      return;
    }

    setForm(
      buildInitialForm(),
    );

    setActiveStep(0);
    setExistingOpenCase(null);
    setValidationMessage(null);
  }

  function handleResetForm() {
    resetForm();

    if (!isEditMode) {
      focusCedulaAndScrollTop();
    }
  }

  if (
    loadingCatalogs
    || loadingRecord
  ) {
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
            {isEditMode
              ? 'Cargando registro completo...'
              : 'Cargando formulario Call Center...'}
          </Typography>
        </Box>
      </Paper>
    );
  }

  if (
    isEditMode
    && recordLoadError
  ) {
    return (
      <Paper
        variant="outlined"
        sx={{
          p: {
            xs: 2,
            md: 4,
          },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <Alert severity="error">
            {recordLoadError}
          </Alert>

          <Box>
            <Button
              variant="outlined"
              startIcon={
                <ArrowBackIcon />
              }
              onClick={goBack}
            >
              Volver al caso
            </Button>
          </Box>
        </Box>
      </Paper>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2.5,
      }}
    >
      <Box
        sx={{
          display: 'flex',

          flexDirection: {
            xs: 'column',
            md: 'row',
          },

          justifyContent:
            'space-between',

          alignItems: {
            xs: 'stretch',
            md: 'flex-start',
          },

          gap: 2,
        }}
      >
        <Box>
          <Typography
            component="h1"
            variant="h5"
            sx={{
              fontWeight: 900,
            }}
          >
           {isEditMode
            ? `Corregir registro completo #${registroId}`
            : 'Registrar caso Call Center'}
          </Typography>

          <Typography
            component="p"
            variant="body2"
            color="text.secondary"
          >
           {isEditMode
            ? 'Corrige los datos existentes del ciudadano, la llamada inicial, las confirmaciones y la programación vigente.'
            : 'Registra el ciudadano, la llamada y la programación de la visita en una sola operación.'}
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
            onClick={goBack}
            disabled={saving}
          >
            {isEditMode
              ? 'Volver al caso'
              : 'Volver a registros'}
          </Button>

          <Button
            variant="outlined"
            startIcon={
              <RestartAltIcon />
            }
            onClick={
              handleResetForm
            }
            disabled={saving}
          >
            {isEditMode
              ? 'Restaurar datos'
              : 'Limpiar formulario'}
          </Button>
        </Box>
      </Box>

      <Alert severity="info">
        {isEditMode
          ? 'La operación actualizará el caso, la última llamada activa y la visita programada dentro de una sola transacción.'
          : 'El funcionario responsable se obtiene de la sesión autenticada. No es necesario seleccionar ni asignar un funcionario Call Center.'}
      </Alert>

      {isEditMode ? (
        <Alert severity="warning">
          Esta pantalla corrige información existente del caso.
          No debe utilizarse para registrar un nuevo intento de
          llamada ni un nuevo resultado del trabajo de campo.
        </Alert>
      ) : null}

      <Box
        sx={{
          overflowX: 'auto',
          pb: 1,
        }}
      >
        <Stepper
          activeStep={activeStep}
          alternativeLabel
          sx={{
            minWidth: 720,
          }}
        >
          {STEPS.map(
            (label) => (
              <Step key={label}>
                <StepLabel>
                  {label}
                </StepLabel>
              </Step>
            ),
          )}
        </Stepper>
      </Box>

      {validationMessage ? (
        <Alert severity="warning">
          {validationMessage}
        </Alert>
      ) : null}

      <Card>
        <CardContent
          sx={{
            p: {
              xs: 2,
              md: 3,
            },

            '&:last-child': {
              pb: {
                xs: 2,
                md: 3,
              },
            },
          }}
        >
          {activeStep === 0 ? (
            <StepCiudadano
              form={form}
              barrios={barrios}
              existingOpenCase={
                existingOpenCase
              }
              searching={
                searchingVentanilla
                || checkingDuplicate
              }
              cedulaInputRef={
                cedulaInputRef
              }
              onChange={updateForm}
              onSearch={
                searchPersonByCedula
              }
              onOpenExistingCase={(
                id,
              ) =>
                router.push(
                  `/dashboard/callcenter/mis-registros/${id}`,
                )
              }
            />
          ) : null}

          {activeStep === 1 ? (
            <StepLlamada
              form={form}
              resultados={
                availableResults
              }
              motivosNoContacto={
                motivosNoContacto
              }
              motivosNoDisposicion={
                motivosNoDisposicion
              }
              isConnected={
                isConnected
              }
              isNotConnected={
                isNotConnected
              }
              requiresNoDisposition={
                requiresNoDisposition
              }
              requiresCallReprogramming={
                requiresCallReprogramming
              }
              onChange={
                updateForm
              }
            />
          ) : null}

          {activeStep === 2 ? (
            <StepProgramacion
              form={form}
              encuestadores={
                encuestadores
              }
              isNotConnected={
                isNotConnected
              }
              onChange={
                updateForm
              }
            />
          ) : null}

          {activeStep === 3 ? (
            <StepConfirmaciones
              form={form}
              motivosNoDisposicion={
                motivosNoDisposicion
              }
              isConnected={
                isConnected
              }
              onChange={
                updateForm
              }
            />
          ) : null}

          {activeStep === 4 ? (
            <StepResumen
              form={form}
              isEditMode={
                isEditMode
              }
              resultLabel={
                selectedResult?.nombre
                ?? formatLabel(
                  form.resultadoLlamada,
                )
              }
              barrioLabel={
                selectedBarrioLabel
              }
              encuestadorLabel={
                selectedEncuestadorLabel
              }
              motivoNoContactoLabel={
                selectedNoContactLabel
              }
              motivoNoDisposicionLabel={
                selectedNoDispositionLabel
              }
            />
          ) : null}
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

            justifyContent:
              'space-between',

            gap: 1,
          }}
        >
          <Button
            variant="text"
            startIcon={
              <NavigateBeforeIcon />
            }
            onClick={handleBack}
            disabled={
              activeStep === 0
              || saving
            }
          >
            Anterior
          </Button>

          {activeStep
            < STEPS.length - 1 ? (
            <Button
              variant="contained"
              endIcon={
                <NavigateNextIcon />
              }
              onClick={() =>
                void handleNext()
              }
              disabled={
                saving
                || checkingDuplicate
              }
            >
              Continuar
            </Button>
          ) : (
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
                || checkingDuplicate
                || Boolean(
                  existingOpenCase,
                )
              }
            >
              {saving
                ? isEditMode
                  ? 'Actualizando...'
                  : 'Guardando...'
                : isEditMode
                  ? 'Guardar corrección'
                  : 'Confirmar y guardar'}
            </Button>
          )}
        </Box>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={closeSnackbar}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={closeSnackbar}
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

type StepCommonProps = {
  form: FormState;

  onChange:
    (
      field: keyof FormState,
      value: string,
    ) => void;
};

type StepCiudadanoProps =
  StepCommonProps & {
    barrios: SelectOption[];

    existingOpenCase:
      CallCenterResponse | null;

    searching: boolean;

    cedulaInputRef:
      RefObject<HTMLInputElement | null>;

    onSearch:
      () => Promise<void> | void;

    onOpenExistingCase:
      (id: number) => void;
  };

function StepCiudadano({
  form,
  barrios,
  existingOpenCase,
  searching,
  cedulaInputRef,
  onChange,
  onSearch,
  onOpenExistingCase,
}: StepCiudadanoProps) {
  const linkedToVentanilla =
    Boolean(
      form.ventanillaRegistroId,
    );

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2.5,
      }}
    >
      <Box>
        <Typography
          component="h2"
          variant="h6"
          sx={{
            fontWeight: 900,
          }}
        >
          1. Ciudadano y solicitud
        </Typography>

        <Typography
          component="p"
          variant="body2"
          color="text.secondary"
        >
          Digita la cédula y presiona Enter. Si el ciudadano
          existe en Ventanilla, sus datos se completarán
          automáticamente. Si no existe, podrás continuar
          como registro manual.
        </Typography>
      </Box>

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
          inputRef={
            cedulaInputRef
          }
          label="Cédula del solicitante"
          value={
            form.cedulaSolicitante
          }
          onChange={(event) => {
            onChange(
              'cedulaSolicitante',
              event.target.value,
            );
          }}
          onKeyDown={(event) => {
            if (
              event.key === 'Enter'
            ) {
              event.preventDefault();

              if (!searching) {
                void onSearch();
              }
            }
          }}
          required
          fullWidth
          disabled={searching}
          helperText={
            searching
              ? 'Consultando la cédula...'
              : 'Presiona Enter para consultar en Ventanilla.'
          }
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),

              endAdornment:
                searching
                  ? (
                    <InputAdornment position="end">
                      <CircularProgress
                        size={20}
                      />
                    </InputAdornment>
                  )
                  : undefined,
            },
          }}
        />

        <TextField
          label="Tipo de solicitud"
          select
          value={
            form.tipoSolicitudCallcenter
          }
          onChange={(event) => {
            onChange(
              'tipoSolicitudCallcenter',
              event.target.value,
            );
          }}
          required
          fullWidth
        >
          {TIPOS_SOLICITUD.map(
            (option) => (
              <MenuItem
                key={option.value}
                value={option.value}
              >
                {option.label}
              </MenuItem>
            ),
          )}
        </TextField>

        <TextField
          label="Nombre completo"
          value={
            form.nombreCompleto
          }
          onChange={(event) => {
            onChange(
              'nombreCompleto',
              toUppercasePersonName(
                event.target.value,
              ),
            );
          }}
          slotProps={{
            htmlInput: {
              autoComplete: 'name',
            },
          }}
          required
          fullWidth
        />

        <TextField
          label="Teléfono"
          type="tel"
          value={
            form.telefono
          }
          onChange={(event) => {
            onChange(
              'telefono',
              event.target.value,
            );
          }}
          fullWidth
        />

        <TextField
          label="Dirección"
          value={
            form.direccionTexto
          }
          onChange={(event) => {
            onChange(
              'direccionTexto',
              event.target.value,
            );
          }}
          required
          fullWidth
        />

        <TextField
          label="Barrio"
          select
          value={
            form.barrioId
          }
          onChange={(event) => {
            onChange(
              'barrioId',
              event.target.value,
            );
          }}
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
                  String(option.id)
                }
              >
                {option.label}
              </MenuItem>
            ),
          )}
        </TextField>
      </Box>

      {linkedToVentanilla ? (
        <Alert severity="success">
          Ciudadano encontrado en Ventanilla. El registro
          quedará relacionado con el ID{' '}
          <strong>
            {form.ventanillaRegistroId}
          </strong>
          .
        </Alert>
      ) : (
        <Alert severity="info">
          Cuando la cédula no exista en Ventanilla, el origen
          será manual y podrás diligenciar los datos del
          ciudadano.
        </Alert>
      )}

      {existingOpenCase ? (
        <Alert
          severity="warning"
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => {
                onOpenExistingCase(
                  existingOpenCase.id,
                );
              }}
            >
              Abrir caso
            </Button>
          }
        >
          Ya existe otra nueva encuesta activa y pendiente:
          caso #{existingOpenCase.id}.
        </Alert>
      ) : null}

      <TextField
        label="Observación general del caso"
        value={
          form.observacionCaso
        }
        onChange={(event) => {
          onChange(
            'observacionCaso',
            event.target.value,
          );
        }}
        multiline
        minRows={3}
        fullWidth
      />
    </Box>
  );
}

type StepLlamadaProps =
  StepCommonProps & {
    resultados:
      CallCenterResultadoLlamadaResponse[];

    motivosNoContacto:
      SelectOption[];

    motivosNoDisposicion:
      SelectOption[];

    isConnected: boolean;
    isNotConnected: boolean;
    requiresNoDisposition: boolean;
    requiresCallReprogramming: boolean;
  };

function StepLlamada({
  form,
  resultados,
  motivosNoContacto,
  motivosNoDisposicion,
  isConnected,
  isNotConnected,
  requiresNoDisposition,
  requiresCallReprogramming,
  onChange,
}: StepLlamadaProps) {
  return (
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
            fontWeight: 900,
          }}
        >
          2. Gestión telefónica
        </Typography>

        <Typography
          component="p"
          variant="body2"
          color="text.secondary"
        >
          Registra o modifica la gestión telefónica asociada
          al caso.
        </Typography>
      </Box>

      <Alert severity="info">
        Una llamada no conectada no bloquea la programación
        ni la realización de la visita.
      </Alert>

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
          label="Fecha de la llamada"
          type="date"
          value={
            form.fechaLlamada
          }
          onChange={(event) =>
            onChange(
              'fechaLlamada',
              event.target.value,
            )
          }
          required
          fullWidth
          slotProps={{
            inputLabel: {
              shrink: true,
            },
          }}
        />

        <TextField
          label="Hora de la llamada"
          type="time"
          value={
            form.horaLlamada
          }
          onChange={(event) =>
            onChange(
              'horaLlamada',
              event.target.value,
            )
          }
          required
          fullWidth
          slotProps={{
            inputLabel: {
              shrink: true,
            },
          }}
        />

        <TextField
          label="¿Se logró conectar la llamada?"
          select
          value={
            form.llamadaConectada
          }
          onChange={(event) =>
            onChange(
              'llamadaConectada',
              event.target.value,
            )
          }
          required
          fullWidth
        >
          <MenuItem value="">
            Selecciona
          </MenuItem>

          <MenuItem value="SI">
            Sí
          </MenuItem>

          <MenuItem value="NO">
            No
          </MenuItem>
        </TextField>

        <TextField
          label="Resultado de la llamada"
          select
          value={
            form.resultadoLlamada
          }
          onChange={(event) =>
            onChange(
              'resultadoLlamada',
              event.target.value,
            )
          }
          required
          fullWidth
        >
          <MenuItem value="">
            Selecciona un resultado
          </MenuItem>

          {resultados.map(
            (result) => (
              <MenuItem
                key={result.id}
                value={result.codigo}
              >
                {result.nombre}
              </MenuItem>
            ),
          )}
        </TextField>

        {isNotConnected ? (
          <TextField
            label="Motivo de no contacto"
            select
            value={
              form.motivoNoContactoId
            }
            onChange={(event) =>
              onChange(
                'motivoNoContactoId',
                event.target.value,
              )
            }
            required
            fullWidth
          >
            <MenuItem value="">
              Selecciona un motivo
            </MenuItem>

            {motivosNoContacto.map(
              (option) => (
                <MenuItem
                  key={option.id}
                  value={
                    String(option.id)
                  }
                >
                  {option.label}
                </MenuItem>
              ),
            )}
          </TextField>
        ) : null}

        {requiresNoDisposition ? (
          <TextField
            label="Motivo de no disposición"
            select
            value={
              form.motivoNoDisposicionId
            }
            onChange={(event) =>
              onChange(
                'motivoNoDisposicionId',
                event.target.value,
              )
            }
            required
            fullWidth
          >
            <MenuItem value="">
              Selecciona un motivo
            </MenuItem>

            {motivosNoDisposicion.map(
              (option) => (
                <MenuItem
                  key={option.id}
                  value={
                    String(option.id)
                  }
                >
                  {option.label}
                </MenuItem>
              ),
            )}
          </TextField>
        ) : null}

        {requiresCallReprogramming ? (
          <>
            <TextField
              label="Fecha del próximo intento"
              type="date"
              value={
                form.fechaReprogramacionLlamada
              }
              onChange={(event) =>
                onChange(
                  'fechaReprogramacionLlamada',
                  event.target.value,
                )
              }
              required
              fullWidth
              slotProps={{
                inputLabel: {
                  shrink: true,
                },
              }}
            />

            <TextField
              label="Hora del próximo intento"
              type="time"
              value={
                form.horaReprogramacionLlamada
              }
              onChange={(event) =>
                onChange(
                  'horaReprogramacionLlamada',
                  event.target.value,
                )
              }
              required
              fullWidth
              slotProps={{
                inputLabel: {
                  shrink: true,
                },
              }}
            />
          </>
        ) : null}
      </Box>

      {isConnected ? (
        <Alert severity="success">
          La llamada está marcada como conectada. Las
          confirmaciones del ciudadano se diligencian en el
          cuarto paso.
        </Alert>
      ) : null}

      <TextField
        label="Observación de la llamada"
        value={
          form.observacionLlamada
        }
        onChange={(event) =>
          onChange(
            'observacionLlamada',
            event.target.value,
          )
        }
        multiline
        minRows={3}
        fullWidth
      />
    </Box>
  );
}

type StepProgramacionProps =
  StepCommonProps & {
    encuestadores:
      SelectOption[];

    isNotConnected: boolean;
  };

function StepProgramacion({
  form,
  encuestadores,
  isNotConnected,
  onChange,
}: StepProgramacionProps) {
  return (
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
            fontWeight: 900,
          }}
        >
          3. Programación de la visita
        </Typography>

        <Typography
          component="p"
          variant="body2"
          color="text.secondary"
        >
          Selecciona el encuestador y define la fecha y hora
          programadas.
        </Typography>
      </Box>

      {isNotConnected ? (
        <Alert severity="warning">
          No se logró contacto telefónico. La visita continúa
          programada con el encuestador seleccionado.
        </Alert>
      ) : null}

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
          label="Encuestador"
          select
          value={
            form.encuestadorId
          }
          onChange={(event) =>
            onChange(
              'encuestadorId',
              event.target.value,
            )
          }
          required
          fullWidth
        >
          <MenuItem value="">
            Selecciona un encuestador
          </MenuItem>

          {encuestadores.map(
            (option) => (
              <MenuItem
                key={option.id}
                value={
                  String(option.id)
                }
              >
                {option.label}
              </MenuItem>
            ),
          )}
        </TextField>

        <TextField
          label="Fecha programada"
          type="date"
          value={
            form.fechaProgramada
          }
          onChange={(event) =>
            onChange(
              'fechaProgramada',
              event.target.value,
            )
          }
          required
          fullWidth
          slotProps={{
            inputLabel: {
              shrink: true,
            },
          }}
        />

        <TextField
          label="Hora programada"
          type="time"
          value={
            form.horaProgramada
          }
          onChange={(event) =>
            onChange(
              'horaProgramada',
              event.target.value,
            )
          }
          required
          fullWidth
          slotProps={{
            inputLabel: {
              shrink: true,
            },
          }}
        />
      </Box>

      <TextField
        label="Observación de programación"
        value={
          form.observacionVisita
        }
        onChange={(event) =>
          onChange(
            'observacionVisita',
            event.target.value,
          )
        }
        multiline
        minRows={3}
        fullWidth
      />
    </Box>
  );
}

type StepConfirmacionesProps =
  StepCommonProps & {
    motivosNoDisposicion:
      SelectOption[];

    isConnected: boolean;
  };

function StepConfirmaciones({
  form,
  motivosNoDisposicion,
  isConnected,
  onChange,
}: StepConfirmacionesProps) {
  if (!isConnected) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <Typography
          component="h2"
          variant="h6"
          sx={{
            fontWeight: 900,
          }}
        >
          4. Confirmaciones telefónicas
        </Typography>

        <Alert severity="info">
          Como la llamada no fue conectada, las confirmaciones
          del ciudadano no se registran. La visita continuará
          programada con el encuestador seleccionado.
        </Alert>
      </Box>
    );
  }

  return (
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
            fontWeight: 900,
          }}
        >
          4. Confirmaciones telefónicas
        </Typography>

        <Typography
          component="p"
          variant="body2"
          color="text.secondary"
        >
          Registra o modifica la información confirmada con
          el ciudadano.
        </Typography>
      </Box>

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
          label="Solicitud de nueva encuesta"
          value={
            normalizeCode(
              form.tipoSolicitudCallcenter,
            ) === 'NUEVA_ENCUESTA'
              ? 'Sí'
              : 'No'
          }
          disabled
          fullWidth
          helperText="Se determina según el tipo de solicitud seleccionado."
        />

        <TextField
          label="Dirección confirmada"
          value={
            form.direccionTexto
          }
          onChange={(event) =>
            onChange(
              'direccionTexto',
              event.target.value,
            )
          }
          required
          fullWidth
        />

        <TextField
          label="¿Tiene disposición para recibir la encuesta?"
          select
          value={
            form.disposicionRecibirEncuesta
          }
          onChange={(event) =>
            onChange(
              'disposicionRecibirEncuesta',
              event.target.value,
            )
          }
          required
          fullWidth
        >
          <MenuItem value="">
            Selecciona
          </MenuItem>

          <MenuItem value="SI">
            Sí
          </MenuItem>

          <MenuItem value="NO">
            No
          </MenuItem>
        </TextField>

        {form.disposicionRecibirEncuesta
          === 'NO' ? (
          <TextField
            label="Motivo de no disposición"
            select
            value={
              form.motivoNoDisposicionId
            }
            onChange={(event) =>
              onChange(
                'motivoNoDisposicionId',
                event.target.value,
              )
            }
            required
            fullWidth
          >
            <MenuItem value="">
              Selecciona un motivo
            </MenuItem>

            {motivosNoDisposicion.map(
              (option) => (
                <MenuItem
                  key={option.id}
                  value={
                    String(option.id)
                  }
                >
                  {option.label}
                </MenuItem>
              ),
            )}
          </TextField>
        ) : null}

        <TextField
          label="Fecha de aplicación informada"
          type="date"
          value={
            form.fechaAplicacionInformada
          }
          onChange={(event) =>
            onChange(
              'fechaAplicacionInformada',
              event.target.value,
            )
          }
          required
          fullWidth
          slotProps={{
            inputLabel: {
              shrink: true,
            },
          }}
          helperText="Se carga inicialmente con la fecha programada de la visita."
        />

        <TextField
          label="¿Explicó el concepto de informante calificado y los soportes requeridos?"
          select
          value={
            form.explicoInformanteCalificado
          }
          onChange={(event) =>
            onChange(
              'explicoInformanteCalificado',
              event.target.value,
            )
          }
          required
          fullWidth
        >
          <MenuItem value="">
            Selecciona
          </MenuItem>

          <MenuItem value="SI">
            Sí
          </MenuItem>

          <MenuItem value="NO">
            No
          </MenuItem>
        </TextField>
      </Box>
    </Box>
  );
}

type StepResumenProps = {
  form: FormState;
  isEditMode: boolean;
  resultLabel: string;
  barrioLabel: string;
  encuestadorLabel: string;
  motivoNoContactoLabel: string;
  motivoNoDisposicionLabel: string;
};

function StepResumen({
  form,
  isEditMode,
  resultLabel,
  barrioLabel,
  encuestadorLabel,
  motivoNoContactoLabel,
  motivoNoDisposicionLabel,
}: StepResumenProps) {
  const connected =
    form.llamadaConectada === 'SI';

  return (
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
          sx={{
            fontWeight: 900,
          }}
        >
          {isEditMode
            ? '5. Revisión y actualización'
            : '5. Revisión y confirmación'}
        </Typography>

        <Typography
          component="p"
          variant="body2"
          color="text.secondary"
        >
          {isEditMode
            ? 'Revisa la información antes de actualizar el registro completo.'
            : 'Revisa la información antes de guardar el caso completo.'}
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'grid',

          gridTemplateColumns: {
            xs: '1fr',
            lg: 'repeat(2, minmax(0, 1fr))',
          },

          gap: 2,
        }}
      >
        <SummarySection
          title="Ciudadano"
          items={[
            {
              label: 'Cédula',
              value:
                form.cedulaSolicitante,
            },
            {
              label: 'Nombre',
              value:
                form.nombreCompleto,
            },
            {
              label: 'Teléfono',
              value:
                form.telefono
                || 'Sin teléfono',
            },
            {
              label: 'Dirección',
              value:
                form.direccionTexto,
            },
            {
              label: 'Barrio',
              value:
                barrioLabel,
            },
            {
              label: 'Origen',
              value:
                formatLabel(
                  form.origenRegistro,
                ),
            },
            {
              label: 'Tipo de solicitud',
              value:
                formatLabel(
                  form.tipoSolicitudCallcenter,
                ),
            },
            {
              label: 'Observación del caso',
              value:
                form.observacionCaso
                || 'Sin observación',
            },
          ]}
        />

        <SummarySection
          title="Llamada"
          items={[
            {
              label: 'Fecha y hora',
              value:
                `${form.fechaLlamada} ${form.horaLlamada}`,
            },
            {
              label: 'Conectada',
              value:
                connected
                  ? 'Sí'
                  : 'No',
            },
            {
              label: 'Resultado',
              value:
                resultLabel,
            },
            {
              label: 'Motivo no contacto',
              value:
                form.motivoNoContactoId
                  ? motivoNoContactoLabel
                  : 'No aplica',
            },
            {
              label: 'Motivo no disposición',
              value:
                form.motivoNoDisposicionId
                  ? motivoNoDisposicionLabel
                  : 'No aplica',
            },
            {
              label: 'Próximo intento',
              value:
                form.fechaReprogramacionLlamada
                  ? `${form.fechaReprogramacionLlamada} ${form.horaReprogramacionLlamada}`
                  : 'No aplica',
            },
            {
              label: 'Observación',
              value:
                form.observacionLlamada
                || 'Sin observación',
            },
          ]}
        />

        <SummarySection
          title="Programación"
          items={[
            {
              label: 'Encuestador',
              value:
                encuestadorLabel,
            },
            {
              label: 'Fecha',
              value:
                form.fechaProgramada,
            },
            {
              label: 'Hora',
              value:
                form.horaProgramada,
            },
            {
              label: 'Observación',
              value:
                form.observacionVisita
                || 'Sin observación',
            },
          ]}
        />

        <SummarySection
          title="Confirmaciones"
          items={[
            {
              label: 'Solicitó nueva encuesta',
              value:
                normalizeCode(
                  form.tipoSolicitudCallcenter,
                ) === 'NUEVA_ENCUESTA'
                  ? 'Sí'
                  : 'No',
            },
            {
              label: 'Disposición',
              value:
                connected
                  ? formatYesNo(
                    form.disposicionRecibirEncuesta,
                  )
                  : 'No confirmado',
            },
            {
              label: 'Fecha informada',
              value:
                connected
                  ? form.fechaAplicacionInformada
                    || 'Sin fecha'
                  : 'No confirmada',
            },
            {
              label: 'Informante calificado',
              value:
                connected
                  ? formatYesNo(
                    form.explicoInformanteCalificado,
                  )
                  : 'No confirmado',
            },
          ]}
        />
      </Box>

      <Alert
        severity={
          isEditMode
            ? 'info'
            : 'warning'
        }
      >
        {isEditMode
          ? 'Al confirmar se actualizarán el caso, la llamada existente y la visita existente dentro de una sola transacción.'
          : 'Al confirmar se enviará una única solicitud para crear el caso, registrar la llamada y programar la visita.'}
      </Alert>
    </Box>
  );
}

type SummarySectionProps = {
  title: string;

  items: Array<{
    label: string;
    value: string;
  }>;
};

function SummarySection({
  title,
  items,
}: SummarySectionProps) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        height: '100%',
      }}
    >
      <Typography
        component="h3"
        variant="subtitle1"
        sx={{
          fontWeight: 900,
          mb: 1.5,
        }}
      >
        {title}
      </Typography>

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 1.2,
        }}
      >
        {items.map(
          (item) => (
            <Box
              key={item.label}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 0.2,
              }}
            >
              <Typography
                component="p"
                variant="caption"
                color="text.secondary"
              >
                {item.label}
              </Typography>

              <Typography
                component="p"
                variant="body2"
                sx={{
                  fontWeight: 700,
                  overflowWrap: 'anywhere',
                }}
              >
                {item.value}
              </Typography>
            </Box>
          ),
        )}
      </Box>
    </Paper>
  );
}

function getOptionLabel(
  options: SelectOption[],
  value: string,
  fallback: string,
) {
  const option =
    options.find(
      (item) =>
        String(item.id) === value,
    );

  return option?.label
    ?? fallback;
}

function formatYesNo(
  value: YesNoValue,
) {
  if (value === 'SI') {
    return 'Sí';
  }

  if (value === 'NO') {
    return 'No';
  }

  return 'Sin confirmar';
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