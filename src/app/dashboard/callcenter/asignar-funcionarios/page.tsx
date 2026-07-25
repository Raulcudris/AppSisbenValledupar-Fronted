'use client';

import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
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
import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  asignarFuncionarioCallCenter,
  getFuncionariosCallCenterOptions,
  getPendientesAsignarFuncionarioCallCenter,
} from '@/services/callcenter.service';
import { PageResponse } from '@/types/api.types';
import { CallCenterResponse } from '@/types/callcenter.types';
import { CallCenterUserOptionResponse } from '@/types/callcenter-assignment.types';

type SnackbarState = {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'warning' | 'info';
};

export default function AsignarFuncionariosCallCenterPage() {
  const router = useRouter();

  const [pageData, setPageData] = useState<PageResponse<CallCenterResponse> | null>(null);
  const [funcionarios, setFuncionarios] = useState<CallCenterUserOptionResponse[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [funcionarioId, setFuncionarioId] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<SnackbarState>({ open: false, message: '', severity: 'success' });

  const records = pageData?.content ?? [];
  const page = pageData?.page ?? 0;
  const size = pageData?.size ?? 20;
  const total = pageData?.totalElements ?? 0;

  const allVisibleSelected = records.length > 0 && records.every((record) => selectedIds.includes(record.id));
  const someVisibleSelected = records.some((record) => selectedIds.includes(record.id));
  const selectedCount = useMemo(() => selectedIds.length, [selectedIds]);

  const showMessage = (message: string, severity: SnackbarState['severity'] = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const closeSnackbar = () => setSnackbar((current) => ({ ...current, open: false }));

  const load = useCallback(async (nextPage = 0, nextSize = 20) => {
    setLoading(true);

    try {
      const response = await getPendientesAsignarFuncionarioCallCenter({ page: nextPage, size: nextSize });
      setPageData(response);
      setSelectedIds([]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No fue posible cargar los pendientes de asignación.';
      showMessage(message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

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

  const toggleRecord = (id: number) => {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const toggleAllVisible = () => {
    const visibleIds = records.map((record) => record.id);

    if (allVisibleSelected) {
      setSelectedIds((current) => current.filter((id) => !visibleIds.includes(id)));
      return;
    }

    setSelectedIds((current) => Array.from(new Set([...current, ...visibleIds])));
  };

  const assign = async () => {
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
      await asignarFuncionarioCallCenter({ funcionarioCallcenterId: Number(funcionarioId), registroIds: selectedIds });
      showMessage('Registros asignados correctamente.', 'success');
      load(page, size);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No fue posible asignar los registros.';
      showMessage(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePageChange = (_: unknown, nextPage: number) => load(nextPage, size);
  const handleRowsPerPageChange = (event: ChangeEvent<HTMLInputElement>) => load(0, Number(event.target.value));

  return (
    <Box>
      <Stack spacing={3}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>Asignar a funcionarios Call Center</Typography>
            <Typography variant="body2" color="text.secondary">
              Selecciona usuarios de nueva encuesta y asígnalos a un funcionario Call Center.
            </Typography>
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => router.push('/dashboard/callcenter/registros')}>Volver</Button>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => load(page, size)} disabled={loading}>Actualizar</Button>
          </Stack>
        </Stack>

        <Paper sx={{ p: 2 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField label="Funcionario Call Center" select value={funcionarioId} onChange={(event) => setFuncionarioId(event.target.value)} fullWidth size="small">
              <MenuItem value="">Selecciona un funcionario</MenuItem>
              {funcionarios.map((item) => (
                <MenuItem key={item.id} value={item.id}>{item.nombreCompleto || item.username}</MenuItem>
              ))}
            </TextField>

            <Button variant="contained" startIcon={<AssignmentIndIcon />} onClick={assign} disabled={saving || selectedCount === 0}>
              Asignar seleccionados ({selectedCount})
            </Button>
          </Stack>
        </Paper>

        {loading ? (
          <Paper sx={{ p: 3 }}><Alert severity="info">Cargando pendientes...</Alert></Paper>
        ) : records.length === 0 ? (
          <Paper sx={{ p: 3 }}><Alert severity="info">No hay registros pendientes por asignar a funcionario Call Center.</Alert></Paper>
        ) : (
          <Paper>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox"><Checkbox checked={allVisibleSelected} indeterminate={!allVisibleSelected && someVisibleSelected} onChange={toggleAllVisible} /></TableCell>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Ciudadano</TableCell>
                    <TableCell>Teléfono</TableCell>
                    <TableCell>Barrio / Comuna</TableCell>
                    <TableCell>Encuestador</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id} hover selected={selectedIds.includes(record.id)}>
                      <TableCell padding="checkbox"><Checkbox checked={selectedIds.includes(record.id)} onChange={() => toggleRecord(record.id)} /></TableCell>
                      <TableCell>{record.fechaLlamada}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{record.nombreCompleto}</Typography>
                        <Typography variant="caption" color="text.secondary">C.C. {record.cedulaSolicitante}</Typography>
                      </TableCell>
                      <TableCell>{record.telefono || 'Sin dato'}</TableCell>
                      <TableCell>
                        <Typography variant="body2">{record.barrioNombre || 'Sin barrio'}</Typography>
                        <Typography variant="caption" color="text.secondary">{record.comunaNombre || 'Sin comuna'}</Typography>
                      </TableCell>
                      <TableCell>{record.encuestadorAsignadoNombre || 'Sin asignar'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TablePagination count={total} page={page} rowsPerPage={size} rowsPerPageOptions={[10, 20, 50, 100]} onPageChange={handlePageChange} onRowsPerPageChange={handleRowsPerPageChange} labelRowsPerPage="Filas" />
                  </TableRow>
                </TableFooter>
              </Table>
            </TableContainer>
          </Paper>
        )}
      </Stack>

      <Snackbar open={snackbar.open} autoHideDuration={5000} onClose={closeSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snackbar.severity} onClose={closeSnackbar} sx={{ width: '100%' }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
