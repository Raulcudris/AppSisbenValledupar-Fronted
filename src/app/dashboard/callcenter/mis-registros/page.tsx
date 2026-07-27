'use client';

import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import RefreshIcon from '@mui/icons-material/Refresh';
import VisibilityIcon from '@mui/icons-material/Visibility';
import {
  Alert,
  Box,
  Button,
  Checkbox,
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
  asignarEncuestadorCallCenter,
  getMisRegistrosCallCenter,
} from '@/services/callcenter.service';
import { getCallCenterEncuestadoresOptions } from '@/services/callcenter-support.service';
import { PageResponse } from '@/types/api.types';
import { CallCenterResponse } from '@/types/callcenter.types';
import { SelectOption } from '@/types/catalog.types';

/**
 * Estado local para mostrar mensajes informativos, exitosos o de error.
 */
type SnackbarState = {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'warning' | 'info';
};

/**
 * Página de registros asignados al funcionario Call Center autenticado.
 *
 * Permite consultar los casos asignados, seleccionar registros,
 * asignar encuestador y abrir el detalle formal del caso para registrar
 * llamadas y visitas.
 */
export default function MisRegistrosCallCenterPage() {
  const router = useRouter();

  const [pageData, setPageData] = useState<PageResponse<CallCenterResponse> | null>(null);
  const [encuestadores, setEncuestadores] = useState<SelectOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [encuestadorId, setEncuestadorId] = useState('');
  const [fechaEncuestaProgramada, setFechaEncuestaProgramada] = useState('');
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
      setSelectedIds([]);
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'No fue posible cargar tus registros asignados.';

      showMessage(message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Carga el catálogo de encuestadores activos.
   */
  const loadCatalogs = useCallback(async () => {
    try {
      const data = await getCallCenterEncuestadoresOptions();

      setEncuestadores(data);
    } catch {
      showMessage('No fue posible cargar el catálogo de encuestadores.', 'warning');
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
   * Asigna el encuestador seleccionado a los registros marcados.
   */
  async function assignEncuestador() {
    if (!encuestadorId) {
      showMessage('Selecciona el encuestador que realizará la encuesta.', 'warning');
      return;
    }

    if (selectedIds.length === 0) {
      showMessage('Selecciona al menos un registro.', 'warning');
      return;
    }

    setSaving(true);

    try {
      await asignarEncuestadorCallCenter({
        encuestadorId: Number(encuestadorId),
        fechaEncuestaProgramada: fechaEncuestaProgramada || null,
        registroIds: selectedIds,
      });

      showMessage('Encuestador asignado correctamente.', 'success');
      load(page, size);
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'No fue posible asignar el encuestador.';

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
              Usuarios asignados a tu cuenta para gestionar llamada y asignar encuestador.
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

        <Paper sx={{ p: 2 }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              gap: 2,
            }}
          >
            <TextField
              label="Encuestador que realizará la encuesta"
              select
              value={encuestadorId}
              onChange={(event) => setEncuestadorId(event.target.value)}
              fullWidth
              size="small"
            >
              <MenuItem value="">Selecciona un encuestador</MenuItem>

              {encuestadores.map((item) => (
                <MenuItem key={item.id} value={item.id}>
                  {item.label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Fecha encuesta programada"
              type="date"
              value={fechaEncuestaProgramada}
              onChange={(event) => setFechaEncuestaProgramada(event.target.value)}
              fullWidth
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
            />

            <Button
              variant="contained"
              startIcon={<AssignmentTurnedInIcon />}
              onClick={assignEncuestador}
              disabled={saving || selectedCount === 0}
            >
              {`Asignar encuestador (${selectedCount})`}
            </Button>
          </Box>
        </Paper>

        {loading ? (
          <Paper sx={{ p: 3 }}>
            <Alert severity="info">Cargando tus registros...</Alert>
          </Paper>
        ) : records.length === 0 ? (
          <Paper sx={{ p: 3 }}>
            <Alert severity="info">No tienes registros asignados.</Alert>
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
                    <TableCell>Dirección</TableCell>
                    <TableCell>Encuestador</TableCell>
                    <TableCell>Visita</TableCell>
                    <TableCell align="right">Acciones</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {records.map((record) => (
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
                        {record.encuestadorAsignadoNombre || 'Sin asignar'}
                      </TableCell>

                      <TableCell>
                        {record.estadoVisita || 'PENDIENTE'}
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