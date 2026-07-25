'use client';

import AddIcon from '@mui/icons-material/Add';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import PhoneIcon from '@mui/icons-material/Phone';
import SearchIcon from '@mui/icons-material/Search';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import LoadingState from '@/components/dashboard/LoadingState';
import CrudPageHeader from '@/components/operational/CrudPageHeader';
import {
  canUpdateEncuestadorVisit,
  canWriteCallCenter,
  currentRole,
} from '@/lib/roleAccess';
import {
  getCallCenterSummary,
  searchCallCenter,
} from '@/services/callcenter.service';
import { PageResponse } from '@/types/api.types';
import {
  CallCenterResponse,
  CallCenterSummaryResponse,
} from '@/types/callcenter.types';

function formatBoolean(value?: boolean | null) {
  if (value === true) return 'Sí';
  if (value === false) return 'No';

  return '-';
}

function SummaryCard({
  title,
  value,
  helper,
}: {
  title: string;
  value: number;
  helper: string;
}) {
  return (
    <Card
      sx={{
        borderRadius: 4,
        border: '1px solid',
        borderColor: 'divider',
        height: '100%',
      }}
    >
      <CardContent>
        <Typography
          color="text.secondary"
          sx={{
            fontSize: 12,
            fontWeight: 900,
            textTransform: 'uppercase',
          }}
        >
          {title}
        </Typography>

        <Typography variant="h4" sx={{ fontWeight: 900, mt: 0.5 }}>
          {value}
        </Typography>

        <Typography color="text.secondary" sx={{ fontSize: 13, mt: 0.5 }}>
          {helper}
        </Typography>
      </CardContent>
    </Card>
  );
}

export default function CallCenterPage() {
  const router = useRouter();

  const [summary, setSummary] = useState<CallCenterSummaryResponse | null>(null);
  const [pageData, setPageData] = useState<PageResponse<CallCenterResponse> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const role = currentRole();
  const allowWrite = useMemo(() => canWriteCallCenter(role), [role]);
  const allowAsignaciones = useMemo(() => canUpdateEncuestadorVisit(role), [role]);

  const load = async () => {
    setLoading(true);
    setError('');

    try {
      const [summaryData, registrosData] = await Promise.all([
        getCallCenterSummary(),
        searchCallCenter({
          page: 0,
          size: 10,
          activo: true,
        }),
      ]);

      setSummary(summaryData);
      setPageData(registrosData);
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : 'No fue posible consultar el módulo Call Center.';

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (loading && !summary) {
    return <LoadingState />;
  }

  const rows = pageData?.content ?? [];

  return (
    <Stack spacing={3}>
      <CrudPageHeader
        title="Call Center"
        subtitle="Consulta general de llamadas y seguimiento a usuarios."
        primaryAction={
          <Stack direction="row" spacing={1}>
            {allowAsignaciones ? (
              <Button
                variant="outlined"
                startIcon={<AssignmentTurnedInIcon />}
                onClick={() => router.push('/dashboard/callcenter/mis-asignaciones')}
              >
                Mis asignaciones
              </Button>
            ) : null}

            <Button
              variant="contained"
              startIcon={allowWrite ? <AddIcon /> : <SearchIcon />}
              onClick={() =>
                router.push(
                  allowWrite
                    ? '/dashboard/callcenter/registros'
                    : '/dashboard/callcenter'
                )
              }
            >
              {allowWrite ? 'Abrir registros' : 'Consultar'}
            </Button>
          </Stack>
        }
      />

      {error ? (
        <Alert severity="error">
          {error}
        </Alert>
      ) : null}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            md: 'repeat(5, 1fr)',
          },
          gap: 2,
        }}
      >
        <SummaryCard
          title="Total"
          value={summary?.totalRegistros ?? 0}
          helper="Registros históricos"
        />

        <SummaryCard
          title="Conectadas"
          value={summary?.llamadasConectadas ?? 0}
          helper="Llamadas atendidas"
        />

        <SummaryCard
          title="No conectadas"
          value={summary?.llamadasNoConectadas ?? 0}
          helper="Sin contacto efectivo"
        />

        <SummaryCard
          title="Activas"
          value={summary?.activos ?? 0}
          helper="Registros disponibles"
        />

        <SummaryCard
          title="Inactivas"
          value={summary?.inactivos ?? 0}
          helper="Registros retirados"
        />
      </Box>

      <Card sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
        <CardContent>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={1}
            sx={{
              alignItems: { xs: 'flex-start', md: 'center' },
              justifyContent: 'space-between',
              mb: 2,
            }}
          >
            <Box>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <PhoneIcon color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 900 }}>
                  Últimos registros activos
                </Typography>
              </Stack>

              <Typography color="text.secondary" sx={{ fontSize: 14, mt: 0.4 }}>
                Vista rápida de los registros más recientes del módulo.
              </Typography>
            </Box>

            <Chip
              label={`${pageData?.totalElements ?? 0} registro${(pageData?.totalElements ?? 0) === 1 ? '' : 's'}`}
              color="primary"
              variant="outlined"
            />
          </Stack>

          <Divider sx={{ mb: 2 }} />

          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 980 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 900 }}>Fecha</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Solicitante</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Teléfono</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Conectada</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Barrio</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Encuestador</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Visita</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell>{row.fechaLlamada}</TableCell>
                    <TableCell>
                      <Typography sx={{ fontWeight: 800 }}>
                        {row.nombreCompleto}
                      </Typography>

                      <Typography color="text.secondary" sx={{ fontSize: 12 }}>
                        C.C. {row.cedulaSolicitante}
                      </Typography>
                    </TableCell>
                    <TableCell>{row.telefono || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={formatBoolean(row.llamadaConectada)}
                        color={row.llamadaConectada ? 'success' : 'warning'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{row.barrioNombre || row.direccionTexto || '-'}</TableCell>
                    <TableCell>
                      {row.encuestadorAsignadoNombre || row.encuestadorProgramadoNombre || '-'}
                    </TableCell>
                    <TableCell>{row.estadoVisita || 'PENDIENTE'}</TableCell>
                  </TableRow>
                ))}

                {!rows.length ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 5 }}>
                      No hay registros activos para mostrar.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </Box>
        </CardContent>
      </Card>
    </Stack>
  );
}
