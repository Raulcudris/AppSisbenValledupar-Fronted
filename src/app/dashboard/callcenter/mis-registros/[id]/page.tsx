'use client';

import AddIcCallIcon from '@mui/icons-material/AddIcCall';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import EditCalendarIcon from '@mui/icons-material/EditCalendar';
import EditIcon from '@mui/icons-material/Edit';

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Switch,
  TextField,
  Typography,
} from '@mui/material';

import {
  useParams,
  useRouter,
} from 'next/navigation';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  canAssignVisit,
  canRegisterCall,
  getCallDisabledReason,
  getVisitAssignmentDisabledReason,
  isFinalCallCenterState,
} from '@/lib/callcenterState';

import {
  getCallCenterEncuestadoresOptions,
  getCallCenterRegistro,
  getMotivosNoContactoOptions,
  getMotivosNoDisposicionOptions,
} from '@/services/callcenter.service';

import {
  actualizarCallCenterProgramacionVisita,
  asignarCallCenterVisita,
  getCallCenterLlamadas,
  getCallCenterResultadosLlamada,
  getCallCenterVisitas,
  registrarCallCenterLlamada,
} from '@/services/callcenter-workflow.service';

import type {
  CallCenterResponse,
} from '@/types/callcenter.types';

import type {
  SelectOption,
} from '@/types/catalog.types';

import type {
  CallCenterGestionLlamadaRequest,
  CallCenterGestionLlamadaResponse,
  CallCenterResultadoLlamadaResponse,
  CallCenterVisitaAsignacionRequest,
  CallCenterVisitaProgramacionRequest,
  CallCenterVisitaResponse,
} from '@/types/callcenter-workflow.types';

type ChipColor =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'error'
  | 'info'
  | 'success'
  | 'warning';

type AlertSeverity =
  | 'success'
  | 'info'
  | 'warning'
  | 'error';

type NextAction = {
  severity: AlertSeverity;
  title: string;
  description: string;
};

const initialLlamadaForm:
  CallCenterGestionLlamadaRequest = {
    llamadaConectada: false,
    resultadoLlamada: '',
    motivoNoContactoId: null,
    motivoNoDisposicionId: null,
    fechaReprogramacionLlamada: null,
    horaReprogramacionLlamada: null,
    observacion: '',
  };

const initialVisitaForm:
  CallCenterVisitaAsignacionRequest = {
    encuestadorId: 0,
    fechaProgramada: null,
    horaProgramada: null,
    observacion: '',
  };

const initialProgramacionForm:
  CallCenterVisitaProgramacionRequest = {
    encuestadorId: 0,
    fechaProgramada: '',
    horaProgramada: null,
  };

export default function PageCallCenterGestionCaso() {
  const router =
    useRouter();

  const params =
    useParams();

  const caseId =
    useMemo(() => {
      const value =
        params?.id;

      return Array.isArray(value)
        ? value[0]
        : value;
    }, [
      params,
    ]);

  const [
    caso,
    setCaso,
  ] = useState<CallCenterResponse | null>(
    null,
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    savingLlamada,
    setSavingLlamada,
  ] = useState(false);

  const [
    savingVisita,
    setSavingVisita,
  ] = useState(false);

  const [
    savingProgramacion,
    setSavingProgramacion,
  ] = useState(false);

  const [
    resultados,
    setResultados,
  ] = useState<
    CallCenterResultadoLlamadaResponse[]
  >([]);

  const [
    llamadas,
    setLlamadas,
  ] = useState<
    CallCenterGestionLlamadaResponse[]
  >([]);

  const [
    visitas,
    setVisitas,
  ] = useState<
    CallCenterVisitaResponse[]
  >([]);

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
    openLlamada,
    setOpenLlamada,
  ] = useState(false);

  const [
    openVisita,
    setOpenVisita,
  ] = useState(false);

  const [
    openProgramacion,
    setOpenProgramacion,
  ] = useState(false);

  const [
    selectedVisitaProgramacion,
    setSelectedVisitaProgramacion,
  ] = useState<
    CallCenterVisitaResponse | null
  >(null);

  const [
    llamadaForm,
    setLlamadaForm,
  ] = useState<
    CallCenterGestionLlamadaRequest
  >(initialLlamadaForm);

  const [
    visitaForm,
    setVisitaForm,
  ] = useState<
    CallCenterVisitaAsignacionRequest
  >(initialVisitaForm);

  const [
    programacionForm,
    setProgramacionForm,
  ] = useState<
    CallCenterVisitaProgramacionRequest
  >(initialProgramacionForm);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  const [
    success,
    setSuccess,
  ] = useState<string | null>(
    null,
  );

  const estadoCaso =
    caso
      ? getStringField(
        caso,
        'estadoCaso',
      )
        || 'PENDIENTE_ENRUTAMIENTO'
      : 'PENDIENTE_ENRUTAMIENTO';

  const tipoSolicitud =
    caso
      ? getStringField(
        caso,
        'tipoSolicitudCallcenter',
      )
        || getStringField(
          caso,
          'solicitudNombre',
        )
      : null;

  const finalState =
    isFinalCallCenterState(
      estadoCaso,
    );

  const callAllowed =
    canRegisterCall(
      estadoCaso,
    );

  const visitAssignmentAllowed =
    canAssignVisit(
      estadoCaso,
    );

  const visitasPorRecencia =
    useMemo(
      () =>
        [...visitas].sort(
          (left, right) =>
            right.id - left.id,
        ),
      [
        visitas,
      ],
    );

  const visitaVigente =
    useMemo(
      () =>
        visitasPorRecencia.find(
          (item) =>
            item.activo !== false,
        ) ?? null,
      [
        visitasPorRecencia,
      ],
    );

  const visitasHistoricas =
    useMemo(() => {
      if (!visitaVigente) {
        return visitasPorRecencia;
      }

      return visitasPorRecencia.filter(
        (item) =>
          item.id !== visitaVigente.id,
      );
    }, [
      visitaVigente,
      visitasPorRecencia,
    ]);

  const nextAction =
    useMemo<NextAction>(() => {
      if (finalState) {
        return {
          severity:
            estadoCaso === 'CERRADO'
              ? 'success'
              : 'warning',

          title:
            'Caso finalizado',

          description:
            'La información permanece disponible únicamente para consulta y trazabilidad.',
        };
      }

      if (callAllowed) {
        return {
          severity:
            'info',

          title:
            'Registrar gestión telefónica',

          description:
            'El caso está en etapa de llamada. Registra el resultado del contacto para continuar.',
        };
      }

      if (visitAssignmentAllowed) {
        return {
          severity:
            'success',

          title:
            'Asignar visita',

          description:
            'La gestión telefónica terminó. Selecciona el encuestador y programa la visita.',
        };
      }

      if (
        visitaVigente
        && isVisitProgrammingEditable(
          visitaVigente,
        )
      ) {
        return {
          severity:
            'info',

          title:
            'Esperar la visita o ajustar la programación',

          description:
            'La visita está asignada. La programación puede modificarse mientras no exista un resultado de campo.',
        };
      }

      return {
        severity:
          'info',

        title:
          'Seguimiento del trabajo de campo',

        description:
          'El caso se encuentra en gestión del encuestador. Consulta la visita vigente y el resultado registrado.',
      };
    }, [
      callAllowed,
      estadoCaso,
      finalState,
      visitaVigente,
      visitAssignmentAllowed,
    ]);

  const selectedResultRequiresNoContact =
    requiresNoContactReason(
      llamadaForm.resultadoLlamada,
    )
    || llamadaForm.llamadaConectada === false;

  const selectedResultRequiresNoDisposition =
    requiresNoDispositionReason(
      llamadaForm.resultadoLlamada,
    );

  async function loadData() {
    if (!caseId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [
        casoData,
        resultadosData,
        llamadasData,
        visitasData,
        encuestadoresData,
        motivosNoContactoData,
        motivosNoDisposicionData,
      ] = await Promise.all([
        getCallCenterRegistro(
          caseId,
        ),

        getCallCenterResultadosLlamada(),

        getCallCenterLlamadas(
          caseId,
        ),

        getCallCenterVisitas(
          caseId,
        ),

        getCallCenterEncuestadoresOptions(),

        getMotivosNoContactoOptions(),

        getMotivosNoDisposicionOptions(),
      ]);

      setCaso(
        casoData,
      );

      setResultados(
        resultadosData,
      );

      setLlamadas(
        llamadasData,
      );

      setVisitas(
        visitasData,
      );

      setEncuestadores(
        encuestadoresData,
      );

      setMotivosNoContacto(
        motivosNoContactoData,
      );

      setMotivosNoDisposicion(
        motivosNoDisposicionData,
      );
    } catch (exception) {
      setError(
        getErrorMessage(
          exception,
          'No fue posible cargar la gestión del caso Call Center.',
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    caseId,
  ]);

  function openRegistrarLlamada() {
    if (!callAllowed) {
      setError(
        getCallDisabledReason(
          estadoCaso,
        ),
      );

      return;
    }

    const now =
      new Date();

    setLlamadaForm({
      ...initialLlamadaForm,

      fechaLlamada:
        getLocalDateISO(now),

      horaLlamada:
        getLocalTime(now),
    });

    setOpenLlamada(
      true,
    );
  }

  function openAsignarVisita() {
    if (
      !visitAssignmentAllowed
    ) {
      setError(
        getVisitAssignmentDisabledReason(
          estadoCaso,
        ),
      );

      return;
    }

    setVisitaForm(
      initialVisitaForm,
    );

    setOpenVisita(
      true,
    );
  }

  function openModificarProgramacion(
    visita:
      CallCenterVisitaResponse,
  ) {
    if (
      finalState
      || visitaVigente?.id !== visita.id
      || !isVisitProgrammingEditable(
        visita,
      )
    ) {
      setError(
        'La programación de esta visita ya no puede modificarse.',
      );

      return;
    }

    const estadoVisita =
      normalizeCode(
        visita.estadoVisita,
      );

    const fechaVigente =
      estadoVisita === 'REPROGRAMADA'
        ? visita.fechaReprogramacion
          ?? visita.fechaProgramada
          ?? ''
        : visita.fechaProgramada
          ?? visita.fechaReprogramacion
          ?? '';

    setSelectedVisitaProgramacion(
      visita,
    );

    setProgramacionForm({
      encuestadorId:
        visita.encuestadorId,

      fechaProgramada:
        fechaVigente,

      horaProgramada:
        visita.horaProgramada
        ?? null,
    });

    setOpenProgramacion(
      true,
    );
  }

  function closeModificarProgramacion() {
    setOpenProgramacion(
      false,
    );

    setSelectedVisitaProgramacion(
      null,
    );

    setProgramacionForm(
      initialProgramacionForm,
    );
  }

  function updateResultadoLlamada(
    value:
      string,
  ) {
    const resultNeedsNoContact =
      requiresNoContactReason(
        value,
      );

    const resultNeedsNoDisposition =
      requiresNoDispositionReason(
        value,
      );

    setLlamadaForm(
      (current) => ({
        ...current,

        resultadoLlamada:
          value,

        motivoNoContactoId:
          resultNeedsNoContact
          || current.llamadaConectada === false
            ? current.motivoNoContactoId
            : null,

        motivoNoDisposicionId:
          resultNeedsNoDisposition
            ? current.motivoNoDisposicionId
            : null,
      }),
    );
  }

  async function handleRegistrarLlamada() {
    if (!caseId) {
      return;
    }

    if (!callAllowed) {
      setError(
        getCallDisabledReason(
          estadoCaso,
        ),
      );

      return;
    }

    if (
      !llamadaForm.resultadoLlamada
    ) {
      setError(
        'Debe seleccionar el resultado de la llamada.',
      );

      return;
    }

    if (
      selectedResultRequiresNoContact
      && !llamadaForm.motivoNoContactoId
    ) {
      setError(
        'Debe seleccionar el motivo de no contacto.',
      );

      return;
    }

    if (
      selectedResultRequiresNoDisposition
      && !llamadaForm.motivoNoDisposicionId
    ) {
      setError(
        'Debe seleccionar el motivo de no disposición.',
      );

      return;
    }

    try {
      setSavingLlamada(
        true,
      );

      setError(
        null,
      );

      await registrarCallCenterLlamada(
        caseId,
        llamadaForm,
      );

      setSuccess(
        'Gestión de llamada registrada correctamente.',
      );

      setOpenLlamada(
        false,
      );

      setLlamadaForm(
        initialLlamadaForm,
      );

      await loadData();
    } catch (exception) {
      setError(
        getErrorMessage(
          exception,
          'No fue posible registrar la llamada.',
        ),
      );
    } finally {
      setSavingLlamada(
        false,
      );
    }
  }

  async function handleAsignarVisita() {
    if (!caseId) {
      return;
    }

    if (
      !visitAssignmentAllowed
    ) {
      setError(
        getVisitAssignmentDisabledReason(
          estadoCaso,
        ),
      );

      return;
    }

    if (
      !visitaForm.encuestadorId
    ) {
      setError(
        'Debe seleccionar el encuestador.',
      );

      return;
    }

    try {
      setSavingVisita(
        true,
      );

      setError(
        null,
      );

      await asignarCallCenterVisita(
        caseId,
        visitaForm,
      );

      setSuccess(
        'Visita asignada correctamente.',
      );

      setOpenVisita(
        false,
      );

      setVisitaForm(
        initialVisitaForm,
      );

      await loadData();
    } catch (exception) {
      setError(
        getErrorMessage(
          exception,
          'No fue posible asignar la visita.',
        ),
      );
    } finally {
      setSavingVisita(
        false,
      );
    }
  }

  async function handleActualizarProgramacion() {
    if (
      !selectedVisitaProgramacion
    ) {
      return;
    }

    if (
      finalState
      || visitaVigente?.id
        !== selectedVisitaProgramacion.id
      || !isVisitProgrammingEditable(
        selectedVisitaProgramacion,
      )
    ) {
      setError(
        'La programación de esta visita ya no puede modificarse.',
      );

      return;
    }

    if (
      !programacionForm.encuestadorId
    ) {
      setError(
        'Debe seleccionar el encuestador.',
      );

      return;
    }

    if (
      !programacionForm.fechaProgramada
    ) {
      setError(
        'Debe seleccionar la fecha programada.',
      );

      return;
    }

    try {
      setSavingProgramacion(
        true,
      );

      setError(
        null,
      );

      await actualizarCallCenterProgramacionVisita(
        selectedVisitaProgramacion.id,
        programacionForm,
      );

      closeModificarProgramacion();

      setSuccess(
        'Programación de la visita actualizada correctamente.',
      );

      await loadData();
    } catch (exception) {
      setError(
        getErrorMessage(
          exception,
          'No fue posible actualizar la programación de la visita.',
        ),
      );
    } finally {
      setSavingProgramacion(
        false,
      );
    }
  }

  if (loading) {
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

        <Typography
          component="p"
          sx={{
            mt: 2,
          }}
        >
          Cargando gestión del caso...
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <Box
        sx={{
          display: 'flex',

          flexDirection: {
            xs: 'column',
            md: 'row',
          },

          gap: 1.5,

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
            Gestión caso Call Center #{caseId ?? ''}
          </Typography>

          <Typography
            component="p"
            variant="body2"
            color="text.secondary"
          >
            Consulta el ciudadano, registra la gestión
            telefónica, administra la visita vigente y revisa
            la trazabilidad del caso.
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
            onClick={() => {
              router.push(
                '/dashboard/callcenter/mis-registros',
              );
            }}
          >
            Volver
          </Button>

          {!finalState ? (
            <Button
              variant="outlined"
              startIcon={
                <EditIcon />
              }
              onClick={() => {
                if (!caseId) {
                  return;
                }

                router.push(
                  `/dashboard/callcenter/registros/nuevo?id=${caseId}`,
                );
              }}
            >
              Corregir registro
            </Button>
          ) : null}
        </Box>
      </Box>

      <Alert
        severity={
          nextAction.severity
        }
      >
        <Typography
          component="p"
          variant="body2"
          sx={{
            fontWeight: 800,
          }}
        >
          Próxima acción: {nextAction.title}
        </Typography>

        <Typography
          component="p"
          variant="body2"
        >
          {nextAction.description}
        </Typography>
      </Alert>

      <Card>
        <CardContent>
          <Box
            sx={{
              display: 'flex',

              flexDirection: {
                xs: 'column',
                md: 'row',
              },

              justifyContent:
                'space-between',

              gap: 2,
              mb: 2,
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
                Resumen del caso
              </Typography>

              <Typography
                component="p"
                variant="body2"
                color="text.secondary"
              >
                Información principal del ciudadano y del
                estado operativo.
              </Typography>
            </Box>

            <Box
              sx={{
                display: 'flex',
                gap: 1,
                flexWrap: 'wrap',
              }}
            >
              <Chip
                size="small"
                label={
                  formatLabel(
                    estadoCaso,
                  )
                }
                color={
                  getStatusColor(
                    estadoCaso,
                  )
                }
              />

              {tipoSolicitud ? (
                <Chip
                  size="small"
                  label={
                    formatLabel(
                      tipoSolicitud,
                    )
                  }
                  variant="outlined"
                />
              ) : null}
            </Box>
          </Box>

          <Divider
            sx={{
              mb: 2,
            }}
          />

          {!caso ? (
            <Alert severity="warning">
              No fue posible encontrar la información
              principal del caso.
            </Alert>
          ) : (
            <Box
              sx={{
                display: 'grid',

                gridTemplateColumns: {
                  xs: '1fr',
                  sm: '1fr 1fr',
                  lg: '1fr 1fr 1fr 1fr',
                },

                gap: 2,
              }}
            >
              <InfoItem
                label="Ciudadano"
                value={
                  caso.nombreCompleto
                  || 'Sin nombre'
                }
              />

              <InfoItem
                label="Cédula"
                value={
                  caso.cedulaSolicitante
                  || 'Sin dato'
                }
              />

              <InfoItem
                label="Teléfono"
                value={
                  caso.telefono
                  || 'Sin dato'
                }
              />

              <InfoItem
                label="Fecha del caso"
                value={
                  caso.fechaLlamada
                  || 'Sin fecha'
                }
              />

              <InfoItem
                label="Dirección"
                value={
                  caso.direccionTexto
                  || 'Sin dirección'
                }
              />

              <InfoItem
                label="Barrio"
                value={
                  caso.barrioNombre
                  || 'Sin barrio'
                }
              />

              <InfoItem
                label="Comuna"
                value={
                  caso.comunaNombre
                  || 'Sin comuna'
                }
              />

              <InfoItem
                label="Encuestador vigente"
                value={
                  visitaVigente?.encuestadorNombre
                  || caso.encuestadorAsignadoNombre
                  || caso.encuestadorProgramadoNombre
                  || 'Sin asignar'
                }
              />

              <InfoItem
                label="Fecha programada"
                value={
                  visitaVigente?.fechaProgramada
                  || caso.fechaEncuestaProgramada
                  || 'Sin fecha programada'
                }
              />

              <InfoItem
                label="Hora programada"
                value={
                  visitaVigente?.horaProgramada
                  || 'Sin hora programada'
                }
              />

              {finalState ? (
                <>
                  <InfoItem
                    label="Fecha cierre"
                    value={
                      caso.fechaCierre
                      || 'Sin fecha de cierre'
                    }
                  />

                  <InfoItem
                    label="Motivo cierre"
                    value={
                      caso.motivoCierre
                      || 'Sin motivo registrado'
                    }
                  />

                  <InfoItem
                    label="Usuario cierre"
                    value={
                      caso.usuarioCierreUsername
                      || 'Sin usuario registrado'
                    }
                  />
                </>
              ) : null}
            </Box>
          )}
        </CardContent>
      </Card>

      <Box
        sx={{
          display: 'grid',

          gridTemplateColumns: {
            xs: '1fr',
            lg: '7fr 5fr',
          },

          gap: 2,
        }}
      >
        <Card>
          <CardContent>
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
                mb: 2,
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
                  Gestión telefónica
                </Typography>

                <Typography
                  component="p"
                  variant="body2"
                  color="text.secondary"
                >
                  Historial de intentos y resultados de
                  contacto.
                </Typography>
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  flexWrap: 'wrap',
                  gap: 1,
                }}
              >
                <Chip
                  size="small"
                  label={`${llamadas.length} llamada(s)`}
                />

                {callAllowed ? (
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={
                      <AddIcCallIcon />
                    }
                    onClick={
                      openRegistrarLlamada
                    }
                  >
                    Registrar llamada
                  </Button>
                ) : null}
              </Box>
            </Box>

            <Divider
              sx={{
                mb: 2,
              }}
            />

            {llamadas.length === 0 ? (
              <Alert severity="info">
                Este caso aún no tiene llamadas registradas.
              </Alert>
            ) : (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1.5,
                }}
              >
                {llamadas.map(
                  (item) => (
                    <Card
                      key={
                        item.id
                      }
                      variant="outlined"
                    >
                      <CardContent>
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent:
                              'space-between',
                            gap: 1,
                          }}
                        >
                          <Box>
                            <Typography
                              component="p"
                              sx={{
                                fontWeight: 800,
                              }}
                            >
                              Intento #{item.intentoNumero} —{' '}
                              {formatLabel(
                                item.resultadoLlamada,
                              )}
                            </Typography>

                            <Typography
                              component="p"
                              variant="body2"
                              color="text.secondary"
                            >
                              {item.fechaLlamada}{' '}
                              {item.horaLlamada ?? ''}
                            </Typography>

                            <Typography
                              component="p"
                              variant="body2"
                              color="text.secondary"
                            >
                              Funcionario:{' '}
                              {item.funcionarioCallcenterNombre
                                ?? item.funcionarioCallcenterUsername
                                ?? 'No disponible'}
                            </Typography>
                          </Box>

                          <Chip
                            size="small"
                            label={
                              item.llamadaConectada
                                ? 'Conectada'
                                : 'No conectada'
                            }
                            color={
                              item.llamadaConectada
                                ? 'success'
                                : 'warning'
                            }
                          />
                        </Box>

                        {item.motivoNoContactoNombre ? (
                          <Typography
                            component="p"
                            variant="body2"
                            sx={{
                              mt: 1,
                            }}
                          >
                            Motivo no contacto:{' '}
                            {item.motivoNoContactoNombre}
                          </Typography>
                        ) : null}

                        {item.motivoNoDisposicionNombre ? (
                          <Typography
                            component="p"
                            variant="body2"
                            sx={{
                              mt: 1,
                            }}
                          >
                            Motivo no disposición:{' '}
                            {item.motivoNoDisposicionNombre}
                          </Typography>
                        ) : null}

                        {item.fechaReprogramacionLlamada ? (
                          <Typography
                            component="p"
                            variant="body2"
                            sx={{
                              mt: 1,
                            }}
                          >
                            Próximo intento:{' '}
                            {item.fechaReprogramacionLlamada}{' '}
                            {item.horaReprogramacionLlamada ?? ''}
                          </Typography>
                        ) : null}

                        {item.observacion ? (
                          <Typography
                            component="p"
                            variant="body2"
                            sx={{
                              mt: 1,
                            }}
                          >
                            {item.observacion}
                          </Typography>
                        ) : null}
                      </CardContent>
                    </Card>
                  ),
                )}
              </Box>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
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
                mb: 2,
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
                  Programación y visitas
                </Typography>

                <Typography
                  component="p"
                  variant="body2"
                  color="text.secondary"
                >
                  Visita vigente e historial del trabajo de
                  campo.
                </Typography>
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  flexWrap: 'wrap',
                  gap: 1,
                }}
              >
                <Chip
                  size="small"
                  label={`${visitas.length} visita(s)`}
                />

                {visitAssignmentAllowed ? (
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={
                      <AssignmentIndIcon />
                    }
                    onClick={
                      openAsignarVisita
                    }
                  >
                    Asignar visita
                  </Button>
                ) : null}
              </Box>
            </Box>

            <Divider
              sx={{
                mb: 2,
              }}
            />

            {visitas.length === 0 ? (
              <Alert severity="info">
                Este caso aún no tiene visitas asignadas.
              </Alert>
            ) : (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1.5,
                }}
              >
                {visitaVigente ? (
                  <>
                    <Typography
                      component="h3"
                      variant="subtitle2"
                      sx={{
                        fontWeight: 900,
                      }}
                    >
                      Visita vigente
                    </Typography>

                    <VisitCard
                      visita={
                        visitaVigente
                      }
                      current
                      editable={
                        !finalState
                        && isVisitProgrammingEditable(
                          visitaVigente,
                        )
                      }
                      onEdit={
                        openModificarProgramacion
                      }
                    />
                  </>
                ) : null}

                {visitasHistoricas.length > 0 ? (
                  <>
                    <Divider />

                    <Box>
                      <Typography
                        component="h3"
                        variant="subtitle2"
                        sx={{
                          fontWeight: 900,
                        }}
                      >
                        Historial de visitas
                      </Typography>

                      <Typography
                        component="p"
                        variant="caption"
                        color="text.secondary"
                      >
                        Registros anteriores disponibles solo
                        para consulta.
                      </Typography>
                    </Box>

                    {visitasHistoricas.map(
                      (item) => (
                        <VisitCard
                          key={
                            item.id
                          }
                          visita={
                            item
                          }
                          current={
                            false
                          }
                          editable={
                            false
                          }
                          onEdit={
                            openModificarProgramacion
                          }
                        />
                      ),
                    )}
                  </>
                ) : null}
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>

      <Dialog
        open={
          openLlamada
        }
        onClose={() => {
          if (!savingLlamada) {
            setOpenLlamada(
              false,
            );
          }
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Registrar gestión de llamada
        </DialogTitle>

        <DialogContent>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              mt: 1,
            }}
          >
            <FormControlLabel
              control={
                <Switch
                  checked={
                    llamadaForm.llamadaConectada
                  }
                  onChange={(event) => {
                    const connected =
                      event.target.checked;

                    setLlamadaForm(
                      (current) => ({
                        ...current,

                        llamadaConectada:
                          connected,

                        motivoNoContactoId:
                          connected
                          && !requiresNoContactReason(
                            current.resultadoLlamada,
                          )
                            ? null
                            : current.motivoNoContactoId,
                      }),
                    );
                  }}
                />
              }
              label="Llamada conectada"
            />

            <FormControl
              fullWidth
              required
            >
              <InputLabel>
                Resultado de llamada
              </InputLabel>

              <Select
                label="Resultado de llamada"
                value={
                  llamadaForm.resultadoLlamada
                }
                onChange={(event) => {
                  updateResultadoLlamada(
                    String(
                      event.target.value,
                    ),
                  );
                }}
              >
                {resultados.map(
                  (item) => (
                    <MenuItem
                      key={
                        item.codigo
                      }
                      value={
                        item.codigo
                      }
                    >
                      {item.nombre}
                    </MenuItem>
                  ),
                )}
              </Select>
            </FormControl>

            {selectedResultRequiresNoContact ? (
              <FormControl
                fullWidth
                required
              >
                <InputLabel>
                  Motivo de no contacto
                </InputLabel>

                <Select
                  label="Motivo de no contacto"
                  value={
                    llamadaForm.motivoNoContactoId
                      ? String(
                        llamadaForm.motivoNoContactoId,
                      )
                      : ''
                  }
                  onChange={(event) => {
                    setLlamadaForm(
                      (current) => ({
                        ...current,

                        motivoNoContactoId:
                          Number(
                            event.target.value,
                          ),
                      }),
                    );
                  }}
                >
                  {motivosNoContacto.map(
                    (item) => (
                      <MenuItem
                        key={
                          item.id
                        }
                        value={
                          String(
                            item.id,
                          )
                        }
                      >
                        {item.label}
                      </MenuItem>
                    ),
                  )}
                </Select>
              </FormControl>
            ) : null}

            {selectedResultRequiresNoDisposition ? (
              <FormControl
                fullWidth
                required
              >
                <InputLabel>
                  Motivo de no disposición
                </InputLabel>

                <Select
                  label="Motivo de no disposición"
                  value={
                    llamadaForm.motivoNoDisposicionId
                      ? String(
                        llamadaForm.motivoNoDisposicionId,
                      )
                      : ''
                  }
                  onChange={(event) => {
                    setLlamadaForm(
                      (current) => ({
                        ...current,

                        motivoNoDisposicionId:
                          Number(
                            event.target.value,
                          ),
                      }),
                    );
                  }}
                >
                  {motivosNoDisposicion.map(
                    (item) => (
                      <MenuItem
                        key={
                          item.id
                        }
                        value={
                          String(
                            item.id,
                          )
                        }
                      >
                        {item.label}
                      </MenuItem>
                    ),
                  )}
                </Select>
              </FormControl>
            ) : null}

            <TextField
              label="Fecha llamada"
              type="date"
              value={
                llamadaForm.fechaLlamada
                ?? ''
              }
              onChange={(event) => {
                setLlamadaForm(
                  (current) => ({
                    ...current,

                    fechaLlamada:
                      event.target.value
                      || null,
                  }),
                );
              }}
              slotProps={{
                inputLabel: {
                  shrink: true,
                },
              }}
              fullWidth
            />

            <TextField
              label="Hora llamada"
              type="time"
              value={
                llamadaForm.horaLlamada
                ?? ''
              }
              onChange={(event) => {
                setLlamadaForm(
                  (current) => ({
                    ...current,

                    horaLlamada:
                      event.target.value
                      || null,
                  }),
                );
              }}
              slotProps={{
                inputLabel: {
                  shrink: true,
                },
              }}
              fullWidth
            />

            <TextField
              label="Observación"
              value={
                llamadaForm.observacion
                ?? ''
              }
              onChange={(event) => {
                setLlamadaForm(
                  (current) => ({
                    ...current,

                    observacion:
                      event.target.value,
                  }),
                );
              }}
              minRows={3}
              multiline
              fullWidth
            />
          </Box>
        </DialogContent>

        <DialogActions>
          <Button
            onClick={() => {
              setOpenLlamada(
                false,
              );
            }}
            disabled={
              savingLlamada
            }
          >
            Cancelar
          </Button>

          <Button
            variant="contained"
            disabled={
              savingLlamada
              || !callAllowed
            }
            onClick={() => {
              void handleRegistrarLlamada();
            }}
          >
            {savingLlamada
              ? 'Guardando...'
              : 'Guardar llamada'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={
          openVisita
        }
        onClose={() => {
          if (!savingVisita) {
            setOpenVisita(
              false,
            );
          }
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Asignar visita a encuestador
        </DialogTitle>

        <DialogContent>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              mt: 1,
            }}
          >
            <FormControl
              fullWidth
              required
            >
              <InputLabel>
                Encuestador
              </InputLabel>

              <Select
                label="Encuestador"
                value={
                  visitaForm.encuestadorId
                    ? String(
                      visitaForm.encuestadorId,
                    )
                    : ''
                }
                onChange={(event) => {
                  setVisitaForm(
                    (current) => ({
                      ...current,

                      encuestadorId:
                        Number(
                          event.target.value,
                        ),
                    }),
                  );
                }}
              >
                {encuestadores.map(
                  (item) => (
                    <MenuItem
                      key={
                        item.id
                      }
                      value={
                        String(
                          item.id,
                        )
                      }
                    >
                      {item.label}
                    </MenuItem>
                  ),
                )}
              </Select>
            </FormControl>

            <TextField
              label="Fecha programada"
              type="date"
              value={
                visitaForm.fechaProgramada
                ?? ''
              }
              onChange={(event) => {
                setVisitaForm(
                  (current) => ({
                    ...current,

                    fechaProgramada:
                      event.target.value
                      || null,
                  }),
                );
              }}
              slotProps={{
                inputLabel: {
                  shrink: true,
                },
              }}
              fullWidth
            />

            <TextField
              label="Hora programada"
              type="time"
              value={
                visitaForm.horaProgramada
                ?? ''
              }
              onChange={(event) => {
                setVisitaForm(
                  (current) => ({
                    ...current,

                    horaProgramada:
                      event.target.value
                      || null,
                  }),
                );
              }}
              slotProps={{
                inputLabel: {
                  shrink: true,
                },
              }}
              fullWidth
            />

            <TextField
              label="Observación"
              value={
                visitaForm.observacion
                ?? ''
              }
              onChange={(event) => {
                setVisitaForm(
                  (current) => ({
                    ...current,

                    observacion:
                      event.target.value,
                  }),
                );
              }}
              minRows={3}
              multiline
              fullWidth
            />
          </Box>
        </DialogContent>

        <DialogActions>
          <Button
            onClick={() => {
              setOpenVisita(
                false,
              );
            }}
            disabled={
              savingVisita
            }
          >
            Cancelar
          </Button>

          <Button
            variant="contained"
            disabled={
              savingVisita
              || !visitAssignmentAllowed
            }
            onClick={() => {
              void handleAsignarVisita();
            }}
          >
            {savingVisita
              ? 'Asignando...'
              : 'Asignar visita'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={
          openProgramacion
        }
        onClose={() => {
          if (!savingProgramacion) {
            closeModificarProgramacion();
          }
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Modificar programación de visita
        </DialogTitle>

        <DialogContent>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              mt: 1,
            }}
          >
            {selectedVisitaProgramacion ? (
              <Alert severity="info">
                Se modificará la visita{' '}
                <strong>
                  #{selectedVisitaProgramacion.id}
                </strong>
                . El cambio de encuestador, fecha y hora
                quedará registrado en auditoría.
              </Alert>
            ) : null}

            <FormControl
              fullWidth
              required
            >
              <InputLabel>
                Encuestador
              </InputLabel>

              <Select
                label="Encuestador"
                value={
                  programacionForm.encuestadorId
                    ? String(
                      programacionForm.encuestadorId,
                    )
                    : ''
                }
                onChange={(event) => {
                  setProgramacionForm(
                    (current) => ({
                      ...current,

                      encuestadorId:
                        Number(
                          event.target.value,
                        ),
                    }),
                  );
                }}
              >
                {encuestadores.map(
                  (item) => (
                    <MenuItem
                      key={
                        item.id
                      }
                      value={
                        String(
                          item.id,
                        )
                      }
                    >
                      {item.label}
                    </MenuItem>
                  ),
                )}
              </Select>
            </FormControl>

            <TextField
              label="Fecha programada"
              type="date"
              value={
                programacionForm.fechaProgramada
              }
              onChange={(event) => {
                setProgramacionForm(
                  (current) => ({
                    ...current,

                    fechaProgramada:
                      event.target.value,
                  }),
                );
              }}
              slotProps={{
                inputLabel: {
                  shrink: true,
                },
              }}
              required
              fullWidth
            />

            <TextField
              label="Hora programada"
              type="time"
              value={
                programacionForm.horaProgramada
                ?? ''
              }
              onChange={(event) => {
                setProgramacionForm(
                  (current) => ({
                    ...current,

                    horaProgramada:
                      event.target.value
                      || null,
                  }),
                );
              }}
              slotProps={{
                inputLabel: {
                  shrink: true,
                },
              }}
              fullWidth
            />
          </Box>
        </DialogContent>

        <DialogActions>
          <Button
            onClick={
              closeModificarProgramacion
            }
            disabled={
              savingProgramacion
            }
          >
            Cancelar
          </Button>

          <Button
            variant="contained"
            onClick={() => {
              void handleActualizarProgramacion();
            }}
            disabled={
              savingProgramacion
              || !programacionForm.encuestadorId
              || !programacionForm.fechaProgramada
            }
          >
            {savingProgramacion
              ? 'Guardando...'
              : 'Guardar programación'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={
          Boolean(error)
        }
        autoHideDuration={6000}
        onClose={() => {
          setError(
            null,
          );
        }}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
      >
        <Alert
          severity="error"
          onClose={() => {
            setError(
              null,
            );
          }}
        >
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={
          Boolean(success)
        }
        autoHideDuration={4000}
        onClose={() => {
          setSuccess(
            null,
          );
        }}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
      >
        <Alert
          severity="success"
          onClose={() => {
            setSuccess(
              null,
            );
          }}
        >
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
}

function VisitCard({
  visita,
  current,
  editable,
  onEdit,
}: {
  visita: CallCenterVisitaResponse;
  current: boolean;
  editable: boolean;
  onEdit:
    (
      visita:
        CallCenterVisitaResponse,
    ) => void;
}) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Box
          sx={{
            display: 'flex',
            justifyContent:
              'space-between',
            gap: 1,
          }}
        >
          <Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 0.75,
              }}
            >
              <Typography
                component="p"
                sx={{
                  fontWeight: 800,
                }}
              >
                {visita.encuestadorNombre
                  ?? 'Encuestador no disponible'}
              </Typography>

              <Chip
                size="small"
                color={
                  current
                    ? 'primary'
                    : 'default'
                }
                variant={
                  current
                    ? 'filled'
                    : 'outlined'
                }
                label={
                  current
                    ? 'Visita vigente'
                    : 'Histórica'
                }
              />
            </Box>

            <Typography
              component="p"
              variant="body2"
              color="text.secondary"
            >
              Programada:{' '}
              {visita.fechaProgramada
                ?? 'Sin fecha'}{' '}
              {visita.horaProgramada
                ?? ''}
            </Typography>

            {visita.fechaReprogramacion ? (
              <Typography
                component="p"
                variant="body2"
                color="text.secondary"
              >
                Reprogramación:{' '}
                {visita.fechaReprogramacion}
              </Typography>
            ) : null}
          </Box>

          <Chip
            size="small"
            label={
              formatLabel(
                visita.estadoVisita,
              )
            }
            color={
              getStatusColor(
                visita.estadoVisita,
              )
            }
          />
        </Box>

        {visita.encuestaRealizada !== null
        && visita.encuestaRealizada
          !== undefined ? (
            <Typography
              component="p"
              variant="body2"
              sx={{
                mt: 1,
              }}
            >
              Encuesta realizada:{' '}
              {visita.encuestaRealizada
                ? 'Sí'
                : 'No'}
            </Typography>
          ) : null}

        {visita.motivoNoEncuesta ? (
          <Typography
            component="p"
            variant="body2"
            sx={{
              mt: 1,
            }}
          >
            Motivo:{' '}
            {visita.motivoNoEncuesta}
          </Typography>
        ) : null}

        {visita.observacionEncuestador ? (
          <Typography
            component="p"
            variant="body2"
            sx={{
              mt: 1,
            }}
          >
            {visita.observacionEncuestador}
          </Typography>
        ) : null}

        {current ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-end',
              mt: 1.5,
            }}
          >
            {editable ? (
              <Button
                size="small"
                variant="outlined"
                startIcon={
                  <EditCalendarIcon />
                }
                onClick={() => {
                  onEdit(
                    visita,
                  );
                }}
              >
                Modificar programación
              </Button>
            ) : (
              <Typography
                component="p"
                variant="caption"
                color="text.secondary"
              >
                La programación ya no admite modificaciones.
              </Typography>
            )}
          </Box>
        ) : null}
      </CardContent>
    </Card>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <Box>
      <Typography
        component="p"
        variant="caption"
        color="text.secondary"
      >
        {label}
      </Typography>

      <Typography
        component="p"
        variant="body2"
        sx={{
          fontWeight: 700,
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

function getStringField(
  record:
    CallCenterResponse,
  field:
    string,
) {
  const data =
    record as unknown as Record<
      string,
      unknown
    >;

  const value =
    data[field];

  if (
    typeof value !== 'string'
  ) {
    return null;
  }

  const trimmed =
    value.trim();

  return trimmed.length > 0
    ? trimmed
    : null;
}

function requiresNoContactReason(
  value?:
    | string
    | null,
) {
  const normalized =
    normalizeCode(
      value,
    );

  return (
    normalized.includes(
      'NO_CONTACTADO',
    )
    || normalized.includes(
      'NO_CONTACTO',
    )
    || normalized.includes(
      'NO_CONTESTA',
    )
    || normalized.includes(
      'TELEFONO_APAGADO',
    )
    || normalized.includes(
      'NUMERO_EQUIVOCADO',
    )
  );
}

function requiresNoDispositionReason(
  value?:
    | string
    | null,
) {
  const normalized =
    normalizeCode(
      value,
    );

  return (
    normalized.includes(
      'SIN_DISPOSICION',
    )
    || normalized.includes(
      'NO_DISPOSICION',
    )
    || normalized.includes(
      'NO_ACEPTA',
    )
  );
}

function isVisitProgrammingEditable(
  visita:
    CallCenterVisitaResponse,
) {
  if (
    visita.activo === false
  ) {
    return false;
  }

  const estado =
    normalizeCode(
      visita.estadoVisita,
    );

  return (
    estado === 'PENDIENTE'
    || estado === 'PROGRAMADA'
    || estado === 'REPROGRAMADA'
  );
}

function getErrorMessage(
  exception:
    unknown,
  fallback:
    string,
) {
  if (
    exception
    && typeof exception === 'object'
    && 'message' in exception
    && typeof exception.message === 'string'
  ) {
    return exception.message;
  }

  return fallback;
}

function formatLabel(
  value?:
    | string
    | null,
) {
  return String(
    value ?? 'Sin estado',
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

function normalizeCode(
  value?:
    | string
    | number
    | null,
) {
  return String(
    value ?? '',
  )
    .trim()
    .toUpperCase();
}

function getStatusColor(
  value?:
    | string
    | null,
): ChipColor {
  const normalized =
    normalizeCode(
      value,
    );

  if (
    normalized.includes(
      'CANCELADO',
    )
    || normalized.includes(
      'NO_ACEPTA',
    )
    || normalized.includes(
      'SIN_DISPOSICION',
    )
  ) {
    return 'error';
  }

  if (
    normalized.includes(
      'REPROGRAMADO',
    )
    || normalized.includes(
      'NO_CONTACTADO',
    )
    || normalized.includes(
      'NO_ATENDIDA',
    )
  ) {
    return 'warning';
  }

  if (
    normalized.includes(
      'REALIZADA',
    )
    || normalized.includes(
      'CERRADO',
    )
    || normalized.includes(
      'CONTACTADO_ACEPTA',
    )
  ) {
    return 'success';
  }

  if (
    normalized.includes(
      'PENDIENTE',
    )
    || normalized.includes(
      'PROGRAMADA',
    )
    || normalized.includes(
      'ASIGNADO',
    )
    || normalized.includes(
      'GESTION',
    )
  ) {
    return 'info';
  }

  return 'default';
}

function getLocalDateISO(
  date =
    new Date(),
) {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1,
    ).padStart(
      2,
      '0',
    );

  const day =
    String(
      date.getDate(),
    ).padStart(
      2,
      '0',
    );

  return `${year}-${month}-${day}`;
}

function getLocalTime(
  date =
    new Date(),
) {
  const hours =
    String(
      date.getHours(),
    ).padStart(
      2,
      '0',
    );

  const minutes =
    String(
      date.getMinutes(),
    ).padStart(
      2,
      '0',
    );

  return `${hours}:${minutes}`;
}