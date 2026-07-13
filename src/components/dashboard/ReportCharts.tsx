'use client';

import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import { BarChart, PieChart } from '@mui/x-charts';
import { ReportGroupResponse } from '@/types/report.types';
import SectionCard from './SectionCard';

function label(item: ReportGroupResponse) {
  return item.nombre ?? item.codigo ?? 'Sin nombre';
}

export function BarGroupChart({
  title,
  rows,
  horizontal,
}: {
  title: string;
  rows: ReportGroupResponse[];
  horizontal?: boolean;
}) {
  const sliced = rows.slice(0, 8);
  const labels = sliced.map(label);
  const values = sliced.map((item) => item.total);

  return (
    <SectionCard title={title}>
      {values.length ? (
        <BarChart
          height={320}
          layout={horizontal ? 'horizontal' : 'vertical'}
          xAxis={horizontal ? undefined : [{ scaleType: 'band', data: labels }]}
          yAxis={horizontal ? [{ scaleType: 'band', data: labels }] : undefined}
          series={[{ data: values, label: 'Total' }]}
        />
      ) : (
        <Alert severity="info">No hay datos disponibles.</Alert>
      )}
    </SectionCard>
  );
}

export function PieGroupChart({ title, rows }: { title: string; rows: ReportGroupResponse[] }) {
  return (
    <SectionCard title={title}>
      {rows.length ? (
        <PieChart
          height={320}
          series={[
            {
              data: rows.slice(0, 8).map((item, index) => ({
                id: item.id ?? index,
                value: item.total,
                label: label(item),
              })),
            },
          ]}
        />
      ) : (
        <Alert severity="info">No hay datos disponibles.</Alert>
      )}
    </SectionCard>
  );
}

export function PageTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={2}
      sx={{ justifyContent: 'space-between' }}
    >
      <Box>
        <Typography variant="h4">{title}</Typography>
        <Typography color="text.secondary">{subtitle}</Typography>
      </Box>
      {action}
    </Stack>
  );
}
