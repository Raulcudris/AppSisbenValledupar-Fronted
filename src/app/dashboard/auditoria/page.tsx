'use client';

import SearchIcon from '@mui/icons-material/Search';
import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { PageTitle } from '@/components/dashboard/ReportCharts';
import { AccessMessage, LoadingState } from '@/components/dashboard/States';
import { ApiClientError } from '@/lib/apiClient';
import { searchAudit } from '@/services/audit.service';
import { AuditFilter, AuditLogResponse } from '@/types/audit.types';

export default function AuditoriaPage() {
  const [rows, setRows] = useState<AuditLogResponse[]>([]);
  const [filter, setFilter] = useState<AuditFilter>({ page: 0, size: 20 });
  const [loading, setLoading] = useState(true);
  const [restricted, setRestricted] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setRestricted(false);
    setError('');

    try {
      const page = await searchAudit(filter);
      setRows(page.content);
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 403) {
        setRestricted(true);
      } else {
        setError(err instanceof Error ? err.message : 'No fue posible consultar auditoría.');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function update(key: keyof AuditFilter, value: string) {
    setFilter((current) => ({ ...current, [key]: value }));
  }

  if (loading) return <LoadingState />;

  return (
    <Stack spacing={3}>
      <PageTitle title="Auditoría" subtitle="Consulta de acciones registradas por usuarios del sistema." />

      {restricted ? (
        <AccessMessage />
      ) : (
        <>
          <Card>
            <CardContent>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <TextField label="Usuario" size="small" value={filter.username ?? ''} onChange={(e) => update('username', e.target.value)} />
                <TextField label="Acción" size="small" value={filter.accion ?? ''} onChange={(e) => update('accion', e.target.value)} placeholder="LOGIN, CREATE..." />
                <TextField label="Tabla" size="small" value={filter.tablaAfectada ?? ''} onChange={(e) => update('tablaAfectada', e.target.value)} />
                <TextField
                  label="Fecha inicio"
                  type="date"
                  size="small"
                  value={filter.fechaInicio ?? ''}
                  onChange={(e) => update('fechaInicio', e.target.value)}
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
                  value={filter.fechaFin ?? ''}
                  onChange={(e) => update('fechaFin', e.target.value)}
                  slotProps={{
                    inputLabel: {
                      shrink: true,
                    },
                  }}
                />                <Button variant="contained" onClick={load} startIcon={<SearchIcon />}>Buscar</Button>
              </Stack>
            </CardContent>
          </Card>

          {error ? <Alert severity="error">{error}</Alert> : null}

          <Card>
            <CardContent sx={{ overflowX: 'auto' }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Usuario</TableCell>
                    <TableCell>Acción</TableCell>
                    <TableCell>Tabla</TableCell>
                    <TableCell>Registro</TableCell>
                    <TableCell>IP</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.id}</TableCell>
                      <TableCell>{new Date(item.fechaAccion).toLocaleString()}</TableCell>
                      <TableCell>{item.username ?? 'N/A'}</TableCell>
                      <TableCell><Chip label={item.accion} size="small" /></TableCell>
                      <TableCell>{item.tablaAfectada ?? 'N/A'}</TableCell>
                      <TableCell>{item.registroId ?? 'N/A'}</TableCell>
                      <TableCell>{item.ipOrigen ?? 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                  {!rows.length ? (
                    <TableRow>
                      <TableCell colSpan={7}>
                        <Alert severity="info">No hay registros de auditoría para los filtros seleccionados.</Alert>
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </Stack>
  );
}
