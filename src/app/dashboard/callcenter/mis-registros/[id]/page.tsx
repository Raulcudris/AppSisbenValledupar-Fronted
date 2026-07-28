'use client';

import AddIcCallIcon from '@mui/icons-material/AddIcCall';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
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

import { apiRequest } from '@/lib/apiClient';
import { getCallCenterEncuestadoresOptions } from '@/services/callcenter.service';
import {
  asignarCallCenterVisita,
  getCallCenterLlamadas,
  getCallCenterResultadosLlamada,
  getCallCenterVisitas,
  registrarCallCenterLlamada,
} from '@/services/callcenter-workflow.service';
import { ApiResponse } from '@/types/api.types';
import { CallCenterResponse } from '@/types/callcenter.types';
import { SelectOption } from '@/types/catalog.types';
import {
  CallCenterGestionLlamadaRequest,
  CallCenterGestionLlamadaResponse,
  CallCenterResultadoLlamadaResponse,
  CallCenterVisitaAsignacionRequest,
  CallCenterVisitaResponse,
} from '@/types/callcenter-workflow.types';

/**
 * Color permitido para chips de estado.
 */
type ChipColor =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'error'
  | 'info'
  | 'success'
  | 'warning';

/**
 * Estado inicial del formulario para registrar llamadas.
 */
const initialLlamadaForm: CallCenterGestionLlamadaRequest = {
  llamadaConectada: false,
  resultadoLlamada: '',
  motivoNoContactoId: null,
  motivoNoDisposicionId: null,
  fechaReprogramacionLlamada: null,
  horaReprogramacionLlamada: null,
  observacion: '',
};

/**
 * Estado inicial del formulario para asignar visitas.
 */
const initialVisitaForm: CallCenterVisitaAsignacionRequest = {
  encuestadorId: 0,
  fechaProgramada: null,
  horaProgramada: null,
  observacion: '',
};
/**
 * Página de gestión operativa del caso Call Center.
 *
 * Esta vista permite consultar la trazabilidad del caso, registrar llamadas
 * y asignar visitas únicamente cuando el caso permanece abierto.
 */
export default function PageCallCenterGestionCaso() {
  const router = useRouter();
  const params = useParams();

  const caseId = useMemo(() => {
    const value = params?.id;

    return Array.isArray(value) ? value[0] : value;
  }, [params]);

  const [caso, setCaso] = useState<CallCenterResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingLlamada, setSavingLlamada] = useState(false);
  const [savingVisita, setSavingVisita] = useState(false);

  const [resultados, setResultados] = useState<CallCenterResultadoLlamadaResponse[]>([]);
  const [llamadas, setLlamadas] = useState<CallCenterGestionLlamadaResponse[]>([]);
  const [visitas, setVisitas] = useState<CallCenterVisitaResponse[]>([]);
  const [encuestadores, setEncuestadores] = useState<SelectOption[]>([]);

  const [openLlamada, setOpenLlamada] = useState(false);
  const [openVisita, setOpenVisita] = useState(false);

  const [llamadaForm, setLlamadaForm] = useState<CallCenterGestionLlamadaRequest>(initialLlamadaForm);
  const [visitaForm, setVisitaForm] = useState<CallCenterVisitaAsignacionRequest>(initialVisitaForm);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const estadoCaso = caso
    ? getStringField(caso, 'estadoCaso') || caso.estadoVisita || 'PENDIENTE'
    : 'PENDIENTE';

  const tipoSolicitud = caso
    ? getStringField(caso, 'tipoSolicitudCallcenter') || getStringField(caso, 'solicitudNombre')
    : null;

  const caseClosedOrCancelled = isCaseClosedOrCancelled(estadoCaso);

  /**
   * Carga la información completa del caso.
   */
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
      ] = await Promise.all([
        getCallCenterDetalle(caseId),
        getCallCenterResultadosLlamada(),
        getCallCenterLlamadas(caseId),
        getCallCenterVisitas(caseId),
        getCallCenterEncuestadoresOptions(),
      ]);

      setCaso(casoData);
      setResultados(resultadosData);
      setLlamadas(llamadasData);
      setVisitas(visitasData);
      setEncuestadores(encuestadoresData);
    } catch (exception) {
      setError(getErrorMessage(exception, 'No fue posible cargar la gestión del caso Call Center.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  /**
   * Abre el formulario de llamada con valores iniciales.
   */
  function openRegistrarLlamada() {
    if (caseClosedOrCancelled) {
      setError('No se pueden registrar llamadas en un caso cerrado o cancelado.');
      return;
    }

    const now = new Date();

    setLlamadaForm({
      ...initialLlamadaForm,
      fechaLlamada: now.toISOString().slice(0, 10),
      horaLlamada: now.toTimeString().slice(0, 5),
    });

    setOpenLlamada(true);
  }

  /**
   * Abre el formulario de asignación de visita.
   */
  function openAsignarVisita() {
    if (caseClosedOrCancelled) {
      setError('No se pueden asignar visitas en un caso cerrado o cancelado.');
      return;
    }

    setVisitaForm(initialVisitaForm);
    setOpenVisita(true);
  }

  /**
   * Registra una llamada y refresca el historial del caso.
   */
  async function handleRegistrarLlamada() {
    if (!caseId) {
      return;
    }

    if (caseClosedOrCancelled) {
      setError('No se pueden registrar llamadas en un caso cerrado o cancelado.');
      return;
    }

    if (!llamadaForm.resultadoLlamada) {
      setError('Debe seleccionar el resultado de la llamada.');
      return;
    }

    try {
      setSavingLlamada(true);
      setError(null);

      await registrarCallCenterLlamada(caseId, llamadaForm);

      setSuccess('Gestión de llamada registrada correctamente.');
      setOpenLlamada(false);
      setLlamadaForm(initialLlamadaForm);
      await loadData();
    } catch (exception) {
      setError(getErrorMessage(exception, 'No fue posible registrar la llamada.'));
    } finally {
      setSavingLlamada(false);
    }
  }

  /**
   * Asigna una visita a encuestador y refresca el historial.
   */
  async function handleAsignarVisita() {
    if (!caseId) {
      return;
    }

    if (caseClosedOrCancelled) {
      setError('No se pueden asignar visitas en un caso cerrado o cancelado.');
      return;
    }

    if (!visitaForm.encuestadorId) {
      setError('Debe seleccionar el encuestador.');
      return;
    }

    try {
      setSavingVisita(true);
      setError(null);

      await asignarCallCenterVisita(caseId, visitaForm);

      setSuccess('Visita asignada correctamente.');
      setOpenVisita(false);
      setVisitaForm(initialVisitaForm);
      await loadData();
    } catch (exception) {
      setError(getErrorMessage(exception, 'No fue posible asignar la visita.'));
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

        <Typography component="p" sx={{ mt: 2 }}>
          Cargando gestión del caso...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 1.5,
          justifyContent: 'space-between',
        }}
      >
        <Box>
          <Typography component="h1" variant="h5" sx={{ fontWeight: 800 }}>
            {`Gestión caso Call Center #${caseId ?? ''}`}
          </Typography>

          <Typography component="p" variant="body2" sx={{ color: 'text.secondary' }}>
            Gestión telefónica, asignación de visita y trazabilidad del caso.
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
            onClick={() => router.push('/dashboard/callcenter/mis-registros')}
          >
            Volver
          </Button>

          <Button
            variant="contained"
            startIcon={<AddIcCallIcon />}
            onClick={openRegistrarLlamada}
            disabled={caseClosedOrCancelled}
          >
            Registrar llamada
          </Button>

          <Button
            variant="contained"
            startIcon={<AssignmentIndIcon />}
            onClick={openAsignarVisita}
            disabled={caseClosedOrCancelled}
          >
            Asignar visita
          </Button>
        </Box>
      </Box>

      {caseClosedOrCancelled && (
        <Alert severity={estadoCaso === 'CERRADO' ? 'success' : 'warning'}>
          Este caso se encuentra <strong>{formatLabel(estadoCaso)}</strong>. No permite registrar nuevas llamadas
          ni asignar nuevas visitas. La información se muestra solo para consulta y trazabilidad.
        </Alert>
      )}

      <Card>
        <CardContent>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              justifyContent: 'space-between',
              gap: 2,
              mb: 2,
            }}
          >
            <Box>
              <Typography component="h2" variant="h6" sx={{ fontWeight: 800 }}>
                Datos principales del ciudadano
              </Typography>

              <Typography component="p" variant="body2" sx={{ color: 'text.secondary' }}>
                Información base para realizar la gestión del caso.
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                size="small"
                label={formatLabel(estadoCaso)}
                color={getStatusColor(estadoCaso)}
              />

              {tipoSolicitud && (
                <Chip
                  size="small"
                  label={formatLabel(tipoSolicitud)}
                  variant="outlined"
                />
              )}
            </Box>
          </Box>

          <Divider sx={{ mb: 2 }} />

          {!caso ? (
            <Alert severity="warning">
              No fue posible encontrar la información principal del caso.
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
              <InfoItem label="Ciudadano" value={caso.nombreCompleto || 'Sin nombre'} />
              <InfoItem label="Cédula" value={caso.cedulaSolicitante || 'Sin dato'} />
              <InfoItem label="Teléfono" value={caso.telefono || 'Sin dato'} />
              <InfoItem label="Fecha llamada" value={caso.fechaLlamada || 'Sin fecha'} />
              <InfoItem label="Dirección" value={caso.direccionTexto || 'Sin dirección'} />
              <InfoItem label="Barrio" value={caso.barrioNombre || 'Sin barrio'} />
              <InfoItem label="Comuna" value={caso.comunaNombre || 'Sin comuna'} />
              <InfoItem label="Encuestador" value={caso.encuestadorAsignadoNombre || 'Sin asignar'} />

              {caseClosedOrCancelled && (
                <>
                  <InfoItem label="Fecha cierre" value={caso.fechaCierre || 'Sin fecha de cierre'} />
                  <InfoItem label="Motivo cierre" value={caso.motivoCierre || 'Sin motivo registrado'} />
                  <InfoItem
                    label="Usuario cierre"
                    value={caso.usuarioCierreUsername || 'Sin usuario registrado'}
                  />
                </>
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '7fr 5fr' },
          gap: 2,
        }}
      >
        <Card>
          <CardContent>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 1,
                mb: 2,
              }}
            >
              <Box>
                <Typography component="h2" variant="h6" sx={{ fontWeight: 800 }}>
                  Historial de llamadas
                </Typography>

                <Typography component="p" variant="body2" sx={{ color: 'text.secondary' }}>
                  Registro de intentos y resultados de contacto.
                </Typography>
              </Box>

              <Chip size="small" label={`${llamadas.length} llamada(s)`} />
            </Box>

            <Divider sx={{ mb: 2 }} />

            {llamadas.length === 0 ? (
              <Alert severity="info">
                Este caso aún no tiene llamadas registradas.
              </Alert>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {llamadas.map((item) => (
                  <Card key={item.id} variant="outlined">
                    <CardContent>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 1,
                        }}
                      >
                        <Box>
                          <Typography component="p" sx={{ fontWeight: 800 }}>
                            {`Intento #${item.intentoNumero} - ${formatLabel(item.resultadoLlamada)}`}
                          </Typography>

                          <Typography component="p" variant="body2" sx={{ color: 'text.secondary' }}>
                            {`${item.fechaLlamada} ${item.horaLlamada ?? ''}`}
                          </Typography>

                          <Typography component="p" variant="body2" sx={{ color: 'text.secondary' }}>
                            {`Funcionario: ${item.funcionarioCallcenterNombre ?? item.funcionarioCallcenterUsername ?? 'No disponible'}`}
                          </Typography>
                        </Box>

                        <Chip
                          size="small"
                          label={item.llamadaConectada ? 'Conectada' : 'No conectada'}
                          color={item.llamadaConectada ? 'success' : 'warning'}
                        />
                      </Box>

                      {item.motivoNoContactoNombre && (
                        <Typography component="p" variant="body2" sx={{ mt: 1 }}>
                          {`Motivo no contacto: ${item.motivoNoContactoNombre}`}
                        </Typography>
                      )}

                      {item.motivoNoDisposicionNombre && (
                        <Typography component="p" variant="body2" sx={{ mt: 1 }}>
                          {`Motivo no disposición: ${item.motivoNoDisposicionNombre}`}
                        </Typography>
                      )}

                      {item.observacion && (
                        <Typography component="p" variant="body2" sx={{ mt: 1 }}>
                          {item.observacion}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 1,
                mb: 2,
              }}
            >
              <Box>
                <Typography component="h2" variant="h6" sx={{ fontWeight: 800 }}>
                  Visitas de encuestadores
                </Typography>

                <Typography component="p" variant="body2" sx={{ color: 'text.secondary' }}>
                  Seguimiento de visitas asignadas al caso.
                </Typography>
              </Box>

              <Chip size="small" label={`${visitas.length} visita(s)`} />
            </Box>

            <Divider sx={{ mb: 2 }} />

            {visitas.length === 0 ? (
              <Alert severity="info">
                Este caso aún no tiene visitas asignadas.
              </Alert>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {visitas.map((item) => (
                  <Card key={item.id} variant="outlined">
                    <CardContent>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 1,
                        }}
                      >
                        <Box>
                          <Typography component="p" sx={{ fontWeight: 800 }}>
                            {item.encuestadorNombre ?? 'Encuestador no disponible'}
                          </Typography>

                          <Typography component="p" variant="body2" sx={{ color: 'text.secondary' }}>
                            {`Programada: ${item.fechaProgramada ?? 'Sin fecha'} ${item.horaProgramada ?? ''}`}
                          </Typography>
                        </Box>

                        <Chip
                          size="small"
                          label={formatLabel(item.estadoVisita)}
                          color={getStatusColor(item.estadoVisita)}
                        />
                      </Box>

                      {item.encuestaRealizada !== null && item.encuestaRealizada !== undefined && (
                        <Typography component="p" variant="body2" sx={{ mt: 1 }}>
                          {`Encuesta realizada: ${item.encuestaRealizada ? 'Sí' : 'No'}`}
                        </Typography>
                      )}

                      {item.observacionEncuestador && (
                        <Typography component="p" variant="body2" sx={{ mt: 1 }}>
                          {item.observacionEncuestador}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>

      <Dialog open={openLlamada} onClose={() => setOpenLlamada(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Registrar gestión de llamada</DialogTitle>

        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={llamadaForm.llamadaConectada}
                  onChange={(event) => setLlamadaForm((current) => ({
                    ...current,
                    llamadaConectada: event.target.checked,
                  }))}
                />
              }
              label="Llamada conectada"
            />

            <FormControl fullWidth>
              <InputLabel>Resultado de llamada</InputLabel>

              <Select
                label="Resultado de llamada"
                value={llamadaForm.resultadoLlamada}
                onChange={(event) => setLlamadaForm((current) => ({
                  ...current,
                  resultadoLlamada: String(event.target.value),
                }))}
              >
                {resultados.map((item) => (
                  <MenuItem key={item.codigo} value={item.codigo}>
                    {item.nombre}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Fecha llamada"
              type="date"
              value={llamadaForm.fechaLlamada ?? ''}
              onChange={(event) => setLlamadaForm((current) => ({
                ...current,
                fechaLlamada: event.target.value || null,
              }))}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />

            <TextField
              label="Hora llamada"
              type="time"
              value={llamadaForm.horaLlamada ?? ''}
              onChange={(event) => setLlamadaForm((current) => ({
                ...current,
                horaLlamada: event.target.value || null,
              }))}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />

            <TextField
              label="Observación"
              value={llamadaForm.observacion ?? ''}
              onChange={(event) => setLlamadaForm((current) => ({
                ...current,
                observacion: event.target.value,
              }))}
              minRows={3}
              multiline
              fullWidth
            />
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenLlamada(false)}>
            Cancelar
          </Button>

          <Button
            variant="contained"
            disabled={savingLlamada || caseClosedOrCancelled}
            onClick={handleRegistrarLlamada}
          >
            Guardar llamada
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openVisita} onClose={() => setOpenVisita(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Asignar visita a encuestador</DialogTitle>

        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Encuestador</InputLabel>

              <Select
                label="Encuestador"
                value={visitaForm.encuestadorId ? String(visitaForm.encuestadorId) : ''}
                onChange={(event) => setVisitaForm((current) => ({
                  ...current,
                  encuestadorId: Number(event.target.value),
                }))}
              >
                {encuestadores.map((item) => (
                  <MenuItem key={item.id} value={String(item.id)}>
                    {item.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Fecha programada"
              type="date"
              value={visitaForm.fechaProgramada ?? ''}
              onChange={(event) => setVisitaForm((current) => ({
                ...current,
                fechaProgramada: event.target.value || null,
              }))}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />

            <TextField
              label="Hora programada"
              type="time"
              value={visitaForm.horaProgramada ?? ''}
              onChange={(event) => setVisitaForm((current) => ({
                ...current,
                horaProgramada: event.target.value || null,
              }))}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />

            <TextField
              label="Observación"
              value={visitaForm.observacion ?? ''}
              onChange={(event) => setVisitaForm((current) => ({
                ...current,
                observacion: event.target.value,
              }))}
              minRows={3}
              multiline
              fullWidth
            />
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenVisita(false)}>
            Cancelar
          </Button>

          <Button
            variant="contained"
            disabled={savingVisita || caseClosedOrCancelled}
            onClick={handleAsignarVisita}
          >
            Asignar visita
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(error)}
        autoHideDuration={6000}
        onClose={() => setError(null)}
      >
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={Boolean(success)}
        autoHideDuration={4000}
        onClose={() => setSuccess(null)}
      >
        <Alert severity="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
}

/**
 * Consulta el detalle principal del caso Call Center.
 *
 * @param id identificador del caso.
 * @returns información del caso.
 */
async function getCallCenterDetalle(id: string) {
  const response = await apiRequest<ApiResponse<CallCenterResponse> | CallCenterResponse>(
    `/api/callcenter/${id}?_t=${Date.now()}`
  );

  if (
    response &&
    typeof response === 'object' &&
    'data' in response
  ) {
    return response.data;
  }

  return response as CallCenterResponse;
}

/**
 * Componente visual para mostrar un dato principal del caso.
 */
function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography component="p" variant="caption" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>

      <Typography component="p" variant="body2" sx={{ fontWeight: 700 }}>
        {value}
      </Typography>
    </Box>
  );
}

/**
 * Obtiene un campo string opcional desde la respuesta sin romper el tipado.
 *
 * @param record registro Call Center.
 * @param field nombre del campo.
 * @returns valor string o null.
 */
function getStringField(record: CallCenterResponse, field: string) {
  const data = record as unknown as Record<string, unknown>;
  const value = data[field];

  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Valida si el estado del caso corresponde a un cierre operativo.
 *
 * @param value estado formal del caso.
 * @returns true si el caso no debe permitir nuevas acciones operativas.
 */
function isCaseClosedOrCancelled(value?: string | null) {
  const normalized = String(value ?? '').trim().toUpperCase();

  return normalized === 'CERRADO' || normalized === 'CANCELADO';
}

/**
 * Obtiene un mensaje de error legible.
 *
 * @param exception excepción recibida.
 * @param fallback mensaje por defecto.
 * @returns mensaje de error.
 */
function getErrorMessage(exception: unknown, fallback: string) {
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

/**
 * Convierte códigos técnicos en etiquetas legibles.
 *
 * @param value código técnico.
 * @returns etiqueta visible.
 */
function formatLabel(value?: string | null) {
  return String(value ?? 'Sin estado')
    .split('_')
    .join(' ')
    .toLowerCase()
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

/**
 * Define el color visual de los estados.
 *
 * @param value estado técnico.
 * @returns color del chip.
 */
function getStatusColor(value?: string | null): ChipColor {
  const normalized = String(value ?? '').toUpperCase();

  if (
    normalized.includes('REALIZADA') ||
    normalized.includes('CERRADO') ||
    normalized.includes('CONTACTADO_ACEPTA')
  ) {
    return 'success';
  }

  if (
    normalized.includes('PENDIENTE') ||
    normalized.includes('PROGRAMADA') ||
    normalized.includes('ASIGNADO')
  ) {
    return 'info';
  }

  if (
    normalized.includes('REPROGRAMADO') ||
    normalized.includes('NO_CONTACTADO') ||
    normalized.includes('NO_ATENDIDA')
  ) {
    return 'warning';
  }

  if (
    normalized.includes('CANCELADO') ||
    normalized.includes('NO_ACEPTA') ||
    normalized.includes('SIN_DISPOSICION')
  ) {
    return 'error';
  }

  return 'default';
}