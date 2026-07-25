'use client';

import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import EditIcon from '@mui/icons-material/Edit';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SearchIcon from '@mui/icons-material/Search';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  MenuItem,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { ChangeEvent, useEffect, useMemo, useState } from 'react';

import AccessMessage from '@/components/dashboard/AccessMessage';
import LoadingState from '@/components/dashboard/LoadingState';
import CrudPageHeader from '@/components/operational/CrudPageHeader';
import { canUpdateEncuestadorVisit, currentRole } from '@/lib/roleAccess';
import {
  getMisAsignacionesCallCenter,
  updateCallCenterVisita,
} from '@/services/callcenter.service';
import { PageResponse } from '@/types/api.types';
import {
  CallCenterResponse,
  CallCenterVisitaRequest,
  EstadoVisita,
} from '@/types/callcenter.types';

type SnackbarSeverity = 'success' | 'error' | 'warning' | 'info';

type FormState = {
  id?: number;
  estadoVisita: EstadoVisita;
  fechaVisitaReal: string;
  horaVisitaReal: string;
  encuestaRealizada: '' | 'YES' | 'NO';
  motivoNoEncuesta: string;
  fechaReprogramacion: string;
  observacionEncuestador: string;
  verificado: '' | 'YES' | 'NO';
};

const initialForm: FormState = {
  estadoVisita: 'PENDIENTE',
  fechaVisitaReal: '',
  horaVisitaReal: '',
  encuestaRealizada: '',
  motivoNoEncuesta: '',
  fechaReprogramacion: '',
  observacionEncuestador: '',
  verificado: '',
};

function normalizeSearchText(value?: string | number | boolean | null) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function matchesByFirstLetters(value: string | number | boolean | null | undefined, searchValue: string) {
  const searchText = normalizeSearchText(searchValue);

  if (!searchText) {
    return true;
  }

  const normalizedValue = normalizeSearchText(value);

  if (!normalizedValue) {
    return false;
  }

  return normalizedValue
    .split(/[\s\-_.]+/)
    .filter(Boolean)
    .some((word) => word.startsWith(searchText));
}

function matchesAnyByFirstLetters(searchValue: string, values: Array<string | number | boolean | null | undefined>) {
  const searchText = normalizeSearchText(searchValue);

  if (!searchText) {
    return true;
  }

  return values.some((value) => matchesByFirstLetters(value, searchText));
}

function booleanLabel(value?: boolean | null) {
  if (value === true) return 'Sí';
  if (value === false) return 'No';

  return '-';
}

function toBooleanOption(value?: boolean | null): '' | 'YES' | 'NO' {
  if (value === true) return 'YES';
  if (value === false) return 'NO';

  return '';
}

function fromBooleanOption(value: '' | 'YES' | 'NO') {
  if (value === 'YES') return true;
  if (value === 'NO') return false;

  return null;
}

function clean(value: string) {
  const safeValue = value.trim();

  return safeValue ? safeValue : null;
}

function statusColor(status?: string | null) {
  if (status === 'REALIZADA') return 'success';
  if (status === 'NO_ATENDIDA' || status === 'CANCELADA') return 'warning';
  if (status === 'REPROGRAMADA') return 'info';

  return 'default';
}

export default function MisAsignacionesCallCenterPage() {
  const [filter, setFilter] = useState({
    page: 0,
    size: 20,
  });

  const [pageData, setPageData] = useState<PageResponse<CallCenterResponse> | null>(null);
  const [loading, setLoading] = useState(true);
  const [restricted, setRestricted] = useState(false);
  const [error, setError] = useState('');
  const [tableSearch, setTableSearch] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<CallCenterResponse | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: SnackbarSeverity;
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const allowWrite = useMemo(() => canUpdateEncuestadorVisit(currentRole()), []);

  const currentPage = pageData?.page ?? 0;
  const currentSize = pageData?.size ?? 20;
  const totalRecords = pageData?.totalElements ?? 0;

  const rows = (pageData?.content ?? []).filter((row) =>
    matchesAnyByFirstLetters(tableSearch, [
      row.fechaAplicacionInformada,
      row.fechaEncuestaProgramada,
      row.cedulaSolicitante,
      row.nombreCompleto,
      row.telefono,
      row.direccionTexto,
      row.barrioNombre,
      row.comunaNombre,
      row.estadoVisita,
      row.encuestaRealizada ? 'realizada si' : 'realizada no',
    ])
  );

  const showSnackbar = (message: string, severity: SnackbarSeverity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const closeSnackbar = () => {
    setSnackbar({
      open: false,
      message: '',
      severity: 'success',
    });
  };

  const load = async (
    customFilter = filter
  ) => {
    setLoading(true);
    setRestricted(false);
    setError('');

    try {
      const response = await getMisAsignacionesCallCenter(customFilter);

      setPageData(response);
      setFilter(customFilter);
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : 'No fue posible consultar tus asignaciones.';

      if (message.toLowerCase().includes('forbidden') || message.includes('403')) {
        setRestricted(true);
      } else {
        setError(message);
        showSnackbar(message, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load({
      page: 0,
      size: 20,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openVisitDialog = (record: CallCenterResponse) => {
    setSelectedRecord(record);
    setForm({
      id: record.id,
      estadoVisita: (record.estadoVisita as EstadoVisita) || 'PENDIENTE',
      fechaVisitaReal: record.fechaVisitaReal ?? '',
      horaVisitaReal: record.horaVisitaReal ? record.horaVisitaReal.slice(0, 5) : '',
      encuestaRealizada: toBooleanOption(record.encuestaRealizada),
      motivoNoEncuesta: record.motivoNoEncuesta ?? '',
      fechaReprogramacion: record.fechaReprogramacion ?? '',
      observacionEncuestador: record.observacionEncuestador ?? '',
      verificado: toBooleanOption(record.verificado),
    });
    setDialogOpen(true);
  };

  const closeVisitDialog = () => {
    setDialogOpen(false);
    setSelectedRecord(null);
    setForm(initialForm);
  };

  const updateForm = (key: keyof FormState, value: string) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const validateForm = () => {
    if (!form.estadoVisita) {
      return 'Selecciona el estado de la visita.';
    }

    if (form.encuestaRealizada === 'NO' && !form.motivoNoEncuesta.trim()) {
      return 'Registra el motivo por el cual no se aplicó la encuesta.';
    }

    if (form.estadoVisita === 'REPROGRAMADA' && !form.fechaReprogramacion) {
      return 'Registra la nueva fecha de reprogramación.';
    }

    return '';
  };

  const buildRequest = (): CallCenterVisitaRequest => ({
    estadoVisita: form.estadoVisita,
    fechaVisitaReal: clean(form.fechaVisitaReal),
    horaVisitaReal: clean(form.horaVisitaReal),
    encuestaRealizada: fromBooleanOption(form.encuestaRealizada),
    motivoNoEncuesta: clean(form.motivoNoEncuesta),
    fechaReprogramacion: clean(form.fechaReprogramacion),
    observacionEncuestador: clean(form.observacionEncuestador),
    verificado: fromBooleanOption(form.verificado),
  });

  const saveVisit = async () => {
    if (!form.id) {
      return;
    }

    const validationMessage = validateForm();

    if (validationMessage) {
      showSnackbar(validationMessage, 'warning');
      return;
    }

    try {
      await updateCallCenterVisita(form.id, buildRequest());
      showSnackbar('Resultado de visita actualizado correctamente.', 'success');
      closeVisitDialog();
      await load(filter);
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : 'No fue posible actualizar el resultado de visita.';

      setError(message);
      showSnackbar(message, 'error');
    }
  };

  const handleChangePage = (_: unknown, newPage: number) => {
    void load({
      ...filter,
      page: newPage,
    });
  };

  const handleChangeRowsPerPage = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    void load({
      page: 0,
      size: Number(event.target.value),
    });
  };

  const clearLocalSearch = () => {
    setTableSearch('');
  };

  if (loading && !pageData) {
    return <LoadingState />;
  }

  return (
    <Stack spacing={3}>
      <CrudPageHeader
        title="Mis asignaciones"
        subtitle="Consulta tus registros asignados y actualiza el resultado de la visita."
        primaryAction={
          <Button
            variant="contained"
            startIcon={<AssignmentTurnedInIcon />}
            onClick={() => void load(filter)}
            disabled={loading}
          >
            Actualizar
          </Button>
        }
      />

      {restricted ? <AccessMessage /> : null}

      {error ? (
        <Alert severity="error">
          {error}
        </Alert>
      ) : null}

      {!allowWrite ? (
        <Alert severity="info">
          Tu rol permite consultar asignaciones, pero no actualizar resultados de visita.
        </Alert>
      ) : null}

      <Card sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
        <CardContent>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            sx={{
              alignItems: { xs: 'stretch', md: 'center' },
              justifyContent: 'space-between',
            }}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>
                Asignaciones del encuestador
              </Typography>

              <Typography color="text.secondary" sx={{ fontSize: 14 }}>
                Solo se muestran los registros asociados al encuestador autenticado.
              </Typography>
            </Box>

            <Chip
              label={`${totalRecords} asignación${totalRecords === 1 ? '' : 'es'}`}
              color="primary"
              variant="outlined"
            />
          </Stack>

          <Divider sx={{ my: 2 }} />

          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={1}
            sx={{ alignItems: { xs: 'stretch', md: 'center' } }}
          >
            <TextField
              placeholder="Buscar por primeras letras..."
              size="small"
              value={tableSearch}
              onChange={(event) => setTableSearch(event.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{ width: { xs: '100%', md: 520 } }}
            />

            <Button
              variant="outlined"
              startIcon={<RestartAltIcon />}
              onClick={clearLocalSearch}
            >
              Limpiar
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card
        sx={{
          borderRadius: 4,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 16px 40px rgba(15, 23, 42, 0.08)',
        }}
      >
        <Box sx={{ overflowX: 'auto' }}>
          <Table sx={{ minWidth: 1200 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 900 }}>Fecha</TableCell>
                <TableCell sx={{ fontWeight: 900 }}>Solicitante</TableCell>
                <TableCell sx={{ fontWeight: 900 }}>Teléfono</TableCell>
                <TableCell sx={{ fontWeight: 900 }}>Dirección/Barrio</TableCell>
                <TableCell sx={{ fontWeight: 900 }}>Estado visita</TableCell>
                <TableCell sx={{ fontWeight: 900 }}>Encuesta</TableCell>
                <TableCell sx={{ fontWeight: 900 }}>Verificada</TableCell>
                <TableCell sx={{ fontWeight: 900 }} align="center">Acción</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>
                    <Typography sx={{ fontWeight: 700 }}>
                      {row.fechaAplicacionInformada || row.fechaEncuestaProgramada || row.fechaLlamada}
                    </Typography>

                    <Typography color="text.secondary" sx={{ fontSize: 12 }}>
                      Llamada: {row.fechaLlamada} {row.horaLlamada || ''}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Typography sx={{ fontWeight: 800, minWidth: 240 }}>
                      {row.nombreCompleto}
                    </Typography>

                    <Typography color="text.secondary" sx={{ fontSize: 12 }}>
                      C.C. {row.cedulaSolicitante}
                    </Typography>
                  </TableCell>

                  <TableCell>{row.telefono || '-'}</TableCell>

                  <TableCell>
                    <Typography sx={{ minWidth: 220 }}>
                      {row.direccionTexto || row.barrioNombre || '-'}
                    </Typography>

                    <Typography color="text.secondary" sx={{ fontSize: 12 }}>
                      {row.comunaNombre || ''}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Chip
                      label={row.estadoVisita || 'PENDIENTE'}
                      size="small"
                      color={statusColor(row.estadoVisita) as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'}
                      variant="outlined"
                      sx={{ fontWeight: 800 }}
                    />
                  </TableCell>

                  <TableCell>
                    <Chip
                      label={booleanLabel(row.encuestaRealizada)}
                      size="small"
                      color={row.encuestaRealizada ? 'success' : 'default'}
                      variant="outlined"
                    />
                  </TableCell>

                  <TableCell>
                    <Chip
                      label={booleanLabel(row.verificado)}
                      size="small"
                      color={row.verificado ? 'success' : 'default'}
                      variant="outlined"
                    />
                  </TableCell>

                  <TableCell align="center">
                    <IconButton
                      onClick={() => openVisitDialog(row)}
                      disabled={!allowWrite}
                      sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 2,
                      }}
                    >
                      <EditIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}

              {!rows.length ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <Box sx={{ py: 5, textAlign: 'center' }}>
                      <Typography variant="h6">
                        No hay asignaciones para mostrar
                      </Typography>

                      <Typography color="text.secondary" sx={{ mt: 1 }}>
                        Revisa que el usuario esté vinculado a un encuestador.
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </Box>

        <TablePagination
          component="div"
          count={totalRecords}
          page={currentPage}
          onPageChange={handleChangePage}
          rowsPerPage={currentSize}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[10, 20, 50]}
          labelRowsPerPage="Filas por página"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} de ${count !== -1 ? count : `más de ${to}`}`
          }
        />
      </Card>

      <Dialog
        open={dialogOpen}
        onClose={closeVisitDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 900 }}>
          Registrar resultado de visita
        </DialogTitle>

        <DialogContent>
          <Stack spacing={3} sx={{ pt: 1 }}>
            {selectedRecord ? (
              <Alert severity="info">
                {selectedRecord.nombreCompleto} · C.C. {selectedRecord.cedulaSolicitante} · {selectedRecord.direccionTexto || selectedRecord.barrioNombre || 'Sin dirección'}
              </Alert>
            ) : null}

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  md: 'repeat(2, 1fr)',
                },
                gap: 2,
              }}
            >
              <TextField
                select
                label="Estado de visita"
                size="small"
                value={form.estadoVisita}
                onChange={(event) => updateForm('estadoVisita', event.target.value)}
              >
                <MenuItem value="PENDIENTE">Pendiente</MenuItem>
                <MenuItem value="PROGRAMADA">Programada</MenuItem>
                <MenuItem value="REALIZADA">Realizada</MenuItem>
                <MenuItem value="NO_ATENDIDA">No atendida</MenuItem>
                <MenuItem value="REPROGRAMADA">Reprogramada</MenuItem>
                <MenuItem value="CANCELADA">Cancelada</MenuItem>
              </TextField>

              <TextField
                select
                label="¿Encuesta realizada?"
                size="small"
                value={form.encuestaRealizada}
                onChange={(event) => updateForm('encuestaRealizada', event.target.value)}
              >
                <MenuItem value="">Sin definir</MenuItem>
                <MenuItem value="YES">Sí</MenuItem>
                <MenuItem value="NO">No</MenuItem>
              </TextField>

              <TextField
                label="Fecha real de visita"
                type="date"
                size="small"
                value={form.fechaVisitaReal}
                onChange={(event) => updateForm('fechaVisitaReal', event.target.value)}
                slotProps={{
                  inputLabel: {
                    shrink: true,
                  },
                }}
              />

              <TextField
                label="Hora real de visita"
                type="time"
                size="small"
                value={form.horaVisitaReal}
                onChange={(event) => updateForm('horaVisitaReal', event.target.value)}
                slotProps={{
                  inputLabel: {
                    shrink: true,
                  },
                }}
              />

              {form.encuestaRealizada === 'NO' ? (
                <TextField
                  label="Motivo no encuesta"
                  size="small"
                  value={form.motivoNoEncuesta}
                  onChange={(event) => updateForm('motivoNoEncuesta', event.target.value)}
                  multiline
                  minRows={2}
                />
              ) : null}

              {form.estadoVisita === 'REPROGRAMADA' ? (
                <TextField
                  label="Fecha reprogramación"
                  type="date"
                  size="small"
                  value={form.fechaReprogramacion}
                  onChange={(event) => updateForm('fechaReprogramacion', event.target.value)}
                  slotProps={{
                    inputLabel: {
                      shrink: true,
                    },
                  }}
                />
              ) : null}

              <TextField
                select
                label="Verificada"
                size="small"
                value={form.verificado}
                onChange={(event) => updateForm('verificado', event.target.value)}
              >
                <MenuItem value="">Sin definir</MenuItem>
                <MenuItem value="YES">Sí</MenuItem>
                <MenuItem value="NO">No</MenuItem>
              </TextField>

              <TextField
                label="Observación del encuestador"
                size="small"
                value={form.observacionEncuestador}
                onChange={(event) => updateForm('observacionEncuestador', event.target.value)}
                multiline
                minRows={3}
                sx={{ gridColumn: { md: '1 / -1' } }}
              />
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button
            variant="outlined"
            color="inherit"
            onClick={closeVisitDialog}
          >
            Cancelar
          </Button>

          <Button
            variant="contained"
            onClick={saveVisit}
            disabled={!allowWrite}
          >
            Guardar resultado
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3500}
        onClose={closeSnackbar}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
          onClose={closeSnackbar}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
