'use client';

import RefreshIcon from '@mui/icons-material/Refresh';
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableFooter,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { ChangeEvent, useCallback, useEffect, useState } from 'react';

import { getMisRegistrosCallCenter } from '@/services/callcenter.service';
import { PageResponse } from '@/types/api.types';
import { CallCenterResponse } from '@/types/callcenter.types';
import VisibilityIcon from '@mui/icons-material/Visibility';

/**
 * Estado local para mostrar mensajes informativos, exitosos o de error.
 */
type SnackbarState = {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'warning' | 'info';
};

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
 * Página de casos asignados al funcionario Call Center autenticado.
 *
 * Esta pantalla solo lista los casos asignados y permite abrir la gestión
 * operativa del caso. La asignación de visita y el registro de llamadas
 * se realizan en la pantalla de detalle.
 */
export default function MisRegistrosCallCenterPage() {
  const router = useRouter();

  const [pageData, setPageData] = useState<PageResponse<CallCenterResponse> | null>(null);
  const [loading, setLoading] = useState(false);

  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success',
  });

  const records = pageData?.content ?? [];
  const page = pageData?.page ?? 0;
  const size = pageData?.size ?? 20;
  const total = pageData?.totalElements ?? 0;

  /**
   * Muestra un mensaje de estado al usuario.
   *
   * @param message mensaje visible.
   * @param severity tipo de mensaje.
   */
  function showMessage(
    message: string,
    severity: SnackbarState['severity'] = 'success',
  ) {
    setSnackbar({
      open: true,
      message,
      severity,
    });
  }

  /**
   * Cierra el mensaje emergente.
   */
  function closeSnackbar() {
    setSnackbar((current) => ({
      ...current,
      open: false,
    }));
  }

  /**
   * Carga los registros asignados al funcionario Call Center autenticado.
   *
   * @param nextPage página solicitada.
   * @param nextSize tamaño de página.
   */
  const load = useCallback(async (nextPage = 0, nextSize = 20) => {
    setLoading(true);

    try {
      const response = await getMisRegistrosCallCenter({
        page: nextPage,
        size: nextSize,
      });

      setPageData(response);
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'No fue posible cargar tus registros asignados.';

      showMessage(message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(0, 20);
  }, [load]);

  /**
   * Cambia la página de la tabla.
   *
   * @param _ evento no utilizado.
   * @param nextPage página siguiente.
   */
  function handlePageChange(_: unknown, nextPage: number) {
    load(nextPage, size);
  }

  /**
   * Cambia el tamaño de página.
   *
   * @param event evento del selector de tamaño.
   */
  function handleRowsPerPageChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    load(0, Number(event.target.value));
  }

  /**
   * Abre la pantalla de gestión formal del caso.
   *
   * @param id identificador del caso Call Center.
   */
  function openGestionCaso(id: number) {
    router.push(`/dashboard/callcenter/mis-registros/${id}`);
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: 2,
            justifyContent: 'space-between',
          }}
        >
          <Box>
            <Typography component="h1" variant="h5" sx={{ fontWeight: 800 }}>
              Mis registros Call Center
            </Typography>

            <Typography component="p" variant="body2" sx={{ color: 'text.secondary' }}>
              Casos asignados a tu cuenta para gestionar llamadas y coordinar visitas.
            </Typography>
          </Box>

          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => load(page, size)}
            disabled={loading}
          >
            Actualizar
          </Button>
        </Box>

        <Alert severity="info">
          Desde esta vista solo se consultan tus casos asignados. Para registrar llamadas o asignar una visita,
          usa el botón <strong>Gestionar</strong>.
        </Alert>

        {loading ? (
          <Paper sx={{ p: 3 }}>
            <Alert severity="info">
              Cargando tus registros...
            </Alert>
          </Paper>
        ) : records.length === 0 ? (
          <Paper sx={{ p: 3 }}>
            <Alert severity="info">
              No tienes registros asignados.
            </Alert>
          </Paper>
        ) : (
          <Paper>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Ciudadano</TableCell>
                    <TableCell>Teléfono</TableCell>
                    <TableCell>Dirección</TableCell>
                    <TableCell>Tipo solicitud</TableCell>
                    <TableCell>Estado caso</TableCell>
                    <TableCell>Encuestador</TableCell>
                    <TableCell align="right">Acciones</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id} hover>
                      <TableCell>
                        <Typography component="p" variant="body2" sx={{ fontWeight: 700 }}>
                          {record.fechaLlamada || 'Sin fecha'}
                        </Typography>

                        <Typography component="p" variant="caption" sx={{ color: 'text.secondary' }}>
                          {record.horaLlamada?.slice(0, 5) || 'Sin hora'}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography component="p" variant="body2" sx={{ fontWeight: 700 }}>
                          {record.nombreCompleto || 'Sin nombre'}
                        </Typography>

                        <Typography component="p" variant="caption" sx={{ color: 'text.secondary' }}>
                          {`C.C. ${record.cedulaSolicitante || 'Sin dato'}`}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        {record.telefono || 'Sin dato'}
                      </TableCell>

                      <TableCell>
                        <Typography component="p" variant="body2">
                          {record.direccionTexto || 'Sin dirección'}
                        </Typography>

                        <Typography component="p" variant="caption" sx={{ color: 'text.secondary' }}>
                          {record.barrioNombre || 'Sin barrio'}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Chip
                          size="small"
                          variant="outlined"
                          label={formatLabel(record.tipoSolicitudCallcenter || 'NUEVA_ENCUESTA')}
                        />
                      </TableCell>

                      <TableCell>
                        <Chip
                          size="small"
                          color={getStatusColor(record.estadoCaso)}
                          label={formatLabel(record.estadoCaso || 'ASIGNADO_CALLCENTER')}
                        />
                      </TableCell>

                      <TableCell>
                        {record.encuestadorAsignadoNombre
                          || record.encuestadorProgramadoNombre
                          || 'Sin asignar'}
                      </TableCell>

                      <TableCell align="right">
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<VisibilityIcon />}
                          onClick={() => openGestionCaso(record.id)}
                        >
                          Gestionar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>

                <TableFooter>
                  <TableRow>
                    <TablePagination
                      component="td"
                      colSpan={8}
                      count={total}
                      page={page}
                      rowsPerPage={size}
                      rowsPerPageOptions={[10, 20, 50, 100]}
                      onPageChange={handlePageChange}
                      onRowsPerPageChange={handleRowsPerPageChange}
                      labelRowsPerPage="Filas"
                    />
                  </TableRow>
                </TableFooter>
              </Table>
            </TableContainer>
          </Paper>
        )}
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={closeSnackbar}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

/**
 * Convierte códigos técnicos en etiquetas legibles.
 *
 * @param value código técnico.
 * @returns etiqueta visible.
 */
function formatLabel(value?: string | null) {
  return String(value ?? 'Sin dato')
    .split('_')
    .join(' ')
    .toLowerCase()
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

/**
 * Define el color visual de los estados del caso.
 *
 * @param value estado técnico.
 * @returns color del chip.
 */
function getStatusColor(value?: string | null): ChipColor {
  const normalized = String(value ?? '').toUpperCase();

  if (
    normalized.includes('CERRADO') ||
    normalized.includes('REALIZADA') ||
    normalized.includes('CONTACTADO')
  ) {
    return 'success';
  }

  if (
    normalized.includes('PENDIENTE') ||
    normalized.includes('ASIGNADO') ||
    normalized.includes('GESTION')
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
    normalized.includes('SIN_DISPOSICION') ||
    normalized.includes('NO_ACEPTA')
  ) {
    return 'error';
  }

  return 'default';
}