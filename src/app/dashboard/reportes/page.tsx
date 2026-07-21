'use client';

import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import PreviewIcon from '@mui/icons-material/Preview';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import TableChartIcon from '@mui/icons-material/TableChart';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useRef, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import * as XLSX from 'xlsx';

import { ApiClientError } from '@/lib/apiClient';
import {
  downloadVentanillaSolicitudesPdf,
  getDmcGroup,
  getDmcSummary,
  getVentanillaEmployeeDetailedPerformance,
  getVentanillaFrequentCitizens,
  getVentanillaSolicitudesTrend,
  previewVentanillaSolicitudes,
} from '@/services/report.service';
import {
  DmcReportSummaryResponse,
  ReportGroupResponse,
  VentanillaDailyTrendResponse,
  VentanillaEmployeeDetailedPerformanceResponse,
  VentanillaFrequentCitizenResponse,
  VentanillaSolicitudPreviewResponse,
} from '@/types/report.types';

type SnackbarSeverity = 'success' | 'error' | 'warning' | 'info';

type SnackbarState = {
  open: boolean;
  message: string;
  severity: SnackbarSeverity;
};

type ReportType =
  | 'SOLICITUDES'
  | 'DMC'
  | 'CIUDADANOS_FRECUENTES'
  | 'DESEMPENO_DETALLADO_VENTANILLA';

type RequiredDateRange = {
  fechaInicio: string;
  fechaFin: string;
};

type FormState = {
  fechaInicio: string;
  fechaFin: string;
  tipoReporte: ReportType;
};

const MAX_RANGE_DAYS = 1825;
const PDF_MARGIN_MM = 9;
const PDF_PAGE_HEADER_HEIGHT_MM = 18;
const PDF_PAGE_FOOTER_HEIGHT_MM = 10;
const PDF_EXPORT_CANVAS_SCALE = 2.8;
const PDF_EXPORT_WIDTH_PX = 1680;
const PDF_EXPORT_MIN_HEIGHT_PX = 760;
const SISBEN_LOGO_PATH = '/images/logo-sisben.png';

const initialSnackbar: SnackbarState = {
  open: false,
  message: '',
  severity: 'success',
};

const chartColors = [
  '#0066CC',
  '#E30613',
  '#FCD116',
  '#2E7D32',
  '#0288D1',
  '#6D4C41',
  '#455A64',
  '#9C27B0',
];

const reportCardSx = {
  borderRadius: 4,
  border: '1px solid',
  borderColor: 'divider',
  boxShadow: 'none',
};

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function getDaysBetween(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const diff = end.getTime() - start.getTime();

  return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
}

const initialForm: FormState = {
  fechaInicio: getTodayDate(),
  fechaFin: getTodayDate(),
  tipoReporte: 'SOLICITUDES',
};

function formatPercent(value: number) {
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('es-CO').format(value);
}

function getGroupingLabel(tipoAgrupacion?: string) {
  return tipoAgrupacion === 'MENSUAL' ? 'Mensual' : 'Diaria';
}

function formatDateLabel(value: string) {
  if (!value) {
    return '-';
  }

  const [year, month, day] = value.split('-');

  if (!year || !month || !day) {
    return value;
  }

  return `${day}/${month}/${year}`;
}

function buildPdfFilename(tipoReporte: ReportType, fechaInicio: string, fechaFin: string) {
  const labels: Record<ReportType, string> = {
    SOLICITUDES: 'solicitudes',
    DMC: 'dmc',
    CIUDADANOS_FRECUENTES: 'ciudadanos-frecuentes',
    DESEMPENO_DETALLADO_VENTANILLA: 'desempeno-detallado-ventanilla',
  };

  return `Reporte-${labels[tipoReporte]}-${fechaInicio}-a-${fechaFin}.pdf`;
}

function buildExcelFilename(tipoReporte: ReportType, fechaInicio: string, fechaFin: string) {
  return buildPdfFilename(tipoReporte, fechaInicio, fechaFin).replace('.pdf', '.xlsx');
}

function getReportTitle(tipoReporte: ReportType) {
  const titles: Record<ReportType, string> = {
    SOLICITUDES: 'Reporte de solicitudes - Ventanilla',
    DMC: 'Reporte DMC',
    CIUDADANOS_FRECUENTES: 'Ciudadanos frecuentes',
    DESEMPENO_DETALLADO_VENTANILLA: 'Desempeño detallado por funcionario - Ventanilla',
  };

  return titles[tipoReporte];
}


function getReportDescription(tipoReporte: ReportType) {
  const descriptions: Record<ReportType, string> = {
    SOLICITUDES: 'Consolidado por tipo de solicitud, días hábiles, totales y comportamiento diario del módulo de Ventanilla.',
    DMC: 'Resumen operativo de registros DMC, cargadas, descargadas y distribución territorial por comuna.',
    CIUDADANOS_FRECUENTES: 'Ranking de ciudadanos con mayor recurrencia, visitas, trámites y fechas de atención registradas.',
    DESEMPENO_DETALLADO_VENTANILLA: 'Evaluación detallada de atenciones por funcionario, estados de gestión, promedio diario y detalle por fecha.',
  };

  return descriptions[tipoReporte];
}

function formatDateTimeLabel() {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date());
}

function normalizeSheetName(name: string) {
  return name
    .replace(/[\/?*:[\]]/g, ' ')
    .trim()
    .slice(0, 31) || 'Hoja';
}

function appendJsonSheet(
  workbook: XLSX.WorkBook,
  sheetName: string,
  rows: Record<string, string | number | boolean | null>[],
  widths: number[] = []
) {
  const safeRows = rows.length ? rows : [{ Mensaje: 'No hay datos para mostrar' }];
  const worksheet = XLSX.utils.json_to_sheet(safeRows);

  if (widths.length) {
    worksheet['!cols'] = widths.map((width) => ({ wch: width }));
  }

  XLSX.utils.book_append_sheet(workbook, worksheet, normalizeSheetName(sheetName));
}

function getGroupName(item: ReportGroupResponse) {
  return item.nombre || item.codigo || 'Sin clasificar';
}

function getGroupTotal(data: ReportGroupResponse[]) {
  return data.reduce((sum, item) => sum + Number(item.total ?? 0), 0);
}

function getPercentage(value: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return (value * 100) / total;
}

function groupRowsToExcelRows(data: ReportGroupResponse[]) {
  const total = getGroupTotal(data);

  return data.map((item, index) => {
    const itemTotal = Number(item.total ?? 0);

    return {
      '#': index + 1,
      Código: item.codigo || '',
      Nombre: getGroupName(item),
      Total: itemTotal,
      Porcentaje: `${formatPercent(getPercentage(itemTotal, total))} %`,
    };
  });
}

function buildGroupChartData(data: ReportGroupResponse[], limit = 14) {
  return [...data]
    .sort((a, b) => Number(b.total ?? 0) - Number(a.total ?? 0))
    .slice(0, limit)
    .map((item) => {
      const total = Number(item.total ?? 0);

      return {
        nombre: getGroupName(item),
        total,
        totalLabel: formatNumber(total),
      };
    });
}

function buildGroupPieData(data: ReportGroupResponse[], limit = 8) {
  const ordered = [...data].sort((a, b) => Number(b.total ?? 0) - Number(a.total ?? 0));

  if (ordered.length <= limit) {
    return ordered.map((item) => ({
      nombre: getGroupName(item),
      total: Number(item.total ?? 0),
    }));
  }

  const mainRows = ordered.slice(0, limit);
  const otherRows = ordered.slice(limit);
  const otherTotal = otherRows.reduce((sum, item) => sum + Number(item.total ?? 0), 0);

  return [
    ...mainRows.map((item) => ({
      nombre: getGroupName(item),
      total: Number(item.total ?? 0),
    })),
    {
      nombre: 'Otros',
      total: otherTotal,
    },
  ];
}

function isWeekendDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);

  if (!year || !month || !day) {
    return false;
  }

  const date = new Date(year, month - 1, day);
  const dayOfWeek = date.getDay();

  return dayOfWeek === 0 || dayOfWeek === 6;
}

function getBusinessDates(dates: string[]) {
  return dates.filter((date) => !isWeekendDate(date));
}

function buildSolicitudRowsForDates(
  rows: VentanillaSolicitudPreviewResponse['filas'],
  dates: string[]
): VentanillaSolicitudPreviewResponse['filas'] {
  const totalGeneral = rows.reduce(
    (sum, row) => sum + dates.reduce(
      (dateSum, date) => dateSum + Number(row.cantidadesPorFecha[date] ?? 0),
      0
    ),
    0
  );

  return rows
    .map((row) => {
      const rowTotal = dates.reduce(
        (sum, date) => sum + Number(row.cantidadesPorFecha[date] ?? 0),
        0
      );

      return {
        ...row,
        totalGeneral: rowTotal,
        porcentaje: getPercentage(rowTotal, totalGeneral),
      };
    })
    .filter((row) => row.totalGeneral > 0)
    .sort((a, b) => b.totalGeneral - a.totalGeneral || a.solicitud.localeCompare(b.solicitud));
}

function getSolicitudColumnTotal(
  rows: VentanillaSolicitudPreviewResponse['filas'],
  fecha: string
) {
  return rows.reduce((sum, row) => sum + Number(row.cantidadesPorFecha[fecha] ?? 0), 0);
}

function getCitizenNameLabel(item: VentanillaFrequentCitizenResponse) {
  const name = item.nombreUsuario?.trim();

  if (name) {
    return name;
  }

  return `CC ${item.cedulaUsuario}`;
}

function getCitizenChartLabel(item: VentanillaFrequentCitizenResponse) {
  const name = getCitizenNameLabel(item);

  return `${name} · ${item.cedulaUsuario}`;
}

function buildFrequentCitizenGroupData(
  data: VentanillaFrequentCitizenResponse[],
  metric: 'totalVisitas' | 'totalSolicitudes',
  limit = 14
): ReportGroupResponse[] {
  return [...data]
    .sort((a, b) => Number(b[metric] ?? 0) - Number(a[metric] ?? 0))
    .slice(0, limit)
    .map((item, index) => ({
      id: index + 1,
      codigo: item.cedulaUsuario,
      nombre: getCitizenChartLabel(item),
      total: Number(item[metric] ?? 0),
    }));
}

function getTopFrequentCitizen(
  data: VentanillaFrequentCitizenResponse[],
  metric: 'totalVisitas' | 'totalSolicitudes'
) {
  if (!data.length) {
    return null;
  }

  return [...data].sort((a, b) => Number(b[metric] ?? 0) - Number(a[metric] ?? 0))[0];
}


function getEmployeeNameLabel(item: VentanillaEmployeeDetailedPerformanceResponse) {
  const name = item.funcionarioUsername?.trim();

  if (name) {
    return name;
  }

  return 'Sin funcionario';
}

function getEmployeeDetailedTotal(data: VentanillaEmployeeDetailedPerformanceResponse[]) {
  return data.reduce((sum, item) => sum + Number(item.totalAtenciones ?? 0), 0);
}

function getEmployeeDetailedDailyRows(data: VentanillaEmployeeDetailedPerformanceResponse[]) {
  return data.flatMap((employee) =>
    employee.detalleDiario.map((item) => ({
      fecha: item.fecha,
      funcionarioId: employee.funcionarioId,
      funcionarioUsername: employee.funcionarioUsername,
      total: Number(item.total ?? 0),
    }))
  ).sort((a, b) => a.fecha.localeCompare(b.fecha) || b.total - a.total);
}

function buildEmployeeDetailedChartData(
  data: VentanillaEmployeeDetailedPerformanceResponse[]
): ReportGroupResponse[] {
  return data.map((item, index) => ({
    id: item.funcionarioId ?? index + 1,
    codigo: getEmployeeNameLabel(item),
    nombre: getEmployeeNameLabel(item),
    total: Number(item.totalAtenciones ?? 0),
  }));
}

function getEmployeeDetailedTop(data: VentanillaEmployeeDetailedPerformanceResponse[]) {
  if (!data.length) {
    return null;
  }

  return [...data].sort(
    (a, b) => Number(b.totalAtenciones ?? 0) - Number(a.totalAtenciones ?? 0)
  )[0];
}


function PdfReportHeader({
  title,
  description,
  fechaInicio,
  fechaFin,
  totalDays,
}: {
  title: string;
  description: string;
  fechaInicio: string;
  fechaFin: string;
  totalDays: number;
}) {
  return (
    <Card
      className="report-export-section report-pdf-header"
      sx={{
        ...reportCardSx,
        overflow: 'hidden',
        bgcolor: '#FFFFFF',
      }}
    >
      <Box
        sx={{
          height: 8,
          background: 'linear-gradient(90deg, #0066CC 0%, #0066CC 58%, #E30613 78%, #FCD116 100%)',
        }}
      />

      <CardContent sx={{ p: { xs: 2.4, md: 3.2 } }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2.4}
          sx={{
            alignItems: { xs: 'flex-start', md: 'center' },
            justifyContent: 'space-between',
            mb: 2.4,
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                fontSize: 12,
                fontWeight: 900,
                letterSpacing: 0.9,
                color: 'primary.main',
                textTransform: 'uppercase',
                mb: 0.7,
              }}
            >
              AppSisbén Valledupar · Vista de reporte PDF
            </Typography>

            <Typography
              variant="h4"
              sx={{
                fontWeight: 900,
                color: '#263238',
                lineHeight: 1.08,
              }}
            >
              {title}
            </Typography>

            <Typography
              color="text.secondary"
              sx={{
                mt: 1,
                fontSize: 14,
                fontWeight: 600,
                maxWidth: 920,
              }}
            >
              {description}
            </Typography>
          </Box>

          <Box
            sx={{
              width: 132,
              height: 54,
              borderRadius: 999,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 8px 22px rgba(0, 77, 153, 0.08)',
              position: 'relative',
              overflow: 'hidden',
              '&::after': {
                content: '""',
                position: 'absolute',
                left: 24,
                right: 24,
                bottom: 6,
                height: 3,
                borderRadius: 999,
                background: 'linear-gradient(90deg, #0066CC 0%, #E30613 72%, #FCD116 100%)',
              },
            }}
          >
            <Box
              component="img"
              src={SISBEN_LOGO_PATH}
              alt="Logo Sisbén"
              sx={{
                width: 86,
                height: 32,
                objectFit: 'contain',
                display: 'block',
              }}
            />
          </Box>
        </Stack>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(4, 1fr)',
            },
            gap: 1.4,
          }}
        >
          <Box sx={{ p: 1.4, borderRadius: 3, bgcolor: '#F4F8FC', border: '1px solid #E2E8F0' }}>
            <Typography sx={{ fontSize: 11, fontWeight: 900, color: 'text.secondary', textTransform: 'uppercase' }}>
              Fecha inicio
            </Typography>
            <Typography sx={{ fontSize: 16, fontWeight: 900, color: '#263238' }}>
              {formatDateLabel(fechaInicio)}
            </Typography>
          </Box>

          <Box sx={{ p: 1.4, borderRadius: 3, bgcolor: '#F4F8FC', border: '1px solid #E2E8F0' }}>
            <Typography sx={{ fontSize: 11, fontWeight: 900, color: 'text.secondary', textTransform: 'uppercase' }}>
              Fecha fin
            </Typography>
            <Typography sx={{ fontSize: 16, fontWeight: 900, color: '#263238' }}>
              {formatDateLabel(fechaFin)}
            </Typography>
          </Box>

          <Box sx={{ p: 1.4, borderRadius: 3, bgcolor: '#F4F8FC', border: '1px solid #E2E8F0' }}>
            <Typography sx={{ fontSize: 11, fontWeight: 900, color: 'text.secondary', textTransform: 'uppercase' }}>
              Rango analizado
            </Typography>
            <Typography sx={{ fontSize: 16, fontWeight: 900, color: '#263238' }}>
              {formatNumber(totalDays)} día(s)
            </Typography>
          </Box>

          <Box sx={{ p: 1.4, borderRadius: 3, bgcolor: '#F4F8FC', border: '1px solid #E2E8F0' }}>
            <Typography sx={{ fontSize: 11, fontWeight: 900, color: 'text.secondary', textTransform: 'uppercase' }}>
              Generado
            </Typography>
            <Typography sx={{ fontSize: 16, fontWeight: 900, color: '#263238' }}>
              {formatDateTimeLabel()}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

function KpiCard({
  title,
  value,
  subtitle,
  color = 'primary',
}: {
  title: string;
  value: number;
  subtitle?: string;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'error';
}) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderRadius: 3,
        bgcolor: 'background.paper',
        height: '100%',
      }}
    >
      <Typography color="text.secondary" sx={{ fontSize: 13, fontWeight: 800 }}>
        {title}
      </Typography>

      <Typography
        variant="h5"
        sx={{
          fontWeight: 900,
          mt: 0.5,
          color: `${color}.main`,
        }}
      >
        {formatNumber(value)}
      </Typography>

      {subtitle ? (
        <Typography color="text.secondary" sx={{ fontSize: 12, mt: 0.5 }}>
          {subtitle}
        </Typography>
      ) : null}
    </Paper>
  );
}

function HorizontalGroupBarChart({
  title,
  description,
  data,
  barName = 'Total',
  color = '#0066CC',
}: {
  title: string;
  description?: string;
  data: ReportGroupResponse[];
  barName?: string;
  color?: string;
}) {
  const chartData = buildGroupChartData(data);
  const height = Math.max(460, Math.min(780, chartData.length * 44 + 160));

  return (
    <Card className="report-export-section" sx={reportCardSx}>
      <CardContent sx={{ p: { xs: 2, md: 3 } }}>
        <Typography variant="h6" sx={{ fontWeight: 900 }}>
          {title}
        </Typography>

        {description ? (
          <Typography color="text.secondary" sx={{ fontSize: 13, mb: 2, fontWeight: 600 }}>
            {description}
          </Typography>
        ) : null}

        {!chartData.length ? (
          <Alert severity="info">
            No hay datos suficientes para construir la gráfica.
          </Alert>
        ) : (
          <Box sx={{ width: '100%', height }}>
            <ResponsiveContainer>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{
                  top: 20,
                  right: 52,
                  left: 40,
                  bottom: 20,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#D9E2EC" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#263238' }} />
                <YAxis
                  type="category"
                  dataKey="nombre"
                  width={280}
                  tick={{ fontSize: 12, fill: '#263238', fontWeight: 700 }}
                />
                <ChartTooltip />
                <Legend />
                <Bar
                  dataKey="total"
                  name={barName}
                  fill={color}
                  radius={[0, 8, 8, 0]}
                  minPointSize={16}
                  isAnimationActive={false}
                >
                  <LabelList
                    dataKey="totalLabel"
                    position="insideRight"
                    fill="#FFFFFF"
                    fontSize={13}
                    fontWeight={900}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

function PieGroupChart({
  title,
  description,
  data,
}: {
  title: string;
  description?: string;
  data: ReportGroupResponse[];
}) {
  const chartData = buildGroupPieData(data);

  return (
    <Card className="report-export-section" sx={reportCardSx}>
      <CardContent sx={{ p: { xs: 2, md: 3 } }}>
        <Typography variant="h6" sx={{ fontWeight: 900 }}>
          {title}
        </Typography>

        {description ? (
          <Typography color="text.secondary" sx={{ fontSize: 13, mb: 2, fontWeight: 600 }}>
            {description}
          </Typography>
        ) : null}

        {!chartData.length ? (
          <Alert severity="info">
            No hay datos suficientes para construir el diagrama.
          </Alert>
        ) : (
          <Box sx={{ width: '100%', height: 460 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  isAnimationActive={false}
                  data={chartData}
                  dataKey="total"
                  nameKey="nombre"
                  outerRadius={145}
                  label
                >
                  {chartData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={chartColors[index % chartColors.length]}
                    />
                  ))}
                </Pie>

                <ChartTooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

function SolicitudesTable({
  preview,
  rows,
  dates,
  total,
  excludedWeekendCount,
}: {
  preview: VentanillaSolicitudPreviewResponse;
  rows: VentanillaSolicitudPreviewResponse['filas'];
  dates: string[];
  total: number;
  excludedWeekendCount: number;
}) {
  const tableMinWidth = Math.max(
    1120,
    380 + dates.length * 82 + 140 + 100
  );

  return (
    <Card className="report-export-section" sx={reportCardSx}>
      <CardContent sx={{ p: { xs: 2, md: 3 } }}>
        <Typography variant="h6" sx={{ fontWeight: 900 }}>
          Totales por tipo de solicitud - Ventanilla
        </Typography>

        <Typography color="text.secondary" sx={{ fontSize: 13, mb: 2, fontWeight: 700 }}>
          Total general lunes a viernes:
          {' '}
          <strong>{formatNumber(total)}</strong>
          {' '}
          · Agrupación:
          {' '}
          <strong>{getGroupingLabel(preview.tipoAgrupacion)}</strong>
          {' '}
          · Fechas de fin de semana excluidas:
          {' '}
          <strong>{excludedWeekendCount}</strong>
        </Typography>

        <TableContainer
          component={Paper}
          variant="outlined"
          sx={{
            borderRadius: 3,
            overflowX: 'auto',
            borderColor: 'divider',
          }}
        >
          <Table
            size="small"
            sx={{
              minWidth: tableMinWidth,
              '& .MuiTableCell-root': {
                borderBottom: '1px solid #E2E8F0',
                fontSize: 12.5,
              },
              '& .MuiTableHead-root .MuiTableCell-root': {
                bgcolor: '#EAF3FC',
                color: '#263238',
                fontWeight: 900,
                whiteSpace: 'nowrap',
              },
              '& .MuiTableBody-root .MuiTableRow-root:nth-of-type(even)': {
                bgcolor: '#FAFCFF',
              },
            }}
          >
            <TableHead>
              <TableRow>
                <TableCell sx={{ minWidth: 320 }}>
                  Solicitud
                </TableCell>

                {dates.map((fecha) => (
                  <TableCell key={fecha} align="center" sx={{ minWidth: 82 }}>
                    {formatDateLabel(fecha)}
                  </TableCell>
                ))}

                <TableCell
                  align="center"
                  sx={{
                    minWidth: 130,
                    bgcolor: '#DCEEFF !important',
                  }}
                >
                  Total general
                </TableCell>

                <TableCell
                  align="center"
                  sx={{
                    minWidth: 90,
                    bgcolor: '#DCEEFF !important',
                  }}
                >
                  %
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {!rows.length ? (
                <TableRow>
                  <TableCell colSpan={dates.length + 3} align="center">
                    No hay información para el periodo seleccionado.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row, index) => (
                  <TableRow key={`${row.solicitud}-${index}`} hover>
                    <TableCell
                      sx={{
                        fontWeight: 900,
                        color: '#263238',
                        textTransform: 'uppercase',
                      }}
                    >
                      {row.solicitud}
                    </TableCell>

                    {dates.map((fecha) => {
                      const value = Number(row.cantidadesPorFecha[fecha] ?? 0);

                      return (
                        <TableCell
                          key={`${row.solicitud}-${fecha}`}
                          align="center"
                          sx={{
                            fontWeight: value > 0 ? 900 : 600,
                            color: value > 0 ? '#263238' : '#94A3B8',
                          }}
                        >
                          {value > 0 ? formatNumber(value) : '—'}
                        </TableCell>
                      );
                    })}

                    <TableCell
                      align="center"
                      sx={{
                        fontWeight: 900,
                        color: 'primary.main',
                        bgcolor: '#F1F7FF',
                      }}
                    >
                      {formatNumber(row.totalGeneral)}
                    </TableCell>

                    <TableCell
                      align="center"
                      sx={{
                        fontWeight: 900,
                        color: '#263238',
                        bgcolor: '#F1F7FF',
                      }}
                    >
                      {formatPercent(row.porcentaje)} %
                    </TableCell>
                  </TableRow>
                ))
              )}

              {rows.length ? (
                <TableRow>
                  <TableCell
                    sx={{
                      fontWeight: 900,
                      bgcolor: '#EAF3FC',
                      color: '#263238',
                    }}
                  >
                    Total general
                  </TableCell>

                  {dates.map((fecha) => (
                    <TableCell
                      key={`total-${fecha}`}
                      align="center"
                      sx={{
                        fontWeight: 900,
                        bgcolor: '#EAF3FC',
                        color: '#263238',
                      }}
                    >
                      {formatNumber(getSolicitudColumnTotal(rows, fecha))}
                    </TableCell>
                  ))}

                  <TableCell
                    align="center"
                    sx={{
                      fontWeight: 900,
                      bgcolor: '#DCEEFF',
                      color: 'primary.main',
                    }}
                  >
                    {formatNumber(total)}
                  </TableCell>

                  <TableCell
                    align="center"
                    sx={{
                      fontWeight: 900,
                      bgcolor: '#DCEEFF',
                      color: '#263238',
                    }}
                  >
                    100,0 %
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
}

function SolicitudesBarChart({
  rows,
}: {
  rows: VentanillaSolicitudPreviewResponse['filas'];
}) {
  const chartData = rows.map((row) => {
    const total = Number(row.totalGeneral ?? 0);

    return {
      nombre: row.solicitud,
      total,
      totalLabel: formatNumber(total),
    };
  });

  const height = Math.max(460, Math.min(780, chartData.length * 40 + 160));

  return (
    <Card className="report-export-section" sx={reportCardSx}>
      <CardContent sx={{ p: { xs: 2, md: 3 } }}>
        <Typography variant="h6" sx={{ fontWeight: 900 }}>
          Gráfica de barras por tipo de solicitud
        </Typography>

        <Typography color="text.secondary" sx={{ fontSize: 13, mb: 2, fontWeight: 600 }}>
          Permite identificar rápidamente los tipos de solicitud con mayor volumen.
        </Typography>

        {!chartData.length ? (
          <Alert severity="info">
            No hay datos suficientes para construir la gráfica.
          </Alert>
        ) : (
          <Box sx={{ width: '100%', height }}>
            <ResponsiveContainer>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{
                  top: 20,
                  right: 62,
                  left: 40,
                  bottom: 20,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#D9E2EC" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#263238' }} />
                <YAxis
                  type="category"
                  dataKey="nombre"
                  width={280}
                  tick={{ fontSize: 12, fill: '#263238', fontWeight: 700 }}
                />
                <ChartTooltip />
                <Legend />
                <Bar
                  dataKey="total"
                  name="Total solicitudes"
                  fill="#0066CC"
                  radius={[0, 8, 8, 0]}
                  minPointSize={16}
                  isAnimationActive={false}
                >
                  <LabelList
                    dataKey="totalLabel"
                    position="insideRight"
                    fill="#FFFFFF"
                    fontSize={13}
                    fontWeight={900}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

function SolicitudesTrendChart({
  trend,
}: {
  trend: VentanillaDailyTrendResponse[];
}) {
  const chartData = trend.map((item) => {
    const total = Number(item.total ?? 0);

    return {
      fecha: formatDateLabel(item.fecha),
      total,
      totalLabel: formatNumber(total),
    };
  });

  return (
    <Card className="report-export-section" sx={reportCardSx}>
      <CardContent sx={{ p: { xs: 2, md: 3 } }}>
        <Typography variant="h6" sx={{ fontWeight: 900 }}>
          Línea de tendencia diaria
        </Typography>

        <Typography color="text.secondary" sx={{ fontSize: 13, mb: 2, fontWeight: 600 }}>
          Muestra el comportamiento de las solicitudes de lunes a viernes durante el periodo.
        </Typography>

        {!chartData.length ? (
          <Alert severity="info">
            No hay datos suficientes para construir la línea de tendencia.
          </Alert>
        ) : (
          <Box sx={{ width: '100%', height: 430 }}>
            <ResponsiveContainer>
              <LineChart
                data={chartData}
                margin={{
                  top: 34,
                  right: 38,
                  left: 20,
                  bottom: 28,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#D9E2EC" />
                <XAxis dataKey="fecha" tick={{ fontSize: 12, fill: '#263238' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#263238' }} />
                <ChartTooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="total"
                  name="Solicitudes por fecha"
                  stroke="#0066CC"
                  strokeWidth={3}
                  dot={{
                    r: 5,
                    strokeWidth: 2,
                    fill: '#FFFFFF',
                    stroke: '#0066CC',
                  }}
                  activeDot={{ r: 7 }}
                  isAnimationActive={false}
                >
                  <LabelList
                    dataKey="totalLabel"
                    position="top"
                    fill="#263238"
                    fontSize={13}
                    fontWeight={900}
                  />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}


function drawPdfPageFrame({
  pdf,
  pageNumber,
  title,
  fechaInicio,
  fechaFin,
}: {
  pdf: jsPDF;
  pageNumber: number;
  title: string;
  fechaInicio: string;
  fechaFin: string;
}) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const headerBottomY = PDF_MARGIN_MM + PDF_PAGE_HEADER_HEIGHT_MM - 3;

  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');

  pdf.setFillColor(0, 102, 204);
  pdf.rect(0, 0, pageWidth * 0.62, 3.2, 'F');
  pdf.setFillColor(227, 6, 19);
  pdf.rect(pageWidth * 0.62, 0, pageWidth * 0.24, 3.2, 'F');
  pdf.setFillColor(252, 209, 22);
  pdf.rect(pageWidth * 0.86, 0, pageWidth * 0.14, 3.2, 'F');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(38, 50, 56);
  pdf.text('AppSisbén Valledupar', PDF_MARGIN_MM, PDF_MARGIN_MM + 2.5);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(96, 125, 139);
  pdf.text(
    `${title} · ${formatDateLabel(fechaInicio)} a ${formatDateLabel(fechaFin)}`,
    PDF_MARGIN_MM,
    PDF_MARGIN_MM + 8
  );

  pdf.setDrawColor(226, 232, 240);
  pdf.setLineWidth(0.2);
  pdf.line(PDF_MARGIN_MM, headerBottomY, pageWidth - PDF_MARGIN_MM, headerBottomY);
  pdf.line(PDF_MARGIN_MM, pageHeight - PDF_PAGE_FOOTER_HEIGHT_MM + 2, pageWidth - PDF_MARGIN_MM, pageHeight - PDF_PAGE_FOOTER_HEIGHT_MM + 2);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(96, 125, 139);
  pdf.text(`Generado: ${formatDateTimeLabel()}`, PDF_MARGIN_MM, pageHeight - 5.2);
  pdf.text(`Página ${pageNumber}`, pageWidth - PDF_MARGIN_MM, pageHeight - 5.2, {
    align: 'right',
  });
}

function addPdfCloneStyles(clonedDocument: Document, renderWidth: number) {
  clonedDocument.body.style.backgroundColor = '#ffffff';
  clonedDocument.body.style.fontFamily = 'Arial, Helvetica, sans-serif';
  clonedDocument.body.style.width = `${renderWidth}px`;
  clonedDocument.body.style.margin = '0';

  const style = clonedDocument.createElement('style');

  style.innerHTML = `
    .report-export-section,
    .report-pdf-header {
      width: ${renderWidth}px !important;
      max-width: none !important;
      overflow: visible !important;
      background: #ffffff !important;
      box-shadow: none !important;
      break-inside: avoid !important;
      page-break-inside: avoid !important;
      border-radius: 18px !important;
    }

    .report-export-section * {
      box-sizing: border-box !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    .report-export-section .MuiCardContent-root {
      padding: 28px !important;
    }

    .report-export-section .MuiTableContainer-root {
      max-height: none !important;
      overflow: visible !important;
      width: 100% !important;
      border-radius: 12px !important;
    }

    .report-export-section table {
      border-collapse: collapse !important;
      width: 100% !important;
    }

    .report-export-section .MuiTableCell-root {
      position: static !important;
      left: auto !important;
      right: auto !important;
      top: auto !important;
      z-index: auto !important;
      font-family: Arial, Helvetica, sans-serif !important;
      line-height: 1.35 !important;
      vertical-align: middle !important;
    }

    .report-export-section .MuiTableHead-root .MuiTableCell-root {
      background-color: #EAF3FC !important;
      color: #263238 !important;
      font-weight: 900 !important;
      white-space: nowrap !important;
    }

    .report-export-section .MuiTableBody-root .MuiTableRow-root:nth-of-type(even) .MuiTableCell-root {
      background-color: #FAFCFF !important;
    }

    .report-export-section .MuiChip-root {
      border-radius: 999px !important;
      font-weight: 800 !important;
    }

    .report-export-section svg {
      overflow: visible !important;
    }
  `;

  clonedDocument.head.appendChild(style);
}

export default function ReportesPage() {
  const reportContentRef = useRef<HTMLDivElement | null>(null);

  const [form, setForm] = useState<FormState>(initialForm);

  const [solicitudesPreview, setSolicitudesPreview] =
    useState<VentanillaSolicitudPreviewResponse | null>(null);
  const [solicitudesTrend, setSolicitudesTrend] =
    useState<VentanillaDailyTrendResponse[]>([]);

  const [dmcSummary, setDmcSummary] =
    useState<DmcReportSummaryResponse | null>(null);
  const [dmcComunas, setDmcComunas] =
    useState<ReportGroupResponse[]>([]);

  const [frequentCitizens, setFrequentCitizens] =
    useState<VentanillaFrequentCitizenResponse[]>([]);
  const [employeeDetailedPerformance, setEmployeeDetailedPerformance] =
    useState<VentanillaEmployeeDetailedPerformanceResponse[]>([]);

  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [loadingFullPdf, setLoadingFullPdf] = useState(false);
  const [loadingExcel, setLoadingExcel] = useState(false);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState<SnackbarState>(initialSnackbar);

  const hasReportData =
    Boolean(solicitudesPreview)
    || Boolean(dmcSummary)
    || frequentCitizens.length > 0
    || employeeDetailedPerformance.length > 0;

  const totalDays = getDaysBetween(form.fechaInicio, form.fechaFin);
  const estimatedGrouping = totalDays > 31 ? 'mensual' : 'diaria';

  const solicitudesBusinessDates = solicitudesPreview
    ? getBusinessDates(solicitudesPreview.fechas)
    : [];
  const solicitudesBusinessRows = solicitudesPreview
    ? buildSolicitudRowsForDates(solicitudesPreview.filas, solicitudesBusinessDates)
    : [];
  const solicitudesBusinessTotal = solicitudesBusinessRows.reduce(
    (sum, row) => sum + Number(row.totalGeneral ?? 0),
    0
  );
  const solicitudesExcludedWeekendCount = solicitudesPreview
    ? solicitudesPreview.fechas.length - solicitudesBusinessDates.length
    : 0;
  const solicitudesBusinessTrend = solicitudesTrend.filter((item) => !isWeekendDate(item.fecha));

  const dmcOperationChartData = dmcSummary
    ? [
        {
          nombre: 'Cargadas',
          total: Number(dmcSummary.totalCargadas ?? 0),
        },
        {
          nombre: 'Descargadas',
          total: Number(dmcSummary.totalDescargadas ?? 0),
        },
      ]
    : [];

  const frequentCitizensByVisits = buildFrequentCitizenGroupData(
    frequentCitizens,
    'totalVisitas'
  );
  const frequentCitizensByRequests = buildFrequentCitizenGroupData(
    frequentCitizens,
    'totalSolicitudes'
  );
  const topCitizenByVisits = getTopFrequentCitizen(frequentCitizens, 'totalVisitas');
  const topCitizenByRequests = getTopFrequentCitizen(frequentCitizens, 'totalSolicitudes');
  const frequentCitizensTotalVisits = frequentCitizens.reduce(
    (sum, item) => sum + Number(item.totalVisitas ?? 0),
    0
  );
  const frequentCitizensTotalRequests = frequentCitizens.reduce(
    (sum, item) => sum + Number(item.totalSolicitudes ?? 0),
    0
  );

  const employeeDetailedTotal = getEmployeeDetailedTotal(employeeDetailedPerformance);
  const employeeDetailedTop = getEmployeeDetailedTop(employeeDetailedPerformance);
  const employeeDetailedChartData = buildEmployeeDetailedChartData(employeeDetailedPerformance);
  const employeeDetailedDailyRows = getEmployeeDetailedDailyRows(employeeDetailedPerformance);
  const employeeDetailedAverage = employeeDetailedPerformance.length > 0
    ? employeeDetailedPerformance.reduce(
        (sum, item) => sum + Number(item.promedioDiario ?? 0),
        0
      ) / employeeDetailedPerformance.length
    : 0;

  const showSnackbar = (
    message: string,
    severity: SnackbarSeverity = 'success'
  ) => {
    setSnackbar({
      open: true,
      message,
      severity,
    });
  };

  const closeSnackbar = () => {
    setSnackbar(initialSnackbar);
  };

  const clearPreviewData = () => {
    setSolicitudesPreview(null);
    setSolicitudesTrend([]);
    setDmcSummary(null);
    setDmcComunas([]);
    setFrequentCitizens([]);
    setEmployeeDetailedPerformance([]);
  };

  const updateForm = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));

    clearPreviewData();
  };

  const clearForm = () => {
    setError('');
    clearPreviewData();
    setForm(initialForm);
  };

  const validateForm = () => {
    if (!form.fechaInicio) {
      return 'La fecha inicio es obligatoria.';
    }

    if (!form.fechaFin) {
      return 'La fecha fin es obligatoria.';
    }

    if (form.fechaFin < form.fechaInicio) {
      return 'La fecha fin no puede ser menor que la fecha inicio.';
    }

    const days = getDaysBetween(form.fechaInicio, form.fechaFin);

    if (days > MAX_RANGE_DAYS) {
      return 'El rango máximo permitido es de 5 años.';
    }

    return '';
  };

  const buildFilter = (): RequiredDateRange => ({
    fechaInicio: form.fechaInicio,
    fechaFin: form.fechaFin,
  });

  const handlePreview = async () => {
    setError('');

    const validationMessage = validateForm();

    if (validationMessage) {
      setError(validationMessage);
      showSnackbar(validationMessage, 'warning');
      return;
    }

    const filter = buildFilter();

    setLoadingPreview(true);
    clearPreviewData();

    try {
      if (form.tipoReporte === 'SOLICITUDES') {
        const [previewResponse, trendResponse] = await Promise.all([
          previewVentanillaSolicitudes(filter),
          getVentanillaSolicitudesTrend(filter),
        ]);

        setSolicitudesPreview(previewResponse);
        setSolicitudesTrend(trendResponse);

        showSnackbar(
          previewResponse.filas.length === 0
            ? 'No hay registros de lunes a viernes para el periodo seleccionado.'
            : 'Reporte de solicitudes generado correctamente.',
          previewResponse.filas.length === 0 ? 'info' : 'success'
        );

        return;
      }

      if (form.tipoReporte === 'DMC') {
        const [dmcSummaryResponse, dmcComunasResponse] = await Promise.all([
          getDmcSummary(filter),
          getDmcGroup('by-comuna', filter),
        ]);

        setDmcSummary(dmcSummaryResponse);
        setDmcComunas(dmcComunasResponse);

        showSnackbar('Reporte DMC generado correctamente.', 'success');
        return;
      }

      if (form.tipoReporte === 'DESEMPENO_DETALLADO_VENTANILLA') {
        const response = await getVentanillaEmployeeDetailedPerformance(filter);

        setEmployeeDetailedPerformance(response);

        showSnackbar(
          response.length === 0
            ? 'No hay desempeño de funcionarios para el periodo seleccionado.'
            : 'Reporte de desempeño detallado generado correctamente.',
          response.length === 0 ? 'info' : 'success'
        );

        return;
      }

      const response = await getVentanillaFrequentCitizens(filter, 50);

      setFrequentCitizens(response);

      showSnackbar(
        response.length === 0
          ? 'No hay ciudadanos frecuentes para el periodo seleccionado.'
          : 'Reporte de ciudadanos frecuentes generado correctamente.',
        response.length === 0 ? 'info' : 'success'
      );
    } catch (err) {
      const message = err instanceof ApiClientError
        ? err.message
        : 'No fue posible generar la previsualización.';

      setError(message);
      showSnackbar(message, 'error');
    } finally {
      setLoadingPreview(false);
    }
  };

  const generateReport = async () => {
    setError('');

    const validationMessage = validateForm();

    if (validationMessage) {
      setError(validationMessage);
      showSnackbar(validationMessage, 'warning');
      return;
    }

    if (form.tipoReporte !== 'SOLICITUDES') {
      showSnackbar(
        'El PDF oficial está disponible para el informe de solicitudes. Para este reporte usa “Exportar documento completo”.',
        'info'
      );
      return;
    }

    setLoadingPdf(true);

    try {
      await downloadVentanillaSolicitudesPdf(buildFilter());
      showSnackbar('Reporte PDF oficial generado correctamente.', 'success');
    } catch (err) {
      const message = err instanceof ApiClientError
        ? err.message
        : 'No fue posible generar el reporte PDF.';

      setError(message);
      showSnackbar(message, 'error');
    } finally {
      setLoadingPdf(false);
    }
  };

  const exportCurrentReportToExcel = async () => {
    if (!hasReportData) {
      showSnackbar('Primero genera la previsualización del reporte.', 'warning');
      return;
    }

    setLoadingExcel(true);
    setError('');

    try {
      const workbook = XLSX.utils.book_new();
      const reportTitle = getReportTitle(form.tipoReporte);

      appendJsonSheet(
        workbook,
        'Resumen',
        [
          {
            Campo: 'Reporte',
            Valor: reportTitle,
          },
          {
            Campo: 'Fecha inicio',
            Valor: formatDateLabel(form.fechaInicio),
          },
          {
            Campo: 'Fecha fin',
            Valor: formatDateLabel(form.fechaFin),
          },
          {
            Campo: 'Rango en días',
            Valor: totalDays,
          },
        ],
        [24, 42]
      );

      if (form.tipoReporte === 'SOLICITUDES' && solicitudesPreview) {
        appendJsonSheet(
          workbook,
          'Solicitudes',
          solicitudesBusinessRows.map((row) => {
            const values: Record<string, string | number | boolean | null> = {
              Solicitud: row.solicitud,
            };

            solicitudesBusinessDates.forEach((fecha) => {
              values[formatDateLabel(fecha)] = row.cantidadesPorFecha[fecha] ?? 0;
            });

            values['Total general'] = row.totalGeneral;
            values.Porcentaje = `${formatPercent(row.porcentaje)} %`;

            return values;
          }),
          [36, ...solicitudesBusinessDates.map(() => 14), 18, 14]
        );

        appendJsonSheet(
          workbook,
          'Tendencia',
          solicitudesBusinessTrend.map((item) => ({
            Fecha: formatDateLabel(item.fecha),
            Total: item.total,
          })),
          [18, 14]
        );
      }

      if (form.tipoReporte === 'DMC' && dmcSummary) {
        appendJsonSheet(
          workbook,
          'Resumen DMC',
          [
            { Indicador: 'Total registros DMC', Valor: dmcSummary.totalRegistros },
            { Indicador: 'Cantidad total', Valor: dmcSummary.totalCantidad },
            { Indicador: 'Cargadas', Valor: dmcSummary.totalCargadas },
            { Indicador: 'Descargadas', Valor: dmcSummary.totalDescargadas },
          ],
          [34, 16]
        );

        appendJsonSheet(workbook, 'Comunas DMC', groupRowsToExcelRows(dmcComunas), [8, 18, 32, 16, 16]);
      }

      if (form.tipoReporte === 'CIUDADANOS_FRECUENTES') {
        appendJsonSheet(
          workbook,
          'Ranking ciudadanos',
          frequentCitizens.map((item, index) => {
            const totalVisitas = Number(item.totalVisitas ?? 0);
            const totalSolicitudes = Number(item.totalSolicitudes ?? 0);

            return {
              '#': index + 1,
              Ciudadano: getCitizenNameLabel(item),
              Cédula: item.cedulaUsuario,
              Teléfono: item.telefono || 'Sin teléfono',
              Visitas: totalVisitas,
              Trámites: totalSolicitudes,
              '% visitas': `${formatPercent(getPercentage(totalVisitas, frequentCitizensTotalVisits))} %`,
              '% trámites': `${formatPercent(getPercentage(totalSolicitudes, frequentCitizensTotalRequests))} %`,
              'Primera visita': formatDateLabel(item.primeraVisita || ''),
              'Última visita': formatDateLabel(item.ultimaVisita || ''),
            };
          }),
          [8, 34, 18, 18, 14, 14, 14, 14, 18, 18]
        );

        appendJsonSheet(workbook, 'Ranking por visitas', groupRowsToExcelRows(frequentCitizensByVisits), [8, 18, 44, 16, 16]);
        appendJsonSheet(workbook, 'Ranking por trámites', groupRowsToExcelRows(frequentCitizensByRequests), [8, 18, 44, 16, 16]);
      }

      if (form.tipoReporte === 'DESEMPENO_DETALLADO_VENTANILLA') {
        appendJsonSheet(
          workbook,
          'Resumen desempeño',
          [
            { Indicador: 'Total atenciones', Valor: employeeDetailedTotal },
            { Indicador: 'Funcionarios evaluados', Valor: employeeDetailedPerformance.length },
            { Indicador: 'Promedio diario general', Valor: formatPercent(employeeDetailedAverage) },
            {
              Indicador: 'Funcionario con más atenciones',
              Valor: employeeDetailedTop ? getEmployeeNameLabel(employeeDetailedTop) : 'Sin datos',
            },
          ],
          [34, 36]
        );

        appendJsonSheet(
          workbook,
          'Desempeño funcionarios',
          employeeDetailedPerformance.map((item, index) => ({
            '#': index + 1,
            Funcionario: getEmployeeNameLabel(item),
            'Total atenciones': Number(item.totalAtenciones ?? 0),
            Porcentaje: `${formatPercent(Number(item.porcentaje ?? 0))} %`,
            'Promedio diario': formatPercent(Number(item.promedioDiario ?? 0)),
            Pendientes: Number(item.pendientes ?? 0),
            Realizadas: Number(item.realizadas ?? 0),
            Aprobadas: Number(item.aprobadas ?? 0),
            Rechazadas: Number(item.rechazadas ?? 0),
            Canceladas: Number(item.canceladas ?? 0),
            Revisar: Number(item.revisar ?? 0),
            Nacionales: Number(item.nacionales ?? 0),
            Extranjeros: Number(item.extranjeros ?? 0),
          })),
          [8, 32, 18, 16, 18, 14, 14, 14, 14, 14, 14, 14, 14]
        );

        appendJsonSheet(
          workbook,
          'Detalle diario',
          employeeDetailedDailyRows.map((item, index) => ({
            '#': index + 1,
            Fecha: formatDateLabel(item.fecha),
            Funcionario: item.funcionarioUsername || 'Sin funcionario',
            'Total atenciones': Number(item.total ?? 0),
          })),
          [8, 18, 34, 18]
        );
      }

      XLSX.writeFile(workbook, buildExcelFilename(form.tipoReporte, form.fechaInicio, form.fechaFin));
      showSnackbar('Reporte Excel descargado correctamente.', 'success');
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : 'No fue posible descargar el reporte en Excel.';

      setError(message);
      showSnackbar(message, 'error');
    } finally {
      setLoadingExcel(false);
    }
  };

  const exportFullDocumentToPdf = async () => {
    if (!reportContentRef.current) {
      showSnackbar('No se encontró contenido para exportar.', 'warning');
      return;
    }

    if (!hasReportData) {
      showSnackbar('Primero genera la previsualización del reporte.', 'warning');
      return;
    }

    setLoadingFullPdf(true);
    setError('');

    try {
      const sections = Array.from(
        reportContentRef.current.querySelectorAll<HTMLElement>('.report-export-section')
      ).filter((section) => section.offsetWidth > 0 && section.offsetHeight > 0);

      if (!sections.length) {
        showSnackbar('No se encontraron secciones del reporte para exportar.', 'warning');
        return;
      }

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      pdf.setProperties({
        title: buildPdfFilename(form.tipoReporte, form.fechaInicio, form.fechaFin),
        subject: 'Reporte generado desde AppSisbén',
        creator: 'AppSisbén Valledupar',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const contentX = PDF_MARGIN_MM;
      const contentY = PDF_MARGIN_MM + PDF_PAGE_HEADER_HEIGHT_MM;
      const contentWidth = pageWidth - PDF_MARGIN_MM * 2;
      const contentHeight = pageHeight
        - PDF_MARGIN_MM * 2
        - PDF_PAGE_HEADER_HEIGHT_MM
        - PDF_PAGE_FOOTER_HEIGHT_MM;

      let pageNumber = 0;

      const addPage = () => {
        if (pageNumber > 0) {
          pdf.addPage('a4', 'landscape');
        }

        pageNumber += 1;

        drawPdfPageFrame({
          pdf,
          pageNumber,
          title: getReportTitle(form.tipoReporte),
          fechaInicio: form.fechaInicio,
          fechaFin: form.fechaFin,
        });
      };

      for (const section of sections) {
        const renderWidth = Math.max(
          PDF_EXPORT_WIDTH_PX,
          section.scrollWidth,
          section.offsetWidth
        );

        const canvas = await html2canvas(section, {
          scale: PDF_EXPORT_CANVAS_SCALE,
          backgroundColor: '#ffffff',
          useCORS: true,
          logging: false,
          windowWidth: renderWidth,
          windowHeight: Math.max(section.scrollHeight, PDF_EXPORT_MIN_HEIGHT_PX),
          onclone: (clonedDocument) => {
            addPdfCloneStyles(clonedDocument, renderWidth);
          },
        });

        if (!canvas.width || !canvas.height) {
          continue;
        }

        const pxPerMm = canvas.width / contentWidth;
        const maxSliceHeightPx = Math.max(1, Math.floor(contentHeight * pxPerMm));

        if (canvas.height <= maxSliceHeightPx) {
          const imageData = canvas.toDataURL('image/png', 1.0);
          const imageHeightMm = Math.min(canvas.height / pxPerMm, contentHeight);

          addPage();

          pdf.addImage(
            imageData,
            'PNG',
            contentX,
            contentY,
            contentWidth,
            imageHeightMm,
            undefined,
            'FAST'
          );

          continue;
        }

        for (let offsetY = 0; offsetY < canvas.height; offsetY += maxSliceHeightPx) {
          const sliceHeightPx = Math.min(maxSliceHeightPx, canvas.height - offsetY);
          const sliceCanvas = document.createElement('canvas');
          const context = sliceCanvas.getContext('2d');

          if (!context) {
            throw new Error('No fue posible preparar una sección del PDF.');
          }

          sliceCanvas.width = canvas.width;
          sliceCanvas.height = sliceHeightPx;

          context.fillStyle = '#ffffff';
          context.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
          context.drawImage(
            canvas,
            0,
            offsetY,
            canvas.width,
            sliceHeightPx,
            0,
            0,
            canvas.width,
            sliceHeightPx
          );

          const imageData = sliceCanvas.toDataURL('image/png', 1.0);
          const imageHeightMm = Math.min(sliceHeightPx / pxPerMm, contentHeight);

          addPage();

          pdf.addImage(
            imageData,
            'PNG',
            contentX,
            contentY,
            contentWidth,
            imageHeightMm,
            undefined,
            'FAST'
          );
        }
      }

      pdf.save(buildPdfFilename(form.tipoReporte, form.fechaInicio, form.fechaFin));
      showSnackbar('Documento completo exportado correctamente con presentación organizada.', 'success');
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : 'No fue posible exportar el documento completo.';

      setError(message);
      showSnackbar(message, 'error');
    } finally {
      setLoadingFullPdf(false);
    }
  };

  const loading = loadingPreview || loadingPdf || loadingFullPdf || loadingExcel;

  return (
    <Stack spacing={3}>
      <Card sx={{ borderRadius: 4, overflow: 'hidden' }}>
        <CardContent
          sx={{
            p: { xs: 3, md: 4 },
            background:
              'linear-gradient(135deg, rgba(0, 102, 204, 0.10), rgba(0, 102, 204, 0.02))',
          }}
        >
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            sx={{
              alignItems: { xs: 'flex-start', md: 'center' },
              justifyContent: 'space-between',
            }}
          >
            <Box>
              <Chip
                label="Reportes"
                color="primary"
                variant="outlined"
                sx={{ mb: 1.5 }}
              />

              <Typography variant="h4" sx={{ fontWeight: 900 }}>
                Generación de reportes
              </Typography>

              <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 760, fontWeight: 600 }}>
                Genera reportes de solicitudes por ventanilla, DMC, ciudadanos frecuentes y desempeño detallado por funcionario.
              </Typography>
            </Box>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.2}
              sx={{ alignItems: { xs: 'stretch', sm: 'center' } }}
            >
              <Button
                variant="outlined"
                color="success"
                startIcon={<TableChartIcon />}
                onClick={exportCurrentReportToExcel}
                disabled={loading || !hasReportData}
              >
                {loadingExcel ? 'Descargando...' : 'Descargar Excel'}
              </Button>

              <Button
                variant="contained"
                color="secondary"
                startIcon={<PictureAsPdfIcon />}
                onClick={exportFullDocumentToPdf}
                disabled={loading || !hasReportData}
              >
                {loadingFullPdf ? 'Exportando...' : 'Exportar documento completo'}
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {error ? (
        <Alert severity="error">
          {error}
        </Alert>
      ) : null}

      <Card
        sx={{
          borderRadius: 4,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Stack spacing={3}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>
                Parámetros del reporte
              </Typography>

              <Typography color="text.secondary" sx={{ fontSize: 14, mt: 0.5, fontWeight: 600 }}>
                Selecciona el tipo de reporte y diligencia el rango de fechas.
              </Typography>
            </Box>

            <Divider />

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  md: 'repeat(3, minmax(220px, 320px))',
                },
                gap: 2,
              }}
            >
              <TextField
                select
                label="Tipo de reporte"
                size="small"
                value={form.tipoReporte}
                onChange={(event) =>
                  updateForm('tipoReporte', event.target.value as ReportType)
                }
              >
                <MenuItem value="SOLICITUDES">
                  Solicitudes por ventanilla
                </MenuItem>

                <MenuItem value="DMC">
                  Reporte DMC
                </MenuItem>

                <MenuItem value="CIUDADANOS_FRECUENTES">
                  Ciudadanos frecuentes
                </MenuItem>

                <MenuItem value="DESEMPENO_DETALLADO_VENTANILLA">
                  Desempeño detallado por funcionario
                </MenuItem>
              </TextField>

              <TextField
                label="Fecha inicio"
                type="date"
                size="small"
                required
                value={form.fechaInicio}
                onChange={(event) => updateForm('fechaInicio', event.target.value)}
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
                required
                value={form.fechaFin}
                onChange={(event) => updateForm('fechaFin', event.target.value)}
                slotProps={{
                  inputLabel: {
                    shrink: true,
                  },
                }}
              />
            </Box>

            <Alert severity="info">
              Para rangos de hasta 31 días se recomienda análisis diario. Rango actual:
              {' '}
              <strong>{totalDays}</strong>
              {' '}
              días, agrupación estimada:
              {' '}
              <strong>{estimatedGrouping}</strong>.
            </Alert>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              sx={{ alignItems: { xs: 'stretch', sm: 'center' } }}
            >
              <Button
                variant="outlined"
                startIcon={<PreviewIcon />}
                onClick={handlePreview}
                disabled={loading}
              >
                {loadingPreview ? 'Consultando...' : 'Previsualizar'}
              </Button>

              <Button
                variant="contained"
                startIcon={<CloudDownloadIcon />}
                onClick={generateReport}
                disabled={loading}
              >
                {loadingPdf ? 'Generando PDF...' : 'Generar PDF oficial'}
              </Button>

              <Button
                variant="outlined"
                color="success"
                startIcon={<TableChartIcon />}
                onClick={exportCurrentReportToExcel}
                disabled={loading || !hasReportData}
              >
                {loadingExcel ? 'Descargando...' : 'Descargar Excel'}
              </Button>

              <Button
                variant="outlined"
                color="secondary"
                startIcon={<PictureAsPdfIcon />}
                onClick={exportFullDocumentToPdf}
                disabled={loading || !hasReportData}
              >
                {loadingFullPdf ? 'Exportando...' : 'Exportar documento completo'}
              </Button>

              <Button
                variant="text"
                color="inherit"
                startIcon={<RestartAltIcon />}
                onClick={clearForm}
                disabled={loading}
              >
                Limpiar
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Box
        ref={reportContentRef}
        sx={{
          '& .report-export-section': {
            mb: 3,
          },
        }}
      >
        {hasReportData ? (
          <Box sx={{ mb: 3 }}>
            <PdfReportHeader
              title={getReportTitle(form.tipoReporte)}
              description={getReportDescription(form.tipoReporte)}
              fechaInicio={form.fechaInicio}
              fechaFin={form.fechaFin}
              totalDays={totalDays}
            />
          </Box>
        ) : null}

        {form.tipoReporte === 'SOLICITUDES' && solicitudesPreview ? (
          <Stack spacing={3}>
            <SolicitudesTable
              preview={solicitudesPreview}
              rows={solicitudesBusinessRows}
              dates={solicitudesBusinessDates}
              total={solicitudesBusinessTotal}
              excludedWeekendCount={solicitudesExcludedWeekendCount}
            />

            <SolicitudesBarChart rows={solicitudesBusinessRows} />

            <SolicitudesTrendChart trend={solicitudesBusinessTrend} />
          </Stack>
        ) : null}

        {form.tipoReporte === 'DMC' && dmcSummary ? (
          <Stack spacing={3}>
            <Card className="report-export-section" sx={reportCardSx}>
              <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                <Typography variant="h6" sx={{ fontWeight: 900, mb: 2 }}>
                  Resumen DMC
                </Typography>

                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: '1fr',
                      md: 'repeat(4, 1fr)',
                    },
                    gap: 2,
                  }}
                >
                  <KpiCard title="Total registros DMC" value={Number(dmcSummary.totalRegistros ?? 0)} />
                  <KpiCard title="Cantidad total" value={Number(dmcSummary.totalCantidad ?? 0)} color="info" />
                  <KpiCard title="Cargadas" value={Number(dmcSummary.totalCargadas ?? 0)} color="success" />
                  <KpiCard title="Descargadas" value={Number(dmcSummary.totalDescargadas ?? 0)} color="warning" />
                </Box>
              </CardContent>
            </Card>

            <HorizontalGroupBarChart
              title="Operación DMC"
              description="Compara registros cargados y descargados."
              data={dmcOperationChartData.map((item, index) => ({
                id: index + 1,
                codigo: item.nombre,
                nombre: item.nombre,
                total: item.total,
              }))}
              barName="Cantidad"
              color="#0066CC"
            />

            <HorizontalGroupBarChart
              title="DMC por comuna"
              description="Distribución territorial de registros DMC."
              data={dmcComunas}
              barName="Total"
              color="#E30613"
            />

            <PieGroupChart
              title="Participación DMC por comuna"
              description="Participación porcentual por comuna."
              data={dmcComunas}
            />
          </Stack>
        ) : null}

        {form.tipoReporte === 'CIUDADANOS_FRECUENTES' && frequentCitizens.length > 0 ? (
          <Stack spacing={3}>
            <Card className="report-export-section" sx={reportCardSx}>
              <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                <Typography variant="h6" sx={{ fontWeight: 900, mb: 2 }}>
                  Resumen de ciudadanos frecuentes
                </Typography>

                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: '1fr',
                      md: 'repeat(4, 1fr)',
                    },
                    gap: 2,
                  }}
                >
                  <KpiCard title="Ciudadanos identificados" value={frequentCitizens.length} />
                  <KpiCard title="Total visitas" value={frequentCitizensTotalVisits} color="info" />
                  <KpiCard title="Total trámites" value={frequentCitizensTotalRequests} color="success" />
                  <KpiCard
                    title="Mayor frecuencia"
                    value={Number(topCitizenByVisits?.totalVisitas ?? 0)}
                    subtitle={topCitizenByVisits ? getCitizenNameLabel(topCitizenByVisits) : 'Sin datos'}
                    color="warning"
                  />
                </Box>
              </CardContent>
            </Card>

            <Card className="report-export-section" sx={reportCardSx}>
              <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                <Typography variant="h6" sx={{ fontWeight: 900, mb: 2 }}>
                  Ranking de ciudadanos frecuentes
                </Typography>

                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 900 }}>#</TableCell>
                        <TableCell sx={{ fontWeight: 900 }}>Ciudadano</TableCell>
                        <TableCell sx={{ fontWeight: 900 }}>Cédula</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 900 }}>Visitas</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 900 }}>Trámites</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 900 }}>Primera visita</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 900 }}>Última visita</TableCell>
                      </TableRow>
                    </TableHead>

                    <TableBody>
                      {frequentCitizens.map((item, index) => (
                        <TableRow key={`${item.cedulaUsuario}-${index}`} hover>
                          <TableCell sx={{ fontWeight: 800 }}>{index + 1}</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>{getCitizenNameLabel(item)}</TableCell>
                          <TableCell>{item.cedulaUsuario}</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 900, color: 'primary.main' }}>
                            {formatNumber(Number(item.totalVisitas ?? 0))}
                          </TableCell>
                          <TableCell align="center" sx={{ fontWeight: 900 }}>
                            {formatNumber(Number(item.totalSolicitudes ?? 0))}
                          </TableCell>
                          <TableCell align="center">{formatDateLabel(item.primeraVisita || '')}</TableCell>
                          <TableCell align="center">{formatDateLabel(item.ultimaVisita || '')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>


            {topCitizenByRequests ? (
              <Alert severity="info" className="report-export-section">
                El ciudadano con más trámites es
                {' '}
                <strong>{getCitizenNameLabel(topCitizenByRequests)}</strong>
                {' '}
                con
                {' '}
                <strong>{formatNumber(Number(topCitizenByRequests.totalSolicitudes ?? 0))}</strong>
                {' '}
                trámite(s).
              </Alert>
            ) : null}
          </Stack>
        ) : null}

        {form.tipoReporte === 'DESEMPENO_DETALLADO_VENTANILLA' && employeeDetailedPerformance.length > 0 ? (
          <Stack spacing={3}>
            <Card className="report-export-section" sx={reportCardSx}>
              <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                <Typography variant="h6" sx={{ fontWeight: 900, mb: 2 }}>
                  Resumen de desempeño detallado por funcionario
                </Typography>

                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: '1fr',
                      md: 'repeat(4, 1fr)',
                    },
                    gap: 2,
                  }}
                >
                  <KpiCard title="Total atenciones" value={employeeDetailedTotal} />
                  <KpiCard title="Funcionarios evaluados" value={employeeDetailedPerformance.length} color="info" />
                  <KpiCard
                    title="Promedio diario general"
                    value={Number(employeeDetailedAverage.toFixed(0))}
                    subtitle={`${formatPercent(employeeDetailedAverage)} atención(es) promedio`}
                    color="success"
                  />
                  <KpiCard
                    title="Mayor desempeño"
                    value={Number(employeeDetailedTop?.totalAtenciones ?? 0)}
                    subtitle={employeeDetailedTop ? getEmployeeNameLabel(employeeDetailedTop) : 'Sin datos'}
                    color="warning"
                  />
                </Box>
              </CardContent>
            </Card>

            <Card className="report-export-section" sx={reportCardSx}>
              <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                <Typography variant="h6" sx={{ fontWeight: 900, mb: 2 }}>
                  Tabla detallada de desempeño por funcionario
                </Typography>

                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3, overflowX: 'auto' }}>
                  <Table
                    size="small"
                    sx={{
                      minWidth: 1180,
                      '& .MuiTableCell-root': {
                        borderBottom: '1px solid #E2E8F0',
                        fontSize: 12.5,
                      },
                      '& .MuiTableHead-root .MuiTableCell-root': {
                        bgcolor: '#EAF3FC',
                        color: '#263238',
                        fontWeight: 900,
                        whiteSpace: 'nowrap',
                      },
                      '& .MuiTableBody-root .MuiTableRow-root:nth-of-type(even)': {
                        bgcolor: '#FAFCFF',
                      },
                    }}
                  >
                    <TableHead>
                      <TableRow>
                        <TableCell>Funcionario</TableCell>
                        <TableCell align="center">Total</TableCell>
                        <TableCell align="center">%</TableCell>
                        <TableCell align="center">Prom. diario</TableCell>
                        <TableCell align="center">Pendientes</TableCell>
                        <TableCell align="center">Realizadas</TableCell>
                        <TableCell align="center">Aprobadas</TableCell>
                        <TableCell align="center">Rechazadas</TableCell>
                        <TableCell align="center">Canceladas</TableCell>
                        <TableCell align="center">Revisar</TableCell>
                        <TableCell align="center">Nacionales</TableCell>
                        <TableCell align="center">Extranjeros</TableCell>
                      </TableRow>
                    </TableHead>

                    <TableBody>
                      {employeeDetailedPerformance.map((item, index) => (
                        <TableRow key={`${item.funcionarioId ?? item.funcionarioUsername}-${index}`} hover>
                          <TableCell sx={{ fontWeight: 900 }}>
                            {getEmployeeNameLabel(item)}
                          </TableCell>
                          <TableCell align="center" sx={{ fontWeight: 900, color: 'primary.main' }}>
                            {formatNumber(Number(item.totalAtenciones ?? 0))}
                          </TableCell>
                          <TableCell align="center" sx={{ fontWeight: 800 }}>
                            {formatPercent(Number(item.porcentaje ?? 0))} %
                          </TableCell>
                          <TableCell align="center" sx={{ fontWeight: 800 }}>
                            {formatPercent(Number(item.promedioDiario ?? 0))}
                          </TableCell>
                          <TableCell align="center">{formatNumber(Number(item.pendientes ?? 0))}</TableCell>
                          <TableCell align="center">{formatNumber(Number(item.realizadas ?? 0))}</TableCell>
                          <TableCell align="center">{formatNumber(Number(item.aprobadas ?? 0))}</TableCell>
                          <TableCell align="center">{formatNumber(Number(item.rechazadas ?? 0))}</TableCell>
                          <TableCell align="center">{formatNumber(Number(item.canceladas ?? 0))}</TableCell>
                          <TableCell align="center">{formatNumber(Number(item.revisar ?? 0))}</TableCell>
                          <TableCell align="center">{formatNumber(Number(item.nacionales ?? 0))}</TableCell>
                          <TableCell align="center">{formatNumber(Number(item.extranjeros ?? 0))}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>

            <HorizontalGroupBarChart
              title="Atenciones por funcionario"
              description="Compara el total de atenciones registradas por cada funcionario de Ventanilla."
              data={employeeDetailedChartData}
              barName="Atenciones"
              color="#0066CC"
            />

            <Card className="report-export-section" sx={reportCardSx}>
              <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                <Typography variant="h6" sx={{ fontWeight: 900, mb: 2 }}>
                  Detalle diario por funcionario
                </Typography>

                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3, overflowX: 'auto' }}>
                  <Table size="small" sx={{ minWidth: 720 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 900 }}>Fecha</TableCell>
                        <TableCell sx={{ fontWeight: 900 }}>Funcionario</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 900 }}>Total atenciones</TableCell>
                      </TableRow>
                    </TableHead>

                    <TableBody>
                      {employeeDetailedDailyRows.map((item, index) => (
                        <TableRow key={`${item.fecha}-${item.funcionarioId ?? item.funcionarioUsername}-${index}`} hover>
                          <TableCell sx={{ fontWeight: 800 }}>
                            {formatDateLabel(item.fecha)}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>
                            {item.funcionarioUsername || 'Sin funcionario'}
                          </TableCell>
                          <TableCell align="center" sx={{ fontWeight: 900, color: 'primary.main' }}>
                            {formatNumber(Number(item.total ?? 0))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Stack>
        ) : null}
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3500}
        onClose={closeSnackbar}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
          onClose={closeSnackbar}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Stack>
  );
}