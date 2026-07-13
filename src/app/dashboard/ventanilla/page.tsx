'use client';

import AssignmentLateIcon from '@mui/icons-material/AssignmentLate';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';

import DateRangeToolbar from '@/components/dashboard/DateRangeToolbar';
import { BarGroupChart, PageTitle, PieGroupChart } from '@/components/dashboard/ReportCharts';
import SectionCard from '@/components/dashboard/SectionCard';
import { LoadingState } from '@/components/dashboard/States';
import StatCard from '@/components/dashboard/StatCard';
import { currentRole } from '@/lib/roleAccess';
import { exportVentanillaReport } from '@/services/export.service';
import { getVentanillaGroup, getVentanillaSummary } from '@/services/report.service';
import { searchVentanilla } from '@/services/ventanilla.service';
import { VentanillaResponse } from '@/types/operational.types';
import {
  ReportDateRange,
  ReportGroupResponse,
  VentanillaReportSummaryResponse,
} from '@/types/report.types';

type ChipColor =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'error'
  | 'info'
  | 'success'
  | 'warning';

function formatDate(value?: string | null) {
  if (!value) {
    return '-';
  }

  const [year, month, day] = value.split('-');

  if (!year || !month || !day) {
    return value;
  }

  return `${day}/${month}/${year}`;
}

function normalizeTraceabilityColor(color?: string | null): ChipColor {
  const allowedColors: ChipColor[] = [
    'default',
    'primary',
    'secondary',
    'error',
    'info',
    'success',
    'warning',
  ];

  if (color && allowedColors.includes(color as ChipColor)) {
    return color as ChipColor;
  }

  return 'default';
}

function formatDaysFromLastVisit(days?: number | null) {
  if (days === undefined || days === null) {
    return 'Primera visita';
  }

  if (days === 0) {
    return 'Vino el mismo día';
  }

  if (days === 1) {
    return 'Hace 1 día';
  }

  return `Hace ${days} días`;
}

function getFrequencyText(record: VentanillaResponse) {
  const trace = record.trazabilidad;

  if (!trace) {
    return 'Sin frecuencia registrada';
  }

  if (trace.ciudadanoFrecuente) {
    return 'Frecuencia alta';
  }

  if (trace.visitasUltimos30Dias >= 2) {
    return 'Frecuencia media';
  }

  if (trace.totalVisitas <= 1) {
    return 'Primera atención';
  }

  return 'Frecuencia baja';
}

function buildFrequencyTooltip(record: VentanillaResponse) {
  const trace = record.trazabilidad;

  if (!trace) {
    return 'No hay información de frecuencia disponible para este ciudadano.';
  }

  const lastVisit = trace.ultimaVisitaAnterior
    ? `Última visita anterior: ${formatDate(trace.ultimaVisitaAnterior)}`
    : 'Sin visita anterior registrada';

  const timeText = formatDaysFromLastVisit(trace.diasDesdeUltimaVisitaAnterior);
  const frequencyText = getFrequencyText(record);

  return `${frequencyText}. ${timeText}. ${trace.descripcion} Total visitas: ${trace.totalVisitas}. Visitas en los últimos 30 días: ${trace.visitasUltimos30Dias}. ${lastVisit}.`;
}

function CitizenFrequencyField({ record }: { record: VentanillaResponse }) {
  const trace = record.trazabilidad;

  if (!trace) {
    return (
      <Box>
        <Chip
          label="Sin trazabilidad"
          color="default"
          variant="outlined"
          size="small"
          sx={{ fontWeight: 700, mb: 0.5 }}
        />

        <Typography color="text.secondary" sx={{ fontSize: 12 }}>
          No hay datos de visitas.
        </Typography>
      </Box>
    );
  }

  const chipColor = normalizeTraceabilityColor(trace.color);
  const chipVariant = trace.nivel === 'PRIMERA_VISITA' ? 'filled' : 'outlined';
  const timeText = formatDaysFromLastVisit(trace.diasDesdeUltimaVisitaAnterior);
  const frequencyText = getFrequencyText(record);
  const lastVisitDate = trace.ultimaVisitaAnterior
    ? formatDate(trace.ultimaVisitaAnterior)
    : 'Sin visita anterior';

  return (
    <Tooltip title={buildFrequencyTooltip(record)} arrow placement="top">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 0.35,
          minWidth: 180,
        }}
      >
        <Box>
          <Chip
            label={trace.etiqueta}
            color={chipColor}
            variant={chipVariant}
            size="small"
            sx={{
              fontWeight: 800,
              minWidth: 115,
            }}
          />
        </Box>

        <Typography
          sx={{
            fontWeight: 800,
            fontSize: 13,
            color: trace.ciudadanoFrecuente ? 'warning.main' : 'text.primary',
          }}
        >
          {timeText}
        </Typography>

        <Typography color="text.secondary" sx={{ fontSize: 12 }}>
          {frequencyText}
        </Typography>

        <Typography color="text.secondary" sx={{ fontSize: 12 }}>
          Última: {lastVisitDate}
        </Typography>

        <Typography color="text.secondary" sx={{ fontSize: 11 }}>
          Total: {trace.totalVisitas} visita(s) · Últimos 30 días: {trace.visitasUltimos30Dias}
        </Typography>
      </Box>
    </Tooltip>
  );
}

export default function VentanillaDashboardPage() {
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [summary, setSummary] = useState<VentanillaReportSummaryResponse | null>(null);
  const [byStatus, setByStatus] = useState<ReportGroupResponse[]>([]);
  const [byRequest, setByRequest] = useState<ReportGroupResponse[]>([]);
  const [byUser, setByUser] = useState<ReportGroupResponse[]>([]);
  const [byComuna, setByComuna] = useState<ReportGroupResponse[]>([]);
  const [recentRecords, setRecentRecords] = useState<VentanillaResponse[]>([]);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  const currentFilter: ReportDateRange = { fechaInicio, fechaFin };
  const emptyTableColSpan = isAdminUser ? 7 : 6;

  async function load(
    filter: ReportDateRange = currentFilter,
    adminRole: boolean = isAdminUser
  ) {
    setLoading(true);
    setError('');

    try {
      const [
        nextSummary,
        status,
        request,
        comuna,
        records,
        userGroup,
      ] = await Promise.all([
        getVentanillaSummary(filter),
        getVentanillaGroup('by-status', filter),
        getVentanillaGroup('by-request-type', filter),
        getVentanillaGroup('by-comuna', filter),
        searchVentanilla({
          fechaInicio: filter.fechaInicio,
          fechaFin: filter.fechaFin,
          page: 0,
          size: 10,
        }),
        adminRole
          ? getVentanillaGroup('by-user', filter)
          : Promise.resolve([] as ReportGroupResponse[]),
      ]);

      const sortedRecords = [...records.content].sort((a, b) => {
        const dateComparison = String(b.fecha).localeCompare(String(a.fecha));

        if (dateComparison !== 0) {
          return dateComparison;
        }

        return b.id - a.id;
      });

      setSummary(nextSummary);
      setByStatus(status);
      setByRequest(request);
      setByComuna(comuna);
      setRecentRecords(sortedRecords);
      setByUser(userGroup);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cargar Ventanilla.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const admin = currentRole() === 'ADMIN';

    setIsAdminUser(admin);
    load({}, admin);
  }, []);

  async function handleExport() {
    setExporting(true);

    try {
      await exportVentanillaReport(currentFilter);
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return <LoadingState />;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageTitle
        title="Dashboard Ventanilla"
        subtitle={
          isAdminUser
            ? 'Seguimiento de solicitudes por estado, tipo, funcionario, comuna y frecuencia de visita del ciudadano.'
            : 'Seguimiento de solicitudes por estado, tipo, comuna y frecuencia de visita del ciudadano.'
        }
        action={
          <Button variant="contained" onClick={handleExport} disabled={exporting}>
            {exporting ? 'Exportando...' : 'Exportar reporte'}
          </Button>
        }
      />

      <SectionCard title="Filtros">
        <DateRangeToolbar
          fechaInicio={fechaInicio}
          fechaFin={fechaFin}
          loading={loading}
          onFechaInicioChange={setFechaInicio}
          onFechaFinChange={setFechaFin}
          onSearch={() => load(currentFilter, isAdminUser)}
          onClear={() => {
            setFechaInicio('');
            setFechaFin('');
            load({}, isAdminUser);
          }}
        />
      </SectionCard>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' },
          gap: 2,
        }}
      >
        <StatCard
          title="Total"
          value={summary?.totalRegistros ?? 0}
          icon={<AssignmentTurnedInIcon color="primary" />}
        />

        <StatCard
          title="Pendientes"
          value={summary?.pendientes ?? 0}
          icon={<PendingActionsIcon color="warning" />}
        />

        <StatCard
          title="Realizadas"
          value={summary?.realizadas ?? 0}
          icon={<CheckCircleIcon color="success" />}
        />

        <StatCard
          title="Rechazadas"
          value={summary?.rechazadas ?? 0}
          icon={<AssignmentLateIcon color="error" />}
        />
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' },
          gap: 2,
        }}
      >
        <BarGroupChart title="Solicitudes por estado" rows={byStatus} />
        <PieGroupChart title="Solicitudes por tipo" rows={byRequest} />

        {isAdminUser ? (
          <BarGroupChart title="Top funcionarios" rows={byUser} horizontal />
        ) : null}

        <BarGroupChart title="Solicitudes por comuna" rows={byComuna} />
      </Box>

      <SectionCard title="Últimos registros de Ventanilla">
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box
            sx={{
              borderRadius: 2,
              bgcolor: 'background.default',
              border: '1px solid',
              borderColor: 'divider',
              px: 2,
              py: 1.5,
            }}
          >
            <Typography sx={{ fontWeight: 700, fontSize: 14 }}>
              Lectura rápida de frecuencia del ciudadano
            </Typography>

            <Typography color="text.secondary" sx={{ fontSize: 13, mt: 0.5 }}>
              La columna “Frecuencia / última visita” muestra si el ciudadano es nuevo,
              recurrente o frecuente, y hace cuánto tiempo fue su visita anterior.
            </Typography>

            <Box
              sx={{
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 1,
                mt: 1.5,
              }}
            >
              <Chip label="Primera visita" color="success" size="small" />
              <Chip label="Recurrente" color="primary" variant="outlined" size="small" />
              <Chip label="Frecuente" color="warning" variant="outlined" size="small" />
              <Chip label="Vino hoy" color="info" variant="outlined" size="small" />
              <Chip label="Sin trazabilidad" color="default" variant="outlined" size="small" />
            </Box>
          </Box>

          <TableContainer
            component={Paper}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: 'none',
              maxHeight: 560,
            }}
          >
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800, minWidth: 100 }}>
                    Fecha
                  </TableCell>

                  <TableCell sx={{ fontWeight: 800, minWidth: 230 }}>
                    Ciudadano
                  </TableCell>

                  <TableCell sx={{ fontWeight: 800, minWidth: 120 }}>
                    Cédula
                  </TableCell>

                  <TableCell sx={{ fontWeight: 800, minWidth: 220 }}>
                    Solicitud
                  </TableCell>

                  <TableCell sx={{ fontWeight: 800, minWidth: 150 }}>
                    Estado
                  </TableCell>

                  {isAdminUser ? (
                    <TableCell sx={{ fontWeight: 800, minWidth: 150 }}>
                      Funcionario
                    </TableCell>
                  ) : null}

                  <TableCell sx={{ fontWeight: 800, minWidth: 220 }}>
                    Frecuencia / última visita
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {recentRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={emptyTableColSpan} align="center" sx={{ py: 4 }}>
                      <Typography sx={{ fontWeight: 700 }}>
                        No hay registros de Ventanilla
                      </Typography>

                      <Typography color="text.secondary" sx={{ fontSize: 13 }}>
                        No se encontraron registros para el periodo seleccionado.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  recentRecords.map((record) => (
                    <TableRow key={record.id} hover>
                      <TableCell>
                        <Typography sx={{ fontWeight: 700, fontSize: 13 }}>
                          {formatDate(record.fecha)}
                        </Typography>

                        <Typography color="text.secondary" sx={{ fontSize: 11 }}>
                          Vent. {record.numeroVentanilla}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Box>
                          <Typography sx={{ fontWeight: 700, fontSize: 14 }}>
                            {record.nombreUsuario}
                          </Typography>

                          <Typography color="text.secondary" sx={{ fontSize: 12 }}>
                            {record.telefono || 'Sin teléfono'}
                          </Typography>

                          <Typography color="text.secondary" sx={{ fontSize: 12 }}>
                            {record.barrioNombre} · {record.comunaNombre}
                          </Typography>
                        </Box>
                      </TableCell>

                      <TableCell>
                        <Typography sx={{ fontWeight: 700, fontSize: 13 }}>
                          {record.cedulaUsuario}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography sx={{ fontWeight: 700, fontSize: 13 }}>
                          {record.solicitudNombre}
                        </Typography>

                        <Typography color="text.secondary" sx={{ fontSize: 12 }}>
                          {record.categoriaNombre}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Chip
                          label={record.estadoSolicitudNombre}
                          size="small"
                          variant="outlined"
                          color="default"
                          sx={{ fontWeight: 700 }}
                        />
                      </TableCell>

                      {isAdminUser ? (
                        <TableCell>
                          <Typography sx={{ fontSize: 13 }}>
                            {record.funcionarioUsername || 'Sin funcionario'}
                          </Typography>
                        </TableCell>
                      ) : null}

                      <TableCell>
                        <CitizenFrequencyField record={record} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </SectionCard>
    </Box>
  );
}