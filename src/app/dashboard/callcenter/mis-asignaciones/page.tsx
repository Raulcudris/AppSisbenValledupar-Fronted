'use client';

import FactCheckIcon from '@mui/icons-material/FactCheck';
import RefreshIcon from '@mui/icons-material/Refresh';
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
import { useEffect, useState } from 'react';

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
 * Esta vista pertenece al flujo del FUNCIONARIO_ENCUESTADOR.
 * Permite consultar únicamente las visitas asignadas al usuario autenticado
 * y registrar el resultado operativo de campo.
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
   * Carga las visitas asignadas al encuestador autenticado.
   */
  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const response = await getMisCallCenterVisitas(page, size);
      const content = getPageContent<CallCenterVisitaResponse>(response);

      setItems(content);
      setTotal(getTotalElements(response, content.length));
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
   * Refresca manualmente las visitas asignadas.
   */
  function refresh() {
    loadData();
  }

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
   * Cierra el formulario de resultado.
   */
  function handleCloseResultado() {
    setSelected(null);
    setForm(initialResultadoForm);
  }

  /**
   * Cambia el estado de visita seleccionado y ajusta campos relacionados.
   *
   * @param estado estado seleccionado.
   */
  function handleChangeEstadoVisita(estado: CallCenterEstadoVisita) {
    setForm((current) => ({
      ...current,
      estadoVisita: estado,
      encuestaRealizada: estado === 'REALIZADA',
      motivoNoEncuesta: estado === 'REALIZADA' ? '' : current.motivoNoEncuesta,
      fechaReprogramacion: estado === 'REPROGRAMADA' ? current.fechaReprogramacion : null,
    }));
  }

  /**
   * Guarda el resultado operativo de la visita seleccionada.
   */
  async function handleSaveResultado() {
    if (!selected) {
      return;
    }

    if (form.estadoVisita !== 'REALIZADA' && !form.motivoNoEncuesta?.trim()) {
      setError('Debes registrar el motivo cuando la visita no queda realizada.');
      return;
    }

    if (form.estadoVisita === 'REPROGRAMADA' && !form.fechaReprogramacion) {
      setError('Debes seleccionar la fecha de reprogramación.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      await actualizarCallCenterResultadoVisita(selected.id, form);

      setSuccess('Resultado de visita actualizado correctamente.');
      handleCloseResultado();
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
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          gap: 1.5,
        }}
      >
        <Box>
          <Typography component="h1" variant="h5" sx={{ fontWeight: 800 }}>
            Mis asignaciones
          </Typography>

          <Typography component="p" variant="body2" sx={{ color: 'text.secondary' }}>
            Consulta tus visitas asignadas y registra el resultado de campo.
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={refresh}
          disabled={loading}
        >
          Actualizar
        </Button>
      </Box>

      {items.length === 0 ? (
        <Alert severity="info">
          No tienes visitas asignadas en este momento.
        </Alert>
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
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 1,
                    }}
                  >
                    <Box>
                      <Typography component="p" sx={{ fontWeight: 800 }}>
                        {`Caso #${item.callCenterRegistroId}`}
                      </Typography>

                      <Typography component="p" variant="caption" sx={{ color: 'text.secondary' }}>
                        {`Visita #${item.id}`}
                      </Typography>
                    </Box>

                    <Chip
                      size="small"
                      label={formatLabel(item.estadoVisita)}
                      color={getStatusColor(item.estadoVisita)}
                    />
                  </Box>

                  <InfoItem
                    label="Encuestador"
                    value={item.encuestadorNombre ?? 'No disponible'}
                  />

                  <InfoItem
                    label="Fecha programada"
                    value={`${item.fechaProgramada ?? 'Sin fecha'} ${item.horaProgramada ?? ''}`.trim()}
                  />

                  {item.fechaVisitaReal && (
                    <InfoItem
                      label="Fecha visita real"
                      value={`${item.fechaVisitaReal} ${item.horaVisitaReal ?? ''}`.trim()}
                    />
                  )}

                  {item.encuestaRealizada !== null && item.encuestaRealizada !== undefined && (
                    <InfoItem
                      label="Encuesta realizada"
                      value={item.encuestaRealizada ? 'Sí' : 'No'}
                    />
                  )}

                  {item.motivoNoEncuesta && (
                    <InfoItem
                      label="Motivo no encuesta"
                      value={item.motivoNoEncuesta}
                    />
                  )}

                  {item.observacionEncuestador && (
                    <Box>
                      <Typography component="p" variant="caption" sx={{ color: 'text.secondary' }}>
                        Observación
                      </Typography>

                      <Typography component="p" variant="body2">
                        {item.observacionEncuestador}
                      </Typography>
                    </Box>
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
        labelRowsPerPage="Filas"
      />

      <Dialog open={Boolean(selected)} onClose={handleCloseResultado} maxWidth="sm" fullWidth>
        <DialogTitle>Registrar resultado de visita</DialogTitle>

        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Estado visita</InputLabel>

              <Select
                label="Estado visita"
                value={form.estadoVisita}
                onChange={(event) => {
                  handleChangeEstadoVisita(event.target.value as CallCenterEstadoVisita);
                }}
              >
                {ESTADOS_VISITA.map((estado) => (
                  <MenuItem key={estado} value={estado}>
                    {formatLabel(estado)}
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
                required
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
                required
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
          <Button onClick={handleCloseResultado}>
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
 * Componente auxiliar para mostrar un dato breve de la visita.
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
 * Extrae el contenido de una respuesta paginada de forma tolerante.
 *
 * @param pageResponse respuesta recibida.
 * @returns arreglo de registros.
 */
function getPageContent<T>(pageResponse: unknown): T[] {
  const data = pageResponse as {
    content?: T[];
    items?: T[];
    data?: T[];
  };

  return data.content ?? data.items ?? data.data ?? [];
}

/**
 * Obtiene el total de registros de una respuesta paginada.
 *
 * @param pageResponse respuesta recibida.
 * @param fallback total alternativo.
 * @returns total de registros.
 */
function getTotalElements(pageResponse: unknown, fallback: number) {
  const data = pageResponse as {
    totalElements?: number;
    totalItems?: number;
    total?: number;
    totalRecords?: number;
  };

  return data.totalElements ?? data.totalItems ?? data.total ?? data.totalRecords ?? fallback;
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

  if (normalized.includes('REALIZADA')) {
    return 'success';
  }

  if (normalized.includes('PENDIENTE') || normalized.includes('PROGRAMADA')) {
    return 'info';
  }

  if (normalized.includes('REPROGRAMADA') || normalized.includes('NO_ATENDIDA')) {
    return 'warning';
  }

  if (normalized.includes('CANCELADA')) {
    return 'error';
  }

  return 'default';
}