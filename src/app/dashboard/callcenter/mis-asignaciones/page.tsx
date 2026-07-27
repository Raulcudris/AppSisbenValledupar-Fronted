'use client';

import { useEffect, useState } from 'react';
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
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  TablePagination,
  TextField,
  Typography,
} from '@mui/material';
import FactCheckIcon from '@mui/icons-material/FactCheck';

import {
  actualizarCallCenterResultadoVisita,
  getMisCallCenterVisitas,
} from '@/services/callcenter-workflow.service';
import {
  CallCenterEstadoVisita,
  CallCenterVisitaResponse,
  CallCenterVisitaResultadoRequest,
} from '@/types/callcenter-workflow.types';

/**
 * Estados permitidos para actualizar visitas desde frontend.
 */
const ESTADOS_VISITA: CallCenterEstadoVisita[] = [
  'REALIZADA',
  'NO_ATENDIDA',
  'REPROGRAMADA',
  'CANCELADA',
];

/**
 * Estado inicial del formulario de resultado de visita.
 */
const initialResultadoForm: CallCenterVisitaResultadoRequest = {
  estadoVisita: 'REALIZADA',
  fechaVisitaReal: null,
  horaVisitaReal: null,
  encuestaRealizada: true,
  motivoNoEncuesta: '',
  fechaReprogramacion: null,
  observacionEncuestador: '',
};

/**
 * Página de mis asignaciones de visitas para encuestadores.
 *
 * Permite consultar visitas asignadas y reportar el resultado operativo.
 */
export default function PageMisAsignacionesCallCenter() {
  const [items, setItems] = useState<CallCenterVisitaResponse[]>([]);
  const [selected, setSelected] = useState<CallCenterVisitaResponse | null>(null);
  const [form, setForm] = useState<CallCenterVisitaResultadoRequest>(initialResultadoForm);

  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  /**
   * Carga las visitas asignadas al usuario autenticado.
   */
  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const response = await getMisCallCenterVisitas(page, size);
      const content = response.content ?? response.items ?? response.data ?? [];

      setItems(content);
      setTotal(response.totalElements ?? response.totalItems ?? response.total ?? content.length);
    } catch (exception) {
      setError(getErrorMessage(exception, 'No fue posible cargar las asignaciones.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, size]);

  /**
   * Abre el formulario para registrar el resultado de la visita.
   *
   * @param item visita seleccionada.
   */
  function handleOpenResultado(item: CallCenterVisitaResponse) {
    const now = new Date();

    setSelected(item);
    setForm({
      estadoVisita: 'REALIZADA',
      fechaVisitaReal: now.toISOString().slice(0, 10),
      horaVisitaReal: now.toTimeString().slice(0, 5),
      encuestaRealizada: true,
      motivoNoEncuesta: '',
      fechaReprogramacion: null,
      observacionEncuestador: '',
    });
  }

  /**
   * Guarda el resultado operativo de la visita seleccionada.
   */
  async function handleSaveResultado() {
    if (!selected) {
      return;
    }

    try {
      setSaving(true);
      setError(null);

      await actualizarCallCenterResultadoVisita(selected.id, form);

      setSuccess('Resultado de visita actualizado correctamente.');
      setSelected(null);
      await loadData();
    } catch (exception) {
      setError(getErrorMessage(exception, 'No fue posible actualizar el resultado de visita.'));
    } finally {
      setSaving(false);
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
          Cargando asignaciones...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box>
        <Typography component="h1" variant="h5" sx={{ fontWeight: 700 }}>
          Mis asignaciones
        </Typography>

        <Typography component="p" sx={{ color: 'text.secondary' }}>
          Consulta las visitas asignadas y registra el resultado de campo.
        </Typography>
      </Box>

      {items.length === 0 ? (
        <Alert severity="info">No tienes visitas asignadas en este momento.</Alert>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              md: '1fr 1fr',
              lg: '1fr 1fr 1fr',
            },
            gap: 2,
          }}
        >
          {items.map((item) => (
            <Card key={item.id} variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 1,
                    }}
                  >
                    <Typography component="p" sx={{ fontWeight: 700 }}>
                      {`Caso #${item.callCenterRegistroId}`}
                    </Typography>

                    <Chip size="small" label={item.estadoVisita} />
                  </Box>

                  <Typography component="p" variant="body2" sx={{ color: 'text.secondary' }}>
                    {`Encuestador: ${item.encuestadorNombre ?? 'No disponible'}`}
                  </Typography>

                  <Typography component="p" variant="body2" sx={{ color: 'text.secondary' }}>
                    {`Programada: ${item.fechaProgramada ?? 'Sin fecha'} ${item.horaProgramada ?? ''}`}
                  </Typography>

                  {item.observacionEncuestador && (
                    <Typography component="p" variant="body2">
                      {item.observacionEncuestador}
                    </Typography>
                  )}

                  <Button
                    variant="contained"
                    startIcon={<FactCheckIcon />}
                    onClick={() => handleOpenResultado(item)}
                  >
                    Registrar resultado
                  </Button>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      <TablePagination
        component="div"
        count={total}
        page={page}
        rowsPerPage={size}
        onPageChange={(_, newPage) => setPage(newPage)}
        onRowsPerPageChange={(event) => {
          setSize(Number(event.target.value));
          setPage(0);
        }}
        rowsPerPageOptions={[10, 20, 50]}
      />

      <Dialog open={Boolean(selected)} onClose={() => setSelected(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Registrar resultado de visita</DialogTitle>

        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Estado visita</InputLabel>

              <Select
                label="Estado visita"
                value={form.estadoVisita}
                onChange={(event) => {
                  const estado = event.target.value as CallCenterEstadoVisita;

                  setForm((current) => ({
                    ...current,
                    estadoVisita: estado,
                    encuestaRealizada: estado === 'REALIZADA',
                  }));
                }}
              >
                {ESTADOS_VISITA.map((estado) => (
                  <MenuItem key={estado} value={estado}>
                    {formatEstadoVisita(estado)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Fecha visita real"
              type="date"
              value={form.fechaVisitaReal ?? ''}
              onChange={(event) => setForm((current) => ({
                ...current,
                fechaVisitaReal: event.target.value || null,
              }))}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />

            <TextField
              label="Hora visita real"
              type="time"
              value={form.horaVisitaReal ?? ''}
              onChange={(event) => setForm((current) => ({
                ...current,
                horaVisitaReal: event.target.value || null,
              }))}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />

            {form.estadoVisita !== 'REALIZADA' && (
              <TextField
                label="Motivo no encuesta"
                value={form.motivoNoEncuesta ?? ''}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  motivoNoEncuesta: event.target.value,
                }))}
                fullWidth
              />
            )}

            {form.estadoVisita === 'REPROGRAMADA' && (
              <TextField
                label="Fecha reprogramación"
                type="date"
                value={form.fechaReprogramacion ?? ''}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  fechaReprogramacion: event.target.value || null,
                }))}
                slotProps={{ inputLabel: { shrink: true } }}
                fullWidth
              />
            )}

            <TextField
              label="Observación del encuestador"
              value={form.observacionEncuestador ?? ''}
              onChange={(event) => setForm((current) => ({
                ...current,
                observacionEncuestador: event.target.value,
              }))}
              multiline
              minRows={3}
              fullWidth
            />
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setSelected(null)}>
            Cancelar
          </Button>

          <Button
            variant="contained"
            disabled={saving}
            onClick={handleSaveResultado}
          >
            Guardar resultado
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
 * Convierte un estado técnico de visita en una etiqueta visible.
 *
 * @param value estado técnico.
 * @returns etiqueta legible.
 */
function formatEstadoVisita(value: string) {
  return value
    .split('_')
    .join(' ')
    .toLowerCase()
    .replace(/^\w/, (letter) => letter.toUpperCase());
}