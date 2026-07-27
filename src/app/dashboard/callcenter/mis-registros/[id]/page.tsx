'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcCallIcon from '@mui/icons-material/AddIcCall';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';

import { getCallCenterEncuestadoresOptions } from '@/services/callcenter.service';
import {
  asignarCallCenterVisita,
  getCallCenterLlamadas,
  getCallCenterResultadosLlamada,
  getCallCenterVisitas,
  registrarCallCenterLlamada,
} from '@/services/callcenter-workflow.service';
import {
  CallCenterGestionLlamadaRequest,
  CallCenterGestionLlamadaResponse,
  CallCenterResultadoLlamadaResponse,
  CallCenterSelectOption,
  CallCenterVisitaAsignacionRequest,
  CallCenterVisitaResponse,
} from '@/types/callcenter-workflow.types';

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
 * Permite consultar historial de llamadas, registrar una nueva gestión,
 * consultar visitas y asignar visita a encuestador.
 */
export default function PageCallCenterGestionCaso() {
  const router = useRouter();
  const params = useParams();

  const caseId = useMemo(() => {
    const value = params?.id;

    return Array.isArray(value) ? value[0] : value;
  }, [params]);

  const [loading, setLoading] = useState(true);
  const [savingLlamada, setSavingLlamada] = useState(false);
  const [savingVisita, setSavingVisita] = useState(false);

  const [resultados, setResultados] = useState<CallCenterResultadoLlamadaResponse[]>([]);
  const [llamadas, setLlamadas] = useState<CallCenterGestionLlamadaResponse[]>([]);
  const [visitas, setVisitas] = useState<CallCenterVisitaResponse[]>([]);
  const [encuestadores, setEncuestadores] = useState<CallCenterSelectOption[]>([]);

  const [openLlamada, setOpenLlamada] = useState(false);
  const [openVisita, setOpenVisita] = useState(false);

  const [llamadaForm, setLlamadaForm] = useState<CallCenterGestionLlamadaRequest>(initialLlamadaForm);
  const [visitaForm, setVisitaForm] = useState<CallCenterVisitaAsignacionRequest>(initialVisitaForm);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  /**
   * Carga la información operativa del caso.
   */
  async function loadData() {
    if (!caseId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [resultadosData, llamadasData, visitasData, encuestadoresData] = await Promise.all([
        getCallCenterResultadosLlamada(),
        getCallCenterLlamadas(caseId),
        getCallCenterVisitas(caseId),
        getCallCenterEncuestadoresOptions(),
      ]);

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
   * Registra una llamada y refresca el historial.
   */
  async function handleRegistrarLlamada() {
    if (!caseId) {
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
   * Asigna una visita a encuestador y refresca la lista.
   */
  async function handleAsignarVisita() {
    if (!caseId) {
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
      <Stack sx={{ minHeight: 320, alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
        <Typography component="p" sx={{ mt: 2 }}>
          Cargando gestión del caso...
        </Typography>
      </Stack>
    );
  }

  return (
    <Stack spacing={2}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={1}
        sx={{ justifyContent: 'space-between' }}
      >
        <Box>
          <Typography component="h1" variant="h5" sx={{ fontWeight: 700 }}>
            {`Gestión caso Call Center #${caseId ?? ''}`}
          </Typography>
          <Typography component="p" sx={{ color: 'text.secondary' }}>
            Historial de llamadas, asignación de visitas y trazabilidad del caso.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1}>
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
            onClick={() => setOpenLlamada(true)}
          >
            Registrar llamada
          </Button>

          <Button
            variant="contained"
            startIcon={<AssignmentIndIcon />}
            onClick={() => setOpenVisita(true)}
          >
            Asignar visita
          </Button>
        </Stack>
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '7fr 5fr' },
          gap: 2,
        }}
      >
        <Card>
          <CardContent>
            <Typography component="h2" variant="h6" sx={{ fontWeight: 700 }}>
              Historial de llamadas
            </Typography>

            <Divider sx={{ my: 2 }} />

            {llamadas.length === 0 ? (
              <Alert severity="info">Este caso aún no tiene llamadas registradas.</Alert>
            ) : (
              <Stack spacing={1.5}>
                {llamadas.map((item) => (
                  <Card key={item.id} variant="outlined">
                    <CardContent>
                      <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between' }}>
                        <Box>
                          <Typography component="p" sx={{ fontWeight: 700 }}>
                            {`Intento #${item.intentoNumero} - ${formatResultado(item.resultadoLlamada)}`}
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
                      </Stack>

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
              </Stack>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography component="h2" variant="h6" sx={{ fontWeight: 700 }}>
              Visitas de encuestadores
            </Typography>

            <Divider sx={{ my: 2 }} />

            {visitas.length === 0 ? (
              <Alert severity="info">Este caso aún no tiene visitas asignadas.</Alert>
            ) : (
              <Stack spacing={1.5}>
                {visitas.map((item) => (
                  <Card key={item.id} variant="outlined">
                    <CardContent>
                      <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between' }}>
                        <Box>
                          <Typography component="p" sx={{ fontWeight: 700 }}>
                            {item.encuestadorNombre ?? 'Encuestador no disponible'}
                          </Typography>
                          <Typography component="p" variant="body2" sx={{ color: 'text.secondary' }}>
                            {`Programada: ${item.fechaProgramada ?? 'Sin fecha'} ${item.horaProgramada ?? ''}`}
                          </Typography>
                        </Box>

                        <Chip size="small" label={item.estadoVisita} />
                      </Stack>

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
              </Stack>
            )}
          </CardContent>
        </Card>
      </Box>

      <Dialog open={openLlamada} onClose={() => setOpenLlamada(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Registrar gestión de llamada</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
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
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenLlamada(false)}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={savingLlamada}
            onClick={handleRegistrarLlamada}
          >
            Guardar llamada
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openVisita} onClose={() => setOpenVisita(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Asignar visita a encuestador</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Encuestador</InputLabel>
              <Select
                label="Encuestador"
                value={visitaForm.encuestadorId || ''}
                onChange={(event) => setVisitaForm((current) => ({
                  ...current,
                  encuestadorId: Number(event.target.value),
                }))}
              >
                {encuestadores.map((item) => (
                  <MenuItem key={item.id} value={item.id}>
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
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenVisita(false)}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={savingVisita}
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
    </Stack>
  );
}

/**
 * Obtiene un mensaje de error legible.
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
 * Convierte un código técnico en una etiqueta legible.
 */
function formatResultado(value: string) {
  return value
    .split('_')
    .join(' ')
    .toLowerCase()
    .replace(/^\w/, (letter) => letter.toUpperCase());
}
