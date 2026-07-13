'use client';

import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import PreviewIcon from '@mui/icons-material/Preview';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';

import { ApiClientError } from '@/lib/apiClient';
import {
  downloadVentanillaSolicitudesPdf,
  previewVentanillaSolicitudes,
  VentanillaSolicitudPreviewResponse,
} from '@/services/report.service';

type SnackbarSeverity = 'success' | 'error' | 'warning' | 'info';

type SnackbarState = {
  open: boolean;
  message: string;
  severity: SnackbarSeverity;
};

type FormState = {
  fechaInicio: string;
  fechaFin: string;
};

const MAX_RANGE_DAYS = 1825;

const initialSnackbar: SnackbarState = {
  open: false,
  message: '',
  severity: 'success',
};

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function getDaysBetween(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  const diff = end.getTime() - start.getTime();

  return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
}

const initialForm: FormState = {
  fechaInicio: getTodayDate(),
  fechaFin: getTodayDate(),
};

function formatPercent(value: number) {
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

function getGroupingLabel(tipoAgrupacion?: string) {
  return tipoAgrupacion === 'MENSUAL' ? 'Mensual' : 'Diaria';
}

export default function ReportesPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [preview, setPreview] = useState<VentanillaSolicitudPreviewResponse | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState<SnackbarState>(initialSnackbar);

  const showSnackbar = (
    message: string,
    severity: SnackbarSeverity = 'success'
  ) => {
    setSnackbar({
      open: true,
      message,
      severity,
    });
  };

  const closeSnackbar = () => {
    setSnackbar(initialSnackbar);
  };

  const updateForm = (key: keyof FormState, value: string) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));

    setPreview(null);
  };

  const clearForm = () => {
    setError('');
    setPreview(null);
    setForm(initialForm);
  };

  const validateForm = () => {
    if (!form.fechaInicio) {
      return 'La fecha inicio es obligatoria.';
    }

    if (!form.fechaFin) {
      return 'La fecha fin es obligatoria.';
    }

    if (form.fechaFin < form.fechaInicio) {
      return 'La fecha fin no puede ser menor que la fecha inicio.';
    }

    const totalDays = getDaysBetween(form.fechaInicio, form.fechaFin);

    if (totalDays > MAX_RANGE_DAYS) {
      return 'El rango máximo permitido es de 5 años.';
    }

    return '';
  };

  const handlePreview = async () => {
    setError('');

    const validationMessage = validateForm();

    if (validationMessage) {
      setError(validationMessage);
      showSnackbar(validationMessage, 'warning');
      return;
    }

    setLoadingPreview(true);

    try {
      const response = await previewVentanillaSolicitudes({
        fechaInicio: form.fechaInicio,
        fechaFin: form.fechaFin,
      });

      setPreview(response);

      if (response.filas.length === 0) {
        showSnackbar('No hay registros para el periodo seleccionado.', 'info');
      } else {
        showSnackbar('Previsualización generada correctamente.', 'success');
      }
    } catch (err) {
      const message = err instanceof ApiClientError
        ? err.message
        : 'No fue posible generar la previsualización.';

      setError(message);
      showSnackbar(message, 'error');
    } finally {
      setLoadingPreview(false);
    }
  };

  const generateReport = async () => {
    setError('');

    const validationMessage = validateForm();

    if (validationMessage) {
      setError(validationMessage);
      showSnackbar(validationMessage, 'warning');
      return;
    }

    setLoadingPdf(true);

    try {
      await downloadVentanillaSolicitudesPdf({
        fechaInicio: form.fechaInicio,
        fechaFin: form.fechaFin,
      });

      showSnackbar('Reporte PDF generado correctamente.', 'success');
    } catch (err) {
      const message = err instanceof ApiClientError
        ? err.message
        : 'No fue posible generar el reporte PDF.';

      setError(message);
      showSnackbar(message, 'error');
    } finally {
      setLoadingPdf(false);
    }
  };

  const loading = loadingPreview || loadingPdf;
  const totalDays = getDaysBetween(form.fechaInicio, form.fechaFin);
  const estimatedGrouping = totalDays > 31 ? 'mensual' : 'diaria';

  return (
    <Stack spacing={3}>
      <Card sx={{ borderRadius: 4, overflow: 'hidden' }}>
        <CardContent
          sx={{
            p: { xs: 3, md: 4 },
            background:
              'linear-gradient(135deg, rgba(25, 118, 210, 0.10), rgba(25, 118, 210, 0.02))',
          }}
        >
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            sx={{
              alignItems: { xs: 'flex-start', md: 'center' },
              justifyContent: 'space-between',
            }}
          >
            <Box>
              <Chip
                label="Reportes"
                color="primary"
                variant="outlined"
                sx={{ mb: 1.5 }}
              />

              <Typography variant="h4" sx={{ fontWeight: 800 }}>
                Generación de reportes
              </Typography>

              <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 760 }}>
                Genera y previsualiza el informe de solicitudes de Ventanilla agrupado por
                tipo de solicitud, periodo, total general y porcentaje.
              </Typography>
            </Box>

            <Button
              variant="contained"
              startIcon={<CloudDownloadIcon />}
              onClick={generateReport}
              disabled={loading}
            >
              {loadingPdf ? 'Generando...' : 'Generar PDF'}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {error ? (
        <Alert severity="error">
          {error}
        </Alert>
      ) : null}

      <Card
        sx={{
          borderRadius: 4,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Stack spacing={3}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                Informe de solicitudes - Ventanilla
              </Typography>

              <Typography color="text.secondary" sx={{ fontSize: 14, mt: 0.5 }}>
                Selecciona el periodo, previsualiza la tabla y luego descarga el PDF.
              </Typography>
            </Box>

            <Divider />

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  md: 'repeat(2, minmax(220px, 320px))',
                },
                gap: 2,
              }}
            >
              <TextField
                label="Fecha inicio"
                type="date"
                size="small"
                required
                value={form.fechaInicio}
                onChange={(event) => updateForm('fechaInicio', event.target.value)}
                slotProps={{
                  inputLabel: {
                    shrink: true,
                  },
                }}
              />

              <TextField
                label="Fecha fin"
                type="date"
                size="small"
                required
                value={form.fechaFin}
                onChange={(event) => updateForm('fechaFin', event.target.value)}
                slotProps={{
                  inputLabel: {
                    shrink: true,
                  },
                }}
              />
            </Box>

            <Alert severity="info">
              La previsualización muestra registros activos de Ventanilla. Para rangos de hasta
              31 días se agrupa por día; para rangos superiores se agrupa por mes. Rango actual:
              {' '}
              <strong>{totalDays}</strong>
              {' '}
              días, agrupación estimada:
              {' '}
              <strong>{estimatedGrouping}</strong>.
            </Alert>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              sx={{ alignItems: { xs: 'stretch', sm: 'center' } }}
            >
              <Button
                variant="outlined"
                startIcon={<PreviewIcon />}
                onClick={handlePreview}
                disabled={loading}
              >
                {loadingPreview ? 'Consultando...' : 'Previsualizar'}
              </Button>

              <Button
                variant="contained"
                startIcon={<CloudDownloadIcon />}
                onClick={generateReport}
                disabled={loading}
              >
                {loadingPdf ? 'Generando PDF...' : 'Generar PDF'}
              </Button>

              <Button
                variant="outlined"
                startIcon={<RestartAltIcon />}
                onClick={clearForm}
                disabled={loading}
              >
                Limpiar
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {preview ? (
        <Card
          sx={{
            borderRadius: 4,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  Previsualización del reporte
                </Typography>

                <Typography color="text.secondary" sx={{ fontSize: 14, mt: 0.5 }}>
                  Total general del periodo: <strong>{preview.totalGeneral}</strong>
                  {' · '}
                  Agrupación: <strong>{getGroupingLabel(preview.tipoAgrupacion)}</strong>
                </Typography>
              </Box>

              <TableContainer
                component={Paper}
                variant="outlined"
                sx={{
                  maxHeight: 560,
                  overflowX: 'auto',
                }}
              >
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell
                        sx={{
                          fontWeight: 800,
                          minWidth: 320,
                          position: 'sticky',
                          left: 0,
                          zIndex: 3,
                          backgroundColor: 'background.paper',
                        }}
                      >
                        Solicitudes
                      </TableCell>

                      {preview.fechas.map((fecha) => (
                        <TableCell
                          key={fecha}
                          align="center"
                          sx={{ fontWeight: 800, minWidth: 110 }}
                        >
                          {fecha}
                        </TableCell>
                      ))}

                      <TableCell align="center" sx={{ fontWeight: 800, minWidth: 120 }}>
                        Total general
                      </TableCell>

                      <TableCell align="center" sx={{ fontWeight: 800, minWidth: 90 }}>
                        %
                      </TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {preview.filas.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={preview.fechas.length + 3}
                          align="center"
                        >
                          No hay registros para el periodo seleccionado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      preview.filas.map((row) => (
                        <TableRow key={row.solicitud} hover>
                          <TableCell
                            sx={{
                              fontWeight: 600,
                              position: 'sticky',
                              left: 0,
                              zIndex: 2,
                              backgroundColor: 'background.paper',
                            }}
                          >
                            {row.solicitud}
                          </TableCell>

                          {preview.fechas.map((fecha) => {
                            const value = row.cantidadesPorFecha[fecha] ?? 0;

                            return (
                              <TableCell key={fecha} align="center">
                                {value > 0 ? value : ''}
                              </TableCell>
                            );
                          })}

                          <TableCell align="center" sx={{ fontWeight: 700 }}>
                            {row.totalGeneral}
                          </TableCell>

                          <TableCell align="center">
                            {formatPercent(row.porcentaje)} %
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Stack>
          </CardContent>
        </Card>
      ) : null}

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