'use client';

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
  getDmcComunasTotales,
  getDmcEncuestadoresDesempeno,
  getVentanillaFrequentCitizens,
  getVentanillaFuncionariosDesempeno,
  getVentanillaSolicitudesTrend,
  previewVentanillaSolicitudes,
} from '@/services/report.service';
import {
  DmcComunaTotalResponse,
  DmcEncuestadorPerformanceResponse,
  VentanillaDailyTrendResponse,
  VentanillaFrequentCitizenResponse,
  VentanillaFuncionarioPerformanceResponse,
  VentanillaSolicitudPreviewResponse,
} from '@/types/report.types';

type SnackbarSeverity = 'success' | 'error' | 'warning' | 'info';

type SnackbarState = {
  open: boolean;
  message: string;
  severity: SnackbarSeverity;
};

type ReportType =
  | 'VENTANILLA_SOLICITUDES'
  | 'CIUDADANOS_FRECUENTES'
  | 'DMC_ENCUESTADORES'
  | 'DMC_COMUNAS'
  | 'VENTANILLA_FUNCIONARIOS'
  | 'EJECUTIVO_DMC'
  | 'EJECUTIVO_VENTANILLA';

type DateRange = {
  fechaInicio: string;
  fechaFin: string;
};

type FormState = DateRange & {
  tipoReporte: ReportType;
};

type KpiColor = 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'error';

type ChartDataRow = Record<string, string | number>;

type ChartSeriesConfig = {
  dataKey: string;
  label: string;
  color: string;
};

const CHART_VALUE_LABEL_COLOR = '#0B2F4A';
const CHART_INSIDE_VALUE_LABEL_COLOR = '#FFFFFF';
const CHART_VALUE_LABEL_STROKE = 'rgba(255,255,255,0.96)';
const CHART_BAR_LABEL_FONT_SIZE = 18;
const CHART_GROUPED_BAR_LABEL_FONT_SIZE = 16;
const CHART_LINE_LABEL_FONT_SIZE = 22;
const CHART_PIE_LABEL_FONT_SIZE = 17;

const MAX_RANGE_DAYS = 1825;
const PDF_MARGIN_MM = 9;
const PDF_HEADER_HEIGHT_MM = 18;
const PDF_FOOTER_HEIGHT_MM = 10;
const PDF_CANVAS_SCALE = 2.7;
const PDF_RENDER_WIDTH_PX = 1680;
const SISBEN_LOGO_PATH = '/images/logo-sisben.png';

const initialSnackbar: SnackbarState = {
  open: false,
  message: '',
  severity: 'success',
};

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

const initialForm: FormState = {
  fechaInicio: getTodayDate(),
  fechaFin: getTodayDate(),
  tipoReporte: 'DMC_ENCUESTADORES',
};

const reportCardSx = {
  borderRadius: 4,
  border: '1px solid',
  borderColor: 'divider',
  boxShadow: 'none',
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
  '#EF6C00',
  '#00897B',
];

function formatDateLabel(value?: string | null) {
  if (!value) {
    return '-';
  }

  const [year, month, day] = value.split('-');

  if (!year || !month || !day) {
    return value;
  }

  return `${day}/${month}/${year}`;
}

function formatDateTimeLabel() {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date());
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('es-CO').format(Number(value ?? 0));
}

function formatPercent(value: number) {
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(Number(value ?? 0));
}

function getDaysBetween(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const diff = end.getTime() - start.getTime();

  return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
}

function sumBy<T>(rows: T[], selector: (row: T) => number | null | undefined) {
  return rows.reduce((total, row) => total + Number(selector(row) ?? 0), 0);
}

function buildTopPieRows(rows: ChartDataRow[], limit = 8) {
  const ordered = rows
    .filter((row) => Number(row.total ?? 0) > 0)
    .sort((a, b) => Number(b.total ?? 0) - Number(a.total ?? 0));

  if (ordered.length <= limit) {
    return ordered;
  }

  const mainRows = ordered.slice(0, limit);
  const otherTotal = ordered
    .slice(limit)
    .reduce((sum, row) => sum + Number(row.total ?? 0), 0);

  return [
    ...mainRows,
    {
      nombre: 'Otros',
      total: otherTotal,
      label: formatNumber(otherTotal),
    },
  ];
}

function buildDmcPerformancePieRows(rows: DmcEncuestadorPerformanceResponse[]) {
  const totals = rows.reduce<Record<string, number>>((acc, row) => {
    const key = row.desempeno?.trim() || 'Sin desempeño';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  return Object.entries(totals).map(([nombre, total]) => ({
    nombre,
    total,
    label: formatNumber(total),
  }));
}

function buildSolicitudRows(preview: VentanillaSolicitudPreviewResponse) {
  return [...preview.filas]
    .map((row) => {
      const totalGeneral = preview.fechas.reduce(
        (sum, fecha) => sum + Number(row.cantidadesPorFecha[fecha] ?? 0),
        0
      );

      return {
        ...row,
        totalGeneral,
        porcentaje: preview.totalGeneral > 0
          ? (totalGeneral * 100) / Number(preview.totalGeneral ?? 0)
          : Number(row.porcentaje ?? 0),
      };
    })
    .sort((a, b) => Number(b.totalGeneral ?? 0) - Number(a.totalGeneral ?? 0)
      || a.solicitud.localeCompare(b.solicitud));
}

function getSolicitudColumnTotal(
  rows: VentanillaSolicitudPreviewResponse['filas'],
  fecha: string
) {
  return rows.reduce(
    (sum, row) => sum + Number(row.cantidadesPorFecha[fecha] ?? 0),
    0
  );
}

function getSolicitudPreviewTotal(preview: VentanillaSolicitudPreviewResponse) {
  const calculatedTotal = preview.filas.reduce(
    (sum, row) => sum + Number(row.totalGeneral ?? 0),
    0
  );

  return Number(preview.totalGeneral ?? calculatedTotal);
}



function getReportTitle(tipoReporte: ReportType) {
  const titles: Record<ReportType, string> = {
    VENTANILLA_SOLICITUDES: 'Ventanilla - Solicitudes por tipo y día',
    CIUDADANOS_FRECUENTES: 'Ventanilla - Ciudadanos frecuentes',
    DMC_ENCUESTADORES: 'DMC - Indicadores por encuestador',
    DMC_COMUNAS: 'DMC - Totales por comuna / zona',
    VENTANILLA_FUNCIONARIOS: 'Ventanilla - Desempeño por funcionario',
    EJECUTIVO_DMC: 'Informe ejecutivo DMC - Desempeño de encuestadores',
    EJECUTIVO_VENTANILLA: 'Informe ejecutivo Ventanilla - Atención por funcionario',
  };

  return titles[tipoReporte];
}

function getReportDescription(tipoReporte: ReportType) {
  const descriptions: Record<ReportType, string> = {
    VENTANILLA_SOLICITUDES: 'Reporte detallado de solicitudes de ventanilla por tipo, fecha, total general y participación porcentual.',
    CIUDADANOS_FRECUENTES: 'Reporte detallado de ciudadanos con mayor recurrencia, total de visitas, total de solicitudes y fechas de atención.',
    DMC_ENCUESTADORES: 'Tabla consolidada de cargadas, efectivas, no efectivas, cumplimiento, desempeño y total por encuestador.',
    DMC_COMUNAS: 'Tabla consolidada territorial con cargadas, descargadas y total por comuna o zona.',
    VENTANILLA_FUNCIONARIOS: 'Tabla consolidada de solicitudes atendidas, participación y promedio diario por funcionario.',
    EJECUTIVO_DMC: 'Informe formal con resumen general, gráfica de cumplimiento, indicadores por encuestador y distribución territorial.',
    EJECUTIVO_VENTANILLA: 'Informe formal con resumen general, gráfica de solicitudes atendidas y consolidado por funcionario.',
  };

  return descriptions[tipoReporte];
}

function buildFileName(tipoReporte: ReportType, fechaInicio: string, fechaFin: string, extension: 'pdf' | 'xlsx') {
  const labels: Record<ReportType, string> = {
    VENTANILLA_SOLICITUDES: 'ventanilla-solicitudes-tipo-dia',
    CIUDADANOS_FRECUENTES: 'ventanilla-ciudadanos-frecuentes',
    DMC_ENCUESTADORES: 'dmc-indicadores-encuestador',
    DMC_COMUNAS: 'dmc-totales-comuna-zona',
    VENTANILLA_FUNCIONARIOS: 'ventanilla-desempeno-funcionario',
    EJECUTIVO_DMC: 'ejecutivo-dmc-encuestadores',
    EJECUTIVO_VENTANILLA: 'ejecutivo-ventanilla-funcionarios',
  };

  return `Reporte-${labels[tipoReporte]}-${fechaInicio}-a-${fechaFin}.${extension}`;
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

function getDmcEncuestadorName(row: DmcEncuestadorPerformanceResponse) {
  return row.encuestadorNombre?.trim() || 'Sin encuestador';
}

function getDmcComunaName(row: DmcComunaTotalResponse) {
  return row.comunaNombre?.trim() || row.comunaCodigo?.trim() || 'COMUNA_N/A';
}

function getFuncionarioName(row: VentanillaFuncionarioPerformanceResponse) {
  return row.funcionarioUsername?.trim() || 'Sin funcionario';
}

function getFrequentCitizenName(row: VentanillaFrequentCitizenResponse) {
  const name = row.nombreUsuario?.trim();

  if (name) {
    return name;
  }

  return `CC ${row.cedulaUsuario}`;
}

function getFrequentCitizenChartName(row: VentanillaFrequentCitizenResponse) {
  const name = getFrequentCitizenName(row);
  const cedula = row.cedulaUsuario?.trim();

  return cedula ? `${name} · ${cedula}` : name;
}

function getFrequentCitizenParticipation(row: VentanillaFrequentCitizenResponse, totalVisits: number) {
  if (totalVisits <= 0) {
    return 0;
  }

  return (Number(row.totalVisitas ?? 0) * 100) / totalVisits;
}

function toDmcEncuestadoresExcelRows(rows: DmcEncuestadorPerformanceResponse[]) {
  return rows.map((row, index) => ({
    '#': index + 1,
    Encuestador: getDmcEncuestadorName(row),
    Cargadas: Number(row.cargadas ?? 0),
    Efectivas: Number(row.efectivas ?? 0),
    'No efectivas': Number(row.noEfectivas ?? 0),
    'Cumplimiento (%)': formatPercent(Number(row.cumplimiento ?? 0)),
    Desempeño: row.desempeno || 'Sin desempeño',
    Total: Number(row.total ?? 0),
  }));
}

function toDmcComunasExcelRows(rows: DmcComunaTotalResponse[]) {
  return rows.map((row, index) => ({
    '#': index + 1,
    'Comuna / zona': getDmcComunaName(row),
    Código: row.comunaCodigo || '',
    Cargadas: Number(row.cargadas ?? 0),
    Descargadas: Number(row.descargadas ?? 0),
    Total: Number(row.total ?? 0),
  }));
}

function toVentanillaFuncionariosExcelRows(rows: VentanillaFuncionarioPerformanceResponse[]) {
  return rows.map((row, index) => ({
    '#': index + 1,
    Funcionario: getFuncionarioName(row),
    'Solicitudes atendidas': Number(row.total ?? 0),
    'Participación (%)': formatPercent(Number(row.porcentaje ?? 0)),
    'Promedio diario': formatPercent(Number(row.promedioDiario ?? 0)),
  }));
}

function toCiudadanosFrecuentesExcelRows(rows: VentanillaFrequentCitizenResponse[]) {
  const totalVisitas = sumBy(rows, (row) => row.totalVisitas);

  return rows.map((row, index) => ({
    '#': index + 1,
    Ciudadano: getFrequentCitizenName(row),
    Cédula: row.cedulaUsuario || '',
    Teléfono: row.telefono || 'Sin teléfono',
    'Total visitas': Number(row.totalVisitas ?? 0),
    'Primera visita': formatDateLabel(row.primeraVisita),
    'Última visita': formatDateLabel(row.ultimaVisita),
  }));
}

function toVentanillaSolicitudesExcelRows(preview: VentanillaSolicitudPreviewResponse) {
  const rows = buildSolicitudRows(preview);

  return rows.map((row) => {
    const values: Record<string, string | number | boolean | null> = {
      Solicitud: row.solicitud,
    };

    preview.fechas.forEach((fecha) => {
      values[formatDateLabel(fecha)] = Number(row.cantidadesPorFecha[fecha] ?? 0);
    });

    values['Total general'] = Number(row.totalGeneral ?? 0);
    values['Participación (%)'] = `${formatPercent(Number(row.porcentaje ?? 0))} %`;

    return values;
  });
}

function toVentanillaSolicitudesTrendExcelRows(rows: VentanillaDailyTrendResponse[]) {
  return rows.map((row) => ({
    Fecha: formatDateLabel(row.fecha),
    'Total solicitudes': Number(row.total ?? 0),
  }));
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
  color?: KpiColor;
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

function ReportHeader({
  title,
  description,
  fechaInicio,
  fechaFin,
}: {
  title: string;
  description: string;
  fechaInicio: string;
  fechaFin: string;
}) {
  return (
    <Card className="report-export-section report-pdf-header" sx={{ ...reportCardSx, overflow: 'hidden' }}>
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
              AppSisbén Valledupar · Reporte generado por el sistema
            </Typography>

            <Typography variant="h4" sx={{ fontWeight: 900, color: '#263238', lineHeight: 1.08 }}>
              {title}
            </Typography>

            <Typography color="text.secondary" sx={{ mt: 1, fontSize: 14, fontWeight: 600, maxWidth: 920 }}>
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
            }}
          >
            <Box
              component="img"
              src={SISBEN_LOGO_PATH}
              alt="Logo Sisbén"
              sx={{
                width: 92,
                height: 34,
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
              sm: 'repeat(3, 1fr)',
            },
            gap: 1.4,
          }}
        >
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3, bgcolor: '#F4F8FC' }}>
            <Typography sx={{ fontSize: 11, fontWeight: 900, color: 'text.secondary', textTransform: 'uppercase' }}>
              Fecha inicio
            </Typography>
            <Typography sx={{ fontSize: 16, fontWeight: 900 }}>{formatDateLabel(fechaInicio)}</Typography>
          </Paper>

          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3, bgcolor: '#F4F8FC' }}>
            <Typography sx={{ fontSize: 11, fontWeight: 900, color: 'text.secondary', textTransform: 'uppercase' }}>
              Fecha fin
            </Typography>
            <Typography sx={{ fontSize: 16, fontWeight: 900 }}>{formatDateLabel(fechaFin)}</Typography>
          </Paper>

          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3, bgcolor: '#F4F8FC' }}>
            <Typography sx={{ fontSize: 11, fontWeight: 900, color: 'text.secondary', textTransform: 'uppercase' }}>
              Generado
            </Typography>
            <Typography sx={{ fontSize: 16, fontWeight: 900 }}>{formatDateTimeLabel()}</Typography>
          </Paper>
        </Box>
      </CardContent>
    </Card>
  );
}

function DmcEncuestadoresTable({
  rows,
}: {
  rows: DmcEncuestadorPerformanceResponse[];
}) {
  const totals = {
    cargadas: sumBy(rows, (row) => row.cargadas),
    efectivas: sumBy(rows, (row) => row.efectivas),
    noEfectivas: sumBy(rows, (row) => row.noEfectivas),
    total: sumBy(rows, (row) => row.total),
  };

  const cumplimientoGeneral = totals.cargadas > 0
    ? (totals.efectivas * 100) / totals.cargadas
    : 0;

  return (
    <Card className="report-export-section" sx={reportCardSx}>
      <CardContent sx={{ p: { xs: 2, md: 3 } }}>
        <Typography variant="h6" sx={{ fontWeight: 900 }}>
          Indicadores de desempeño DMC
        </Typography>

        <Typography color="text.secondary" sx={{ fontSize: 13, mb: 2, fontWeight: 700 }}>
          Consolidado por encuestador con cargadas, efectivas, no efectivas, cumplimiento y desempeño.
        </Typography>

        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3, overflowX: 'auto' }}>
          <Table
            size="small"
            sx={{
              minWidth: 1120,
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
                <TableCell>Encuestador</TableCell>
                <TableCell align="center">Cargadas</TableCell>
                <TableCell align="center">Efectivas</TableCell>
                <TableCell align="center">No efectivas</TableCell>
                <TableCell align="center">Cumplimiento (%)</TableCell>
                <TableCell align="center">Desempeño</TableCell>
                <TableCell align="center">Total</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {rows.map((row, index) => (
                <TableRow key={`${row.encuestadorId ?? row.encuestadorNombre}-${index}`} hover>
                  <TableCell sx={{ fontWeight: 900, textTransform: 'uppercase' }}>
                    {getDmcEncuestadorName(row)}
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800 }}>{formatNumber(Number(row.cargadas ?? 0))}</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800 }}>{formatNumber(Number(row.efectivas ?? 0))}</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800 }}>{formatNumber(Number(row.noEfectivas ?? 0))}</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 900, color: 'primary.main' }}>
                    {formatPercent(Number(row.cumplimiento ?? 0))} %
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={row.desempeno || 'Sin desempeño'}
                      size="small"
                      color={
                        row.desempeno === 'Alto'
                          ? 'success'
                          : row.desempeno === 'Medio'
                            ? 'warning'
                            : 'error'
                      }
                      variant="outlined"
                      sx={{ fontWeight: 800 }}
                    />
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 900 }}>{formatNumber(Number(row.total ?? 0))}</TableCell>
                </TableRow>
              ))}

              {!rows.length ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No hay información DMC para el periodo seleccionado.
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow>
                  <TableCell sx={{ fontWeight: 900, bgcolor: '#EAF3FC' }}>TOTALES</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 900, bgcolor: '#EAF3FC' }}>{formatNumber(totals.cargadas)}</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 900, bgcolor: '#EAF3FC' }}>{formatNumber(totals.efectivas)}</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 900, bgcolor: '#EAF3FC' }}>{formatNumber(totals.noEfectivas)}</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 900, bgcolor: '#EAF3FC' }}>{formatPercent(cumplimientoGeneral)} %</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 900, bgcolor: '#EAF3FC' }}>-</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 900, bgcolor: '#EAF3FC' }}>{formatNumber(totals.total)}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
}

function DmcComunasTable({
  rows,
}: {
  rows: DmcComunaTotalResponse[];
}) {
  const totals = {
    cargadas: sumBy(rows, (row) => row.cargadas),
    descargadas: sumBy(rows, (row) => row.descargadas),
    total: sumBy(rows, (row) => row.total),
  };

  return (
    <Card className="report-export-section" sx={reportCardSx}>
      <CardContent sx={{ p: { xs: 2, md: 3 } }}>
        <Typography variant="h6" sx={{ fontWeight: 900 }}>
          Totales por comuna / zona
        </Typography>

        <Typography color="text.secondary" sx={{ fontSize: 13, mb: 2, fontWeight: 700 }}>
          Distribución territorial de cargadas, descargadas y total.
        </Typography>

        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3, overflowX: 'auto' }}>
          <Table
            size="small"
            sx={{
              minWidth: 860,
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
                <TableCell>Comuna / zona</TableCell>
                <TableCell align="center">Cargadas</TableCell>
                <TableCell align="center">Descargadas</TableCell>
                <TableCell align="center">Total</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {rows.map((row, index) => (
                <TableRow key={`${row.comunaId ?? row.comunaCodigo}-${index}`} hover>
                  <TableCell sx={{ fontWeight: 900, textTransform: 'uppercase' }}>
                    {getDmcComunaName(row)}
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800 }}>{formatNumber(Number(row.cargadas ?? 0))}</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800 }}>{formatNumber(Number(row.descargadas ?? 0))}</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 900, color: 'primary.main' }}>{formatNumber(Number(row.total ?? 0))}</TableCell>
                </TableRow>
              ))}

              {!rows.length ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    No hay información territorial DMC para el periodo seleccionado.
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow>
                  <TableCell sx={{ fontWeight: 900, bgcolor: '#EAF3FC' }}>TOTALES</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 900, bgcolor: '#EAF3FC' }}>{formatNumber(totals.cargadas)}</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 900, bgcolor: '#EAF3FC' }}>{formatNumber(totals.descargadas)}</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 900, bgcolor: '#EAF3FC' }}>{formatNumber(totals.total)}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
}

function VentanillaFuncionariosTable({
  rows,
}: {
  rows: VentanillaFuncionarioPerformanceResponse[];
}) {
  const total = sumBy(rows, (row) => row.total);

  return (
    <Card className="report-export-section" sx={reportCardSx}>
      <CardContent sx={{ p: { xs: 2, md: 3 } }}>
        <Typography variant="h6" sx={{ fontWeight: 900 }}>
          Consolidado de solicitudes atendidas
        </Typography>

        <Typography color="text.secondary" sx={{ fontSize: 13, mb: 2, fontWeight: 700 }}>
          Productividad por funcionario, participación porcentual y promedio diario.
        </Typography>

        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3, overflowX: 'auto' }}>
          <Table
            size="small"
            sx={{
              minWidth: 860,
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
                <TableCell>N°</TableCell>
                <TableCell>Funcionario</TableCell>
                <TableCell align="center">Solicitudes atendidas</TableCell>
                <TableCell align="center">Participación</TableCell>
                <TableCell align="center">Promedio diario</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {rows.map((row, index) => (
                <TableRow key={`${row.funcionarioId ?? row.funcionarioUsername}-${index}`} hover>
                  <TableCell sx={{ fontWeight: 800 }}>{index + 1}</TableCell>
                  <TableCell sx={{ fontWeight: 900, textTransform: 'uppercase' }}>
                    {getFuncionarioName(row)}
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 900, color: 'primary.main' }}>
                    {formatNumber(Number(row.total ?? 0))}
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800 }}>
                    {formatPercent(Number(row.porcentaje ?? 0))} %
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800 }}>
                    {formatPercent(Number(row.promedioDiario ?? 0))}
                  </TableCell>
                </TableRow>
              ))}

              {!rows.length ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    No hay información de ventanilla para el periodo seleccionado.
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow>
                  <TableCell sx={{ fontWeight: 900, bgcolor: '#EAF3FC' }} />
                  <TableCell sx={{ fontWeight: 900, bgcolor: '#EAF3FC' }}>TOTAL GENERAL</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 900, bgcolor: '#EAF3FC' }}>{formatNumber(total)}</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 900, bgcolor: '#EAF3FC' }}>100,0 %</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 900, bgcolor: '#EAF3FC' }}>-</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
}



function VentanillaSolicitudesDetailedTable({
  preview,
}: {
  preview: VentanillaSolicitudPreviewResponse;
}) {
  const dates = preview.fechas;
  const rows = buildSolicitudRows(preview);
  const totalGeneral = getSolicitudPreviewTotal(preview);
  const tableMinWidth = Math.max(1120, 360 + dates.length * 96 + 220);

  return (
    <Card className="report-export-section" sx={reportCardSx}>
      <CardContent sx={{ p: { xs: 2, md: 3 } }}>
        <Typography variant="h6" sx={{ fontWeight: 900 }}>
          Totales por tipo de solicitud - Ventanilla
        </Typography>

        <Typography color="text.secondary" sx={{ fontSize: 13, mb: 2, fontWeight: 700 }}>
          Reporte detallado por fecha, tipo de solicitud, total general y participación porcentual.
          {' '}
          Total general:
          {' '}
          <strong>{formatNumber(totalGeneral)}</strong>
          {' '}
          · Agrupación:
          {' '}
          <strong>{preview.tipoAgrupacion === 'MENSUAL' ? 'Mensual' : 'Diaria'}</strong>
        </Typography>

        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3, overflowX: 'auto' }}>
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
                <TableCell sx={{ minWidth: 320 }}>Solicitud</TableCell>

                {dates.map((fecha) => (
                  <TableCell key={fecha} align="center" sx={{ minWidth: 96 }}>
                    {formatDateLabel(fecha)}
                  </TableCell>
                ))}

                <TableCell align="center" sx={{ minWidth: 130, bgcolor: '#DCEEFF !important' }}>
                  Total general
                </TableCell>

                <TableCell align="center" sx={{ minWidth: 110, bgcolor: '#DCEEFF !important' }}>
                  %
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {!rows.length ? (
                <TableRow>
                  <TableCell colSpan={dates.length + 3} align="center">
                    No hay solicitudes para el periodo seleccionado.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row, index) => (
                  <TableRow key={`${row.solicitud}-${index}`} hover>
                    <TableCell sx={{ fontWeight: 900, textTransform: 'uppercase' }}>
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

                    <TableCell align="center" sx={{ fontWeight: 900, color: 'primary.main', bgcolor: '#F1F7FF' }}>
                      {formatNumber(Number(row.totalGeneral ?? 0))}
                    </TableCell>

                    <TableCell align="center" sx={{ fontWeight: 900, bgcolor: '#F1F7FF' }}>
                      {formatPercent(Number(row.porcentaje ?? 0))} %
                    </TableCell>
                  </TableRow>
                ))
              )}

              {rows.length ? (
                <TableRow>
                  <TableCell sx={{ fontWeight: 900, bgcolor: '#EAF3FC' }}>
                    TOTAL GENERAL
                  </TableCell>

                  {dates.map((fecha) => (
                    <TableCell key={`total-${fecha}`} align="center" sx={{ fontWeight: 900, bgcolor: '#EAF3FC' }}>
                      {formatNumber(getSolicitudColumnTotal(rows, fecha))}
                    </TableCell>
                  ))}

                  <TableCell align="center" sx={{ fontWeight: 900, bgcolor: '#DCEEFF', color: 'primary.main' }}>
                    {formatNumber(totalGeneral)}
                  </TableCell>

                  <TableCell align="center" sx={{ fontWeight: 900, bgcolor: '#DCEEFF' }}>
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



function CiudadanosFrecuentesSummaryCard({
  rows,
}: {
  rows: VentanillaFrequentCitizenResponse[];
}) {
  const totalVisitas = sumBy(rows, (row) => row.totalVisitas);
  const totalSolicitudes = sumBy(rows, (row) => row.totalSolicitudes);
  const promedioVisitas = rows.length ? totalVisitas / rows.length : 0;
  const promedioSolicitudes = rows.length ? totalSolicitudes / rows.length : 0;

  const topCitizen = [...rows]
    .sort((a, b) => Number(b.totalVisitas ?? 0) - Number(a.totalVisitas ?? 0))[0];

  return (
    <Card className="report-export-section" sx={reportCardSx}>
      <CardContent sx={{ p: { xs: 2, md: 3 } }}>
        <Stack spacing={2.4}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 900 }}>
              Resumen del reporte de ciudadanos frecuentes
            </Typography>

            <Typography color="text.secondary" sx={{ fontSize: 14, fontWeight: 600, mt: 0.5 }}>
              Consolidado de ciudadanos que registran mayor recurrencia en ventanilla durante el periodo seleccionado.
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
            <KpiCard title="Total visitas" value={totalVisitas} />
            <KpiCard title="Total solicitudes" value={totalSolicitudes} color="success" />
            <KpiCard title="Ciudadanos identificados" value={rows.length} color="info" />
            <KpiCard
              title="Mayor recurrencia"
              value={Number(topCitizen?.totalVisitas ?? 0)}
              subtitle={topCitizen ? getFrequentCitizenName(topCitizen) : 'Sin datos'}
              color="warning"
            />
          </Box>

          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 3,
              bgcolor: '#F8FBFF',
              borderColor: '#D8E8F8',
            }}
          >
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={1.5}
              sx={{
                alignItems: { xs: 'flex-start', md: 'center' },
                justifyContent: 'space-between',
              }}
            >
              <Box>
                <Typography sx={{ fontWeight: 900, color: '#0B2F4A' }}>
                  Promedio por ciudadano
                </Typography>

                <Typography color="text.secondary" sx={{ fontSize: 13, fontWeight: 700 }}>
                  Visitas promedio: {formatPercent(promedioVisitas)} · Solicitudes promedio: {formatPercent(promedioSolicitudes)}
                </Typography>
              </Box>

              <Chip
                label="Reporte detallado"
                color="primary"
                variant="outlined"
                sx={{ fontWeight: 900 }}
              />
            </Stack>
          </Paper>
        </Stack>
      </CardContent>
    </Card>
  );
}

function CiudadanosFrecuentesTable({
  rows,
}: {
  rows: VentanillaFrequentCitizenResponse[];
}) {
  const totalVisitas = sumBy(rows, (row) => row.totalVisitas);

  return (
    <Card className="report-export-section" sx={reportCardSx}>
      <CardContent sx={{ p: { xs: 2, md: 3 } }}>
        <Typography variant="h6" sx={{ fontWeight: 900 }}>
          Detalle de ciudadanos frecuentes
        </Typography>

        <Typography color="text.secondary" sx={{ fontSize: 13, mb: 2, fontWeight: 700 }}>
          Ranking de ciudadanos con mayor número de visitas y fechas de atención dentro del periodo seleccionado.
        </Typography>

        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3, overflowX: 'auto' }}>
          <Table
            size="small"
            sx={{
              minWidth: 1040,
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
                <TableCell align="center">N°</TableCell>
                <TableCell>Ciudadano</TableCell>
                <TableCell>Cédula</TableCell>
                <TableCell>Teléfono</TableCell>
                <TableCell align="center">Total visitas</TableCell>
                <TableCell align="center">Primera visita</TableCell>
                <TableCell align="center">Última visita</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {rows.map((row, index) => {
                const visitas = Number(row.totalVisitas ?? 0);

                return (
                  <TableRow key={`${row.cedulaUsuario}-${index}`} hover>
                    <TableCell align="center" sx={{ fontWeight: 800 }}>{index + 1}</TableCell>

                    <TableCell sx={{ fontWeight: 900, textTransform: 'uppercase', minWidth: 260 }}>
                      {getFrequentCitizenName(row)}
                    </TableCell>

                    <TableCell sx={{ fontWeight: 800, minWidth: 140 }}>
                      {row.cedulaUsuario || '-'}
                    </TableCell>

                    <TableCell sx={{ fontWeight: 800, minWidth: 140 }}>
                      {row.telefono || 'Sin teléfono'}
                    </TableCell>

                    <TableCell align="center" sx={{ fontWeight: 900, color: 'primary.main' }}>
                      {formatNumber(visitas)}
                    </TableCell>

                    <TableCell align="center" sx={{ fontWeight: 800 }}>
                      {formatDateLabel(row.primeraVisita)}
                    </TableCell>

                    <TableCell align="center" sx={{ fontWeight: 800 }}>
                      {formatDateLabel(row.ultimaVisita)}
                    </TableCell>
                  </TableRow>
                );
              })}

              {!rows.length ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No hay ciudadanos frecuentes para el periodo seleccionado.
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow>
                  <TableCell align="center" sx={{ fontWeight: 900, bgcolor: '#EAF3FC' }} />

                  <TableCell colSpan={3} sx={{ fontWeight: 900, bgcolor: '#EAF3FC' }}>
                    TOTAL GENERAL
                  </TableCell>

                  <TableCell align="center" sx={{ fontWeight: 900, bgcolor: '#EAF3FC', color: 'primary.main' }}>
                    {formatNumber(totalVisitas)}
                  </TableCell>

                  <TableCell align="center" sx={{ fontWeight: 900, bgcolor: '#EAF3FC' }}>
                    -
                  </TableCell>

                  <TableCell align="center" sx={{ fontWeight: 900, bgcolor: '#EAF3FC' }}>
                    -
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
}


function HorizontalBarChart({
  title,
  description,
  data,
  dataKey,
  label,
  valueSuffix = '',
}: {
  title: string;
  description?: string;
  data: ChartDataRow[];
  dataKey: string;
  label: string;
  valueSuffix?: string;
}) {
  const height = Math.max(440, Math.min(760, data.length * 42 + 160));

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

        {!data.length ? (
          <Alert severity="info">
            No hay datos suficientes para construir la gráfica de barras.
          </Alert>
        ) : (
          <Box sx={{ width: '100%', height }}>
            <ResponsiveContainer>
              <BarChart
                data={data}
                layout="vertical"
                margin={{
                  top: 20,
                  right: 70,
                  left: 40,
                  bottom: 20,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#D9E2EC" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#263238' }} />
                <YAxis
                  type="category"
                  dataKey="nombre"
                  width={300}
                  tick={{ fontSize: 12, fill: '#263238', fontWeight: 700 }}
                />
                <ChartTooltip />
                <Legend />
                <Bar
                  dataKey={dataKey}
                  name={label}
                  fill="#0066CC"
                  radius={[0, 8, 8, 0]}
                  minPointSize={16}
                  isAnimationActive={false}
                >
                  <LabelList
                    dataKey="label"
                    position="insideRight"
                    fill={CHART_INSIDE_VALUE_LABEL_COLOR}
                    stroke="#0B2F4A"
                    strokeWidth={0.45}
                    fontSize={CHART_BAR_LABEL_FONT_SIZE}
                    fontWeight={900}
                    formatter={(value) => `${value ?? ''}${valueSuffix}`}
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

function GroupedBarChart({
  title,
  description,
  data,
  series,
}: {
  title: string;
  description?: string;
  data: ChartDataRow[];
  series: ChartSeriesConfig[];
}) {
  const height = Math.max(460, Math.min(780, data.length * 46 + 170));

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

        {!data.length ? (
          <Alert severity="info">
            No hay datos suficientes para construir el diagrama de barras.
          </Alert>
        ) : (
          <Box sx={{ width: '100%', height }}>
            <ResponsiveContainer>
              <BarChart
                data={data}
                layout="vertical"
                margin={{
                  top: 20,
                  right: 44,
                  left: 40,
                  bottom: 20,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#D9E2EC" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#263238' }} />
                <YAxis
                  type="category"
                  dataKey="nombre"
                  width={300}
                  tick={{ fontSize: 12, fill: '#263238', fontWeight: 700 }}
                />
                <ChartTooltip />
                <Legend />
                {series.map((item) => (
                  <Bar
                    key={item.dataKey}
                    dataKey={item.dataKey}
                    name={item.label}
                    fill={item.color}
                    radius={[0, 8, 8, 0]}
                    minPointSize={16}
                    isAnimationActive={false}
                  >
                    <LabelList
                      dataKey={item.dataKey}
                      position="insideRight"
                      fill={CHART_INSIDE_VALUE_LABEL_COLOR}
                      stroke="#0B2F4A"
                      strokeWidth={0.45}
                      fontSize={CHART_GROUPED_BAR_LABEL_FONT_SIZE}
                      fontWeight={900}
                      formatter={(value) => formatNumber(Number(value ?? 0))}
                    />
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

function LineTrendChart({
  title,
  description,
  data,
  dataKey,
  label,
  valueSuffix = '',
}: {
  title: string;
  description?: string;
  data: ChartDataRow[];
  dataKey: string;
  label: string;
  valueSuffix?: string;
}) {
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

        {data.length < 2 ? (
          <Alert severity="info">
            La línea de tendencia requiere al menos dos puntos de comparación.
          </Alert>
        ) : (
          <Box sx={{ width: '100%', height: 430 }}>
            <ResponsiveContainer>
              <LineChart
                data={data}
                margin={{
                  top: 78,
                  right: 54,
                  left: 24,
                  bottom: 42,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#D9E2EC" />
                <XAxis
                  dataKey="nombre"
                  tick={{ fontSize: 11, fill: '#263238', fontWeight: 700 }}
                  interval={0}
                  angle={-18}
                  textAnchor="end"
                  height={72}
                />
                <YAxis
                  allowDecimals
                  domain={[
                    0,
                    (dataMax: number) => {
                      const safeMax = Number(dataMax || 0);

                      if (safeMax <= 0) {
                        return 10;
                      }

                      return Math.ceil(safeMax * 1.22);
                    },
                  ]}
                  tick={{ fontSize: 12, fill: '#263238' }}
                  tickFormatter={(value) => `${formatNumber(Number(value))}${valueSuffix}`}
                />
                <ChartTooltip formatter={(value) => [`${formatNumber(Number(value))}${valueSuffix}`, label]} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey={dataKey}
                  name={label}
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
                    dataKey="label"
                    content={(props) => {
                      const { x, y, value } = props;

                      if (x === undefined || y === undefined || value === undefined || value === null) {
                        return null;
                      }

                      const numericX = Number(x);
                      const numericY = Number(y);
                      const labelValue = String(value);

                      return (
                        <text
                          x={numericX}
                          y={Math.max(24, numericY - 18)}
                          textAnchor="middle"
                          fill="#000000"
                          stroke="#FFFFFF"
                          strokeWidth={5}
                          paintOrder="stroke"
                          fontSize={CHART_LINE_LABEL_FONT_SIZE}
                          fontWeight={900}
                        >
                          {`${labelValue}${valueSuffix}`}
                        </text>
                      );
                    }}
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

function PieReportChart({
  title,
  description,
  data,
}: {
  title: string;
  description?: string;
  data: ChartDataRow[];
}) {
  const chartData = buildTopPieRows(data);

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

        {chartData.length < 2 ? (
          <Alert severity="info">
            El diagrama de torta requiere al menos dos categorías con valores mayores a cero.
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
                  innerRadius={58}
                  paddingAngle={2}
                  isAnimationActive={false}
                >
                  {chartData.map((_, index) => (
                    <Cell
                      key={`pie-cell-${index}`}
                      fill={chartColors[index % chartColors.length]}
                    />
                  ))}
                  <LabelList
                    dataKey="label"
                    position="inside"
                    fill={CHART_INSIDE_VALUE_LABEL_COLOR}
                    stroke="#0B2F4A"
                    strokeWidth={0.5}
                    fontSize={CHART_PIE_LABEL_FONT_SIZE}
                    fontWeight={900}
                    formatter={(value) => `${value ?? ''}`}
                  />
                </Pie>
                <ChartTooltip formatter={(value) => [formatNumber(Number(value)), 'Total']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

function ExecutiveSummaryDmc({
  rows,
  comunas,
}: {
  rows: DmcEncuestadorPerformanceResponse[];
  comunas: DmcComunaTotalResponse[];
}) {
  const totalCargadas = sumBy(rows, (row) => row.cargadas);
  const totalEfectivas = sumBy(rows, (row) => row.efectivas);
  const totalNoEfectivas = sumBy(rows, (row) => row.noEfectivas);
  const totalGeneral = sumBy(rows, (row) => row.total);
  const cumplimientoGeneral = totalCargadas > 0 ? (totalEfectivas * 100) / totalCargadas : 0;
  const topEncuestador = [...rows].sort((a, b) => Number(b.cumplimiento ?? 0) - Number(a.cumplimiento ?? 0))[0];
  const topComuna = [...comunas].sort((a, b) => Number(b.total ?? 0) - Number(a.total ?? 0))[0];

  return (
    <Card className="report-export-section" sx={reportCardSx}>
      <CardContent sx={{ p: { xs: 2, md: 3 } }}>
        <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>
          Resumen ejecutivo DMC
        </Typography>

        <Typography color="text.secondary" sx={{ fontSize: 14, fontWeight: 600, mb: 2 }}>
          Durante el periodo evaluado se consolidan los indicadores operativos DMC por encuestador
          y la distribución territorial por comuna o zona.
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
          <KpiCard title="Cargadas" value={totalCargadas} />
          <KpiCard title="Efectivas" value={totalEfectivas} color="success" />
          <KpiCard title="No efectivas" value={totalNoEfectivas} color="warning" />
          <KpiCard
            title="Total general"
            value={totalGeneral}
            subtitle={`Cumplimiento general: ${formatPercent(cumplimientoGeneral)} %`}
            color="info"
          />
        </Box>

        <Divider sx={{ my: 2 }} />

        <Typography sx={{ fontWeight: 800 }}>
          Mayor cumplimiento:
          {' '}
          <strong>{topEncuestador ? getDmcEncuestadorName(topEncuestador) : 'Sin datos'}</strong>
          {' '}
          {topEncuestador ? `(${formatPercent(Number(topEncuestador.cumplimiento ?? 0))} %)` : ''}
        </Typography>

        <Typography sx={{ fontWeight: 800, mt: 0.8 }}>
          Mayor concentración territorial:
          {' '}
          <strong>{topComuna ? getDmcComunaName(topComuna) : 'Sin datos'}</strong>
          {' '}
          {topComuna ? `(${formatNumber(Number(topComuna.total ?? 0))} registros)` : ''}
        </Typography>
      </CardContent>
    </Card>
  );
}

function ExecutiveSummaryVentanilla({
  rows,
}: {
  rows: VentanillaFuncionarioPerformanceResponse[];
}) {
  const total = sumBy(rows, (row) => row.total);
  const topFuncionario = [...rows].sort((a, b) => Number(b.total ?? 0) - Number(a.total ?? 0))[0];
  const promedioGeneral = rows.length ? total / rows.length : 0;

  return (
    <Card className="report-export-section" sx={reportCardSx}>
      <CardContent sx={{ p: { xs: 2, md: 3 } }}>
        <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>
          Resumen ejecutivo Ventanilla
        </Typography>

        <Typography color="text.secondary" sx={{ fontSize: 14, fontWeight: 600, mb: 2 }}>
          Durante el periodo evaluado se consolidan las solicitudes atendidas por funcionario,
          su participación porcentual y el promedio diario de gestión.
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
          <KpiCard title="Total solicitudes" value={total} />
          <KpiCard title="Funcionarios evaluados" value={rows.length} color="info" />
          <KpiCard title="Promedio por funcionario" value={Number(promedioGeneral.toFixed(0))} color="success" />
          <KpiCard
            title="Mayor desempeño"
            value={Number(topFuncionario?.total ?? 0)}
            subtitle={topFuncionario ? getFuncionarioName(topFuncionario) : 'Sin datos'}
            color="warning"
          />
        </Box>
      </CardContent>
    </Card>
  );
}

function RecommendationsCard({
  type,
}: {
  type: 'DMC' | 'VENTANILLA';
}) {
  const recommendations = type === 'DMC'
    ? [
        'Mantener seguimiento periódico al cumplimiento por encuestador.',
        'Priorizar acompañamiento a los encuestadores con desempeño bajo o medio.',
        'Revisar registros territoriales sin clasificación para fortalecer la calidad del dato.',
      ]
    : [
        'Mantener seguimiento periódico al volumen de solicitudes atendidas por funcionario.',
        'Revisar diferencias significativas de productividad para equilibrar cargas de trabajo.',
        'Fortalecer la organización de turnos y retroalimentación individual.',
      ];

  return (
    <Card className="report-export-section" sx={reportCardSx}>
      <CardContent sx={{ p: { xs: 2, md: 3 } }}>
        <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>
          Conclusiones y recomendaciones
        </Typography>

        <Typography color="text.secondary" sx={{ fontSize: 14, fontWeight: 600, mb: 2 }}>
          Los resultados permiten fortalecer el seguimiento operativo y la toma de decisiones.
        </Typography>

        <Stack spacing={1}>
          {recommendations.map((recommendation, index) => (
            <Alert key={recommendation} severity="info">
              <strong>{index + 1}.</strong>
              {' '}
              {recommendation}
            </Alert>
          ))}
        </Stack>
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
  const headerBottomY = PDF_MARGIN_MM + PDF_HEADER_HEIGHT_MM - 3;

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
  pdf.line(
    PDF_MARGIN_MM,
    pageHeight - PDF_FOOTER_HEIGHT_MM + 2,
    pageWidth - PDF_MARGIN_MM,
    pageHeight - PDF_FOOTER_HEIGHT_MM + 2
  );

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
  const [solicitudesPreview, setSolicitudesPreview] = useState<VentanillaSolicitudPreviewResponse | null>(null);
  const [solicitudesTrend, setSolicitudesTrend] = useState<VentanillaDailyTrendResponse[]>([]);
  const [dmcEncuestadores, setDmcEncuestadores] = useState<DmcEncuestadorPerformanceResponse[]>([]);
  const [dmcComunas, setDmcComunas] = useState<DmcComunaTotalResponse[]>([]);
  const [ventanillaFuncionarios, setVentanillaFuncionarios] = useState<VentanillaFuncionarioPerformanceResponse[]>([]);
  const [ciudadanosFrecuentes, setCiudadanosFrecuentes] = useState<VentanillaFrequentCitizenResponse[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingExcel, setLoadingExcel] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState<SnackbarState>(initialSnackbar);

  const totalDays = getDaysBetween(form.fechaInicio, form.fechaFin);

  const hasReportData =
    Boolean(solicitudesPreview)
    || dmcEncuestadores.length > 0
    || dmcComunas.length > 0
    || ventanillaFuncionarios.length > 0
    || ciudadanosFrecuentes.length > 0;

  const loading = loadingPreview || loadingExcel || loadingPdf;

  const solicitudesRows = solicitudesPreview
    ? buildSolicitudRows(solicitudesPreview)
    : [];

  const solicitudesTotal = solicitudesPreview
    ? getSolicitudPreviewTotal(solicitudesPreview)
    : 0;

  const solicitudesBarData = solicitudesRows
    .slice(0, 14)
    .map((row) => ({
      nombre: row.solicitud,
      total: Number(row.totalGeneral ?? 0),
      label: formatNumber(Number(row.totalGeneral ?? 0)),
    }));

  const solicitudesPieData = solicitudesRows.map((row) => ({
    nombre: row.solicitud,
    total: Number(row.totalGeneral ?? 0),
    label: formatNumber(Number(row.totalGeneral ?? 0)),
  }));

  const solicitudesTrendData = (solicitudesTrend.length > 0
    ? solicitudesTrend
    : solicitudesPreview
      ? solicitudesPreview.fechas.map((fecha) => ({
          fecha,
          total: getSolicitudColumnTotal(solicitudesRows, fecha),
        }))
      : []
  ).map((row) => ({
    nombre: formatDateLabel(row.fecha),
    total: Number(row.total ?? 0),
    label: formatNumber(Number(row.total ?? 0)),
  }));

  const dmcEncuestadoresChartData = dmcEncuestadores
    .slice(0, 14)
    .map((row) => ({
      nombre: getDmcEncuestadorName(row),
      cumplimiento: Number(row.cumplimiento ?? 0),
      total: Number(row.total ?? 0),
      label: formatPercent(Number(row.cumplimiento ?? 0)),
    }));

  const dmcEncuestadoresOperationBarData = dmcEncuestadores
    .slice(0, 14)
    .map((row) => ({
      nombre: getDmcEncuestadorName(row),
      cargadas: Number(row.cargadas ?? 0),
      efectivas: Number(row.efectivas ?? 0),
      noEfectivas: Number(row.noEfectivas ?? 0),
    }));

  const dmcEncuestadoresPieData = buildDmcPerformancePieRows(dmcEncuestadores);

  const dmcComunasChartData = dmcComunas
    .slice(0, 14)
    .map((row) => ({
      nombre: getDmcComunaName(row),
      total: Number(row.total ?? 0),
      label: formatNumber(Number(row.total ?? 0)),
    }));

  const dmcComunasPieData = dmcComunas.map((row) => ({
    nombre: getDmcComunaName(row),
    total: Number(row.total ?? 0),
    label: formatNumber(Number(row.total ?? 0)),
  }));

  const ventanillaChartData = ventanillaFuncionarios
    .slice(0, 14)
    .map((row) => ({
      nombre: getFuncionarioName(row),
      total: Number(row.total ?? 0),
      label: formatNumber(Number(row.total ?? 0)),
    }));

  const ventanillaPieData = ventanillaFuncionarios.map((row) => ({
    nombre: getFuncionarioName(row),
    total: Number(row.total ?? 0),
    label: formatNumber(Number(row.total ?? 0)),
  }));

  const ciudadanosFrecuentesTotalVisitas = sumBy(ciudadanosFrecuentes, (row) => row.totalVisitas);
  const ciudadanosFrecuentesTotalSolicitudes = sumBy(ciudadanosFrecuentes, (row) => row.totalSolicitudes);
  const ciudadanoMasFrecuente = [...ciudadanosFrecuentes]
    .sort((a, b) => Number(b.totalVisitas ?? 0) - Number(a.totalVisitas ?? 0))[0];

  const ciudadanosFrecuentesBarData = ciudadanosFrecuentes
    .slice(0, 14)
    .map((row) => ({
      nombre: getFrequentCitizenChartName(row),
      total: Number(row.totalVisitas ?? 0),
      label: formatNumber(Number(row.totalVisitas ?? 0)),
    }));

  const ciudadanosFrecuentesSolicitudesData = ciudadanosFrecuentes
    .slice(0, 14)
    .map((row) => ({
      nombre: getFrequentCitizenChartName(row),
      total: Number(row.totalSolicitudes ?? 0),
      label: formatNumber(Number(row.totalSolicitudes ?? 0)),
    }));

  const ciudadanosFrecuentesPieData = ciudadanosFrecuentes.map((row) => ({
    nombre: getFrequentCitizenChartName(row),
    total: Number(row.totalVisitas ?? 0),
    label: formatNumber(Number(row.totalVisitas ?? 0)),
  }));

  const closeSnackbar = () => {
    setSnackbar(initialSnackbar);
  };

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

  const clearPreviewData = () => {
    setSolicitudesPreview(null);
    setSolicitudesTrend([]);
    setDmcEncuestadores([]);
    setDmcComunas([]);
    setVentanillaFuncionarios([]);
    setCiudadanosFrecuentes([]);
  };

  const updateForm = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));

    setError('');
    clearPreviewData();
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

    if (totalDays > MAX_RANGE_DAYS) {
      return 'El rango máximo permitido es de 5 años.';
    }

    return '';
  };

  const buildFilter = (): DateRange => ({
    fechaInicio: form.fechaInicio,
    fechaFin: form.fechaFin,
  });

  const clearForm = () => {
    setError('');
    setForm(initialForm);
    clearPreviewData();
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
      if (form.tipoReporte === 'VENTANILLA_SOLICITUDES') {
        const [previewResponse, trendResponse] = await Promise.all([
          previewVentanillaSolicitudes(filter),
          getVentanillaSolicitudesTrend(filter),
        ]);

        setSolicitudesPreview(previewResponse);
        setSolicitudesTrend(trendResponse);

        const rows = buildSolicitudRows(previewResponse);

        showSnackbar(
          rows.length ? 'Reporte detallado de solicitudes generado correctamente.' : 'No hay solicitudes para el periodo seleccionado.',
          rows.length ? 'success' : 'info'
        );
        return;
      }

      if (form.tipoReporte === 'CIUDADANOS_FRECUENTES') {
        const response = await getVentanillaFrequentCitizens(filter, 200);

        setCiudadanosFrecuentes(response);

        showSnackbar(
          response.length ? 'Reporte de ciudadanos frecuentes generado correctamente.' : 'No hay ciudadanos frecuentes para el periodo seleccionado.',
          response.length ? 'success' : 'info'
        );
        return;
      }

      if (form.tipoReporte === 'DMC_ENCUESTADORES') {
        const response = await getDmcEncuestadoresDesempeno(filter);

        setDmcEncuestadores(response);

        showSnackbar(
          response.length ? 'Reporte DMC por encuestador generado correctamente.' : 'No hay datos para el periodo seleccionado.',
          response.length ? 'success' : 'info'
        );
        return;
      }

      if (form.tipoReporte === 'DMC_COMUNAS') {
        const response = await getDmcComunasTotales(filter);

        setDmcComunas(response);

        showSnackbar(
          response.length ? 'Reporte DMC por comuna/zona generado correctamente.' : 'No hay datos para el periodo seleccionado.',
          response.length ? 'success' : 'info'
        );
        return;
      }

      if (form.tipoReporte === 'VENTANILLA_FUNCIONARIOS') {
        const response = await getVentanillaFuncionariosDesempeno(filter);

        setVentanillaFuncionarios(response);

        showSnackbar(
          response.length ? 'Reporte de ventanilla por funcionario generado correctamente.' : 'No hay datos para el periodo seleccionado.',
          response.length ? 'success' : 'info'
        );
        return;
      }

      if (form.tipoReporte === 'EJECUTIVO_DMC') {
        const [encuestadoresResponse, comunasResponse] = await Promise.all([
          getDmcEncuestadoresDesempeno(filter),
          getDmcComunasTotales(filter),
        ]);

        setDmcEncuestadores(encuestadoresResponse);
        setDmcComunas(comunasResponse);

        showSnackbar(
          encuestadoresResponse.length || comunasResponse.length
            ? 'Informe ejecutivo DMC generado correctamente.'
            : 'No hay datos para el periodo seleccionado.',
          encuestadoresResponse.length || comunasResponse.length ? 'success' : 'info'
        );
        return;
      }

      const response = await getVentanillaFuncionariosDesempeno(filter);

      setVentanillaFuncionarios(response);

      showSnackbar(
        response.length ? 'Informe ejecutivo de ventanilla generado correctamente.' : 'No hay datos para el periodo seleccionado.',
        response.length ? 'success' : 'info'
      );
    } catch (err) {
      const message = err instanceof ApiClientError
        ? err.message
        : err instanceof Error
          ? err.message
          : 'No fue posible generar la previsualización.';

      setError(message);
      showSnackbar(message, 'error');
    } finally {
      setLoadingPreview(false);
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

      appendJsonSheet(
        workbook,
        'Resumen',
        [
          { Campo: 'Reporte', Valor: getReportTitle(form.tipoReporte) },
          { Campo: 'Fecha inicio', Valor: formatDateLabel(form.fechaInicio) },
          { Campo: 'Fecha fin', Valor: formatDateLabel(form.fechaFin) },
          { Campo: 'Rango en días', Valor: totalDays },
        ],
        [24, 48]
      );

      if (form.tipoReporte === 'VENTANILLA_SOLICITUDES' && solicitudesPreview) {
        appendJsonSheet(
          workbook,
          'Solicitudes por tipo',
          toVentanillaSolicitudesExcelRows(solicitudesPreview),
          [36, ...solicitudesPreview.fechas.map(() => 14), 18, 16]
        );

        appendJsonSheet(
          workbook,
          'Tendencia diaria',
          toVentanillaSolicitudesTrendExcelRows(solicitudesTrend),
          [18, 18]
        );
      }

      if (form.tipoReporte === 'CIUDADANOS_FRECUENTES') {
        appendJsonSheet(
          workbook,
          'Ciudadanos frecuentes',
          toCiudadanosFrecuentesExcelRows(ciudadanosFrecuentes),
          [8, 34, 18, 18, 16, 18, 18]
        );
      }

      if (form.tipoReporte === 'DMC_ENCUESTADORES' || form.tipoReporte === 'EJECUTIVO_DMC') {
        appendJsonSheet(
          workbook,
          'DMC encuestadores',
          toDmcEncuestadoresExcelRows(dmcEncuestadores),
          [8, 36, 14, 14, 16, 18, 16, 14]
        );
      }

      if (form.tipoReporte === 'DMC_COMUNAS' || form.tipoReporte === 'EJECUTIVO_DMC') {
        appendJsonSheet(
          workbook,
          'DMC comunas',
          toDmcComunasExcelRows(dmcComunas),
          [8, 32, 18, 14, 16, 14]
        );
      }

      if (form.tipoReporte === 'VENTANILLA_FUNCIONARIOS' || form.tipoReporte === 'EJECUTIVO_VENTANILLA') {
        appendJsonSheet(
          workbook,
          'Ventanilla funcionarios',
          toVentanillaFuncionariosExcelRows(ventanillaFuncionarios),
          [8, 34, 22, 18, 18]
        );
      }

      XLSX.writeFile(
        workbook,
        buildFileName(form.tipoReporte, form.fechaInicio, form.fechaFin, 'xlsx')
      );

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

    setLoadingPdf(true);
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
        title: buildFileName(form.tipoReporte, form.fechaInicio, form.fechaFin, 'pdf'),
        subject: 'Reporte generado desde AppSisbén',
        creator: 'AppSisbén Valledupar',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const contentX = PDF_MARGIN_MM;
      const contentY = PDF_MARGIN_MM + PDF_HEADER_HEIGHT_MM;
      const contentWidth = pageWidth - PDF_MARGIN_MM * 2;
      const contentHeight = pageHeight
        - PDF_MARGIN_MM * 2
        - PDF_HEADER_HEIGHT_MM
        - PDF_FOOTER_HEIGHT_MM;

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
          PDF_RENDER_WIDTH_PX,
          section.scrollWidth,
          section.offsetWidth
        );

        const canvas = await html2canvas(section, {
          scale: PDF_CANVAS_SCALE,
          backgroundColor: '#ffffff',
          useCORS: true,
          logging: false,
          windowWidth: renderWidth,
          windowHeight: Math.max(section.scrollHeight, 760),
          onclone: (clonedDocument) => {
            addPdfCloneStyles(clonedDocument, renderWidth);
          },
        });

        if (!canvas.width || !canvas.height) {
          continue;
        }

        const pxPerMm = canvas.width / contentWidth;
        const maxSliceHeightPx = Math.max(1, Math.floor(contentHeight * pxPerMm));

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

      pdf.save(buildFileName(form.tipoReporte, form.fechaInicio, form.fechaFin, 'pdf'));
      showSnackbar('Reporte PDF exportado correctamente.', 'success');
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : 'No fue posible exportar el reporte PDF.';

      setError(message);
      showSnackbar(message, 'error');
    } finally {
      setLoadingPdf(false);
    }
  };

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
                Genera reportes DMC y Ventanilla con tablas oficiales, Excel y PDF ejecutivo.
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
                {loadingPdf ? 'Exportando...' : 'Generar PDF'}
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
                Selecciona el reporte que deseas generar y el rango de fechas.
              </Typography>
            </Box>

            <Divider />

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  md: 'minmax(260px, 420px) 220px 220px',
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
                <MenuItem value="VENTANILLA_SOLICITUDES">
                  Ventanilla - Solicitudes por tipo y día
                </MenuItem>

                <MenuItem value="CIUDADANOS_FRECUENTES">
                  Ventanilla - Ciudadanos frecuentes
                </MenuItem>

                <MenuItem value="DMC_ENCUESTADORES">
                  DMC - Indicadores por encuestador
                </MenuItem>

                <MenuItem value="DMC_COMUNAS">
                  DMC - Totales por comuna / zona
                </MenuItem>

                <MenuItem value="VENTANILLA_FUNCIONARIOS">
                  Ventanilla - Desempeño por funcionario
                </MenuItem>

                <MenuItem value="EJECUTIVO_DMC">
                  Ejecutivo DMC - Desempeño de encuestadores
                </MenuItem>

                <MenuItem value="EJECUTIVO_VENTANILLA">
                  Ejecutivo Ventanilla - Atención por funcionario
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
              Reporte seleccionado:
              {' '}
              <strong>{getReportTitle(form.tipoReporte)}</strong>
              {' '}
              · Rango actual:
              {' '}
              <strong>{totalDays}</strong>
              {' '}
              día(s).
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
                {loadingPdf ? 'Exportando...' : 'Generar PDF'}
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

      <Box ref={reportContentRef}>
        {hasReportData ? (
          <Box sx={{ mb: 3 }}>
            <ReportHeader
              title={getReportTitle(form.tipoReporte)}
              description={getReportDescription(form.tipoReporte)}
              fechaInicio={form.fechaInicio}
              fechaFin={form.fechaFin}
            />
          </Box>
        ) : null}

        {form.tipoReporte === 'VENTANILLA_SOLICITUDES' && solicitudesPreview ? (
          <Stack spacing={3}>
            <Box
              className="report-export-section"
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  md: 'repeat(3, 1fr)',
                },
                gap: 2,
              }}
            >
              <KpiCard title="Total solicitudes" value={solicitudesTotal} />
              <KpiCard title="Tipos de solicitud" value={solicitudesRows.length} color="info" />
              <KpiCard title="Días del periodo" value={solicitudesPreview.fechas.length} color="success" />
            </Box>

            <HorizontalBarChart
              title="Diagrama de barras por tipo de solicitud"
              description="Permite identificar los tipos de solicitud con mayor volumen en el periodo."
              data={solicitudesBarData}
              dataKey="total"
              label="Total solicitudes"
            />

            <LineTrendChart
              title="Línea de tendencia diaria"
              description="Muestra el comportamiento diario del total de solicitudes registradas."
              data={solicitudesTrendData}
              dataKey="total"
              label="Solicitudes"
            />

            <PieReportChart
              title="Diagrama de torta por participación de solicitud"
              description="Participación porcentual de cada tipo de solicitud sobre el total general."
              data={solicitudesPieData}
            />

            <VentanillaSolicitudesDetailedTable preview={solicitudesPreview} />
          </Stack>
        ) : null}

        {form.tipoReporte === 'CIUDADANOS_FRECUENTES' && ciudadanosFrecuentes.length > 0 ? (
          <Stack spacing={3}>
            <CiudadanosFrecuentesSummaryCard rows={ciudadanosFrecuentes} />

            <CiudadanosFrecuentesTable rows={ciudadanosFrecuentes} />

            <HorizontalBarChart
              title="Diagrama de barras por total de visitas"
              description="Ranking de ciudadanos con mayor número de visitas durante el periodo."
              data={ciudadanosFrecuentesBarData}
              dataKey="total"
              label="Total visitas"
            />

            <PieReportChart
              title="Diagrama de torta por participación de visitas"
              description="Participación de cada ciudadano frecuente sobre el total de visitas del periodo."
              data={ciudadanosFrecuentesPieData}
            />

            <LineTrendChart
              title="Línea comparativa de solicitudes por ciudadano"
              description="Comparativo del total de solicitudes registradas por ciudadano frecuente."
              data={ciudadanosFrecuentesSolicitudesData}
              dataKey="total"
              label="Total solicitudes"
            />
          </Stack>
        ) : null}

        {form.tipoReporte === 'DMC_ENCUESTADORES' && dmcEncuestadores.length > 0 ? (
          <Stack spacing={3}>
            <GroupedBarChart
              title="Diagrama de barras - Cargadas, efectivas y no efectivas"
              description="Comparativo operativo por encuestador."
              data={dmcEncuestadoresOperationBarData}
              series={[
                { dataKey: 'cargadas', label: 'Cargadas', color: '#0066CC' },
                { dataKey: 'efectivas', label: 'Efectivas', color: '#2E7D32' },
                { dataKey: 'noEfectivas', label: 'No efectivas', color: '#E30613' },
              ]}
            />

            <LineTrendChart
              title="Línea de cumplimiento por encuestador"
              description="Comportamiento comparativo del porcentaje de cumplimiento."
              data={dmcEncuestadoresChartData}
              dataKey="cumplimiento"
              label="Cumplimiento"
              valueSuffix=" %"
            />

            <PieReportChart
              title="Diagrama de torta por nivel de desempeño"
              description="Distribución de encuestadores clasificados como desempeño alto, medio o bajo."
              data={dmcEncuestadoresPieData}
            />

            <DmcEncuestadoresTable rows={dmcEncuestadores} />
          </Stack>
        ) : null}

        {form.tipoReporte === 'DMC_COMUNAS' && dmcComunas.length > 0 ? (
          <Stack spacing={3}>
            <HorizontalBarChart
              title="Diagrama de barras por comuna / zona"
              description="Comunas o zonas con mayor concentración de registros DMC."
              data={dmcComunasChartData}
              dataKey="total"
              label="Total registros"
            />

            <LineTrendChart
              title="Línea comparativa por comuna / zona"
              description="Comportamiento comparativo de los totales territoriales."
              data={dmcComunasChartData}
              dataKey="total"
              label="Total registros"
            />

            <PieReportChart
              title="Diagrama de torta por participación territorial"
              description="Participación de cada comuna o zona sobre el total DMC."
              data={dmcComunasPieData}
            />

            <DmcComunasTable rows={dmcComunas} />
          </Stack>
        ) : null}

        {form.tipoReporte === 'VENTANILLA_FUNCIONARIOS' && ventanillaFuncionarios.length > 0 ? (
          <Stack spacing={3}>
            <HorizontalBarChart
              title="Diagrama de barras por funcionario"
              description="Comparativo del volumen de solicitudes atendidas."
              data={ventanillaChartData}
              dataKey="total"
              label="Solicitudes atendidas"
            />

            <LineTrendChart
              title="Línea comparativa de solicitudes atendidas"
              description="Comportamiento comparativo del total de solicitudes por funcionario."
              data={ventanillaChartData}
              dataKey="total"
              label="Solicitudes atendidas"
            />

            <PieReportChart
              title="Diagrama de torta por participación de funcionario"
              description="Participación de cada funcionario sobre el total de solicitudes atendidas."
              data={ventanillaPieData}
            />

            <VentanillaFuncionariosTable rows={ventanillaFuncionarios} />
          </Stack>
        ) : null}

        {form.tipoReporte === 'EJECUTIVO_DMC' && (dmcEncuestadores.length > 0 || dmcComunas.length > 0) ? (
          <Stack spacing={3}>
            <ExecutiveSummaryDmc rows={dmcEncuestadores} comunas={dmcComunas} />

            <GroupedBarChart
              title="Diagrama de barras - Cargadas, efectivas y no efectivas"
              description="Comparativo operativo por encuestador."
              data={dmcEncuestadoresOperationBarData}
              series={[
                { dataKey: 'cargadas', label: 'Cargadas', color: '#0066CC' },
                { dataKey: 'efectivas', label: 'Efectivas', color: '#2E7D32' },
                { dataKey: 'noEfectivas', label: 'No efectivas', color: '#E30613' },
              ]}
            />

            <LineTrendChart
              title="Línea de cumplimiento por encuestador"
              description="Comportamiento comparativo del porcentaje de cumplimiento."
              data={dmcEncuestadoresChartData}
              dataKey="cumplimiento"
              label="Cumplimiento"
              valueSuffix=" %"
            />

            <PieReportChart
              title="Diagrama de torta por nivel de desempeño"
              description="Distribución de encuestadores clasificados como desempeño alto, medio o bajo."
              data={dmcEncuestadoresPieData}
            />

            <DmcEncuestadoresTable rows={dmcEncuestadores} />

            <HorizontalBarChart
              title="Distribución territorial por total"
              description="Comunas o zonas con mayor concentración de registros."
              data={dmcComunasChartData}
              dataKey="total"
              label="Total"
            />

            <LineTrendChart
              title="Línea comparativa territorial"
              description="Comportamiento comparativo de los totales por comuna o zona."
              data={dmcComunasChartData}
              dataKey="total"
              label="Total"
            />

            <PieReportChart
              title="Diagrama de torta por participación territorial"
              description="Participación de cada comuna o zona sobre el total DMC."
              data={dmcComunasPieData}
            />

            <DmcComunasTable rows={dmcComunas} />

            <RecommendationsCard type="DMC" />
          </Stack>
        ) : null}

        {form.tipoReporte === 'EJECUTIVO_VENTANILLA' && ventanillaFuncionarios.length > 0 ? (
          <Stack spacing={3}>
            <ExecutiveSummaryVentanilla rows={ventanillaFuncionarios} />

            <HorizontalBarChart
              title="Solicitudes atendidas por funcionario"
              description="Comparativo del volumen de solicitudes atendidas durante el periodo."
              data={ventanillaChartData}
              dataKey="total"
              label="Solicitudes atendidas"
            />

            <LineTrendChart
              title="Línea comparativa de solicitudes atendidas"
              description="Comportamiento comparativo del total de solicitudes por funcionario."
              data={ventanillaChartData}
              dataKey="total"
              label="Solicitudes atendidas"
            />

            <PieReportChart
              title="Diagrama de torta por participación de funcionario"
              description="Participación de cada funcionario sobre el total de solicitudes atendidas."
              data={ventanillaPieData}
            />

            <VentanillaFuncionariosTable rows={ventanillaFuncionarios} />

            <RecommendationsCard type="VENTANILLA" />
          </Stack>
        ) : null}
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4500}
        onClose={closeSnackbar}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
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
