'use client';

import AssignmentIcon from '@mui/icons-material/Assignment';
import DownloadDoneIcon from '@mui/icons-material/DownloadDone';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import GroupsIcon from '@mui/icons-material/Groups';
import { Alert, Box, Button, Stack } from '@mui/material';
import { useEffect, useState } from 'react';
import DateRangeToolbar from '@/components/dashboard/DateRangeToolbar';
import { BarGroupChart, PageTitle, PieGroupChart } from '@/components/dashboard/ReportCharts';
import SectionCard from '@/components/dashboard/SectionCard';
import { LoadingState } from '@/components/dashboard/States';
import StatCard from '@/components/dashboard/StatCard';
import { exportDmcReport } from '@/services/export.service';
import { getDmcGroup, getDmcSummary } from '@/services/report.service';
import { DmcReportSummaryResponse, ReportDateRange, ReportGroupResponse } from '@/types/report.types';

export default function DmcDashboardPage() {
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [summary, setSummary] = useState<DmcReportSummaryResponse | null>(null);
  const [byType, setByType] = useState<ReportGroupResponse[]>([]);
  const [bySurveyor, setBySurveyor] = useState<ReportGroupResponse[]>([]);
  const [byUser, setByUser] = useState<ReportGroupResponse[]>([]);
  const [byComuna, setByComuna] = useState<ReportGroupResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  const currentFilter: ReportDateRange = { fechaInicio, fechaFin };

  async function load(filter: ReportDateRange = currentFilter) {
    setLoading(true);
    setError('');

    try {
      const [nextSummary, type, surveyor, user, comuna] = await Promise.all([
        getDmcSummary(filter),
        getDmcGroup('by-type', filter),
        getDmcGroup('by-surveyor', filter),
        getDmcGroup('by-user', filter),
        getDmcGroup('by-comuna', filter),
      ]);

      setSummary(nextSummary);
      setByType(type);
      setBySurveyor(surveyor);
      setByUser(user);
      setByComuna(comuna);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cargar DMC.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load({});
  }, []);

  async function handleExport() {
    setExporting(true);

    try {
      await exportDmcReport(currentFilter);
    } finally {
      setExporting(false);
    }
  }

  if (loading) return <LoadingState />;

  return (
    <Stack spacing={3}>
      <PageTitle
        title="Dashboard DMC"
        subtitle="Seguimiento por tipo DMC, encuestador, funcionario y comuna."
        action={<Button variant="contained" onClick={handleExport} disabled={exporting}>{exporting ? 'Exportando...' : 'Exportar reporte'}</Button>}
      />

      <SectionCard title="Filtros">
        <DateRangeToolbar
          fechaInicio={fechaInicio}
          fechaFin={fechaFin}
          loading={loading}
          onFechaInicioChange={setFechaInicio}
          onFechaFinChange={setFechaFin}
          onSearch={() => load(currentFilter)}
          onClear={() => {
            setFechaInicio('');
            setFechaFin('');
            load({});
          }}
        />
      </SectionCard>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 2 }}>
        <StatCard title="Registros" value={summary?.totalRegistros ?? 0} icon={<AssignmentIcon color="primary" />} />
        <StatCard title="Cantidad total" value={summary?.totalCantidad ?? 0} icon={<FactCheckIcon color="success" />} />
        <StatCard title="Cargadas" value={summary?.totalCargadas ?? 0} icon={<DownloadDoneIcon color="secondary" />} />
        <StatCard title="Descargadas" value={summary?.totalDescargadas ?? 0} icon={<GroupsIcon color="warning" />} />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' }, gap: 2 }}>
        <PieGroupChart title="DMC por tipo" rows={byType} />
        <BarGroupChart title="DMC por encuestador" rows={bySurveyor} horizontal />
        <BarGroupChart title="DMC por funcionario" rows={byUser} horizontal />
        <BarGroupChart title="DMC por comuna" rows={byComuna} />
      </Box>
    </Stack>
  );
}
