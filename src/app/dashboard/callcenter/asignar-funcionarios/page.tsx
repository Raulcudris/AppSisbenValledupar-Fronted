'use client';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  MenuItem,
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
  TextField,
  Typography,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';

import {
  asignarFuncionarioCallCenter,
  getFuncionariosCallCenterOptions,
  getPendientesAsignarFuncionarioCallCenter,
} from '@/services/callcenter.service';
import { PageResponse } from '@/types/api.types';
import { CallCenterUserOptionResponse } from '@/types/callcenter-assignment.types';
import { CallCenterResponse } from '@/types/callcenter.types';

/**
 * Estado local para mostrar mensajes informativos, exitosos o de error.
 */
type SnackbarState = {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'warning' | 'info';
};

/**
 * Página de asignación de casos Call Center a funcionarios.
 *
 * Esta vista pertenece al flujo del Coordinador / Enrutador Call Center.
 * Su responsabilidad es tomar los casos pendientes de enrutamiento y
 * asignarlos a un funcionario Call Center para que este gestione las llamadas.
 */
export default function AsignarFuncionariosCallCenterPage() {
  const router = useRouter();

  const [pageData, setPageData] = useState<PageResponse<CallCenterResponse> | null>(null);
  const [funcionarios, setFuncionarios] = useState<CallCenterUserOptionResponse[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [funcionarioId, setFuncionarioId] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success',
  });

  const records = pageData?.content ?? [];
  const page = pageData?.page ?? 0;
  const size = pageData?.size ?? 20;
  const total = pageData?.totalElements ?? 0;

  const allVisibleSelected = records.length > 0
    && records.every((record) => selectedIds.includes(record.id));

  const someVisibleSelected = records.some((record) => selectedIds.includes(record.id));

  const selectedCount = useMemo(() => selectedIds.length, [selectedIds]);

  /**
   * Muestra un mensaje temporal en pantalla.
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
   * Carga los casos pendientes por asignar a funcionarios Call Center.
   *
   * @param nextPage página solicitada.
   * @param nextSize cantidad de registros por página.
   */
  const load = useCallback(async (nextPage = 0, nextSize = 20) => {
    setLoading(true);

    try {
      const response = await getPendientesAsignarFuncionarioCallCenter({
        page: nextPage,
        size: nextSize,
      });

      setPageData(response);
      setSelectedIds([]);
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'No fue posible cargar los pendientes de asignación.';

      showMessage(message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Carga el catálogo de funcionarios Call Center activos.
   */
  const loadCatalogs = useCallback(async () => {
    try {
      const data = await getFuncionariosCallCenterOptions();

      setFuncionarios(data);
    } catch {
      showMessage('No fue posible cargar funcionarios Call Center.', 'warning');
    }
  }, []);

  useEffect(() => {
    loadCatalogs();
    load(0, 20);
  }, [loadCatalogs, load]);

  /**
   * Selecciona o deselecciona un registro.
   *
   * @param id identificador del registro.
   */
  function toggleRecord(id: number) {
    setSelectedIds((current) => (
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    ));
  }

  /**
   * Selecciona o deselecciona todos los registros visibles.
   */
  function toggleAllVisible() {
    const visibleIds = records.map((record) => record.id);

    if (allVisibleSelected) {
      setSelectedIds((current) => current.filter((id) => !visibleIds.includes(id)));
      return;
    }

    setSelectedIds((current) => Array.from(new Set([...current, ...visibleIds])));
  }

  /**
   * Asigna los casos seleccionados al funcionario Call Center elegido.
   */
  async function assign() {
    if (!funcionarioId) {
      showMessage('Selecciona el funcionario Call Center.', 'warning');
      return;
    }

    if (selectedIds.length === 0) {
      showMessage('Selecciona al menos un registro.', 'warning');
      return;
    }

    setSaving(true);

    try {
      await asignarFuncionarioCallCenter({
        funcionarioCallcenterId: Number(funcionarioId),
        registroIds: selectedIds,
      });

      showMessage('Registros asignados correctamente.', 'success');
      setFuncionarioId('');
      await load(page, size);
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'No fue posible asignar los registros.';

      showMessage(message, 'error');
    } finally {
      setSaving(false);
    }
  }

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
   * Cambia la cantidad de registros por página.
   *
   * @param event evento del selector de filas.
   */
  function handleRowsPerPageChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    load(0, Number(event.target.value));
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
              Asignar funcionarios Call Center
            </Typography>

            <Typography component="p" variant="body2" sx={{ color: 'text.secondary' }}>
              Selecciona los casos pendientes y asígnalos al funcionario que realizará la gestión telefónica.
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
              onClick={() => router.push('/dashboard/callcenter/registros')}
            >
              Volver
            </Button>

            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => load(page, size)}
              disabled={loading}
            >
              Actualizar
            </Button>
          </Box>
        </Box>

        <Paper sx={{ p: 2 }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              gap: 2,
            }}
          >
            <TextField
              label="Funcionario Call Center"
              select
              value={funcionarioId}
              onChange={(event) => setFuncionarioId(event.target.value)}
              fullWidth
              size="small"
            >
              <MenuItem value="">
                Selecciona un funcionario
              </MenuItem>

              {funcionarios.map((item) => (
                <MenuItem key={item.id} value={item.id}>
                  {item.nombreCompleto || item.username}
                </MenuItem>
              ))}
            </TextField>

            <Button
              variant="contained"
              startIcon={<AssignmentIndIcon />}
              onClick={assign}
              disabled={saving || selectedCount === 0}
            >
              {`Asignar seleccionados (${selectedCount})`}
            </Button>
          </Box>
        </Paper>

        {loading ? (
          <Paper sx={{ p: 3 }}>
            <Alert severity="info">
              Cargando pendientes...
            </Alert>
          </Paper>
        ) : records.length === 0 ? (
          <Paper sx={{ p: 3 }}>
            <Alert severity="info">
              No hay registros pendientes por asignar a funcionario Call Center.
            </Alert>
          </Paper>
        ) : (
          <Paper>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={allVisibleSelected}
                        indeterminate={!allVisibleSelected && someVisibleSelected}
                        onChange={toggleAllVisible}
                      />
                    </TableCell>

                    <TableCell>Fecha</TableCell>
                    <TableCell>Ciudadano</TableCell>
                    <TableCell>Teléfono</TableCell>
                    <TableCell>Barrio / Comuna</TableCell>
                    <TableCell>Estado</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {records.map((record) => {
                    const estadoCaso = getStringField(record, 'estadoCaso');
                    const tipoSolicitud = getStringField(record, 'tipoSolicitudCallcenter');

                    return (
                      <TableRow
                        key={record.id}
                        hover
                        selected={selectedIds.includes(record.id)}
                      >
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={selectedIds.includes(record.id)}
                            onChange={() => toggleRecord(record.id)}
                          />
                        </TableCell>

                        <TableCell>
                          {record.fechaLlamada || 'Sin fecha'}
                        </TableCell>

                        <TableCell>
                          <Typography component="p" variant="body2" sx={{ fontWeight: 700 }}>
                            {record.nombreCompleto || 'Sin nombre'}
                          </Typography>

                          <Typography component="p" variant="caption" sx={{ color: 'text.secondary' }}>
                            {`C.C. ${record.cedulaSolicitante || 'Sin dato'}`}
                          </Typography>

                          {tipoSolicitud && (
                            <Typography component="p" variant="caption" sx={{ color: 'text.secondary' }}>
                              {formatLabel(tipoSolicitud)}
                            </Typography>
                          )}
                        </TableCell>

                        <TableCell>
                          {record.telefono || 'Sin dato'}
                        </TableCell>

                        <TableCell>
                          <Typography component="p" variant="body2">
                            {record.barrioNombre || 'Sin barrio'}
                          </Typography>

                          <Typography component="p" variant="caption" sx={{ color: 'text.secondary' }}>
                            {record.comunaNombre || 'Sin comuna'}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <Chip
                            size="small"
                            label={formatLabel(estadoCaso || 'PENDIENTE ENRUTAMIENTO')}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>

                <TableFooter>
                  <TableRow>
                    <TablePagination
                      component="td"
                      colSpan={6}
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
 * Obtiene un campo string opcional desde la respuesta sin romper el tipado.
 *
 * Se usa para campos nuevos del flujo formal que pueden no estar todavía
 * declarados en CallCenterResponse durante la transición del módulo.
 *
 * @param record registro Call Center.
 * @param field nombre técnico del campo.
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
 * Convierte códigos técnicos en etiquetas legibles.
 *
 * @param value código técnico.
 * @returns etiqueta visible.
 */
function formatLabel(value: string) {
  return value
    .split('_')
    .join(' ')
    .toLowerCase()
    .replace(/^\w/, (letter) => letter.toUpperCase());
}