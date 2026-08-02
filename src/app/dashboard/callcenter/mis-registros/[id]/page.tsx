'use client';

import AddIcCallIcon from '@mui/icons-material/AddIcCall';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import EditIcon from '@mui/icons-material/Edit';
import EventIcon from '@mui/icons-material/Event';
import HistoryIcon from '@mui/icons-material/History';
import PhoneIcon from '@mui/icons-material/Phone';
import RefreshIcon from '@mui/icons-material/Refresh';
import SaveIcon from '@mui/icons-material/Save';
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
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import {
  getCallCenterEncuestadoresOptions,
  getCallCenterRegistro,
  getMotivosNoContactoOptions,
  getMotivosNoDisposicionOptions,
  updateCallCenterRegistro,
} from '@/services/callcenter.service';
import {
  asignarCallCenterVisita,
  getCallCenterLlamadas,
  getCallCenterResultadosLlamada,
  getCallCenterVisitas,
  registrarCallCenterLlamada,
} from '@/services/callcenter-workflow.service';
import type {
  CallCenterRequest,
  CallCenterResponse,
} from '@/types/callcenter.types';
import type {
  CallCenterGestionLlamadaRequest,
  CallCenterGestionLlamadaResponse,
  CallCenterResultadoLlamadaResponse,
  CallCenterVisitaAsignacionRequest,
  CallCenterVisitaResponse,
} from '@/types/callcenter-workflow.types';
import type { SelectOption } from '@/types/catalog.types';

type ChipColor =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'error'
  | 'info'
  | 'success'
  | 'warning';

type CallCenterEditFormState = {
  cedulaSolicitante: string;
  nombreCompleto: string;
  telefono: string;
  direccionTexto: string;
  tipoSolicitudCallcenter: string;
  observacion: string;
};

type WorkflowActionInfo = {
  label: string;
  detail: string;
  color: ChipColor;
};

const initialLlamadaForm: CallCenterGestionLlamadaRequest = {
  llamadaConectada: false,
  resultadoLlamada: '',
  motivoNoContactoId: null,
  motivoNoDisposicionId: null,
  fechaReprogramacionLlamada: null,
  horaReprogramacionLlamada: null,
  observacion: '',
};

const initialVisitaForm: CallCenterVisitaAsignacionRequest = {
  encuestadorId: 0,
  fechaProgramada: null,
  horaProgramada: null,
  observacion: '',
};

const initialEditForm: CallCenterEditFormState = {
  cedulaSolicitante: '',
  nombreCompleto: '',
  telefono: '',
  direccionTexto: '',
  tipoSolicitudCallcenter: 'NUEVA_ENCUESTA',
  observacion: '',
};

const TIPOS_SOLICITUD = [
  'NUEVA_ENCUESTA',
  'INCLUSION',
  'VERIFICACION',
  'OTRO',
];

export default function PageCallCenterGestionCaso() {
  const router = useRouter();
  const params = useParams();

  const caseId = useMemo(() => {
    const value = params?.id;

    return Array.isArray(value)
      ? value[0]
      : value;
  }, [params]);

  const [caso, setCaso] =
    useState<CallCenterResponse | null>(null);

  const [llamadas, setLlamadas] =
    useState<CallCenterGestionLlamadaResponse[]>([]);

  const [visitas, setVisitas] =
    useState<CallCenterVisitaResponse[]>([]);

  const [resultados, setResultados] =
    useState<CallCenterResultadoLlamadaResponse[]>([]);

  const [motivosNoContacto, setMotivosNoContacto] =
    useState<SelectOption[]>([]);

  const [
    motivosNoDisposicion,
    setMotivosNoDisposicion,
  ] = useState<SelectOption[]>([]);

  const [encuestadores, setEncuestadores] =
    useState<SelectOption[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [
    loadingLlamadaCatalogs,
    setLoadingLlamadaCatalogs,
  ] = useState(false);

  const [
    loadingEncuestadores,
    setLoadingEncuestadores,
  ] = useState(false);

  const [
    llamadaCatalogsLoaded,
    setLlamadaCatalogsLoaded,
  ] = useState(false);

  const [
    encuestadoresLoaded,
    setEncuestadoresLoaded,
  ] = useState(false);

  const [savingEdit, setSavingEdit] =
    useState(false);

  const [savingLlamada, setSavingLlamada] =
    useState(false);

  const [savingVisita, setSavingVisita] =
    useState(false);

  const [openEdit, setOpenEdit] =
    useState(false);

  const [openLlamada, setOpenLlamada] =
    useState(false);

  const [openVisita, setOpenVisita] =
    useState(false);

  const [editForm, setEditForm] =
    useState<CallCenterEditFormState>(
      initialEditForm,
    );

  const [llamadaForm, setLlamadaForm] =
    useState<CallCenterGestionLlamadaRequest>(
      initialLlamadaForm,
    );

  const [visitaForm, setVisitaForm] =
    useState<CallCenterVisitaAsignacionRequest>(
      initialVisitaForm,
    );

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  const estadoCaso =
    caso?.estadoCaso ||
    'ASIGNADO_CALLCENTER';

  const estadoVisita =
    caso?.estadoVisita ||
    'PENDIENTE';

  const tipoSolicitud =
    caso?.tipoSolicitudCallcenter ||
    'NUEVA_ENCUESTA';

  const caseClosedOrCancelled =
    isCaseClosedOrCancelled(
      estadoCaso,
    );

  const llamadasOrdenadas = useMemo(
    () =>
      [...llamadas].sort(
        (left, right) => {
          if (
            left.intentoNumero !==
            right.intentoNumero
          ) {
            return (
              right.intentoNumero -
              left.intentoNumero
            );
          }

          return right.id - left.id;
        },
      ),
    [llamadas],
  );

  const visitasOrdenadas = useMemo(
    () =>
      [...visitas].sort(
        (left, right) =>
          right.id - left.id,
      ),
    [visitas],
  );

  const visitasActivas = useMemo(
    () =>
      visitas.filter((visita) =>
        isActiveVisit(visita),
      ).length,
    [visitas],
  );

  const visitaProgramadaActual = useMemo(
    () =>
      visitasOrdenadas.find((visita) =>
        isActiveVisit(visita),
      ) ?? null,
    [visitasOrdenadas],
  );

  const workflowAction = useMemo(
    () =>
      getWorkflowAction(
        caso,
        llamadas,
        visitas,
      ),
    [caso, llamadas, visitas],
  );

  async function loadData() {
    if (!caseId) {
      setError(
        'No se recibió un identificador válido para el caso.',
      );
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [
        casoData,
        llamadasData,
        visitasData,
      ] = await Promise.all([
        getCallCenterRegistro(caseId),
        getCallCenterLlamadas(caseId),
        getCallCenterVisitas(caseId),
      ]);

      setCaso(casoData);
      setLlamadas(llamadasData);
      setVisitas(visitasData);
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

  async function loadLlamadaCatalogs() {
    if (llamadaCatalogsLoaded) {
      return;
    }

    try {
      setLoadingLlamadaCatalogs(true);

      const [
        resultadosData,
        motivosNoContactoData,
        motivosNoDisposicionData,
      ] = await Promise.all([
        getCallCenterResultadosLlamada(),
        getMotivosNoContactoOptions(),
        getMotivosNoDisposicionOptions(),
      ]);

      setResultados(resultadosData);
      setMotivosNoContacto(
        motivosNoContactoData,
      );
      setMotivosNoDisposicion(
        motivosNoDisposicionData,
      );
      setLlamadaCatalogsLoaded(true);
    } catch (exception) {
      setError(
        getErrorMessage(
          exception,
          'No fue posible cargar los catálogos para registrar la llamada.',
        ),
      );
    } finally {
      setLoadingLlamadaCatalogs(false);
    }
  }

  async function loadEncuestadores() {
    if (encuestadoresLoaded) {
      return;
    }

    try {
      setLoadingEncuestadores(true);

      const data =
        await getCallCenterEncuestadoresOptions();

      setEncuestadores(data);
      setEncuestadoresLoaded(true);
    } catch (exception) {
      setError(
        getErrorMessage(
          exception,
          'No fue posible cargar el catálogo de encuestadores.',
        ),
      );
    } finally {
      setLoadingEncuestadores(false);
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  function openEditarDatos() {
    if (!caso) {
      setError(
        'No fue posible cargar los datos del caso para edición.',
      );
      return;
    }

    if (caseClosedOrCancelled) {
      setError(
        'No se pueden editar datos de un caso cerrado o cancelado.',
      );
      return;
    }

    setEditForm({
      cedulaSolicitante:
        caso.cedulaSolicitante || '',
      nombreCompleto:
        caso.nombreCompleto || '',
      telefono:
        caso.telefono || '',
      direccionTexto:
        caso.direccionTexto || '',
      tipoSolicitudCallcenter:
        caso.tipoSolicitudCallcenter ||
        'NUEVA_ENCUESTA',
      observacion:
        caso.observacion || '',
    });

    setOpenEdit(true);
  }

  async function openRegistrarLlamada() {
    if (caseClosedOrCancelled) {
      setError(
        'No se pueden registrar llamadas en un caso cerrado o cancelado.',
      );
      return;
    }

    const now = new Date();

    setLlamadaForm({
      ...initialLlamadaForm,
      llamadaConectada: false,
      fechaLlamada:
        formatLocalDate(now),
      horaLlamada:
        formatLocalTime(now),
    });

    setOpenLlamada(true);

    await loadLlamadaCatalogs();
  }

  async function openAsignarVisita() {
    if (caseClosedOrCancelled) {
      setError(
        'No se pueden asignar visitas en un caso cerrado o cancelado.',
      );
      return;
    }

    setVisitaForm(initialVisitaForm);
    setOpenVisita(true);

    await loadEncuestadores();
  }

  async function handleActualizarDatos() {
    if (
      !caseId ||
      !caso
    ) {
      return;
    }

    if (caseClosedOrCancelled) {
      setError(
        'No se pueden editar datos de un caso cerrado o cancelado.',
      );
      return;
    }

    if (
      !editForm.nombreCompleto.trim()
    ) {
      setError(
        'Debe registrar el nombre completo del ciudadano.',
      );
      return;
    }

    if (
      !editForm.cedulaSolicitante.trim()
    ) {
      setError(
        'Debe registrar la cédula del ciudadano.',
      );
      return;
    }

    if (
      !editForm.telefono.trim()
    ) {
      setError(
        'Debe registrar el teléfono del ciudadano.',
      );
      return;
    }

    try {
      setSavingEdit(true);
      setError(null);

      await updateCallCenterRegistro(
        Number(caseId),
        buildUpdateRequest(
          caso,
          editForm,
        ),
      );

      setSuccess(
        'Datos del caso actualizados correctamente.',
      );
      setOpenEdit(false);

      await loadData();
    } catch (exception) {
      setError(
        getErrorMessage(
          exception,
          'No fue posible actualizar los datos del caso.',
        ),
      );
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleRegistrarLlamada() {
    if (!caseId) {
      return;
    }

    if (caseClosedOrCancelled) {
      setError(
        'No se pueden registrar llamadas en un caso cerrado o cancelado.',
      );
      return;
    }

    const resultado =
      llamadaForm.resultadoLlamada.trim();

    if (!resultado) {
      setError(
        'Debe seleccionar el resultado de la llamada.',
      );
      return;
    }

    if (
      !llamadaForm.llamadaConectada &&
      !llamadaForm.motivoNoContactoId
    ) {
      setError(
        'Debe seleccionar el motivo por el cual no se logró conectar la llamada.',
      );
      return;
    }

    const request: CallCenterGestionLlamadaRequest = {
      ...llamadaForm,
      resultadoLlamada:
        resultado,
      motivoNoContactoId:
        llamadaForm.llamadaConectada
          ? null
          : llamadaForm.motivoNoContactoId,
      motivoNoDisposicionId:
        shouldShowMotivoNoDisposicion(
          llamadaForm,
        )
          ? llamadaForm.motivoNoDisposicionId
          : null,
      fechaReprogramacionLlamada:
        isReprogramCallResult(
          resultado,
        )
          ? llamadaForm.fechaReprogramacionLlamada
          : null,
      horaReprogramacionLlamada:
        isReprogramCallResult(
          resultado,
        )
          ? llamadaForm.horaReprogramacionLlamada
          : null,
      observacion:
        llamadaForm.observacion?.trim() ||
        null,
    };

    try {
      setSavingLlamada(true);
      setError(null);

      await registrarCallCenterLlamada(
        caseId,
        request,
      );

      setSuccess(
        'Gestión de llamada registrada correctamente.',
      );
      setOpenLlamada(false);
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
      setSavingLlamada(false);
    }
  }

  async function handleAsignarVisita() {
    if (!caseId) {
      return;
    }

    if (caseClosedOrCancelled) {
      setError(
        'No se pueden asignar visitas en un caso cerrado o cancelado.',
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

    if (
      !visitaForm.fechaProgramada
    ) {
      setError(
        'Debe seleccionar la fecha programada para la visita.',
      );
      return;
    }

    if (
      !visitaForm.horaProgramada
    ) {
      setError(
        'Debe seleccionar la hora programada para la visita.',
      );
      return;
    }

    const request: CallCenterVisitaAsignacionRequest = {
      encuestadorId:
        visitaForm.encuestadorId,
      fechaProgramada:
        visitaForm.fechaProgramada,
      horaProgramada:
        visitaForm.horaProgramada,
      observacion:
        visitaForm.observacion?.trim() ||
        null,
    };

    try {
      setSavingVisita(true);
      setError(null);

      await asignarCallCenterVisita(
        caseId,
        request,
      );

      setSuccess(
        'Encuestador y programación de visita registrados correctamente.',
      );

      setOpenVisita(false);
      setVisitaForm(
        initialVisitaForm,
      );

      await loadData();
    } catch (exception) {
      setError(
        getErrorMessage(
          exception,
          'No fue posible asignar el encuestador y programar la visita.',
        ),
      );
    } finally {
      setSavingVisita(false);
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
          sx={{ mt: 2 }}
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
          gap: 1.5,
          justifyContent:
            'space-between',
        }}
      >
        <Box>
          <Typography
            component="h1"
            variant="h5"
            sx={{ fontWeight: 800 }}
          >
            {`Gestión del caso #${caseId ?? ''}`}
          </Typography>

          <Typography
            component="p"
            variant="body2"
            sx={{
              color: 'text.secondary',
              mt: 0.5,
            }}
          >
            Registra la llamada o intento y asigna el
            encuestador, la fecha y la hora de la visita.
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
                '/dashboard/callcenter/mis-registros',
              )
            }
          >
            Volver a casos
          </Button>

          <Button
            variant="outlined"
            startIcon={
              <RefreshIcon />
            }
            onClick={() =>
              void loadData()
            }
            disabled={loading}
          >
            Actualizar
          </Button>

          <Button
            variant="outlined"
            startIcon={
              <EditIcon />
            }
            onClick={
              openEditarDatos
            }
            disabled={
              caseClosedOrCancelled ||
              !caso
            }
          >
            Editar datos
          </Button>
        </Box>
      </Box>

      <Alert severity="info">
        <Typography
          component="p"
          variant="body2"
          sx={{ fontWeight: 800 }}
        >
          La llamada es informativa y de confirmación.
        </Typography>

        <Typography
          component="p"
          variant="body2"
        >
          Si el ciudadano no contesta, registra el intento. La
          visita no se cancela y el encuestador debe realizarla
          en la fecha asignada.
        </Typography>
      </Alert>

      {caseClosedOrCancelled && (
        <Alert
          severity={
            normalizeCode(
              estadoCaso,
            ) === 'CERRADO'
              ? 'success'
              : 'warning'
          }
        >
          Este caso está{' '}
          <strong>
            {formatLabel(
              estadoCaso,
            )}
          </strong>
          . La información se muestra únicamente para consulta y
          trazabilidad.
        </Alert>
      )}

      <Card variant="outlined">
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
            }}
          >
            <Box>
              <Typography
                component="h2"
                variant="h6"
                sx={{ fontWeight: 800 }}
              >
                Resumen del caso
              </Typography>

              <Typography
                component="p"
                variant="body2"
                sx={{
                  color: 'text.secondary',
                }}
              >
                Información principal para realizar la gestión
                telefónica y programar la visita.
              </Typography>
            </Box>

            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 1,
              }}
            >
              <Chip
                size="small"
                label={formatLabel(
                  estadoCaso,
                )}
                color={getStatusColor(
                  estadoCaso,
                )}
              />

              <Chip
                size="small"
                label={formatLabel(
                  estadoVisita,
                )}
                color={getStatusColor(
                  estadoVisita,
                )}
                variant="outlined"
              />

              <Chip
                size="small"
                label={formatLabel(
                  tipoSolicitud,
                )}
                variant="outlined"
              />
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          {!caso ? (
            <Alert severity="warning">
              No fue posible encontrar la información principal
              del caso.
            </Alert>
          ) : (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, minmax(0, 1fr))',
                  lg: 'repeat(4, minmax(0, 1fr))',
                },
                gap: 2,
              }}
            >
              <InfoItem
                label="Ciudadano"
                value={
                  caso.nombreCompleto ||
                  'Sin nombre'
                }
              />

              <InfoItem
                label="Cédula"
                value={
                  caso.cedulaSolicitante ||
                  'Sin dato'
                }
              />

              <InfoItem
                label="Teléfono"
                value={
                  caso.telefono ||
                  'Sin dato'
                }
              />

              <InfoItem
                label="Origen"
                value={formatLabel(
                  caso.origenRegistro ||
                  'MANUAL',
                )}
              />

              <InfoItem
                label="Dirección"
                value={
                  caso.direccionTexto ||
                  'Sin dirección'
                }
              />

              <InfoItem
                label="Barrio"
                value={
                  caso.barrioNombre ||
                  'Sin barrio'
                }
              />

              <InfoItem
                label="Comuna"
                value={
                  caso.comunaNombre ||
                  'Sin comuna'
                }
              />

              <InfoItem
                label="Funcionario Call Center"
                value={
                  caso.funcionarioCallcenterAsignadoNombre ||
                  caso.funcionarioCallcenterAsignadoUsername ||
                  'Sin asignar'
                }
              />

              <InfoItem
                label="Encuestador programado"
                value={
                  visitaProgramadaActual?.encuestadorNombre ||
                  caso.encuestadorAsignadoNombre ||
                  caso.encuestadorProgramadoNombre ||
                  'Sin asignar'
                }
              />

              <InfoItem
                label="Fecha programada"
                value={
                  visitaProgramadaActual?.fechaProgramada ||
                  caso.fechaEncuestaProgramada ||
                  'Sin fecha'
                }
              />

              <InfoItem
                label="Hora programada"
                value={
                  visitaProgramadaActual?.horaProgramada
                    ? visitaProgramadaActual.horaProgramada.slice(
                      0,
                      5,
                    )
                    : 'Sin hora'
                }
              />

              <InfoItem
                label="Llamadas registradas"
                value={String(
                  llamadas.length,
                )}
              />

              <InfoItem
                label="Visitas activas"
                value={String(
                  visitasActivas,
                )}
              />

              <Box
                sx={{
                  gridColumn: {
                    xs: 'auto',
                    sm: 'span 2',
                    lg: 'span 4',
                  },
                }}
              >
                <InfoItem
                  label="Observación general"
                  value={
                    caso.observacion ||
                    'Sin observación'
                  }
                />
              </Box>

              {caseClosedOrCancelled && (
                <>
                  <InfoItem
                    label="Fecha de cierre"
                    value={
                      caso.fechaCierre ||
                      'Sin fecha de cierre'
                    }
                  />

                  <InfoItem
                    label="Motivo de cierre"
                    value={
                      caso.motivoCierre ||
                      'Sin motivo registrado'
                    }
                  />

                  <InfoItem
                    label="Usuario de cierre"
                    value={
                      caso.usuarioCierreUsername ||
                      'Sin usuario registrado'
                    }
                  />
                </>
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography
            component="h2"
            variant="h6"
            sx={{ fontWeight: 800 }}
          >
            Siguiente paso recomendado
          </Typography>

          <Box
            sx={{
              display: 'flex',
              flexDirection: {
                xs: 'column',
                sm: 'row',
              },
              gap: 1.5,
              alignItems: {
                xs: 'flex-start',
                sm: 'center',
              },
              mt: 1.5,
            }}
          >
            <Chip
              color={
                workflowAction.color
              }
              label={
                workflowAction.label
              }
            />

            <Typography
              component="p"
              variant="body2"
              sx={{
                color: 'text.secondary',
              }}
            >
              {workflowAction.detail}
            </Typography>
          </Box>
        </CardContent>
      </Card>

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
        <Card variant="outlined">
          <CardContent
            sx={{
              display: 'flex',
              flexDirection: 'column',
              minHeight: 270,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                justifyContent:
                  'space-between',
                gap: 1,
              }}
            >
              <Box>
                <Chip
                  size="small"
                  color="primary"
                  label="Paso 1"
                />

                <Typography
                  component="h2"
                  variant="h6"
                  sx={{
                    fontWeight: 800,
                    mt: 1,
                  }}
                >
                  Gestión telefónica
                </Typography>
              </Box>

              <PhoneIcon color="primary" />
            </Box>

            <Typography
              component="p"
              variant="body2"
              sx={{
                color: 'text.secondary',
                mt: 1,
              }}
            >
              Registra cada intento de llamada. Los intentos
              anteriores permanecen en el historial.
            </Typography>

            <Box
              sx={{
                mt: 2,
                display: 'flex',
                flexDirection: 'column',
                gap: 0.75,
              }}
            >
              <Typography
                component="p"
                variant="body2"
              >
                <strong>
                  Intentos registrados:
                </strong>{' '}
                {llamadas.length}
              </Typography>

              <Typography
                component="p"
                variant="body2"
              >
                <strong>
                  Resultado principal:
                </strong>{' '}
                {caso
                  ? getPhoneStatusLabel(
                    caso,
                  )
                  : 'Sin dato'}
              </Typography>
            </Box>

            <Button
              variant="contained"
              startIcon={
                <AddIcCallIcon />
              }
              onClick={() =>
                void openRegistrarLlamada()
              }
              disabled={
                caseClosedOrCancelled
              }
              sx={{
                mt: 'auto',
                alignSelf: 'flex-start',
              }}
            >
              Registrar llamada
            </Button>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent
            sx={{
              display: 'flex',
              flexDirection: 'column',
              minHeight: 270,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                justifyContent:
                  'space-between',
                gap: 1,
              }}
            >
              <Box>
                <Chip
                  size="small"
                  color="warning"
                  label="Paso 2"
                />

                <Typography
                  component="h2"
                  variant="h6"
                  sx={{
                    fontWeight: 800,
                    mt: 1,
                  }}
                >
                  Asignar encuestador y programar visita
                </Typography>
              </Box>

              <EventIcon color="warning" />
            </Box>

            <Typography
              component="p"
              variant="body2"
              sx={{
                color: 'text.secondary',
                mt: 1,
              }}
            >
              Selecciona el encuestador, la fecha y la hora de
              la visita. La programación continúa aunque la
              llamada no haya sido conectada.
            </Typography>

            <Box
              sx={{
                mt: 2,
                display: 'flex',
                flexDirection: 'column',
                gap: 0.75,
              }}
            >
              <Typography
                component="p"
                variant="body2"
              >
                <strong>
                  Visitas registradas:
                </strong>{' '}
                {visitas.length}
              </Typography>

              <Typography
                component="p"
                variant="body2"
              >
                <strong>
                  Visitas activas:
                </strong>{' '}
                {visitasActivas}
              </Typography>

              <Typography
                component="p"
                variant="body2"
              >
                <strong>
                  Programación actual:
                </strong>{' '}
                {visitaProgramadaActual
                  ? formatVisitSchedule(
                    visitaProgramadaActual,
                  )
                  : 'Sin programación activa'}
              </Typography>
            </Box>

            <Button
              variant="contained"
              color="warning"
              startIcon={
                <AssignmentIndIcon />
              }
              onClick={() =>
                void openAsignarVisita()
              }
              disabled={
                caseClosedOrCancelled
              }
              sx={{
                mt: 'auto',
                alignSelf: 'flex-start',
              }}
            >
              Asignar encuestador
            </Button>
          </CardContent>
        </Card>
      </Box>

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
        <Card variant="outlined">
          <CardContent>
            <Box
              sx={{
                display: 'flex',
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
                  sx={{ fontWeight: 800 }}
                >
                  Historial de llamadas
                </Typography>

                <Typography
                  component="p"
                  variant="body2"
                  sx={{
                    color: 'text.secondary',
                  }}
                >
                  Intentos de contacto registrados para el caso.
                </Typography>
              </Box>

              <Chip
                size="small"
                icon={<HistoryIcon />}
                label={`${llamadas.length} llamada(s)`}
              />
            </Box>

            <Divider sx={{ mb: 2 }} />

            {llamadasOrdenadas.length === 0 ? (
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
                {llamadasOrdenadas.map(
                  (item) => (
                    <Card
                      key={item.id}
                      variant="outlined"
                    >
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
                          }}
                        >
                          <Box>
                            <Typography
                              component="p"
                              sx={{
                                fontWeight: 800,
                              }}
                            >
                              {`Intento #${item.intentoNumero} · ${formatLabel(
                                item.resultadoLlamada,
                              )}`}
                            </Typography>

                            <Typography
                              component="p"
                              variant="body2"
                              sx={{
                                color:
                                  'text.secondary',
                              }}
                            >
                              {item.fechaLlamada}
                              {item.horaLlamada
                                ? ` · ${item.horaLlamada.slice(
                                  0,
                                  5,
                                )}`
                                : ''}
                            </Typography>

                            <Typography
                              component="p"
                              variant="body2"
                              sx={{
                                color:
                                  'text.secondary',
                              }}
                            >
                              Funcionario:{' '}
                              {item.funcionarioCallcenterNombre ||
                                item.funcionarioCallcenterUsername ||
                                'No disponible'}
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

                        {item.motivoNoContactoNombre && (
                          <Typography
                            component="p"
                            variant="body2"
                            sx={{ mt: 1 }}
                          >
                            <strong>
                              Motivo de no contacto:
                            </strong>{' '}
                            {
                              item.motivoNoContactoNombre
                            }
                          </Typography>
                        )}

                        {item.motivoNoDisposicionNombre && (
                          <Typography
                            component="p"
                            variant="body2"
                            sx={{ mt: 1 }}
                          >
                            <strong>
                              Motivo de no disposición:
                            </strong>{' '}
                            {
                              item.motivoNoDisposicionNombre
                            }
                          </Typography>
                        )}

                        {item.fechaReprogramacionLlamada && (
                          <Typography
                            component="p"
                            variant="body2"
                            sx={{ mt: 1 }}
                          >
                            <strong>
                              Llamada reprogramada:
                            </strong>{' '}
                            {
                              item.fechaReprogramacionLlamada
                            }
                            {item.horaReprogramacionLlamada
                              ? ` · ${item.horaReprogramacionLlamada.slice(
                                0,
                                5,
                              )}`
                              : ''}
                          </Typography>
                        )}

                        {item.observacion && (
                          <Typography
                            component="p"
                            variant="body2"
                            sx={{ mt: 1 }}
                          >
                            {item.observacion}
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  ),
                )}
              </Box>
            )}
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent>
            <Box
              sx={{
                display: 'flex',
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
                  sx={{ fontWeight: 800 }}
                >
                  Historial de visitas
                </Typography>

                <Typography
                  component="p"
                  variant="body2"
                  sx={{
                    color: 'text.secondary',
                  }}
                >
                  Programaciones y resultados de campo.
                </Typography>
              </Box>

              <Chip
                size="small"
                icon={
                  <AssignmentIndIcon />
                }
                label={`${visitas.length} visita(s)`}
              />
            </Box>

            <Divider sx={{ mb: 2 }} />

            {visitasOrdenadas.length === 0 ? (
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
                {visitasOrdenadas.map(
                  (item) => (
                    <Card
                      key={item.id}
                      variant="outlined"
                    >
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
                          }}
                        >
                          <Box>
                            <Typography
                              component="p"
                              sx={{
                                fontWeight: 800,
                              }}
                            >
                              {item.encuestadorNombre ||
                                'Encuestador no disponible'}
                            </Typography>

                            <Typography
                              component="p"
                              variant="body2"
                              sx={{
                                color:
                                  'text.secondary',
                              }}
                            >
                              Programada:{' '}
                              {item.fechaProgramada ||
                                'Sin fecha'}
                              {item.horaProgramada
                                ? ` · ${item.horaProgramada.slice(
                                  0,
                                  5,
                                )}`
                                : ''}
                            </Typography>
                          </Box>

                          <Chip
                            size="small"
                            label={formatLabel(
                              item.estadoVisita,
                            )}
                            color={getStatusColor(
                              item.estadoVisita,
                            )}
                          />
                        </Box>

                        {item.encuestaRealizada !== null &&
                          item.encuestaRealizada !== undefined && (
                            <Typography
                              component="p"
                              variant="body2"
                              sx={{ mt: 1 }}
                            >
                              <strong>
                                Encuesta realizada:
                              </strong>{' '}
                              {item.encuestaRealizada
                                ? 'Sí'
                                : 'No'}
                            </Typography>
                          )}

                        {item.fechaVisitaReal && (
                          <Typography
                            component="p"
                            variant="body2"
                            sx={{ mt: 1 }}
                          >
                            <strong>
                              Fecha real:
                            </strong>{' '}
                            {item.fechaVisitaReal}
                            {item.horaVisitaReal
                              ? ` · ${item.horaVisitaReal.slice(
                                0,
                                5,
                              )}`
                              : ''}
                          </Typography>
                        )}

                        {item.fechaReprogramacion && (
                          <Typography
                            component="p"
                            variant="body2"
                            sx={{ mt: 1 }}
                          >
                            <strong>
                              Reprogramada:
                            </strong>{' '}
                            {item.fechaReprogramacion}
                          </Typography>
                        )}

                        {item.motivoNoEncuesta && (
                          <Typography
                            component="p"
                            variant="body2"
                            sx={{ mt: 1 }}
                          >
                            <strong>
                              Motivo:
                            </strong>{' '}
                            {item.motivoNoEncuesta}
                          </Typography>
                        )}

                        {item.observacionEncuestador && (
                          <Typography
                            component="p"
                            variant="body2"
                            sx={{ mt: 1 }}
                          >
                            <strong>
                              Observación del encuestador:
                            </strong>{' '}
                            {item.observacionEncuestador}
                          </Typography>
                        )}

                      </CardContent>
                    </Card>
                  ),
                )}
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>

      <Dialog
        open={openEdit}
        onClose={() =>
          setOpenEdit(false)
        }
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Editar datos del ciudadano
        </DialogTitle>

        <DialogContent>
          <Alert
            severity="info"
            sx={{
              mt: 1,
              mb: 2,
            }}
          >
            Esta edición actualiza los datos principales del
            caso. No reemplaza el historial de llamadas.
          </Alert>

          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            <TextField
              label="Nombre completo"
              value={
                editForm.nombreCompleto
              }
              onChange={(event) =>
                setEditForm(
                  (current) => ({
                    ...current,
                    nombreCompleto:
                      event.target.value,
                  }),
                )
              }
              fullWidth
              required
              size="small"
            />

            <TextField
              label="Cédula"
              value={
                editForm.cedulaSolicitante
              }
              onChange={(event) =>
                setEditForm(
                  (current) => ({
                    ...current,
                    cedulaSolicitante:
                      event.target.value,
                  }),
                )
              }
              fullWidth
              required
              size="small"
            />

            <TextField
              label="Teléfono"
              value={
                editForm.telefono
              }
              onChange={(event) =>
                setEditForm(
                  (current) => ({
                    ...current,
                    telefono:
                      event.target.value,
                  }),
                )
              }
              fullWidth
              required
              size="small"
            />

            <TextField
              label="Dirección"
              value={
                editForm.direccionTexto
              }
              onChange={(event) =>
                setEditForm(
                  (current) => ({
                    ...current,
                    direccionTexto:
                      event.target.value,
                  }),
                )
              }
              fullWidth
              size="small"
            />

            <FormControl
              fullWidth
              size="small"
            >
              <InputLabel>
                Tipo de solicitud
              </InputLabel>

              <Select
                label="Tipo de solicitud"
                value={
                  editForm.tipoSolicitudCallcenter
                }
                onChange={(event) =>
                  setEditForm(
                    (current) => ({
                      ...current,
                      tipoSolicitudCallcenter:
                        String(
                          event.target.value,
                        ),
                    }),
                  )
                }
              >
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
              </Select>
            </FormControl>

            <TextField
              label="Observación general"
              value={
                editForm.observacion
              }
              onChange={(event) =>
                setEditForm(
                  (current) => ({
                    ...current,
                    observacion:
                      event.target.value,
                  }),
                )
              }
              minRows={3}
              multiline
              fullWidth
              size="small"
            />
          </Box>
        </DialogContent>

        <DialogActions>
          <Button
            onClick={() =>
              setOpenEdit(false)
            }
            disabled={savingEdit}
          >
            Cancelar
          </Button>

          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={
              savingEdit ||
              caseClosedOrCancelled
            }
            onClick={() =>
              void handleActualizarDatos()
            }
          >
            {savingEdit
              ? 'Guardando...'
              : 'Guardar cambios'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openLlamada}
        onClose={() => {
          if (!savingLlamada) {
            setOpenLlamada(false);
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
            <Alert severity="info">
              Cada guardado crea un nuevo intento en el historial.
              Una llamada no conectada no cancela una visita
              programada.
            </Alert>

            {loadingLlamadaCatalogs && (
              <Alert severity="info">
                Cargando resultados y motivos...
              </Alert>
            )}

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
                            ? null
                            : current.motivoNoContactoId,
                      }),
                    );
                  }}
                  disabled={
                    savingLlamada
                  }
                />
              }
              label={
                llamadaForm.llamadaConectada
                  ? 'Llamada conectada: Sí'
                  : 'Llamada conectada: No'
              }
            />

            {!llamadaForm.llamadaConectada && (
              <Alert severity="warning">
                Selecciona el motivo de no contacto. La visita
                programada continuará activa.
              </Alert>
            )}

            <FormControl
              fullWidth
              required
              size="small"
              disabled={
                loadingLlamadaCatalogs ||
                savingLlamada
              }
            >
              <InputLabel>
                Resultado de llamada
              </InputLabel>

              <Select
                label="Resultado de llamada"
                value={
                  llamadaForm.resultadoLlamada
                }
                onChange={(event) =>
                  setLlamadaForm(
                    (current) => ({
                      ...current,
                      resultadoLlamada:
                        String(
                          event.target.value,
                        ),
                      motivoNoDisposicionId:
                        null,
                      fechaReprogramacionLlamada:
                        null,
                      horaReprogramacionLlamada:
                        null,
                    }),
                  )
                }
              >
                {resultados.map(
                  (item) => (
                    <MenuItem
                      key={item.codigo}
                      value={item.codigo}
                    >
                      {item.nombre}
                    </MenuItem>
                  ),
                )}
              </Select>
            </FormControl>

            {!llamadaForm.llamadaConectada && (
              <FormControl
                fullWidth
                required
                size="small"
                disabled={
                  loadingLlamadaCatalogs ||
                  savingLlamada
                }
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
                  onChange={(event) =>
                    setLlamadaForm(
                      (current) => ({
                        ...current,
                        motivoNoContactoId:
                          event.target.value
                            ? Number(
                              event.target.value,
                            )
                            : null,
                      }),
                    )
                  }
                >
                  <MenuItem value="">
                    Selecciona el motivo
                  </MenuItem>

                  {motivosNoContacto.map(
                    (item) => (
                      <MenuItem
                        key={item.id}
                        value={String(
                          item.id,
                        )}
                      >
                        {item.label}
                      </MenuItem>
                    ),
                  )}
                </Select>
              </FormControl>
            )}

            {shouldShowMotivoNoDisposicion(
              llamadaForm,
            ) && (
                <FormControl
                  fullWidth
                  size="small"
                  disabled={
                    loadingLlamadaCatalogs ||
                    savingLlamada
                  }
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
                    onChange={(event) =>
                      setLlamadaForm(
                        (current) => ({
                          ...current,
                          motivoNoDisposicionId:
                            event.target.value
                              ? Number(
                                event.target.value,
                              )
                              : null,
                        }),
                      )
                    }
                  >
                    <MenuItem value="">
                      Sin motivo seleccionado
                    </MenuItem>

                    {motivosNoDisposicion.map(
                      (item) => (
                        <MenuItem
                          key={item.id}
                          value={String(
                            item.id,
                          )}
                        >
                          {item.label}
                        </MenuItem>
                      ),
                    )}
                  </Select>
                </FormControl>
              )}

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: '1fr 1fr',
                },
                gap: 2,
              }}
            >
              <TextField
                label="Fecha de llamada"
                type="date"
                value={
                  llamadaForm.fechaLlamada ??
                  ''
                }
                onChange={(event) =>
                  setLlamadaForm(
                    (current) => ({
                      ...current,
                      fechaLlamada:
                        event.target.value ||
                        null,
                    }),
                  )
                }
                slotProps={{
                  inputLabel: {
                    shrink: true,
                  },
                }}
                fullWidth
                size="small"
                disabled={savingLlamada}
              />

              <TextField
                label="Hora de llamada"
                type="time"
                value={
                  llamadaForm.horaLlamada ??
                  ''
                }
                onChange={(event) =>
                  setLlamadaForm(
                    (current) => ({
                      ...current,
                      horaLlamada:
                        event.target.value ||
                        null,
                    }),
                  )
                }
                slotProps={{
                  inputLabel: {
                    shrink: true,
                  },
                }}
                fullWidth
                size="small"
                disabled={savingLlamada}
              />
            </Box>

            {isReprogramCallResult(
              llamadaForm.resultadoLlamada,
            ) && (
                <>
                  <Alert severity="info">
                    Registra la fecha y hora acordadas para el
                    próximo intento.
                  </Alert>

                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: {
                        xs: '1fr',
                        sm: '1fr 1fr',
                      },
                      gap: 2,
                    }}
                  >
                    <TextField
                      label="Fecha de reprogramación"
                      type="date"
                      value={
                        llamadaForm.fechaReprogramacionLlamada ??
                        ''
                      }
                      onChange={(event) =>
                        setLlamadaForm(
                          (current) => ({
                            ...current,
                            fechaReprogramacionLlamada:
                              event.target.value ||
                              null,
                          }),
                        )
                      }
                      slotProps={{
                        inputLabel: {
                          shrink: true,
                        },
                      }}
                      fullWidth
                      size="small"
                      disabled={
                        savingLlamada
                      }
                    />

                    <TextField
                      label="Hora de reprogramación"
                      type="time"
                      value={
                        llamadaForm.horaReprogramacionLlamada ??
                        ''
                      }
                      onChange={(event) =>
                        setLlamadaForm(
                          (current) => ({
                            ...current,
                            horaReprogramacionLlamada:
                              event.target.value ||
                              null,
                          }),
                        )
                      }
                      slotProps={{
                        inputLabel: {
                          shrink: true,
                        },
                      }}
                      fullWidth
                      size="small"
                      disabled={
                        savingLlamada
                      }
                    />
                  </Box>
                </>
              )}

            <TextField
              label="Observación"
              value={
                llamadaForm.observacion ??
                ''
              }
              onChange={(event) =>
                setLlamadaForm(
                  (current) => ({
                    ...current,
                    observacion:
                      event.target.value,
                  }),
                )
              }
              minRows={3}
              multiline
              fullWidth
              size="small"
              disabled={savingLlamada}
            />
          </Box>
        </DialogContent>

        <DialogActions>
          <Button
            onClick={() =>
              setOpenLlamada(false)
            }
            disabled={savingLlamada}
          >
            Cancelar
          </Button>

          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={
              savingLlamada ||
              loadingLlamadaCatalogs ||
              caseClosedOrCancelled
            }
            onClick={() =>
              void handleRegistrarLlamada()
            }
          >
            {savingLlamada
              ? 'Guardando...'
              : 'Guardar llamada'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openVisita}
        onClose={() => {
          if (!savingVisita) {
            setOpenVisita(false);
          }
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Asignar encuestador y programar visita
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
            <Alert severity="info">
              Como funcionario Call Center debes seleccionar el
              encuestador, la fecha y la hora de la visita. La
              programación puede realizarse aunque el ciudadano
              no haya contestado la llamada.
            </Alert>

            {visitasActivas > 0 && (
              <Alert severity="warning">
                El caso ya tiene {visitasActivas} visita(s)
                activa(s). Revisa el historial antes de registrar
                una nueva programación.
              </Alert>
            )}

            {loadingEncuestadores && (
              <Alert severity="info">
                Cargando encuestadores...
              </Alert>
            )}

            <FormControl
              fullWidth
              required
              size="small"
              disabled={
                loadingEncuestadores ||
                savingVisita
              }
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
                onChange={(event) =>
                  setVisitaForm(
                    (current) => ({
                      ...current,
                      encuestadorId:
                        Number(
                          event.target.value,
                        ),
                    }),
                  )
                }
              >
                <MenuItem value="">
                  Selecciona el encuestador
                </MenuItem>

                {encuestadores.map(
                  (item) => (
                    <MenuItem
                      key={item.id}
                      value={String(
                        item.id,
                      )}
                    >
                      {item.label}
                    </MenuItem>
                  ),
                )}
              </Select>
            </FormControl>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: '1fr 1fr',
                },
                gap: 2,
              }}
            >
              <TextField
                label="Fecha programada"
                type="date"
                value={
                  visitaForm.fechaProgramada ??
                  ''
                }
                onChange={(event) =>
                  setVisitaForm(
                    (current) => ({
                      ...current,
                      fechaProgramada:
                        event.target.value ||
                        null,
                    }),
                  )
                }
                slotProps={{
                  inputLabel: {
                    shrink: true,
                  },
                }}
                fullWidth
                required
                size="small"
                disabled={savingVisita}
              />

              <TextField
                label="Hora programada"
                type="time"
                value={
                  visitaForm.horaProgramada ??
                  ''
                }
                onChange={(event) =>
                  setVisitaForm(
                    (current) => ({
                      ...current,
                      horaProgramada:
                        event.target.value ||
                        null,
                    }),
                  )
                }
                slotProps={{
                  inputLabel: {
                    shrink: true,
                  },
                }}
                fullWidth
                required
                size="small"
                disabled={savingVisita}
              />
            </Box>

            <TextField
              label="Observación de programación"
              value={
                visitaForm.observacion ??
                ''
              }
              onChange={(event) =>
                setVisitaForm(
                  (current) => ({
                    ...current,
                    observacion:
                      event.target.value,
                  }),
                )
              }
              placeholder="Indicaciones para el encuestador o información relevante de la visita"
              minRows={3}
              multiline
              fullWidth
              size="small"
              disabled={savingVisita}
            />
          </Box>
        </DialogContent>

        <DialogActions>
          <Button
            onClick={() =>
              setOpenVisita(false)
            }
            disabled={savingVisita}
          >
            Cancelar
          </Button>

          <Button
            variant="contained"
            startIcon={
              <AssignmentIndIcon />
            }
            disabled={
              savingVisita ||
              loadingEncuestadores ||
              caseClosedOrCancelled
            }
            onClick={() =>
              void handleAsignarVisita()
            }
          >
            {savingVisita
              ? 'Programando...'
              : 'Confirmar programación'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(error)}
        autoHideDuration={6000}
        onClose={() =>
          setError(null)
        }
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
      >
        <Alert
          severity="error"
          onClose={() =>
            setError(null)
          }
          sx={{ width: '100%' }}
        >
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={Boolean(success)}
        autoHideDuration={4000}
        onClose={() =>
          setSuccess(null)
        }
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
      >
        <Alert
          severity="success"
          onClose={() =>
            setSuccess(null)
          }
          sx={{ width: '100%' }}
        >
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
}

function buildUpdateRequest(
  caso: CallCenterResponse,
  form: CallCenterEditFormState,
): CallCenterRequest {
  return {
    marcaTemporal:
      caso.marcaTemporal ?? null,
    fechaLlamada:
      caso.fechaLlamada,
    horaLlamada:
      caso.horaLlamada ?? null,
    tipoRegistro:
      caso.tipoRegistro ?? 'LLAMADA',
    origenRegistro:
      caso.origenRegistro ?? 'MANUAL',
    ventanillaRegistroId:
      caso.ventanillaRegistroId ?? null,

    cedulaSolicitante:
      form.cedulaSolicitante.trim(),
    nombreCompleto:
      form.nombreCompleto.trim(),
    telefono:
      form.telefono.trim(),
    llamadaConectada:
      caso.llamadaConectada,

    motivoNoContactoId:
      caso.motivoNoContactoId ?? null,
    motivoNoContactoTexto:
      caso.motivoNoContactoTexto ?? null,

    encuestadorProgramadoId:
      caso.encuestadorProgramadoId ?? null,
    fechaEncuestaProgramada:
      caso.fechaEncuestaProgramada ?? null,

    solicitoNuevaEncuesta:
      caso.solicitoNuevaEncuesta ?? true,
    direccionTexto:
      form.direccionTexto.trim() ||
      null,
    barrioId:
      caso.barrioId ?? null,
    fechaAplicacionInformada:
      caso.fechaAplicacionInformada ?? null,
    disposicionRecibirEncuesta:
      caso.disposicionRecibirEncuesta ?? null,

    motivoNoDisposicionId:
      caso.motivoNoDisposicionId ?? null,
    motivoNoDisposicionTexto:
      caso.motivoNoDisposicionTexto ?? null,

    encuestadorAsignadoId:
      caso.encuestadorAsignadoId ?? null,
    explicoInformanteCalificado:
      caso.explicoInformanteCalificado ?? null,

    observacion:
      form.observacion.trim() ||
      null,
    activo:
      caso.activo,
    verificado:
      caso.verificado ?? null,

    estadoCaso:
      caso.estadoCaso ??
      'ASIGNADO_CALLCENTER',
    tipoSolicitudCallcenter:
      form.tipoSolicitudCallcenter ||
      'NUEVA_ENCUESTA',
  };
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
        sx={{
          color: 'text.secondary',
        }}
      >
        {label}
      </Typography>

      <Typography
        component="p"
        variant="body2"
        sx={{
          fontWeight: 700,
          overflowWrap: 'anywhere',
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

function getWorkflowAction(
  caso: CallCenterResponse | null,
  llamadas: CallCenterGestionLlamadaResponse[],
  visitas: CallCenterVisitaResponse[],
): WorkflowActionInfo {
  if (!caso) {
    return {
      label: 'Revisar caso',
      detail:
        'No se pudo determinar el siguiente paso porque falta la información principal.',
      color: 'warning',
    };
  }

  if (
    isCaseClosedOrCancelled(
      caso.estadoCaso,
    )
  ) {
    return {
      label: 'Solo consulta',
      detail:
        'El caso está cerrado o cancelado. Revisa la trazabilidad disponible.',
      color: 'default',
    };
  }

  const hasCalls =
    llamadas.length > 0;

  const hasActiveVisit =
    visitas.some((visita) =>
      isActiveVisit(visita),
    );

  if (
    !hasCalls &&
    !hasActiveVisit
  ) {
    return {
      label: 'Llamar y programar visita',
      detail:
        'Registra el primer intento telefónico y asigna el encuestador, la fecha y la hora. La programación no depende de que la llamada sea conectada.',
      color: 'primary',
    };
  }

  if (!hasCalls) {
    return {
      label: 'Registrar llamada pendiente',
      detail:
        'La visita ya está programada, pero todavía no existe un intento telefónico registrado.',
      color: 'warning',
    };
  }

  if (!hasActiveVisit) {
    return {
      label: 'Asignar encuestador',
      detail:
        'La gestión telefónica ya está registrada. Selecciona el encuestador y define la fecha y hora de visita.',
      color: 'warning',
    };
  }

  return {
    label: 'Seguimiento de visita',
    detail:
      'La llamada y la programación están registradas. El encuestador debe realizar la visita en la fecha asignada.',
    color: 'info',
  };
}

function isActiveVisit(
  visita: CallCenterVisitaResponse,
) {
  const estado =
    normalizeCode(
      visita.estadoVisita,
    );

  return (
    visita.activo !== false &&
    estado !== 'REALIZADA' &&
    estado !== 'NO_ATENDIDA' &&
    estado !== 'CANCELADA'
  );
}

function shouldShowMotivoNoDisposicion(
  request: CallCenterGestionLlamadaRequest,
) {
  const result =
    normalizeCode(
      request.resultadoLlamada,
    );

  return (
    request.llamadaConectada &&
    (
      result.includes('NO_ACEPTA') ||
      result.includes(
        'SIN_DISPOSICION',
      )
    )
  );
}

function isReprogramCallResult(
  result?: string | null,
) {
  return (
    normalizeCode(result) ===
    'REPROGRAMAR_LLAMADA'
  );
}

function getPhoneStatusLabel(
  caso: CallCenterResponse,
) {
  if (
    caso.llamadaConectada === true
  ) {
    return 'Llamada conectada';
  }

  if (
    caso.llamadaConectada === false
  ) {
    return 'Llamada no conectada';
  }

  return 'Sin resultado';
}

function isCaseClosedOrCancelled(
  value?: string | null,
) {
  const normalized =
    normalizeCode(value);

  return (
    normalized === 'CERRADO' ||
    normalized === 'CANCELADO'
  );
}

function formatVisitSchedule(
  visita: CallCenterVisitaResponse,
) {
  const date =
    visita.fechaProgramada ||
    'Sin fecha';

  const time =
    visita.horaProgramada
      ? visita.horaProgramada.slice(
        0,
        5,
      )
      : 'Sin hora';

  const surveyor =
    visita.encuestadorNombre ||
    'Sin encuestador';

  return `${date} · ${time} · ${surveyor}`;
}

function getErrorMessage(
  exception: unknown,
  fallback: string,
) {
  if (
    exception &&
    typeof exception === 'object' &&
    'message' in exception &&
    typeof exception.message === 'string'
  ) {
    return exception.message;
  }

  return fallback;
}

function normalizeCode(
  value?: string | number | null,
) {
  return String(value ?? '')
    .trim()
    .toUpperCase();
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
    normalized ===
    'CONTACTADO_ACEPTA_VISITA'
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

function formatLocalDate(
  date: Date,
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

function formatLocalTime(
  date: Date,
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