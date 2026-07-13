'use client';

import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import { Alert, Box, Button, Stack } from '@mui/material';
import { useState } from 'react';
import DateRangeToolbar from '@/components/dashboard/DateRangeToolbar';
import { PageTitle } from '@/components/dashboard/ReportCharts';
import SectionCard from '@/components/dashboard/SectionCard';
import { AccessMessage } from '@/components/dashboard/States';
import { ApiClientError } from '@/lib/apiClient';
import { exportDmc, exportDmcReport, exportVentanilla, exportVentanillaReport } from '@/services/export.service';
import { ReportDateRange } from '@/types/report.types';

export default function ExportacionesPage() {
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [loading, setLoading] = useState(false);
  const [restricted, setRestricted] = useState(false);
  const [error, setError] = useState('');

  const filter: ReportDateRange = { fechaInicio, fechaFin };

  async function download(handler: (filter: ReportDateRange) => Promise<void>) {
    setLoading(true);
    setRestricted(false);
    setError('');

    try {
      await handler(filter);
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 403) {
        setRestricted(true);
      } else {
        setError(err instanceof Error ? err.message : 'No fue posible descargar el archivo.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Stack spacing={3}>
      <PageTitle title="Exportaciones" subtitle="Descarga archivos Excel de listados y reportes." />

      {restricted ? <AccessMessage message="Tu rol no tiene permisos para exportar información." /> : null}
      {error ? <Alert severity="error">{error}</Alert> : null}

      <SectionCard title="Filtros de fecha">
        <DateRangeToolbar
          fechaInicio={fechaInicio}
          fechaFin={fechaFin}
          loading={loading}
          onFechaInicioChange={setFechaInicio}
          onFechaFinChange={setFechaFin}
          onSearch={() => undefined}
          onClear={() => {
            setFechaInicio('');
            setFechaFin('');
          }}
        />
      </SectionCard>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
        <SectionCard title="Listados operativos" subtitle="Exporta registros completos según filtros.">
          <Stack spacing={2}>
            <Button variant="contained" startIcon={<CloudDownloadIcon />} onClick={() => download(exportVentanilla)} disabled={loading}>
              Exportar registros de Ventanilla
            </Button>
            <Button variant="contained" startIcon={<CloudDownloadIcon />} onClick={() => download(exportDmc)} disabled={loading}>
              Exportar registros DMC
            </Button>
          </Stack>
        </SectionCard>

        <SectionCard title="Reportes consolidados" subtitle="Exporta libros Excel con varias hojas de indicadores.">
          <Stack spacing={2}>
            <Button variant="outlined" startIcon={<CloudDownloadIcon />} onClick={() => download(exportVentanillaReport)} disabled={loading}>
              Exportar reporte Ventanilla
            </Button>
            <Button variant="outlined" startIcon={<CloudDownloadIcon />} onClick={() => download(exportDmcReport)} disabled={loading}>
              Exportar reporte DMC
            </Button>
          </Stack>
        </SectionCard>
      </Box>
    </Stack>
  );
}
