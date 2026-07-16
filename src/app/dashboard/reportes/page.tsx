'use client';

import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import TableChartIcon from '@mui/icons-material/TableChart';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import PreviewIcon from '@mui/icons-material/Preview';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SearchIcon from '@mui/icons-material/Search';
import {
  Alert,
  AlertColor,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  InputAdornment,
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
import * as XLSX from 'xlsx';
import { useRef, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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

import { ApiClientError } from '@/lib/apiClient';
import { exportVentanillaUserHistoryPdf } from '@/services/export.service';
import {
  downloadVentanillaSolicitudesPdf,
  getDmcGroup,
  getDmcSummary,
  getVentanillaEmployeeProductivity,
  getVentanillaFrequentCitizens,
  getVentanillaFuncionariosPerformance,
  getVentanillaFuncionariosTrend,
  getVentanillaGroup,
  getVentanillaSolicitudesTrend,
  getVentanillaSummary,
  previewVentanillaSolicitudes,
} from '@/services/report.service';
import { getVentanillaUserHistory } from '@/services/ventanilla.service';
import { VentanillaUserHistoryResponse } from '@/types/operational.types';
import {
  DmcReportSummaryResponse,
  ProductivityGrouping,
  ReportDateRange,
  ReportGroupResponse,
  VentanillaDailyTrendResponse,
  VentanillaEmployeeProductivityResponse,
  VentanillaFrequentCitizenResponse,
  VentanillaFuncionarioPerformanceResponse,
  VentanillaFuncionarioTrendResponse,
  VentanillaReportSummaryResponse,
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
  | 'FUNCIONARIOS'
  | 'GENERAL'
  | 'DMC'
  | 'COMUNAS'
  | 'ALERTAS'
  | 'HISTORIAL_USUARIO'
  | 'CIUDADANOS_FRECUENTES'
  | 'PRODUCTIVIDAD_FUNCIONARIO';

type FormState = {
  fechaInicio: string;
  fechaFin: string;
  tipoReporte: ReportType;
  cedulaUsuario: string;
  productivityGrouping: ProductivityGrouping;
};

type AlertItem = {
  title: string;
  description: string;
  severity: AlertColor;
  value: string;
  helper: string;
};

const MAX_RANGE_DAYS = 1825;
const PDF_MARGIN_MM = 8;
const PDF_EXPORT_CANVAS_SCALE = 2.6;
const PDF_EXPORT_WIDTH_PX = 1600;

const initialSnackbar: SnackbarState = {
  open: false,
  message: '',
  severity: 'success',
};

const chartColors = [
  '#1976d2',
  '#2e7d32',
  '#ed6c02',
  '#9c27b0',
  '#d32f2f',
  '#0288d1',
  '#6d4c41',
  '#455a64',
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
  cedulaUsuario: '',
  productivityGrouping: 'SEMANAL',
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
    FUNCIONARIOS: 'desempeno-funcionarios',
    GENERAL: 'general-sistema',
    DMC: 'dmc',
    COMUNAS: 'totales-comuna',
    ALERTAS: 'control-operativo-alertas',
    HISTORIAL_USUARIO: 'historial-ciudadano',
    CIUDADANOS_FRECUENTES: 'ciudadanos-frecuentes',
    PRODUCTIVIDAD_FUNCIONARIO: 'productividad-funcionario',
  };

  return `Reporte-${labels[tipoReporte]}-${fechaInicio}-a-${fechaFin}.pdf`;
}

function buildExcelFilename(tipoReporte: ReportType, fechaInicio: string, fechaFin: string) {
  return buildPdfFilename(tipoReporte, fechaInicio, fechaFin).replace('.pdf', '.xlsx');
}

function getReportTitle(tipoReporte: ReportType) {
  const titles: Record<ReportType, string> = {
    SOLICITUDES: 'Reporte de solicitudes - Ventanilla',
    FUNCIONARIOS: 'Reporte de desempeño por funcionario - Ventanilla',
    GENERAL: 'Reporte general del sistema',
    DMC: 'Reporte DMC',
    COMUNAS: 'Reporte de totales por comuna',
    ALERTAS: 'Control operativo y alertas',
    HISTORIAL_USUARIO: 'Historial por ciudadano',
    CIUDADANOS_FRECUENTES: 'Ciudadanos frecuentes',
    PRODUCTIVIDAD_FUNCIONARIO: 'Productividad por funcionario',
  };

  return titles[tipoReporte];
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

function getTopGroup(data: ReportGroupResponse[]) {
  if (!data.length) {
    return null;
  }

  return [...data].sort((a, b) => Number(b.total ?? 0) - Number(a.total ?? 0))[0];
}

function buildHistoryGroupData(
  history: VentanillaUserHistoryResponse | null,
  field:
    | 'solicitudNombre'
    | 'estadoSolicitudNombre'
    | 'funcionarioUsername'
    | 'comunaNombre'
): ReportGroupResponse[] {
  if (!history) {
    return [];
  }

  const groups = new Map<string, number>();

  history.solicitudes.forEach((item) => {
    const key = item[field] || 'Sin clasificar';
    groups.set(key, (groups.get(key) ?? 0) + 1);
  });

  return Array.from(groups.entries())
    .map(([name, total], index) => ({
      id: index + 1,
      codigo: name,
      nombre: name,
      total,
    }))
    .sort((a, b) => b.total - a.total);
}

function getLastHistoryItem(history: VentanillaUserHistoryResponse | null) {
  if (!history || !history.solicitudes.length) {
    return null;
  }

  return [...history.solicitudes].sort((a, b) => {
    if (a.fecha === b.fecha) {
      return Number(b.id ?? 0) - Number(a.id ?? 0);
    }

    return b.fecha.localeCompare(a.fecha);
  })[0];
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


function getProductivityGroupingLabel(value: ProductivityGrouping) {
  return value === 'MENSUAL' ? 'Mensual' : 'Semanal';
}

function getEmployeeProductivityTotal(data: VentanillaEmployeeProductivityResponse[]) {
  return data.reduce((sum, item) => sum + Number(item.totalAtenciones ?? 0), 0);
}

function buildEmployeeProductivityEmployeeSummary(
  data: VentanillaEmployeeProductivityResponse[]
): ReportGroupResponse[] {
  const groups = new Map<string, { id: number | null; name: string; total: number }>();

  data.forEach((item) => {
    const key = item.funcionarioUsername || 'Sin funcionario';
    const current = groups.get(key) ?? {
      id: item.funcionarioId ?? null,
      name: key,
      total: 0,
    };

    current.total += Number(item.totalAtenciones ?? 0);
    groups.set(key, current);
  });

  return Array.from(groups.values())
    .map((item, index) => ({
      id: item.id ?? index + 1,
      codigo: item.name,
      nombre: item.name,
      total: item.total,
    }))
    .sort((a, b) => Number(b.total ?? 0) - Number(a.total ?? 0));
}

function buildEmployeeProductivityPeriodSummary(
  data: VentanillaEmployeeProductivityResponse[]
): ReportGroupResponse[] {
  const groups = new Map<string, number>();

  data.forEach((item) => {
    const key = item.periodo || 'Sin periodo';
    groups.set(key, (groups.get(key) ?? 0) + Number(item.totalAtenciones ?? 0));
  });

  return Array.from(groups.entries())
    .map(([periodo, total], index) => ({
      id: index + 1,
      codigo: periodo,
      nombre: periodo,
      total,
    }))
    .sort((a, b) => Number(b.total ?? 0) - Number(a.total ?? 0));
}

function getTopEmployeeProductivity(data: VentanillaEmployeeProductivityResponse[]) {
  if (!data.length) {
    return null;
  }

  return [...data].sort(
    (a, b) => Number(b.totalAtenciones ?? 0) - Number(a.totalAtenciones ?? 0)
  )[0];
}

function buildGroupChartData(data: ReportGroupResponse[], limit = 14) {
  return [...data]
    .sort((a, b) => Number(b.total ?? 0) - Number(a.total ?? 0))
    .slice(0, limit)
    .map((item) => ({
      nombre: getGroupName(item),
      total: Number(item.total ?? 0),
    }));
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

function buildTopSolicitudesPieData(
  rows: VentanillaSolicitudPreviewResponse['filas'],
  maxItems = 8
) {
  if (rows.length <= maxItems) {
    return rows;
  }

  const topRows = rows.slice(0, maxItems);
  const otherRows = rows.slice(maxItems);

  const otrosTotal = otherRows.reduce(
    (sum, item) => sum + item.totalGeneral,
    0
  );

  return [
    ...topRows,
    {
      solicitud: 'Otros',
      cantidadesPorFecha: {},
      totalGeneral: otrosTotal,
      porcentaje: 0,
    },
  ];
}

function getSolicitudColumnTotal(
  rows: VentanillaSolicitudPreviewResponse['filas'],
  fecha: string
) {
  return rows.reduce((sum, row) => sum + Number(row.cantidadesPorFecha[fecha] ?? 0), 0);
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

function buildFuncionarioTrendChartData(data: VentanillaFuncionarioTrendResponse[]) {
  const rows = new Map<string, Record<string, string | number>>();

  data.forEach((item) => {
    const fechaLabel = formatDateLabel(item.fecha);
    const funcionario = item.funcionarioUsername || 'Sin funcionario';

    if (!rows.has(item.fecha)) {
      rows.set(item.fecha, {
        fecha: fechaLabel,
      });
    }

    rows.get(item.fecha)![funcionario] = item.total;
  });

  return Array.from(rows.values());
}

function getFuncionarioNames(data: VentanillaFuncionarioTrendResponse[]) {
  return Array.from(
    new Set(data.map((item) => item.funcionarioUsername || 'Sin funcionario'))
  ).slice(0, 8);
}

function buildOperationalAlerts({
  ventanillaSummary,
  dmcSummary,
  ventanillaSolicitudes,
  ventanillaFuncionarios,
  ventanillaComunas,
  dmcComunas,
}: {
  ventanillaSummary: VentanillaReportSummaryResponse | null;
  dmcSummary: DmcReportSummaryResponse | null;
  ventanillaSolicitudes: ReportGroupResponse[];
  ventanillaFuncionarios: ReportGroupResponse[];
  ventanillaComunas: ReportGroupResponse[];
  dmcComunas: ReportGroupResponse[];
}) {
  const alerts: AlertItem[] = [];

  const totalVentanilla = Number(ventanillaSummary?.totalRegistros ?? 0);
  const totalDmc = Number(dmcSummary?.totalRegistros ?? 0);

  const pendientes = Number(ventanillaSummary?.pendientes ?? 0);
  const revisar = Number(ventanillaSummary?.revisar ?? 0);
  const rechazadas = Number(ventanillaSummary?.rechazadas ?? 0);
  const canceladas = Number(ventanillaSummary?.canceladas ?? 0);

  const pendientesPercent = getPercentage(pendientes, totalVentanilla);
  const revisarPercent = getPercentage(revisar, totalVentanilla);
  const rechazoCancelacionPercent = getPercentage(rechazadas + canceladas, totalVentanilla);

  alerts.push({
    title: 'Solicitudes pendientes',
    value: `${formatPercent(pendientesPercent)} %`,
    severity: pendientesPercent >= 30 ? 'warning' : 'success',
    description: `${formatNumber(pendientes)} solicitudes pendientes sobre ${formatNumber(totalVentanilla)} registros.`,
    helper: pendientesPercent >= 30
      ? 'Requiere seguimiento porque la carga pendiente es alta.'
      : 'El volumen pendiente se encuentra controlado.',
  });

  alerts.push({
    title: 'Solicitudes en revisión',
    value: `${formatPercent(revisarPercent)} %`,
    severity: revisarPercent >= 20 ? 'warning' : 'info',
    description: `${formatNumber(revisar)} solicitudes están marcadas para revisar.`,
    helper: revisarPercent >= 20
      ? 'Conviene revisar causas y responsables de estos casos.'
      : 'Nivel de revisión dentro de un rango aceptable.',
  });

  alerts.push({
    title: 'Rechazadas y canceladas',
    value: `${formatPercent(rechazoCancelacionPercent)} %`,
    severity: rechazoCancelacionPercent >= 15 ? 'error' : 'success',
    description: `${formatNumber(rechazadas + canceladas)} registros entre rechazados y cancelados.`,
    helper: rechazoCancelacionPercent >= 15
      ? 'Puede indicar problemas en calidad de registro o gestión del proceso.'
      : 'No se observa una concentración alta en rechazos/cancelaciones.',
  });

  const topFuncionario = getTopGroup(ventanillaFuncionarios);
  const totalFuncionarios = getGroupTotal(ventanillaFuncionarios);
  const topFuncionarioPercent = topFuncionario
    ? getPercentage(Number(topFuncionario.total ?? 0), totalFuncionarios)
    : 0;

  alerts.push({
    title: 'Concentración por funcionario',
    value: topFuncionario ? `${formatPercent(topFuncionarioPercent)} %` : '0,0 %',
    severity: topFuncionarioPercent >= 45 ? 'warning' : 'info',
    description: topFuncionario
      ? `${getGroupName(topFuncionario)} concentra ${formatNumber(Number(topFuncionario.total ?? 0))} atenciones.`
      : 'No hay datos de funcionarios para el periodo.',
    helper: topFuncionarioPercent >= 45
      ? 'Existe alta concentración operativa en un funcionario.'
      : 'La carga operativa no muestra una concentración crítica.',
  });

  const topSolicitud = getTopGroup(ventanillaSolicitudes);
  const totalSolicitudes = getGroupTotal(ventanillaSolicitudes);
  const topSolicitudPercent = topSolicitud
    ? getPercentage(Number(topSolicitud.total ?? 0), totalSolicitudes)
    : 0;

  alerts.push({
    title: 'Solicitud más frecuente',
    value: topSolicitud ? `${formatPercent(topSolicitudPercent)} %` : '0,0 %',
    severity: topSolicitudPercent >= 40 ? 'warning' : 'info',
    description: topSolicitud
      ? `${getGroupName(topSolicitud)} es el tipo de solicitud con mayor volumen.`
      : 'No hay solicitudes agrupadas para el periodo.',
    helper: topSolicitudPercent >= 40
      ? 'Puede requerir análisis de capacidad o mejora del flujo de atención.'
      : 'La demanda se encuentra distribuida entre varios tipos de solicitud.',
  });

  const topComunaVentanilla = getTopGroup(ventanillaComunas);
  const totalComunasVentanilla = getGroupTotal(ventanillaComunas);
  const topComunaVentanillaPercent = topComunaVentanilla
    ? getPercentage(Number(topComunaVentanilla.total ?? 0), totalComunasVentanilla)
    : 0;

  alerts.push({
    title: 'Concentración territorial Ventanilla',
    value: topComunaVentanilla ? `${formatPercent(topComunaVentanillaPercent)} %` : '0,0 %',
    severity: topComunaVentanillaPercent >= 35 ? 'warning' : 'info',
    description: topComunaVentanilla
      ? `${getGroupName(topComunaVentanilla)} concentra la mayor actividad de Ventanilla.`
      : 'No hay datos de comunas para Ventanilla.',
    helper: topComunaVentanillaPercent >= 35
      ? 'Se recomienda revisar si esta zona necesita refuerzo operativo.'
      : 'La actividad territorial de Ventanilla se encuentra distribuida.',
  });

  const topComunaDmc = getTopGroup(dmcComunas);
  const totalComunasDmc = getGroupTotal(dmcComunas);
  const topComunaDmcPercent = topComunaDmc
    ? getPercentage(Number(topComunaDmc.total ?? 0), totalComunasDmc)
    : 0;

  alerts.push({
    title: 'Concentración territorial DMC',
    value: topComunaDmc ? `${formatPercent(topComunaDmcPercent)} %` : '0,0 %',
    severity: topComunaDmcPercent >= 35 ? 'warning' : 'info',
    description: topComunaDmc
      ? `${getGroupName(topComunaDmc)} concentra la mayor actividad DMC.`
      : 'No hay datos de comunas para DMC.',
    helper: topComunaDmcPercent >= 35
      ? 'Puede requerir revisión territorial o redistribución de actividades.'
      : 'La actividad territorial DMC se encuentra distribuida.',
  });

  const dmcVsVentanillaPercent = totalVentanilla > 0
    ? getPercentage(totalDmc, totalVentanilla)
    : 0;

  alerts.push({
    title: 'Relación DMC vs Ventanilla',
    value: `${formatPercent(dmcVsVentanillaPercent)} %`,
    severity: dmcVsVentanillaPercent > 120 ? 'warning' : 'info',
    description: `DMC registra ${formatNumber(totalDmc)} frente a ${formatNumber(totalVentanilla)} registros de Ventanilla.`,
    helper: dmcVsVentanillaPercent > 120
      ? 'DMC está superando ampliamente el volumen de Ventanilla en el periodo.'
      : 'El comportamiento entre módulos no presenta una diferencia crítica.',
  });

  return alerts;
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
      <Typography color="text.secondary" sx={{ fontSize: 13, fontWeight: 700 }}>
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

function GroupTable({
  title,
  description,
  data,
}: {
  title: string;
  description?: string;
  data: ReportGroupResponse[];
}) {
  const total = getGroupTotal(data);

  return (
    <Card className="report-export-section" sx={reportCardSx}>
      <CardContent sx={{ p: { xs: 2, md: 3 } }}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {title}
            </Typography>

            {description ? (
              <Typography color="text.secondary" sx={{ fontSize: 14, mt: 0.5 }}>
                {description}
              </Typography>
            ) : null}
          </Box>

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 800 }}>Nombre</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800 }}>Total</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800 }}>%</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {!data.length ? (
                  <TableRow>
                    <TableCell colSpan={3} align="center">
                      No hay información para el periodo seleccionado.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((item, index) => {
                    const itemTotal = Number(item.total ?? 0);
                    const percentage = total > 0 ? (itemTotal * 100) / total : 0;

                    return (
                      <TableRow key={`${item.id ?? item.codigo ?? getGroupName(item)}-${index}`} hover>
                        <TableCell sx={{ fontWeight: 700 }}>
                          {getGroupName(item)}
                        </TableCell>

                        <TableCell align="center">
                          {formatNumber(itemTotal)}
                        </TableCell>

                        <TableCell align="center">
                          {formatPercent(percentage)} %
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      </CardContent>
    </Card>
  );
}

function HorizontalGroupBarChart({
  title,
  description,
  data,
  barName = 'Total',
  color = '#1976d2',
}: {
  title: string;
  description?: string;
  data: ReportGroupResponse[];
  barName?: string;
  color?: string;
}) {
  const chartData = buildGroupChartData(data);
  const height = Math.max(460, Math.min(780, chartData.length * 42 + 160));

  return (
    <Card className="report-export-section" sx={reportCardSx}>
      <CardContent sx={{ p: { xs: 2, md: 3 } }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          {title}
        </Typography>

        {description ? (
          <Typography color="text.secondary" sx={{ fontSize: 13, mb: 2 }}>
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
                  right: 30,
                  left: 40,
                  bottom: 20,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="nombre"
                  width={280}
                  tick={{ fontSize: 12 }}
                />
                <ChartTooltip />
                <Legend />
                <Bar
                  dataKey="total"
                  name={barName}
                  fill={color}
                  radius={[0, 8, 8, 0]}
                />
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
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          {title}
        </Typography>

        {description ? (
          <Typography color="text.secondary" sx={{ fontSize: 13, mb: 2 }}>
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

export default function ReportesPage() {
  const reportContentRef = useRef<HTMLDivElement | null>(null);

  const [form, setForm] = useState<FormState>(initialForm);

  const [solicitudesPreview, setSolicitudesPreview] =
    useState<VentanillaSolicitudPreviewResponse | null>(null);
  const [solicitudesTrend, setSolicitudesTrend] =
    useState<VentanillaDailyTrendResponse[]>([]);

  const [funcionariosPerformance, setFuncionariosPerformance] =
    useState<VentanillaFuncionarioPerformanceResponse[]>([]);
  const [funcionariosTrend, setFuncionariosTrend] =
    useState<VentanillaFuncionarioTrendResponse[]>([]);

  const [ventanillaSummary, setVentanillaSummary] =
    useState<VentanillaReportSummaryResponse | null>(null);
  const [dmcSummary, setDmcSummary] =
    useState<DmcReportSummaryResponse | null>(null);

  const [ventanillaSolicitudes, setVentanillaSolicitudes] =
    useState<ReportGroupResponse[]>([]);
  const [ventanillaEstados, setVentanillaEstados] =
    useState<ReportGroupResponse[]>([]);
  const [ventanillaFuncionarios, setVentanillaFuncionarios] =
    useState<ReportGroupResponse[]>([]);
  const [ventanillaComunas, setVentanillaComunas] =
    useState<ReportGroupResponse[]>([]);
  const [dmcComunas, setDmcComunas] =
    useState<ReportGroupResponse[]>([]);

  const [citizenHistory, setCitizenHistory] =
    useState<VentanillaUserHistoryResponse | null>(null);
  const [frequentCitizens, setFrequentCitizens] =
    useState<VentanillaFrequentCitizenResponse[]>([]);
  const [employeeProductivity, setEmployeeProductivity] =
    useState<VentanillaEmployeeProductivityResponse[]>([]);

  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [loadingFullPdf, setLoadingFullPdf] = useState(false);
  const [loadingExcel, setLoadingExcel] = useState(false);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState<SnackbarState>(initialSnackbar);

  const hasReportData =
    Boolean(solicitudesPreview)
    || funcionariosPerformance.length > 0
    || Boolean(ventanillaSummary)
    || Boolean(dmcSummary)
    || ventanillaComunas.length > 0
    || dmcComunas.length > 0
    || Boolean(citizenHistory)
    || frequentCitizens.length > 0
    || employeeProductivity.length > 0;

  const totalDays = getDaysBetween(form.fechaInicio, form.fechaFin);
  const estimatedGrouping = totalDays > 31 ? 'mensual' : 'diaria';

  const funcionarioTrendChartData = buildFuncionarioTrendChartData(funcionariosTrend);
  const funcionarioNames = getFuncionarioNames(funcionariosTrend);

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

  const solicitudesPieData = buildTopSolicitudesPieData(solicitudesBusinessRows);

  const solicitudesTableMinWidth = Math.max(
    1120,
    360 + solicitudesBusinessDates.length * 72 + 120 + 90
  );

  const solicitudesBarChartHeight = Math.max(
    460,
    Math.min(780, solicitudesBusinessRows.length * 36 + 160)
  );

  const funcionariosBarChartHeight = Math.max(
    460,
    Math.min(780, funcionariosPerformance.length * 42 + 160)
  );

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

  const systemComparisonData = [
    {
      nombre: 'Ventanilla',
      total: Number(ventanillaSummary?.totalRegistros ?? 0),
    },
    {
      nombre: 'DMC',
      total: Number(dmcSummary?.totalRegistros ?? 0),
    },
  ];

  const operationalAlerts = buildOperationalAlerts({
    ventanillaSummary,
    dmcSummary,
    ventanillaSolicitudes,
    ventanillaFuncionarios,
    ventanillaComunas,
    dmcComunas,
  });

  const historySolicitudGroups = buildHistoryGroupData(citizenHistory, 'solicitudNombre');
  const historyEstadoGroups = buildHistoryGroupData(citizenHistory, 'estadoSolicitudNombre');
  const historyFuncionarioGroups = buildHistoryGroupData(citizenHistory, 'funcionarioUsername');
  const historyComunaGroups = buildHistoryGroupData(citizenHistory, 'comunaNombre');
  const lastHistoryItem = getLastHistoryItem(citizenHistory);

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


  const employeeProductivityTotal = getEmployeeProductivityTotal(employeeProductivity);
  const employeeProductivityByEmployee = buildEmployeeProductivityEmployeeSummary(employeeProductivity);
  const employeeProductivityByPeriod = buildEmployeeProductivityPeriodSummary(employeeProductivity);
  const topEmployeeProductivity = getTopEmployeeProductivity(employeeProductivity);
  const employeeProductivityPeriodCount = new Set(
    employeeProductivity.map((item) => item.periodo)
  ).size;
  const employeeProductivityEmployeeCount = new Set(
    employeeProductivity.map((item) => item.funcionarioUsername || 'Sin funcionario')
  ).size;

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
    setFuncionariosPerformance([]);
    setFuncionariosTrend([]);

    setVentanillaSummary(null);
    setDmcSummary(null);
    setVentanillaSolicitudes([]);
    setVentanillaEstados([]);
    setVentanillaFuncionarios([]);
    setVentanillaComunas([]);
    setDmcComunas([]);
    setCitizenHistory(null);
    setFrequentCitizens([]);
    setEmployeeProductivity([]);
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

  const buildFilter = (): ReportDateRange => ({
    fechaInicio: form.fechaInicio,
    fechaFin: form.fechaFin,
  });

  const loadGeneralData = async (filter: ReportDateRange) => {
    const [
      ventanillaSummaryResponse,
      dmcSummaryResponse,
      ventanillaSolicitudesResponse,
      ventanillaEstadosResponse,
      ventanillaFuncionariosResponse,
      ventanillaComunasResponse,
      dmcComunasResponse,
    ] = await Promise.all([
      getVentanillaSummary(filter),
      getDmcSummary(filter),
      getVentanillaGroup('by-request-type', filter),
      getVentanillaGroup('by-status', filter),
      getVentanillaGroup('by-user', filter),
      getVentanillaGroup('by-comuna', filter),
      getDmcGroup('by-comuna', filter),
    ]);

    setVentanillaSummary(ventanillaSummaryResponse);
    setDmcSummary(dmcSummaryResponse);
    setVentanillaSolicitudes(ventanillaSolicitudesResponse);
    setVentanillaEstados(ventanillaEstadosResponse);
    setVentanillaFuncionarios(ventanillaFuncionariosResponse);
    setVentanillaComunas(ventanillaComunasResponse);
    setDmcComunas(dmcComunasResponse);
  };

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
          previewVentanillaSolicitudes({
            fechaInicio: form.fechaInicio,
            fechaFin: form.fechaFin,
          }),
          getVentanillaSolicitudesTrend({
            fechaInicio: form.fechaInicio,
            fechaFin: form.fechaFin,
          }),
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

      if (form.tipoReporte === 'FUNCIONARIOS') {
        const [performanceResponse, trendResponse] = await Promise.all([
          getVentanillaFuncionariosPerformance({
            fechaInicio: form.fechaInicio,
            fechaFin: form.fechaFin,
          }),
          getVentanillaFuncionariosTrend({
            fechaInicio: form.fechaInicio,
            fechaFin: form.fechaFin,
          }),
        ]);

        setFuncionariosPerformance(performanceResponse);
        setFuncionariosTrend(trendResponse);

        showSnackbar(
          performanceResponse.length === 0
            ? 'No hay desempeño de funcionarios para el periodo seleccionado.'
            : 'Reporte de desempeño generado correctamente.',
          performanceResponse.length === 0 ? 'info' : 'success'
        );

        return;
      }

      if (form.tipoReporte === 'HISTORIAL_USUARIO') {
        const cedula = form.cedulaUsuario.trim();

        if (!cedula) {
          const message = 'La cédula del ciudadano es obligatoria para consultar el historial.';
          setError(message);
          showSnackbar(message, 'warning');
          return;
        }

        const response = await getVentanillaUserHistory(cedula);

        setCitizenHistory(response);

        showSnackbar(
          response.totalSolicitudes === 0
            ? 'No hay solicitudes registradas para este ciudadano.'
            : 'Historial del ciudadano consultado correctamente.',
          response.totalSolicitudes === 0 ? 'info' : 'success'
        );

        return;
      }

      if (form.tipoReporte === 'CIUDADANOS_FRECUENTES') {
        const response = await getVentanillaFrequentCitizens(filter, 50);

        setFrequentCitizens(response);

        showSnackbar(
          response.length === 0
            ? 'No hay ciudadanos frecuentes para el periodo seleccionado.'
            : 'Reporte de ciudadanos frecuentes generado correctamente.',
          response.length === 0 ? 'info' : 'success'
        );

        return;
      }

      if (form.tipoReporte === 'PRODUCTIVIDAD_FUNCIONARIO') {
        const response = await getVentanillaEmployeeProductivity(
          filter,
          form.productivityGrouping
        );

        setEmployeeProductivity(response);

        showSnackbar(
          response.length === 0
            ? 'No hay productividad por funcionario para el periodo seleccionado.'
            : 'Reporte de productividad por funcionario generado correctamente.',
          response.length === 0 ? 'info' : 'success'
        );

        return;
      }

      if (form.tipoReporte === 'GENERAL') {
        await loadGeneralData(filter);
        showSnackbar('Reporte general generado correctamente.', 'success');
        return;
      }

      if (form.tipoReporte === 'ALERTAS') {
        await loadGeneralData(filter);
        showSnackbar('Reporte de control operativo y alertas generado correctamente.', 'success');
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

      const [ventanillaComunasResponse, dmcComunasResponse] = await Promise.all([
        getVentanillaGroup('by-comuna', filter),
        getDmcGroup('by-comuna', filter),
      ]);

      setVentanillaComunas(ventanillaComunasResponse);
      setDmcComunas(dmcComunasResponse);

      showSnackbar('Reporte de totales por comuna generado correctamente.', 'success');
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

    if (form.tipoReporte === 'HISTORIAL_USUARIO') {
      const cedula = form.cedulaUsuario.trim();

      if (!cedula) {
        const message = 'La cédula del ciudadano es obligatoria para generar el PDF.';
        setError(message);
        showSnackbar(message, 'warning');
        return;
      }

      setLoadingPdf(true);

      try {
        await exportVentanillaUserHistoryPdf(cedula);
        showSnackbar('PDF oficial del historial generado correctamente.', 'success');
      } catch (err) {
        const message = err instanceof ApiClientError
          ? err.message
          : 'No fue posible generar el PDF del historial.';

        setError(message);
        showSnackbar(message, 'error');
      } finally {
        setLoadingPdf(false);
      }

      return;
    }

    if (form.tipoReporte !== 'SOLICITUDES') {
      showSnackbar(
        'El PDF oficial está disponible para el informe de solicitudes. Para los demás reportes usa “Exportar documento completo”.',
        'info'
      );
      return;
    }

    setLoadingPdf(true);

    try {
      await downloadVentanillaSolicitudesPdf({
        fechaInicio: form.fechaInicio,
        fechaFin: form.fechaFin,
      });

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
          ...(form.tipoReporte === 'PRODUCTIVIDAD_FUNCIONARIO'
            ? [
                {
                  Campo: 'Agrupación',
                  Valor: getProductivityGroupingLabel(form.productivityGrouping),
                },
              ]
            : []),
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

      if (form.tipoReporte === 'FUNCIONARIOS') {
        appendJsonSheet(
          workbook,
          'Desempeño',
          funcionariosPerformance.map((item, index) => ({
            '#': index + 1,
            Funcionario: item.funcionarioUsername || 'Sin funcionario',
            Total: item.total,
            Porcentaje: `${formatPercent(item.porcentaje)} %`,
            'Promedio diario': formatPercent(item.promedioDiario),
          })),
          [8, 28, 14, 14, 18]
        );

        appendJsonSheet(
          workbook,
          'Tendencia funcionarios',
          funcionariosTrend.map((item) => ({
            Fecha: formatDateLabel(item.fecha),
            Funcionario: item.funcionarioUsername || 'Sin funcionario',
            Total: item.total,
          })),
          [18, 28, 14]
        );
      }

      if (form.tipoReporte === 'GENERAL') {
        appendJsonSheet(
          workbook,
          'Indicadores',
          [
            { Indicador: 'Total Ventanilla', Valor: ventanillaSummary?.totalRegistros ?? 0 },
            { Indicador: 'Pendientes', Valor: ventanillaSummary?.pendientes ?? 0 },
            { Indicador: 'Realizadas', Valor: ventanillaSummary?.realizadas ?? 0 },
            { Indicador: 'Aprobadas', Valor: ventanillaSummary?.aprobadas ?? 0 },
            { Indicador: 'Rechazadas', Valor: ventanillaSummary?.rechazadas ?? 0 },
            { Indicador: 'Canceladas', Valor: ventanillaSummary?.canceladas ?? 0 },
            { Indicador: 'Revisar', Valor: ventanillaSummary?.revisar ?? 0 },
            { Indicador: 'Extranjeros', Valor: ventanillaSummary?.extranjeros ?? 0 },
            { Indicador: 'Nacionales', Valor: ventanillaSummary?.nacionales ?? 0 },
            { Indicador: 'Total DMC', Valor: dmcSummary?.totalRegistros ?? 0 },
            { Indicador: 'Cantidad DMC', Valor: dmcSummary?.totalCantidad ?? 0 },
            { Indicador: 'Cargadas', Valor: dmcSummary?.totalCargadas ?? 0 },
            { Indicador: 'Descargadas', Valor: dmcSummary?.totalDescargadas ?? 0 },
          ],
          [32, 16]
        );

        appendJsonSheet(workbook, 'Solicitudes Ventanilla', groupRowsToExcelRows(ventanillaSolicitudes), [8, 18, 38, 16, 16]);
        appendJsonSheet(workbook, 'Estados Ventanilla', groupRowsToExcelRows(ventanillaEstados), [8, 18, 34, 16, 16]);
        appendJsonSheet(workbook, 'Funcionarios', groupRowsToExcelRows(ventanillaFuncionarios), [8, 20, 30, 16, 16]);
        appendJsonSheet(workbook, 'Comunas Ventanilla', groupRowsToExcelRows(ventanillaComunas), [8, 18, 32, 16, 16]);
        appendJsonSheet(workbook, 'Comunas DMC', groupRowsToExcelRows(dmcComunas), [8, 18, 32, 16, 16]);
      }

      if (form.tipoReporte === 'ALERTAS') {
        appendJsonSheet(
          workbook,
          'Alertas',
          operationalAlerts.map((item, index) => ({
            '#': index + 1,
            Alerta: item.title,
            Valor: item.value,
            Severidad: item.severity,
            Descripción: item.description,
            Recomendación: item.helper,
          })),
          [8, 32, 16, 16, 60, 60]
        );

        appendJsonSheet(workbook, 'Estados Ventanilla', groupRowsToExcelRows(ventanillaEstados), [8, 18, 34, 16, 16]);
        appendJsonSheet(workbook, 'Funcionarios', groupRowsToExcelRows(ventanillaFuncionarios), [8, 20, 30, 16, 16]);
        appendJsonSheet(workbook, 'Solicitudes', groupRowsToExcelRows(ventanillaSolicitudes), [8, 18, 38, 16, 16]);
        appendJsonSheet(workbook, 'Comunas Ventanilla', groupRowsToExcelRows(ventanillaComunas), [8, 18, 32, 16, 16]);
        appendJsonSheet(workbook, 'Comunas DMC', groupRowsToExcelRows(dmcComunas), [8, 18, 32, 16, 16]);
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

      if (form.tipoReporte === 'COMUNAS') {
        appendJsonSheet(workbook, 'Comunas Ventanilla', groupRowsToExcelRows(ventanillaComunas), [8, 18, 32, 16, 16]);
        appendJsonSheet(workbook, 'Comunas DMC', groupRowsToExcelRows(dmcComunas), [8, 18, 32, 16, 16]);
      }

      if (form.tipoReporte === 'HISTORIAL_USUARIO' && citizenHistory) {
        appendJsonSheet(
          workbook,
          'Resumen ciudadano',
          [
            { Campo: 'Cédula', Valor: citizenHistory.cedulaUsuario },
            { Campo: 'Nombre', Valor: citizenHistory.nombreUsuario || 'Sin nombre registrado' },
            { Campo: 'Teléfono', Valor: citizenHistory.telefono || 'Sin teléfono' },
            { Campo: 'Total visitas', Valor: citizenHistory.totalVisitas },
            { Campo: 'Total solicitudes', Valor: citizenHistory.totalSolicitudes },
            { Campo: 'Primera visita', Valor: formatDateLabel(citizenHistory.primeraVisita || '') },
            { Campo: 'Última visita', Valor: formatDateLabel(citizenHistory.ultimaVisita || '') },
          ],
          [26, 45]
        );

        appendJsonSheet(
          workbook,
          'Historial solicitudes',
          citizenHistory.solicitudes.map((item, index) => ({
            '#': index + 1,
            Fecha: formatDateLabel(item.fecha),
            'N° Ventanilla': item.numeroVentanilla || '',
            Solicitud: item.solicitudNombre || 'Sin solicitud',
            Categoría: item.categoriaNombre || 'Sin categoría',
            Estado: item.estadoSolicitudNombre || 'Sin estado',
            Barrio: item.barrioNombre || 'Sin barrio',
            Comuna: item.comunaNombre || 'Sin comuna',
            Funcionario: item.funcionarioUsername || 'Sin funcionario',
            Extranjero: item.extranjero ? 'Sí' : 'No',
            'Estado registro': item.activo ? 'Activo' : 'Inactivo',
            Observación: item.observacion || 'Sin observación',
          })),
          [8, 16, 16, 32, 26, 22, 24, 24, 24, 14, 16, 42]
        );
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

      if (form.tipoReporte === 'PRODUCTIVIDAD_FUNCIONARIO') {
        appendJsonSheet(
          workbook,
          'Productividad',
          employeeProductivity.map((item, index) => ({
            '#': index + 1,
            Periodo: item.periodo,
            'Fecha inicio periodo': formatDateLabel(item.fechaInicioPeriodo),
            'Fecha fin periodo': formatDateLabel(item.fechaFinPeriodo),
            Funcionario: item.funcionarioUsername || 'Sin funcionario',
            'Total atenciones': Number(item.totalAtenciones ?? 0),
            Porcentaje: `${formatPercent(Number(item.porcentaje ?? 0))} %`,
            'Promedio diario': formatPercent(Number(item.promedioDiario ?? 0)),
          })),
          [8, 20, 20, 20, 30, 18, 16, 18]
        );

        appendJsonSheet(
          workbook,
          'Resumen funcionarios',
          groupRowsToExcelRows(employeeProductivityByEmployee),
          [8, 22, 34, 18, 18]
        );

        appendJsonSheet(
          workbook,
          'Resumen periodos',
          groupRowsToExcelRows(employeeProductivityByPeriod),
          [8, 22, 30, 18, 18]
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
      );

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
      const availableWidth = pageWidth - PDF_MARGIN_MM * 2;
      const availableHeight = pageHeight - PDF_MARGIN_MM * 2;
      let hasPage = false;

      const addPdfPage = () => {
        if (hasPage) {
          pdf.addPage('a4', 'landscape');
        } else {
          hasPage = true;
        }
      };

      for (const section of sections) {
        const canvas = await html2canvas(section, {
          scale: PDF_EXPORT_CANVAS_SCALE,
          backgroundColor: '#ffffff',
          useCORS: true,
          logging: false,
          windowWidth: Math.max(PDF_EXPORT_WIDTH_PX, section.scrollWidth),
          windowHeight: Math.max(section.scrollHeight, 1200),
          onclone: (clonedDocument) => {
            clonedDocument.body.style.backgroundColor = '#ffffff';

            clonedDocument
              .querySelectorAll<HTMLElement>('.report-export-section')
              .forEach((exportSection) => {
                exportSection.style.width = `${Math.max(PDF_EXPORT_WIDTH_PX, section.scrollWidth)}px`;
                exportSection.style.maxWidth = 'none';
                exportSection.style.overflow = 'visible';
                exportSection.style.backgroundColor = '#ffffff';
                exportSection.style.boxShadow = 'none';
              });

            clonedDocument
              .querySelectorAll<HTMLElement>('.report-export-section .MuiTableContainer-root')
              .forEach((tableContainer) => {
                tableContainer.style.maxHeight = 'none';
                tableContainer.style.overflow = 'visible';
                tableContainer.style.width = '100%';
              });

            clonedDocument
              .querySelectorAll<HTMLElement>('.report-export-section .MuiTableCell-root')
              .forEach((tableCell) => {
                tableCell.style.position = 'static';
                tableCell.style.left = 'auto';
                tableCell.style.top = 'auto';
                tableCell.style.zIndex = 'auto';
                tableCell.style.backgroundColor = '#ffffff';
              });

            clonedDocument
              .querySelectorAll<HTMLElement>('.report-export-section svg')
              .forEach((svg) => {
                svg.style.overflow = 'visible';
              });
          },
        });

        if (!canvas.width || !canvas.height) {
          continue;
        }

        const pxPerMm = canvas.width / availableWidth;
        const maxSliceHeightPx = Math.max(1, Math.floor(availableHeight * pxPerMm));

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
          const imageHeightMm = sliceHeightPx / pxPerMm;

          addPdfPage();

          pdf.addImage(
            imageData,
            'PNG',
            PDF_MARGIN_MM,
            PDF_MARGIN_MM,
            availableWidth,
            imageHeightMm,
            undefined,
            'FAST'
          );
        }
      }

      pdf.save(buildPdfFilename(form.tipoReporte, form.fechaInicio, form.fechaFin));
      showSnackbar('Documento completo exportado correctamente y ajustado a impresión.', 'success');
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
              'linear-gradient(135deg, rgba(25, 118, 210, 0.10), rgba(25, 118, 210, 0.02))',
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

              <Typography variant="h4" sx={{ fontWeight: 800 }}>
                Generación de reportes
              </Typography>

              <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 760 }}>
                Genera reportes de Ventanilla, DMC, desempeño, comunas, funcionamiento
                general, control operativo, historial por ciudadano, ciudadanos frecuentes y productividad por funcionario.
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
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                Parámetros del reporte
              </Typography>

              <Typography color="text.secondary" sx={{ fontSize: 14, mt: 0.5 }}>
                Selecciona el tipo de reporte y diligencia los parámetros requeridos.
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
                  Solicitudes por tipo
                </MenuItem>

                <MenuItem value="FUNCIONARIOS">
                  Desempeño por funcionario
                </MenuItem>

                <MenuItem value="GENERAL">
                  Reporte general del sistema
                </MenuItem>

                <MenuItem value="DMC">
                  Reporte DMC
                </MenuItem>

                <MenuItem value="COMUNAS">
                  Totales por comuna
                </MenuItem>

                <MenuItem value="ALERTAS">
                  Control operativo y alertas
                </MenuItem>

                <MenuItem value="HISTORIAL_USUARIO">
                  Historial por ciudadano
                </MenuItem>

                <MenuItem value="CIUDADANOS_FRECUENTES">
                  Ciudadanos frecuentes
                </MenuItem>

                <MenuItem value="PRODUCTIVIDAD_FUNCIONARIO">
                  Productividad por funcionario
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

            {form.tipoReporte === 'HISTORIAL_USUARIO' ? (
              <TextField
                label="Cédula del ciudadano"
                size="small"
                required
                value={form.cedulaUsuario}
                onChange={(event) => updateForm('cedulaUsuario', event.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{
                  width: {
                    xs: '100%',
                    md: 420,
                  },
                }}
              />
            ) : null}


            {form.tipoReporte === 'PRODUCTIVIDAD_FUNCIONARIO' ? (
              <TextField
                select
                label="Agrupación de productividad"
                size="small"
                value={form.productivityGrouping}
                onChange={(event) =>
                  updateForm('productivityGrouping', event.target.value as ProductivityGrouping)
                }
                sx={{
                  width: {
                    xs: '100%',
                    md: 320,
                  },
                }}
              >
                <MenuItem value="SEMANAL">
                  Semanal
                </MenuItem>

                <MenuItem value="MENSUAL">
                  Mensual
                </MenuItem>
              </TextField>
            ) : null}

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
                variant="outlined"
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

      {hasReportData ? (
        <Box
          ref={reportContentRef}
          sx={{
            bgcolor: '#ffffff',
            borderRadius: 4,
            p: { xs: 1.5, md: 2 },
          }}
        >
          <Stack spacing={3}>
            <Card className="report-export-section" sx={reportCardSx}>
              <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                <Stack
                  direction={{ xs: 'column', md: 'row' }}
                  spacing={2}
                  sx={{
                    alignItems: { xs: 'flex-start', md: 'center' },
                    justifyContent: 'space-between',
                  }}
                >
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 900 }}>
                      {form.tipoReporte === 'SOLICITUDES'
                        ? 'Reporte de solicitudes - Ventanilla'
                        : form.tipoReporte === 'FUNCIONARIOS'
                          ? 'Reporte de desempeño por funcionario - Ventanilla'
                          : form.tipoReporte === 'GENERAL'
                            ? 'Reporte general del sistema'
                            : form.tipoReporte === 'DMC'
                              ? 'Reporte DMC'
                              : form.tipoReporte === 'COMUNAS'
                                ? 'Reporte de totales por comuna'
                                : form.tipoReporte === 'ALERTAS'
                                  ? 'Control operativo y alertas'
                                  : form.tipoReporte === 'HISTORIAL_USUARIO'
                                    ? 'Historial por ciudadano'
                                    : form.tipoReporte === 'CIUDADANOS_FRECUENTES'
                                      ? 'Ciudadanos frecuentes'
                                      : 'Productividad por funcionario'}
                    </Typography>

                    <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                      Periodo consultado: {formatDateLabel(form.fechaInicio)} al{' '}
                      {formatDateLabel(form.fechaFin)}
                    </Typography>
                  </Box>

                  <Chip
                    label={`Rango: ${totalDays} día${totalDays === 1 ? '' : 's'}`}
                    color="primary"
                    variant="outlined"
                    sx={{ fontWeight: 800 }}
                  />
                </Stack>
              </CardContent>
            </Card>

            {solicitudesPreview ? (
              <Stack spacing={3}>
                <Card className="report-export-section" sx={reportCardSx}>
                  <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                    <Stack spacing={2.5}>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>
                          Totales por tipo de solicitud - Ventanilla
                        </Typography>

                        <Typography color="text.secondary" sx={{ fontSize: 14, mt: 0.5 }}>
                          Total general lunes a viernes: <strong>{formatNumber(solicitudesBusinessTotal)}</strong>
                          {' · '}
                          Agrupación: <strong>{getGroupingLabel(solicitudesPreview.tipoAgrupacion)}</strong>
                          {' · '}
                          Fechas de fin de semana excluidas: <strong>{formatNumber(solicitudesExcludedWeekendCount)}</strong>
                        </Typography>

                      </Box>

                      {solicitudesBusinessDates.length === 0 || solicitudesBusinessRows.length === 0 ? (
                        <Alert severity="info">
                          No hay registros de lunes a viernes para el periodo seleccionado.
                        </Alert>
                      ) : (
                        <TableContainer
                          component={Paper}
                          variant="outlined"
                          sx={{
                            borderRadius: 3,
                            overflowX: 'auto',
                            overflowY: 'visible',
                            borderColor: 'divider',
                            bgcolor: '#ffffff',
                            '&::-webkit-scrollbar': {
                              height: 10,
                            },
                            '&::-webkit-scrollbar-thumb': {
                              borderRadius: 8,
                              backgroundColor: 'rgba(25, 118, 210, 0.35)',
                            },
                          }}
                        >
                          <Table
                            size="small"
                            sx={{
                              minWidth: solicitudesTableMinWidth,
                              tableLayout: 'fixed',
                              borderCollapse: 'separate',
                              borderSpacing: 0,
                              '& .MuiTableCell-root': {
                                borderColor: 'rgba(15, 23, 42, 0.12)',
                                px: 0.75,
                                py: 0.85,
                                verticalAlign: 'middle',
                              },
                              '& .solicitudes-header-cell': {
                                bgcolor: '#eef5ff',
                                color: 'text.primary',
                                fontWeight: 900,
                                fontSize: 11.5,
                                lineHeight: 1.15,
                                borderBottom: '2px solid rgba(25, 118, 210, 0.30)',
                              },
                              '& .solicitudes-number-cell': {
                                width: 72,
                                minWidth: 72,
                                maxWidth: 72,
                                fontVariantNumeric: 'tabular-nums',
                                whiteSpace: 'nowrap',
                                textAlign: 'center',
                                fontSize: 12,
                              },
                              '& .solicitudes-name-cell': {
                                width: 360,
                                minWidth: 360,
                                maxWidth: 360,
                                fontWeight: 700,
                                lineHeight: 1.25,
                                whiteSpace: 'normal',
                                wordBreak: 'break-word',
                                position: 'sticky',
                                left: 0,
                                zIndex: 2,
                                bgcolor: '#ffffff',
                                boxShadow: '8px 0 12px -12px rgba(15, 23, 42, 0.45)',
                              },
                              '& thead .solicitudes-name-cell': {
                                zIndex: 4,
                                bgcolor: '#e3f0ff',
                              },
                              '& .solicitudes-total-cell': {
                                width: 120,
                                minWidth: 120,
                                maxWidth: 120,
                                fontWeight: 900,
                                bgcolor: '#f8fafc',
                              },
                              '& .solicitudes-percent-cell': {
                                width: 90,
                                minWidth: 90,
                                maxWidth: 90,
                              },
                              '& .solicitudes-total-row td': {
                                bgcolor: '#f8fafc',
                                fontWeight: 900,
                                borderTop: '2px solid rgba(15, 23, 42, 0.20)',
                              },
                              '& .solicitudes-total-row .solicitudes-name-cell': {
                                bgcolor: '#f8fafc',
                              },
                            }}
                          >
                            <TableHead>
                              <TableRow>
                                <TableCell className="solicitudes-header-cell solicitudes-name-cell">
                                  Solicitudes
                                </TableCell>

                                {solicitudesBusinessDates.map((fecha) => (
                                  <TableCell
                                    key={fecha}
                                    className="solicitudes-header-cell solicitudes-number-cell"
                                    align="center"
                                  >
                                    {formatDateLabel(fecha)}
                                  </TableCell>
                                ))}

                                <TableCell
                                  className="solicitudes-header-cell solicitudes-number-cell solicitudes-total-cell"
                                  align="center"
                                >
                                  Total general
                                </TableCell>

                                <TableCell
                                  className="solicitudes-header-cell solicitudes-number-cell solicitudes-percent-cell"
                                  align="center"
                                >
                                  %
                                </TableCell>
                              </TableRow>
                            </TableHead>

                            <TableBody>
                              {solicitudesBusinessRows.map((row, rowIndex) => (
                                <TableRow
                                  key={row.solicitud}
                                  hover
                                  sx={{
                                    '& td': {
                                      bgcolor: rowIndex % 2 === 0 ? '#ffffff' : '#fbfdff',
                                    },
                                    '& .solicitudes-name-cell': {
                                      bgcolor: rowIndex % 2 === 0 ? '#ffffff' : '#fbfdff',
                                    },
                                  }}
                                >
                                  <TableCell className="solicitudes-name-cell">
                                    {row.solicitud}
                                  </TableCell>

                                  {solicitudesBusinessDates.map((fecha) => {
                                    const value = Number(row.cantidadesPorFecha[fecha] ?? 0);

                                    return (
                                      <TableCell
                                        key={`${row.solicitud}-${fecha}`}
                                        className="solicitudes-number-cell"
                                        align="center"
                                        sx={{ color: value > 0 ? 'text.primary' : 'text.disabled' }}
                                      >
                                        {value > 0 ? formatNumber(value) : '—'}
                                      </TableCell>
                                    );
                                  })}

                                  <TableCell
                                    className="solicitudes-number-cell solicitudes-total-cell"
                                    align="center"
                                  >
                                    {formatNumber(row.totalGeneral)}
                                  </TableCell>

                                  <TableCell
                                    className="solicitudes-number-cell solicitudes-percent-cell"
                                    align="center"
                                  >
                                    {formatPercent(row.porcentaje)} %
                                  </TableCell>
                                </TableRow>
                              ))}

                              <TableRow className="solicitudes-total-row">
                                <TableCell className="solicitudes-name-cell">
                                  Total general
                                </TableCell>

                                {solicitudesBusinessDates.map((fecha) => (
                                  <TableCell
                                    key={`total-${fecha}`}
                                    className="solicitudes-number-cell"
                                    align="center"
                                  >
                                    {formatNumber(getSolicitudColumnTotal(solicitudesBusinessRows, fecha))}
                                  </TableCell>
                                ))}

                                <TableCell
                                  className="solicitudes-number-cell solicitudes-total-cell"
                                  align="center"
                                >
                                  {formatNumber(solicitudesBusinessTotal)}
                                </TableCell>

                                <TableCell
                                  className="solicitudes-number-cell solicitudes-percent-cell"
                                  align="center"
                                >
                                  100,0 %
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </TableContainer>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
                <Card className="report-export-section" sx={reportCardSx}>
                  <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                      Gráfica de barras por tipo de solicitud
                    </Typography>

                    <Typography color="text.secondary" sx={{ fontSize: 13, mb: 2 }}>
                      Permite identificar rápidamente los tipos de solicitud con mayor volumen.
                    </Typography>

                    <Box sx={{ width: '100%', height: solicitudesBarChartHeight }}>
                      <ResponsiveContainer>
                        <BarChart data={solicitudesBusinessRows} layout="vertical" margin={{ top: 20, right: 30, left: 40, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" allowDecimals={false} />
                          <YAxis type="category" dataKey="solicitud" width={280} tick={{ fontSize: 12 }} />
                          <ChartTooltip />
                          <Legend />
                          <Bar dataKey="totalGeneral" name="Total solicitudes" fill="#1976d2" radius={[0, 8, 8, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  </CardContent>
                </Card>

                <Card className="report-export-section" sx={reportCardSx}>
                  <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                      Línea de tendencia diaria
                    </Typography>

                    <Typography color="text.secondary" sx={{ fontSize: 13, mb: 2 }}>
                      Muestra el comportamiento de las solicitudes de lunes a viernes durante el periodo.
                    </Typography>

                    <Box sx={{ width: '100%', height: 460 }}>
                      <ResponsiveContainer>
                        <LineChart
                          data={solicitudesBusinessTrend.map((item) => ({
                            fecha: formatDateLabel(item.fecha),
                            total: item.total,
                          }))}
                          margin={{ top: 20, right: 30, left: 10, bottom: 30 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="fecha" minTickGap={24} tick={{ fontSize: 12 }} />
                          <YAxis allowDecimals={false} />
                          <ChartTooltip />
                          <Legend />
                          <Line type="monotone" dataKey="total" name="Solicitudes por fecha" stroke="#1976d2" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 7 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </Box>
                  </CardContent>
                </Card>

                <Card className="report-export-section" sx={reportCardSx}>
                  <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                      Diagrama de distribución porcentual
                    </Typography>

                    <Typography color="text.secondary" sx={{ fontSize: 13, mb: 2 }}>
                      Agrupa las solicitudes principales y resume las demás como “Otros”.
                    </Typography>

                    <Box sx={{ width: '100%', height: 460 }}>
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie data={solicitudesPieData} dataKey="totalGeneral" nameKey="solicitud" outerRadius={145} label>
                            {solicitudesPieData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                            ))}
                          </Pie>

                          <ChartTooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </Box>
                  </CardContent>
                </Card>
              </Stack>
            ) : null}

            {funcionariosPerformance.length > 0 ? (
              <Stack spacing={3}>
                <Card className="report-export-section" sx={reportCardSx}>
                  <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>
                          Tabla de desempeño por funcionario
                        </Typography>

                        <Typography color="text.secondary" sx={{ fontSize: 14, mt: 0.5 }}>
                          Total atendido, participación porcentual y promedio diario.
                        </Typography>
                      </Box>

                      <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 800 }}>Funcionario</TableCell>
                              <TableCell align="center" sx={{ fontWeight: 800 }}>Total</TableCell>
                              <TableCell align="center" sx={{ fontWeight: 800 }}>%</TableCell>
                              <TableCell align="center" sx={{ fontWeight: 800 }}>Promedio diario</TableCell>
                            </TableRow>
                          </TableHead>

                          <TableBody>
                            {funcionariosPerformance.map((item) => (
                              <TableRow key={item.funcionarioId ?? item.funcionarioUsername} hover>
                                <TableCell sx={{ fontWeight: 700 }}>
                                  {item.funcionarioUsername || 'Sin funcionario'}
                                </TableCell>

                                <TableCell align="center">
                                  {formatNumber(item.total)}
                                </TableCell>

                                <TableCell align="center">
                                  {formatPercent(item.porcentaje)} %
                                </TableCell>

                                <TableCell align="center">
                                  {formatPercent(item.promedioDiario)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Stack>
                  </CardContent>
                </Card>

                <Card className="report-export-section" sx={reportCardSx}>
                  <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                      Gráfica de desempeño total por funcionario
                    </Typography>

                    <Typography color="text.secondary" sx={{ fontSize: 13, mb: 2 }}>
                      Compara el volumen total de atenciones por funcionario.
                    </Typography>

                    <Box sx={{ width: '100%', height: funcionariosBarChartHeight }}>
                      <ResponsiveContainer>
                        <BarChart
                          data={funcionariosPerformance.map((item) => ({
                            funcionario: item.funcionarioUsername || 'Sin funcionario',
                            total: item.total,
                          }))}
                          layout="vertical"
                          margin={{ top: 20, right: 30, left: 30, bottom: 20 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" allowDecimals={false} />
                          <YAxis type="category" dataKey="funcionario" width={240} tick={{ fontSize: 12 }} />
                          <ChartTooltip />
                          <Legend />
                          <Bar dataKey="total" name="Atenciones" fill="#2e7d32" radius={[0, 8, 8, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  </CardContent>
                </Card>

                <Card className="report-export-section" sx={reportCardSx}>
                  <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                      Línea de tendencia por funcionario
                    </Typography>

                    <Typography color="text.secondary" sx={{ fontSize: 13, mb: 2 }}>
                      Visualiza el comportamiento de hasta 8 funcionarios durante el periodo.
                    </Typography>

                    {funcionariosTrend.length > 0 && funcionarioNames.length > 0 ? (
                      <Box sx={{ width: '100%', height: 500 }}>
                        <ResponsiveContainer>
                          <LineChart data={funcionarioTrendChartData} margin={{ top: 20, right: 30, left: 10, bottom: 30 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="fecha" minTickGap={24} tick={{ fontSize: 12 }} />
                            <YAxis allowDecimals={false} />
                            <ChartTooltip />
                            <Legend />

                            {funcionarioNames.map((name, index) => (
                              <Line
                                key={name}
                                type="monotone"
                                dataKey={name}
                                stroke={chartColors[index % chartColors.length]}
                                strokeWidth={2.5}
                                dot={{ r: 3 }}
                                activeDot={{ r: 6 }}
                              />
                            ))}
                          </LineChart>
                        </ResponsiveContainer>
                      </Box>
                    ) : (
                      <Alert severity="info">
                        No hay datos suficientes para construir la línea de tendencia.
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </Stack>
            ) : null}

            {form.tipoReporte === 'HISTORIAL_USUARIO' && citizenHistory ? (
              <Stack spacing={3}>
                <Card className="report-export-section" sx={reportCardSx}>
                  <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>
                          Resumen del ciudadano
                        </Typography>

                        <Typography color="text.secondary" sx={{ fontSize: 14, mt: 0.5 }}>
                          Información general del historial individual consultado.
                        </Typography>
                      </Box>

                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: {
                            xs: '1fr',
                            sm: 'repeat(2, 1fr)',
                            md: 'repeat(4, 1fr)',
                          },
                          gap: 2,
                        }}
                      >
                        <KpiCard title="Total visitas" value={citizenHistory.totalVisitas} color="primary" />
                        <KpiCard title="Total solicitudes" value={citizenHistory.totalSolicitudes} color="secondary" />

                        <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                          <Typography color="text.secondary" sx={{ fontSize: 13, fontWeight: 700 }}>
                            Primera visita
                          </Typography>

                          <Typography variant="h6" sx={{ fontWeight: 900, mt: 0.5 }}>
                            {formatDateLabel(citizenHistory.primeraVisita || '')}
                          </Typography>
                        </Paper>

                        <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                          <Typography color="text.secondary" sx={{ fontSize: 13, fontWeight: 700 }}>
                            Última visita
                          </Typography>

                          <Typography variant="h6" sx={{ fontWeight: 900, mt: 0.5 }}>
                            {formatDateLabel(citizenHistory.ultimaVisita || '')}
                          </Typography>
                        </Paper>
                      </Box>

                      <Alert severity="info">
                        Ciudadano: <strong>{citizenHistory.nombreUsuario || 'Sin nombre registrado'}</strong>
                        {' · '}
                        Cédula: <strong>{citizenHistory.cedulaUsuario}</strong>
                        {' · '}
                        Teléfono: <strong>{citizenHistory.telefono || 'Sin teléfono'}</strong>
                      </Alert>

                      {lastHistoryItem ? (
                        <Alert severity="success">
                          Última atención registrada el <strong>{formatDateLabel(lastHistoryItem.fecha)}</strong>
                          {' '}
                          por solicitud <strong>{lastHistoryItem.solicitudNombre || 'Sin solicitud'}</strong>
                          {' '}
                          con estado <strong>{lastHistoryItem.estadoSolicitudNombre || 'Sin estado'}</strong>.
                        </Alert>
                      ) : null}
                    </Stack>
                  </CardContent>
                </Card>

                <Card className="report-export-section" sx={reportCardSx}>
                  <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>
                          Historial completo de solicitudes
                        </Typography>

                        <Typography color="text.secondary" sx={{ fontSize: 14, mt: 0.5 }}>
                          Detalle de las solicitudes asociadas al ciudadano consultado.
                        </Typography>
                      </Box>

                      <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
                        <Table size="small" sx={{ minWidth: 1250 }}>
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 800 }}>Fecha</TableCell>
                              <TableCell sx={{ fontWeight: 800 }}>N° Ventanilla</TableCell>
                              <TableCell sx={{ fontWeight: 800 }}>Solicitud</TableCell>
                              <TableCell sx={{ fontWeight: 800 }}>Categoría</TableCell>
                              <TableCell sx={{ fontWeight: 800 }}>Estado</TableCell>
                              <TableCell sx={{ fontWeight: 800 }}>Barrio</TableCell>
                              <TableCell sx={{ fontWeight: 800 }}>Comuna</TableCell>
                              <TableCell sx={{ fontWeight: 800 }}>Funcionario</TableCell>
                              <TableCell sx={{ fontWeight: 800 }}>Extranjero</TableCell>
                              <TableCell sx={{ fontWeight: 800 }}>Estado registro</TableCell>
                              <TableCell sx={{ fontWeight: 800 }}>Observación</TableCell>
                            </TableRow>
                          </TableHead>

                          <TableBody>
                            {citizenHistory.solicitudes.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={11} align="center">
                                  No hay solicitudes registradas para este ciudadano.
                                </TableCell>
                              </TableRow>
                            ) : (
                              citizenHistory.solicitudes.map((item) => (
                                <TableRow key={item.id} hover>
                                  <TableCell>{formatDateLabel(item.fecha)}</TableCell>
                                  <TableCell>{item.numeroVentanilla || '-'}</TableCell>
                                  <TableCell>{item.solicitudNombre || 'Sin solicitud'}</TableCell>
                                  <TableCell>{item.categoriaNombre || 'Sin categoría'}</TableCell>
                                  <TableCell>{item.estadoSolicitudNombre || 'Sin estado'}</TableCell>
                                  <TableCell>{item.barrioNombre || 'Sin barrio'}</TableCell>
                                  <TableCell>{item.comunaNombre || 'Sin comuna'}</TableCell>
                                  <TableCell>{item.funcionarioUsername || 'Sin funcionario'}</TableCell>
                                  <TableCell>{item.extranjero ? 'Sí' : 'No'}</TableCell>
                                  <TableCell>{item.activo ? 'Activo' : 'Inactivo'}</TableCell>
                                  <TableCell>{item.observacion || 'Sin observación'}</TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Stack>
                  </CardContent>
                </Card>

                <HorizontalGroupBarChart
                  title="Solicitudes realizadas por el ciudadano"
                  description="Agrupa el historial individual por tipo de solicitud."
                  data={historySolicitudGroups}
                  barName="Solicitudes"
                  color="#1976d2"
                />

                <HorizontalGroupBarChart
                  title="Estados de las solicitudes del ciudadano"
                  description="Permite revisar cómo se distribuyen los estados dentro del historial individual."
                  data={historyEstadoGroups}
                  barName="Registros"
                  color="#ed6c02"
                />

                <HorizontalGroupBarChart
                  title="Funcionarios que atendieron al ciudadano"
                  description="Muestra los funcionarios asociados a las atenciones del ciudadano."
                  data={historyFuncionarioGroups}
                  barName="Atenciones"
                  color="#2e7d32"
                />

                <PieGroupChart
                  title="Distribución territorial del historial"
                  description="Distribución por comuna de las solicitudes del ciudadano."
                  data={historyComunaGroups}
                />
              </Stack>
            ) : null}

            {form.tipoReporte === 'CIUDADANOS_FRECUENTES' ? (
              <Stack spacing={3}>
                <Card className="report-export-section" sx={reportCardSx}>
                  <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>
                          Resumen de ciudadanos frecuentes
                        </Typography>

                        <Typography color="text.secondary" sx={{ fontSize: 14, mt: 0.5 }}>
                          Ranking de ciudadanos que más visitan la ventanilla y realizan trámites
                          dentro del periodo seleccionado.
                        </Typography>
                      </Box>

                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: {
                            xs: '1fr',
                            sm: 'repeat(2, 1fr)',
                            md: 'repeat(4, 1fr)',
                          },
                          gap: 2,
                        }}
                      >
                        <KpiCard
                          title="Ciudadanos encontrados"
                          value={frequentCitizens.length}
                          color="primary"
                        />

                        <KpiCard
                          title="Total visitas"
                          value={frequentCitizensTotalVisits}
                          color="success"
                        />

                        <KpiCard
                          title="Total trámites"
                          value={frequentCitizensTotalRequests}
                          color="secondary"
                        />

                        <KpiCard
                          title="Promedio de trámites"
                          value={frequentCitizens.length > 0
                            ? Math.round(frequentCitizensTotalRequests / frequentCitizens.length)
                            : 0}
                          color="info"
                          subtitle="Promedio aproximado por ciudadano"
                        />
                      </Box>

                      {topCitizenByVisits ? (
                        <Alert severity="info" variant="outlined">
                          Ciudadano con más visitas:{' '}
                          <strong>{getCitizenNameLabel(topCitizenByVisits)}</strong>
                          {' · '}
                          Cédula: <strong>{topCitizenByVisits.cedulaUsuario}</strong>
                          {' · '}
                          Visitas: <strong>{formatNumber(topCitizenByVisits.totalVisitas)}</strong>
                        </Alert>
                      ) : null}

                      {topCitizenByRequests ? (
                        <Alert severity="success" variant="outlined">
                          Ciudadano con más trámites:{' '}
                          <strong>{getCitizenNameLabel(topCitizenByRequests)}</strong>
                          {' · '}
                          Cédula: <strong>{topCitizenByRequests.cedulaUsuario}</strong>
                          {' · '}
                          Trámites: <strong>{formatNumber(topCitizenByRequests.totalSolicitudes)}</strong>
                        </Alert>
                      ) : null}
                    </Stack>
                  </CardContent>
                </Card>

                <Card className="report-export-section" sx={reportCardSx}>
                  <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>
                          Ranking de ciudadanos frecuentes
                        </Typography>

                        <Typography color="text.secondary" sx={{ fontSize: 14, mt: 0.5 }}>
                          Ordenado por mayor número de visitas y mayor número de trámites.
                        </Typography>
                      </Box>

                      <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
                        <Table size="small" sx={{ minWidth: 1150 }}>
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 800 }}>#</TableCell>
                              <TableCell sx={{ fontWeight: 800 }}>Ciudadano</TableCell>
                              <TableCell sx={{ fontWeight: 800 }}>Cédula</TableCell>
                              <TableCell sx={{ fontWeight: 800 }}>Teléfono</TableCell>
                              <TableCell align="center" sx={{ fontWeight: 800 }}>Visitas</TableCell>
                              <TableCell align="center" sx={{ fontWeight: 800 }}>Trámites</TableCell>
                              <TableCell align="center" sx={{ fontWeight: 800 }}>% visitas</TableCell>
                              <TableCell align="center" sx={{ fontWeight: 800 }}>% trámites</TableCell>
                              <TableCell sx={{ fontWeight: 800 }}>Primera visita</TableCell>
                              <TableCell sx={{ fontWeight: 800 }}>Última visita</TableCell>
                            </TableRow>
                          </TableHead>

                          <TableBody>
                            {frequentCitizens.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={10} align="center">
                                  No hay ciudadanos frecuentes para el periodo seleccionado.
                                </TableCell>
                              </TableRow>
                            ) : (
                              frequentCitizens.map((item, index) => {
                                const totalVisitas = Number(item.totalVisitas ?? 0);
                                const totalSolicitudes = Number(item.totalSolicitudes ?? 0);
                                const visitsPercent = getPercentage(
                                  totalVisitas,
                                  frequentCitizensTotalVisits
                                );
                                const requestsPercent = getPercentage(
                                  totalSolicitudes,
                                  frequentCitizensTotalRequests
                                );

                                return (
                                  <TableRow key={`${item.cedulaUsuario}-${index}`} hover>
                                    <TableCell sx={{ fontWeight: 800 }}>
                                      {index + 1}
                                    </TableCell>

                                    <TableCell sx={{ fontWeight: 700 }}>
                                      {getCitizenNameLabel(item)}
                                    </TableCell>

                                    <TableCell>
                                      <Chip
                                        label={item.cedulaUsuario}
                                        size="small"
                                        color="primary"
                                        variant="outlined"
                                        sx={{ fontWeight: 700 }}
                                      />
                                    </TableCell>

                                    <TableCell>{item.telefono || 'Sin teléfono'}</TableCell>

                                    <TableCell align="center">
                                      {formatNumber(totalVisitas)}
                                    </TableCell>

                                    <TableCell align="center">
                                      {formatNumber(totalSolicitudes)}
                                    </TableCell>

                                    <TableCell align="center">
                                      {formatPercent(visitsPercent)} %
                                    </TableCell>

                                    <TableCell align="center">
                                      {formatPercent(requestsPercent)} %
                                    </TableCell>

                                    <TableCell>{formatDateLabel(item.primeraVisita || '')}</TableCell>
                                    <TableCell>{formatDateLabel(item.ultimaVisita || '')}</TableCell>
                                  </TableRow>
                                );
                              })
                            )}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Stack>
                  </CardContent>
                </Card>

                <HorizontalGroupBarChart
                  title="Ciudadanos con más visitas"
                  description="Ranking por número de días o visitas registradas en Ventanilla."
                  data={frequentCitizensByVisits}
                  barName="Visitas"
                  color="#1976d2"
                />

                <HorizontalGroupBarChart
                  title="Ciudadanos con más trámites"
                  description="Ranking por cantidad total de solicitudes o trámites realizados."
                  data={frequentCitizensByRequests}
                  barName="Trámites"
                  color="#2e7d32"
                />

                <PieGroupChart
                  title="Distribución porcentual por trámites"
                  description="Participación de los ciudadanos con mayor cantidad de trámites dentro del periodo."
                  data={frequentCitizensByRequests}
                />
              </Stack>
            ) : null}

            {form.tipoReporte === 'PRODUCTIVIDAD_FUNCIONARIO' ? (
              <Stack spacing={3}>
                <Card className="report-export-section" sx={reportCardSx}>
                  <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>
                          Resumen de productividad por funcionario
                        </Typography>

                        <Typography color="text.secondary" sx={{ fontSize: 14, mt: 0.5 }}>
                          Consolidado de atenciones por funcionario con agrupación{' '}
                          <strong>{getProductivityGroupingLabel(form.productivityGrouping)}</strong>.
                        </Typography>
                      </Box>

                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: {
                            xs: '1fr',
                            sm: 'repeat(2, 1fr)',
                            md: 'repeat(4, 1fr)',
                          },
                          gap: 2,
                        }}
                      >
                        <KpiCard
                          title="Total atenciones"
                          value={employeeProductivityTotal}
                          color="primary"
                        />

                        <KpiCard
                          title="Funcionarios"
                          value={employeeProductivityEmployeeCount}
                          color="success"
                        />

                        <KpiCard
                          title="Periodos"
                          value={employeeProductivityPeriodCount}
                          color="secondary"
                          subtitle={getProductivityGroupingLabel(form.productivityGrouping)}
                        />

                        <KpiCard
                          title="Promedio por funcionario"
                          value={employeeProductivityEmployeeCount > 0
                            ? Math.round(employeeProductivityTotal / employeeProductivityEmployeeCount)
                            : 0}
                          color="info"
                          subtitle="Promedio aproximado del periodo"
                        />
                      </Box>

                      {topEmployeeProductivity ? (
                        <Alert severity="info" variant="outlined">
                          Mayor productividad:{' '}
                          <strong>{topEmployeeProductivity.funcionarioUsername || 'Sin funcionario'}</strong>
                          {' · '}
                          Periodo: <strong>{topEmployeeProductivity.periodo}</strong>
                          {' · '}
                          Atenciones:{' '}
                          <strong>{formatNumber(Number(topEmployeeProductivity.totalAtenciones ?? 0))}</strong>
                        </Alert>
                      ) : (
                        <Alert severity="info">
                          No hay datos de productividad para el periodo seleccionado.
                        </Alert>
                      )}
                    </Stack>
                  </CardContent>
                </Card>

                <Card className="report-export-section" sx={reportCardSx}>
                  <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>
                          Tabla de productividad por funcionario
                        </Typography>

                        <Typography color="text.secondary" sx={{ fontSize: 14, mt: 0.5 }}>
                          Muestra el total de atenciones, participación porcentual y promedio diario
                          por funcionario en cada periodo.
                        </Typography>
                      </Box>

                      <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto' }}>
                        <Table size="small" sx={{ minWidth: 1000 }}>
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 800 }}>#</TableCell>
                              <TableCell sx={{ fontWeight: 800 }}>Periodo</TableCell>
                              <TableCell sx={{ fontWeight: 800 }}>Fecha inicio</TableCell>
                              <TableCell sx={{ fontWeight: 800 }}>Fecha fin</TableCell>
                              <TableCell sx={{ fontWeight: 800 }}>Funcionario</TableCell>
                              <TableCell align="center" sx={{ fontWeight: 800 }}>Total atenciones</TableCell>
                              <TableCell align="center" sx={{ fontWeight: 800 }}>% del periodo</TableCell>
                              <TableCell align="center" sx={{ fontWeight: 800 }}>Promedio diario</TableCell>
                            </TableRow>
                          </TableHead>

                          <TableBody>
                            {employeeProductivity.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={8} align="center">
                                  No hay productividad para el periodo seleccionado.
                                </TableCell>
                              </TableRow>
                            ) : (
                              employeeProductivity.map((item, index) => (
                                <TableRow
                                  key={`${item.periodo}-${item.funcionarioId ?? item.funcionarioUsername}-${index}`}
                                  hover
                                >
                                  <TableCell sx={{ fontWeight: 800 }}>
                                    {index + 1}
                                  </TableCell>

                                  <TableCell sx={{ fontWeight: 700 }}>
                                    {item.periodo}
                                  </TableCell>

                                  <TableCell>
                                    {formatDateLabel(item.fechaInicioPeriodo)}
                                  </TableCell>

                                  <TableCell>
                                    {formatDateLabel(item.fechaFinPeriodo)}
                                  </TableCell>

                                  <TableCell>
                                    {item.funcionarioUsername || 'Sin funcionario'}
                                  </TableCell>

                                  <TableCell align="center">
                                    {formatNumber(Number(item.totalAtenciones ?? 0))}
                                  </TableCell>

                                  <TableCell align="center">
                                    {formatPercent(Number(item.porcentaje ?? 0))} %
                                  </TableCell>

                                  <TableCell align="center">
                                    {formatPercent(Number(item.promedioDiario ?? 0))}
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Stack>
                  </CardContent>
                </Card>

                <HorizontalGroupBarChart
                  title="Productividad consolidada por funcionario"
                  description="Suma todas las atenciones del periodo seleccionado por funcionario."
                  data={employeeProductivityByEmployee}
                  barName="Atenciones"
                  color="#2e7d32"
                />

                <HorizontalGroupBarChart
                  title="Productividad consolidada por periodo"
                  description="Suma las atenciones por semana o mes, según la agrupación seleccionada."
                  data={employeeProductivityByPeriod}
                  barName="Atenciones"
                  color="#1976d2"
                />

                <PieGroupChart
                  title="Distribución porcentual por funcionario"
                  description="Participación de cada funcionario sobre el total de atenciones del periodo."
                  data={employeeProductivityByEmployee}
                />
              </Stack>
            ) : null}

            {form.tipoReporte === 'GENERAL' && ventanillaSummary && dmcSummary ? (
              <Stack spacing={3}>
                <Card className="report-export-section" sx={reportCardSx}>
                  <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>
                          Resumen general del sistema
                        </Typography>

                        <Typography color="text.secondary" sx={{ fontSize: 14, mt: 0.5 }}>
                          Indicadores principales de Ventanilla y DMC dentro del periodo seleccionado.
                        </Typography>
                      </Box>

                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: {
                            xs: '1fr',
                            sm: 'repeat(2, 1fr)',
                            md: 'repeat(4, 1fr)',
                          },
                          gap: 2,
                        }}
                      >
                        <KpiCard title="Total Ventanilla" value={ventanillaSummary.totalRegistros} subtitle="Registros de ventanilla" />
                        <KpiCard title="Pendientes" value={ventanillaSummary.pendientes} color="warning" />
                        <KpiCard title="Realizadas" value={ventanillaSummary.realizadas} color="success" />
                        <KpiCard title="Aprobadas" value={ventanillaSummary.aprobadas} color="info" />
                        <KpiCard title="Total DMC" value={dmcSummary.totalRegistros} subtitle="Registros DMC" color="secondary" />
                        <KpiCard title="Cantidad DMC" value={dmcSummary.totalCantidad} color="primary" />
                        <KpiCard title="Cargadas" value={dmcSummary.totalCargadas} color="success" />
                        <KpiCard title="Descargadas" value={dmcSummary.totalDescargadas} color="info" />
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>

                <Card className="report-export-section" sx={reportCardSx}>
                  <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                      Comparativo general Ventanilla vs DMC
                    </Typography>

                    <Typography color="text.secondary" sx={{ fontSize: 13, mb: 2 }}>
                      Permite observar qué módulo concentra mayor volumen de registros.
                    </Typography>

                    <Box sx={{ width: '100%', height: 420 }}>
                      <ResponsiveContainer>
                        <BarChart data={systemComparisonData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="nombre" />
                          <YAxis allowDecimals={false} />
                          <ChartTooltip />
                          <Legend />
                          <Bar dataKey="total" name="Total registros" fill="#1976d2" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  </CardContent>
                </Card>

                <HorizontalGroupBarChart
                  title="Solicitudes por tipo - Ventanilla"
                  description="Muestra los tipos de solicitud con mayor movimiento."
                  data={ventanillaSolicitudes}
                  barName="Solicitudes"
                />

                <HorizontalGroupBarChart
                  title="Estados de solicitud - Ventanilla"
                  description="Permite revisar cómo se distribuyen los estados del proceso."
                  data={ventanillaEstados}
                  barName="Registros"
                  color="#ed6c02"
                />

                <HorizontalGroupBarChart
                  title="Atenciones por funcionario - Ventanilla"
                  description="Muestra el volumen de atenciones por funcionario."
                  data={ventanillaFuncionarios}
                  barName="Atenciones"
                  color="#2e7d32"
                />

                <HorizontalGroupBarChart
                  title="Totales por comuna - Ventanilla"
                  description="Muestra las comunas con mayor actividad en Ventanilla."
                  data={ventanillaComunas}
                  barName="Registros"
                  color="#9c27b0"
                />

                <HorizontalGroupBarChart
                  title="Totales por comuna - DMC"
                  description="Muestra las comunas con mayor actividad en DMC."
                  data={dmcComunas}
                  barName="Registros"
                  color="#0288d1"
                />

                <Card className="report-export-section" sx={reportCardSx}>
                  <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                      Resumen operativo DMC
                    </Typography>

                    <Typography color="text.secondary" sx={{ fontSize: 13, mb: 2 }}>
                      Comparativo entre cargadas y descargadas. No se incluye total rechazadas.
                    </Typography>

                    <Box sx={{ width: '100%', height: 420 }}>
                      <ResponsiveContainer>
                        <BarChart data={dmcOperationChartData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="nombre" />
                          <YAxis allowDecimals={false} />
                          <ChartTooltip />
                          <Legend />
                          <Bar dataKey="total" name="Total" fill="#2e7d32" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  </CardContent>
                </Card>
              </Stack>
            ) : null}

            {form.tipoReporte === 'ALERTAS' && ventanillaSummary && dmcSummary ? (
              <Stack spacing={3}>
                <Card className="report-export-section" sx={reportCardSx}>
                  <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>
                          Resumen de control operativo
                        </Typography>

                        <Typography color="text.secondary" sx={{ fontSize: 14, mt: 0.5 }}>
                          Indicadores que ayudan a detectar cargas altas, acumulación de pendientes,
                          concentración territorial y comportamiento operativo del sistema.
                        </Typography>
                      </Box>

                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: {
                            xs: '1fr',
                            sm: 'repeat(2, 1fr)',
                            md: 'repeat(4, 1fr)',
                          },
                          gap: 2,
                        }}
                      >
                        <KpiCard title="Total Ventanilla" value={ventanillaSummary.totalRegistros} />
                        <KpiCard title="Pendientes" value={ventanillaSummary.pendientes} color="warning" />
                        <KpiCard title="En revisión" value={ventanillaSummary.revisar} color="info" />
                        <KpiCard title="Canceladas" value={ventanillaSummary.canceladas} color="error" />
                        <KpiCard title="Total DMC" value={dmcSummary.totalRegistros} color="secondary" />
                        <KpiCard title="Cantidad DMC" value={dmcSummary.totalCantidad} />
                        <KpiCard title="Cargadas" value={dmcSummary.totalCargadas} color="success" />
                        <KpiCard title="Descargadas" value={dmcSummary.totalDescargadas} color="info" />
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>

                <Card className="report-export-section" sx={reportCardSx}>
                  <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>
                          Alertas operativas
                        </Typography>

                        <Typography color="text.secondary" sx={{ fontSize: 14, mt: 0.5 }}>
                          Lectura automática de puntos que requieren seguimiento o validación.
                        </Typography>
                      </Box>

                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: {
                            xs: '1fr',
                            md: 'repeat(2, 1fr)',
                          },
                          gap: 2,
                        }}
                      >
                        {operationalAlerts.map((item) => (
                          <Alert key={item.title} severity={item.severity} variant="outlined">
                            <Stack spacing={0.5}>
                              <Typography sx={{ fontWeight: 900 }}>
                                {item.title} · {item.value}
                              </Typography>

                              <Typography sx={{ fontSize: 13 }}>
                                {item.description}
                              </Typography>

                              <Typography sx={{ fontSize: 12 }}>
                                {item.helper}
                              </Typography>
                            </Stack>
                          </Alert>
                        ))}
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>

                <HorizontalGroupBarChart
                  title="Estados de solicitud - Ventanilla"
                  description="Ayuda a identificar pendientes, revisiones, aprobadas, rechazadas y canceladas."
                  data={ventanillaEstados}
                  barName="Registros"
                  color="#ed6c02"
                />

                <HorizontalGroupBarChart
                  title="Funcionarios con mayor carga operativa"
                  description="Permite revisar concentración de atenciones por funcionario."
                  data={ventanillaFuncionarios}
                  barName="Atenciones"
                  color="#2e7d32"
                />

                <HorizontalGroupBarChart
                  title="Solicitudes con mayor demanda"
                  description="Identifica los tipos de solicitud que generan mayor presión operativa."
                  data={ventanillaSolicitudes}
                  barName="Solicitudes"
                  color="#1976d2"
                />

                <HorizontalGroupBarChart
                  title="Comunas con mayor actividad - Ventanilla"
                  description="Muestra las comunas que concentran más registros de Ventanilla."
                  data={ventanillaComunas}
                  barName="Registros"
                  color="#9c27b0"
                />

                <HorizontalGroupBarChart
                  title="Comunas con mayor actividad - DMC"
                  description="Muestra las comunas que concentran más actividad DMC."
                  data={dmcComunas}
                  barName="Registros"
                  color="#0288d1"
                />

                <Card className="report-export-section" sx={reportCardSx}>
                  <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                      Comparativo DMC operativo
                    </Typography>

                    <Typography color="text.secondary" sx={{ fontSize: 13, mb: 2 }}>
                      Comparativo entre cargadas y descargadas. No se incluye total rechazadas.
                    </Typography>

                    <Box sx={{ width: '100%', height: 420 }}>
                      <ResponsiveContainer>
                        <BarChart data={dmcOperationChartData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="nombre" />
                          <YAxis allowDecimals={false} />
                          <ChartTooltip />
                          <Legend />
                          <Bar dataKey="total" name="Total" fill="#2e7d32" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  </CardContent>
                </Card>
              </Stack>
            ) : null}

            {form.tipoReporte === 'DMC' && dmcSummary ? (
              <Stack spacing={3}>
                <Card className="report-export-section" sx={reportCardSx}>
                  <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>
                          Resumen DMC
                        </Typography>

                        <Typography color="text.secondary" sx={{ fontSize: 14, mt: 0.5 }}>
                          Indicadores principales de DMC. No se muestra total rechazadas.
                        </Typography>
                      </Box>

                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: {
                            xs: '1fr',
                            sm: 'repeat(2, 1fr)',
                            md: 'repeat(4, 1fr)',
                          },
                          gap: 2,
                        }}
                      >
                        <KpiCard title="Total registros DMC" value={dmcSummary.totalRegistros} color="secondary" />
                        <KpiCard title="Cantidad total" value={dmcSummary.totalCantidad} />
                        <KpiCard title="Cargadas" value={dmcSummary.totalCargadas} color="success" />
                        <KpiCard title="Descargadas" value={dmcSummary.totalDescargadas} color="info" />
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>

                <Card className="report-export-section" sx={reportCardSx}>
                  <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                      Comparativo DMC
                    </Typography>

                    <Typography color="text.secondary" sx={{ fontSize: 13, mb: 2 }}>
                      Comparativo entre cargadas y descargadas.
                    </Typography>

                    <Box sx={{ width: '100%', height: 420 }}>
                      <ResponsiveContainer>
                        <BarChart data={dmcOperationChartData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="nombre" />
                          <YAxis allowDecimals={false} />
                          <ChartTooltip />
                          <Legend />
                          <Bar dataKey="total" name="Total" fill="#2e7d32" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  </CardContent>
                </Card>

                <GroupTable
                  title="Totales por comuna - DMC"
                  description="Tabla consolidada de registros DMC por comuna."
                  data={dmcComunas}
                />

                <HorizontalGroupBarChart
                  title="Gráfica de totales por comuna - DMC"
                  description="Permite identificar las comunas con mayor actividad DMC."
                  data={dmcComunas}
                  barName="Registros"
                  color="#0288d1"
                />

                <PieGroupChart
                  title="Distribución porcentual por comuna - DMC"
                  description="Distribución visual de la participación por comuna."
                  data={dmcComunas}
                />
              </Stack>
            ) : null}

            {form.tipoReporte === 'COMUNAS' ? (
              <Stack spacing={3}>
                <GroupTable
                  title="Totales por comuna - Ventanilla"
                  description="Tabla consolidada de registros de Ventanilla por comuna."
                  data={ventanillaComunas}
                />

                <HorizontalGroupBarChart
                  title="Gráfica de totales por comuna - Ventanilla"
                  description="Permite identificar las comunas con mayor actividad de Ventanilla."
                  data={ventanillaComunas}
                  barName="Registros"
                  color="#9c27b0"
                />

                <PieGroupChart
                  title="Distribución porcentual por comuna - Ventanilla"
                  description="Distribución visual de la participación por comuna en Ventanilla."
                  data={ventanillaComunas}
                />

                <GroupTable
                  title="Totales por comuna - DMC"
                  description="Tabla consolidada de registros DMC por comuna."
                  data={dmcComunas}
                />

                <HorizontalGroupBarChart
                  title="Gráfica de totales por comuna - DMC"
                  description="Permite identificar las comunas con mayor actividad DMC."
                  data={dmcComunas}
                  barName="Registros"
                  color="#0288d1"
                />

                <PieGroupChart
                  title="Distribución porcentual por comuna - DMC"
                  description="Distribución visual de la participación por comuna en DMC."
                  data={dmcComunas}
                />
              </Stack>
            ) : null}
          </Stack>
        </Box>
      ) : null}

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