'use client';

import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import PreviewIcon from '@mui/icons-material/Preview';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import TableChartIcon from '@mui/icons-material/TableChart';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  MenuItem,
  Paper,
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
import { useState } from 'react';
import * as XLSX from 'xlsx';

import DateRangeToolbar from '@/components/dashboard/DateRangeToolbar';
import { PageTitle } from '@/components/dashboard/ReportCharts';
import SectionCard from '@/components/dashboard/SectionCard';
import { AccessMessage } from '@/components/dashboard/States';
import { ApiClientError } from '@/lib/apiClient';
import {
  exportDmc,
  exportDmcReport,
  exportVentanilla,
  exportVentanillaReport,
  previewExportDmc,
  previewExportVentanilla,
} from '@/services/export.service';
import {
  getDmcGroup,
  getDmcSummary,
  getVentanillaEmployeeProductivity,
  getVentanillaFrequentCitizens,
  getVentanillaFuncionariosDesempeno as getVentanillaFuncionariosPerformance,
  getVentanillaGroup,
  getVentanillaSummary,
} from '@/services/report.service';
import { ExportOptionType } from '@/types/export.types';
import {
  ProductivityGrouping,
  ReportDateRange,
  ReportGroupResponse,
} from '@/types/report.types';

type PreviewCell = string | number | boolean | null;

type PreviewRow = Record<string, PreviewCell>;

type PreviewColumn = {
  key: string;
  label: string;
  minWidth?: number;
  align?: 'left' | 'center' | 'right';
};

type PreviewResult = {
  title: string;
  subtitle: string;
  columns: PreviewColumn[];
  rows: PreviewRow[];
  totalRecords: number;
  helper?: string;
};

type ExportOptionConfig = {
  value: ExportOptionType;
  label: string;
  description: string;
  category: 'Listado operativo' | 'Reporte consolidado';
  officialBackendDownload: boolean;
};

const PREVIEW_LIMIT = 200;

const exportOptions: ExportOptionConfig[] = [
  {
    value: 'VENTANILLA_REGISTROS',
    label: 'Registros de Ventanilla',
    description: 'Listado operativo detallado de registros de ventanilla.',
    category: 'Listado operativo',
    officialBackendDownload: true,
  },
  {
    value: 'DMC_REGISTROS',
    label: 'Registros DMC',
    description: 'Listado operativo detallado de registros DMC.',
    category: 'Listado operativo',
    officialBackendDownload: true,
  },
  {
    value: 'VENTANILLA_REPORTE',
    label: 'Reporte consolidado Ventanilla',
    description: 'Libro Excel con resumen, estados, solicitudes, funcionarios, barrios y comunas.',
    category: 'Reporte consolidado',
    officialBackendDownload: true,
  },
  {
    value: 'DMC_REPORTE',
    label: 'Reporte consolidado DMC',
    description: 'Libro Excel con resumen e indicadores principales de DMC.',
    category: 'Reporte consolidado',
    officialBackendDownload: true,
  },
  {
    value: 'SOLICITUDES_TIPO',
    label: 'Solicitudes por ventanilla',
    description: 'Consolidado por tipo de solicitud de Ventanilla.',
    category: 'Reporte consolidado',
    officialBackendDownload: false,
  },
  {
    value: 'DESEMPENO_FUNCIONARIOS',
    label: 'Desempeño por funcionario',
    description: 'Total, porcentaje y promedio diario por funcionario.',
    category: 'Reporte consolidado',
    officialBackendDownload: false,
  },
  {
    value: 'PRODUCTIVIDAD_FUNCIONARIOS',
    label: 'Productividad por funcionario',
    description: 'Productividad semanal o mensual por funcionario.',
    category: 'Reporte consolidado',
    officialBackendDownload: false,
  },
  {
    value: 'CIUDADANOS_FRECUENTES',
    label: 'Ciudadanos frecuentes',
    description: 'Ciudadanos con más visitas y trámites en el periodo.',
    category: 'Reporte consolidado',
    officialBackendDownload: false,
  },
  {
    value: 'TOTALES_COMUNA',
    label: 'Totales por comuna',
    description: 'Consolidado territorial de Ventanilla y DMC por comuna.',
    category: 'Reporte consolidado',
    officialBackendDownload: false,
  },
];

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function getMonthStartDate() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
}

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

function formatNumber(value: number) {
  return new Intl.NumberFormat('es-CO').format(value);
}

function formatPercent(value: number) {
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

function getPercentage(value: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return (value * 100) / total;
}

function getSelectedOption(type: ExportOptionType) {
  return exportOptions.find((option) => option.value === type) ?? exportOptions[0];
}

function normalizeSheetName(name: string) {
  return name
    .replace(/[\\/?*:[\]]/g, ' ')
    .trim()
    .slice(0, 31) || 'Exportación';
}

function buildExcelFilename(type: ExportOptionType, fechaInicio: string, fechaFin: string) {
  const option = getSelectedOption(type);
  const safeName = option.label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

  return `exportacion-${safeName}-${fechaInicio}-a-${fechaFin}.xlsx`;
}

function getGroupName(item: ReportGroupResponse) {
  return item.nombre || item.codigo || 'Sin clasificar';
}

function getGroupTotal(data: ReportGroupResponse[]) {
  return data.reduce((sum, item) => sum + Number(item.total ?? 0), 0);
}

function groupRowsToPreview(section: string, data: ReportGroupResponse[]) {
  const total = getGroupTotal(data);

  return data.map((item, index) => {
    const itemTotal = Number(item.total ?? 0);

    return {
      ranking: index + 1,
      seccion: section,
      codigo: item.codigo || '',
      nombre: getGroupName(item),
      total: itemTotal,
      porcentaje: `${formatPercent(getPercentage(itemTotal, total))} %`,
    };
  });
}

function summaryRowsToPreview(section: string, data: Record<string, number>) {
  return Object.entries(data).map(([name, value], index) => ({
    ranking: index + 1,
    seccion: section,
    codigo: '',
    nombre: name,
    total: value,
    porcentaje: '',
  }));
}

function buildWorkbookFromPreview(preview: PreviewResult) {
  const workbook = XLSX.utils.book_new();

  const rows = preview.rows.length
    ? preview.rows.map((row) => {
        const excelRow: Record<string, PreviewCell> = {};

        preview.columns.forEach((column) => {
          excelRow[column.label] = row[column.key] ?? '';
        });

        return excelRow;
      })
    : [{ Mensaje: 'No hay datos para exportar' }];

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = preview.columns.map((column) => ({
    wch: Math.max(14, Math.min(42, Math.floor((column.minWidth ?? 160) / 8))),
  }));

  XLSX.utils.book_append_sheet(workbook, worksheet, normalizeSheetName(preview.title));

  const metadata = XLSX.utils.json_to_sheet([
    {
      Reporte: preview.title,
      Descripción: preview.subtitle,
      Registros: preview.totalRecords,
      Nota: preview.helper || '',
    },
  ]);
  XLSX.utils.book_append_sheet(workbook, metadata, 'Resumen');

  return workbook;
}

function createPreviewColumns(keys: PreviewColumn[]) {
  return keys;
}

export default function ExportacionesPage() {
  const [fechaInicio, setFechaInicio] = useState(getMonthStartDate());
  const [fechaFin, setFechaFin] = useState(getTodayDate());
  const [exportType, setExportType] = useState<ExportOptionType>('VENTANILLA_REGISTROS');
  const [grouping, setGrouping] = useState<ProductivityGrouping>('SEMANAL');
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingDownload, setLoadingDownload] = useState(false);
  const [restricted, setRestricted] = useState(false);
  const [error, setError] = useState('');

  const loading = loadingPreview || loadingDownload;
  const selectedOption = getSelectedOption(exportType);

  const filter: ReportDateRange = {
    fechaInicio,
    fechaFin,
  };

  function validateFilters() {
    if (!fechaInicio) {
      return 'La fecha inicio es obligatoria.';
    }

    if (!fechaFin) {
      return 'La fecha fin es obligatoria.';
    }

    if (fechaFin < fechaInicio) {
      return 'La fecha fin no puede ser menor que la fecha inicio.';
    }

    return '';
  }

  function resetFeedback() {
    setRestricted(false);
    setError('');
  }

  async function loadPreviewData(): Promise<PreviewResult> {
    if (exportType === 'VENTANILLA_REGISTROS') {
      const data = await previewExportVentanilla(filter, PREVIEW_LIMIT);

      return {
        title: 'Registros de Ventanilla',
        subtitle: 'Vista previa de registros operativos de Ventanilla según el rango de fechas.',
        totalRecords: data.length,
        helper: `Vista previa limitada a ${PREVIEW_LIMIT} registros. La descarga exporta todos los registros del filtro aplicado.`,
        columns: createPreviewColumns([
          { key: 'id', label: 'ID', minWidth: 90, align: 'center' },
          { key: 'fecha', label: 'Fecha', minWidth: 120, align: 'center' },
          { key: 'numeroVentanilla', label: 'N° Ventanilla', minWidth: 150 },
          { key: 'cedulaUsuario', label: 'Cédula', minWidth: 150 },
          { key: 'nombreUsuario', label: 'Ciudadano', minWidth: 230 },
          { key: 'telefono', label: 'Teléfono', minWidth: 140 },
          { key: 'solicitudNombre', label: 'Solicitud', minWidth: 260 },
          { key: 'categoriaNombre', label: 'Categoría', minWidth: 180 },
          { key: 'estadoSolicitudNombre', label: 'Estado solicitud', minWidth: 170 },
          { key: 'barrioNombre', label: 'Barrio', minWidth: 170 },
          { key: 'comunaNombre', label: 'Comuna', minWidth: 170 },
          { key: 'funcionarioUsername', label: 'Funcionario', minWidth: 170 },
          { key: 'extranjero', label: 'Extranjero', minWidth: 120, align: 'center' },
          { key: 'estadoRegistro', label: 'Estado registro', minWidth: 150, align: 'center' },
          { key: 'observacion', label: 'Observación', minWidth: 260 },
        ]),
        rows: data.map((item) => ({
          ...item,
          fecha: formatDateLabel(item.fecha),
          extranjero: item.extranjero ? 'Sí' : 'No',
        })),
      };
    }

    if (exportType === 'DMC_REGISTROS') {
      const data = await previewExportDmc(filter, PREVIEW_LIMIT);

      return {
        title: 'Registros DMC',
        subtitle: 'Vista previa de registros operativos DMC según el rango de fechas.',
        totalRecords: data.length,
        helper: `Vista previa limitada a ${PREVIEW_LIMIT} registros. La descarga exporta todos los registros del filtro aplicado.`,
        columns: createPreviewColumns([
          { key: 'id', label: 'ID', minWidth: 90, align: 'center' },
          { key: 'fecha', label: 'Fecha', minWidth: 120, align: 'center' },
          { key: 'funcionarioUsername', label: 'Funcionario', minWidth: 180 },
          { key: 'tipoDmcCodigo', label: 'Tipo código', minWidth: 130 },
          { key: 'tipoDmcNombre', label: 'Tipo DMC', minWidth: 230 },
          { key: 'encuestadorNombre', label: 'Encuestador', minWidth: 220 },
          { key: 'cantidad', label: 'Cantidad', minWidth: 120, align: 'right' },
          { key: 'barrioNombre', label: 'Barrio', minWidth: 170 },
          { key: 'comunaNombre', label: 'Comuna', minWidth: 170 },
          { key: 'observacion', label: 'Observación', minWidth: 260 },
        ]),
        rows: data.map((item) => ({
          ...item,
          fecha: formatDateLabel(item.fecha),
        })),
      };
    }

    if (exportType === 'VENTANILLA_REPORTE') {
      const [summary, byStatus, byRequestType, byUser, byComuna] = await Promise.all([
        getVentanillaSummary(filter),
        getVentanillaGroup('by-status', filter),
        getVentanillaGroup('by-request-type', filter),
        getVentanillaGroup('by-user', filter),
        getVentanillaGroup('by-comuna', filter),
      ]);

      const rows = [
        ...summaryRowsToPreview('Resumen', {
          'Total registros': summary.totalRegistros,
          Pendientes: summary.pendientes,
          Realizadas: summary.realizadas,
          Aprobadas: summary.aprobadas,
          Rechazadas: summary.rechazadas,
          Canceladas: summary.canceladas,
          Revisar: summary.revisar,
          Extranjeros: summary.extranjeros,
          Nacionales: summary.nacionales,
        }),
        ...groupRowsToPreview('Por estado', byStatus),
        ...groupRowsToPreview('Por solicitud', byRequestType),
        ...groupRowsToPreview('Por funcionario', byUser),
        ...groupRowsToPreview('Por comuna', byComuna),
      ];

      return {
        title: 'Reporte consolidado Ventanilla',
        subtitle: 'Vista previa resumida del libro Excel consolidado de Ventanilla.',
        totalRecords: rows.length,
        helper: 'La descarga oficial genera un libro Excel con varias hojas de indicadores.',
        columns: createPreviewColumns([
          { key: 'ranking', label: '#', minWidth: 70, align: 'center' },
          { key: 'seccion', label: 'Sección', minWidth: 180 },
          { key: 'codigo', label: 'Código', minWidth: 130 },
          { key: 'nombre', label: 'Nombre / indicador', minWidth: 280 },
          { key: 'total', label: 'Total', minWidth: 120, align: 'right' },
          { key: 'porcentaje', label: '%', minWidth: 100, align: 'center' },
        ]),
        rows,
      };
    }

    if (exportType === 'DMC_REPORTE') {
      const [summary, byComuna] = await Promise.all([
        getDmcSummary(filter),
        getDmcGroup('by-comuna', filter),
      ]);

      const rows = [
        ...summaryRowsToPreview('Resumen', {
          'Total registros': summary.totalRegistros,
          'Total cantidad': summary.totalCantidad,
          'Total cargadas': summary.totalCargadas,
          'Total descargadas': summary.totalDescargadas,
          'Total rechazadas': summary.totalRechazadas,
        }),
        ...groupRowsToPreview('Por comuna', byComuna),
      ];

      return {
        title: 'Reporte consolidado DMC',
        subtitle: 'Vista previa resumida del libro Excel consolidado de DMC.',
        totalRecords: rows.length,
        helper: 'La descarga oficial genera un libro Excel con varias hojas de indicadores.',
        columns: createPreviewColumns([
          { key: 'ranking', label: '#', minWidth: 70, align: 'center' },
          { key: 'seccion', label: 'Sección', minWidth: 180 },
          { key: 'codigo', label: 'Código', minWidth: 130 },
          { key: 'nombre', label: 'Nombre / indicador', minWidth: 280 },
          { key: 'total', label: 'Total', minWidth: 120, align: 'right' },
          { key: 'porcentaje', label: '%', minWidth: 100, align: 'center' },
        ]),
        rows,
      };
    }

    if (exportType === 'SOLICITUDES_TIPO') {
      const data = await getVentanillaGroup('by-request-type', filter);
      const rows = groupRowsToPreview('Solicitudes por tipo', data);

      return {
        title: 'Solicitudes por tipo',
        subtitle: 'Consolidado de Ventanilla por tipo de solicitud.',
        totalRecords: rows.length,
        columns: createPreviewColumns([
          { key: 'ranking', label: '#', minWidth: 70, align: 'center' },
          { key: 'nombre', label: 'Tipo de solicitud', minWidth: 320 },
          { key: 'total', label: 'Total', minWidth: 130, align: 'right' },
          { key: 'porcentaje', label: '%', minWidth: 120, align: 'center' },
        ]),
        rows,
      };
    }

    if (exportType === 'DESEMPENO_FUNCIONARIOS') {
      const data = await getVentanillaFuncionariosPerformance({
        fechaInicio,
        fechaFin,
      });

      return {
        title: 'Desempeño por funcionario',
        subtitle: 'Total, porcentaje y promedio diario por funcionario.',
        totalRecords: data.length,
        columns: createPreviewColumns([
          { key: 'ranking', label: '#', minWidth: 70, align: 'center' },
          { key: 'funcionarioUsername', label: 'Funcionario', minWidth: 260 },
          { key: 'total', label: 'Total', minWidth: 130, align: 'right' },
          { key: 'porcentaje', label: '%', minWidth: 120, align: 'center' },
          { key: 'promedioDiario', label: 'Promedio diario', minWidth: 160, align: 'right' },
        ]),
        rows: data.map((item, index) => ({
          ranking: index + 1,
          funcionarioUsername: item.funcionarioUsername || 'Sin funcionario',
          total: item.total,
          porcentaje: `${formatPercent(item.porcentaje)} %`,
          promedioDiario: formatPercent(item.promedioDiario),
        })),
      };
    }

    if (exportType === 'PRODUCTIVIDAD_FUNCIONARIOS') {
      const data = await getVentanillaEmployeeProductivity(filter, grouping);

      return {
        title: 'Productividad por funcionario',
        subtitle: `Productividad ${grouping === 'MENSUAL' ? 'mensual' : 'semanal'} por funcionario.`,
        totalRecords: data.length,
        columns: createPreviewColumns([
          { key: 'periodo', label: 'Periodo', minWidth: 160 },
          { key: 'fechaInicioPeriodo', label: 'Inicio periodo', minWidth: 140, align: 'center' },
          { key: 'fechaFinPeriodo', label: 'Fin periodo', minWidth: 140, align: 'center' },
          { key: 'funcionarioUsername', label: 'Funcionario', minWidth: 260 },
          { key: 'totalAtenciones', label: 'Total atenciones', minWidth: 160, align: 'right' },
          { key: 'porcentaje', label: '% periodo', minWidth: 120, align: 'center' },
          { key: 'promedioDiario', label: 'Promedio diario', minWidth: 160, align: 'right' },
        ]),
        rows: data.map((item) => ({
          periodo: item.periodo,
          fechaInicioPeriodo: formatDateLabel(item.fechaInicioPeriodo),
          fechaFinPeriodo: formatDateLabel(item.fechaFinPeriodo),
          funcionarioUsername: item.funcionarioUsername || 'Sin funcionario',
          totalAtenciones: item.totalAtenciones,
          porcentaje: `${formatPercent(item.porcentaje)} %`,
          promedioDiario: formatPercent(item.promedioDiario),
        })),
      };
    }

    if (exportType === 'CIUDADANOS_FRECUENTES') {
      const data = await getVentanillaFrequentCitizens(filter, 200);
      const totalVisitas = data.reduce((sum, item) => sum + Number(item.totalVisitas ?? 0), 0);

      return {
        title: 'Ciudadanos frecuentes',
        subtitle: 'Ciudadanos con mayor cantidad de visitas y trámites en el periodo.',
        totalRecords: data.length,
        columns: createPreviewColumns([
          { key: 'ranking', label: '#', minWidth: 70, align: 'center' },
          { key: 'cedulaUsuario', label: 'Cédula', minWidth: 150 },
          { key: 'nombreUsuario', label: 'Ciudadano', minWidth: 260 },
          { key: 'telefono', label: 'Teléfono', minWidth: 150 },
          { key: 'totalVisitas', label: 'Total visitas', minWidth: 140, align: 'right' },
          { key: 'primeraVisita', label: 'Primera visita', minWidth: 140, align: 'center' },
          { key: 'ultimaVisita', label: 'Última visita', minWidth: 140, align: 'center' },
        ]),
        rows: data.map((item, index) => ({
          ranking: index + 1,
          cedulaUsuario: item.cedulaUsuario,
          nombreUsuario: item.nombreUsuario || 'Sin nombre',
          telefono: item.telefono || '',
          totalVisitas: item.totalVisitas,
          totalSolicitudes: item.totalSolicitudes,
          participacion: `${formatPercent(getPercentage(Number(item.totalVisitas ?? 0), totalVisitas))} %`,
          primeraVisita: formatDateLabel(item.primeraVisita),
          ultimaVisita: formatDateLabel(item.ultimaVisita),
        })),
      };
    }

    const [ventanillaComunas, dmcComunas] = await Promise.all([
      getVentanillaGroup('by-comuna', filter),
      getDmcGroup('by-comuna', filter),
    ]);

    const rows = [
      ...groupRowsToPreview('Ventanilla por comuna', ventanillaComunas),
      ...groupRowsToPreview('DMC por comuna', dmcComunas),
    ];

    return {
      title: 'Totales por comuna',
      subtitle: 'Consolidado territorial de Ventanilla y DMC por comuna.',
      totalRecords: rows.length,
      columns: createPreviewColumns([
        { key: 'ranking', label: '#', minWidth: 70, align: 'center' },
        { key: 'seccion', label: 'Módulo', minWidth: 180 },
        { key: 'codigo', label: 'Código', minWidth: 130 },
        { key: 'nombre', label: 'Comuna', minWidth: 260 },
        { key: 'total', label: 'Total', minWidth: 130, align: 'right' },
        { key: 'porcentaje', label: '%', minWidth: 120, align: 'center' },
      ]),
      rows,
    };
  }

  async function handlePreview() {
    resetFeedback();

    const validationMessage = validateFilters();

    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setLoadingPreview(true);
    setPreview(null);

    try {
      const result = await loadPreviewData();
      setPreview(result);
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 403) {
        setRestricted(true);
      } else {
        setError(err instanceof Error ? err.message : 'No fue posible consultar la vista previa.');
      }
    } finally {
      setLoadingPreview(false);
    }
  }

  async function handleDownload() {
    resetFeedback();

    const validationMessage = validateFilters();

    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setLoadingDownload(true);

    try {
      if (exportType === 'VENTANILLA_REGISTROS') {
        await exportVentanilla(filter);
        return;
      }

      if (exportType === 'DMC_REGISTROS') {
        await exportDmc(filter);
        return;
      }

      if (exportType === 'VENTANILLA_REPORTE') {
        await exportVentanillaReport(filter);
        return;
      }

      if (exportType === 'DMC_REPORTE') {
        await exportDmcReport(filter);
        return;
      }

      const result = preview ?? await loadPreviewData();
      const workbook = buildWorkbookFromPreview(result);
      XLSX.writeFile(workbook, buildExcelFilename(exportType, fechaInicio, fechaFin));

      if (!preview) {
        setPreview(result);
      }
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 403) {
        setRestricted(true);
      } else {
        setError(err instanceof Error ? err.message : 'No fue posible descargar el archivo.');
      }
    } finally {
      setLoadingDownload(false);
    }
  }

  function clearFilters() {
    setFechaInicio(getMonthStartDate());
    setFechaFin(getTodayDate());
    setExportType('VENTANILLA_REGISTROS');
    setGrouping('SEMANAL');
    setPreview(null);
    resetFeedback();
  }

  return (
    <Stack spacing={3}>
      <PageTitle
        title="Exportaciones"
        subtitle="Consulta, visualiza y descarga información en Excel con filtros por fecha."
      />

      {restricted ? <AccessMessage message="Tu rol no tiene permisos para exportar información." /> : null}
      {error ? <Alert severity="error">{error}</Alert> : null}

      <SectionCard
        title="Filtros de exportación"
        subtitle="Selecciona el rango de fechas y el tipo de información que deseas consultar o descargar."
      >
        <Stack spacing={2.5}>
          <DateRangeToolbar
            fechaInicio={fechaInicio}
            fechaFin={fechaFin}
            loading={loading}
            onFechaInicioChange={(value) => {
              setFechaInicio(value);
              setPreview(null);
            }}
            onFechaFinChange={(value) => {
              setFechaFin(value);
              setPreview(null);
            }}
            onSearch={handlePreview}
            onClear={clearFilters}
          />

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                md: exportType === 'PRODUCTIVIDAD_FUNCIONARIOS'
                  ? 'minmax(260px, 520px) minmax(180px, 240px)'
                  : 'minmax(260px, 520px)',
              },
              gap: 2,
            }}
          >
            <TextField
              select
              size="small"
              label="Tipo de exportación"
              value={exportType}
              onChange={(event) => {
                setExportType(event.target.value as ExportOptionType);
                setPreview(null);
              }}
            >
              {exportOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>

            {exportType === 'PRODUCTIVIDAD_FUNCIONARIOS' ? (
              <TextField
                select
                size="small"
                label="Agrupación"
                value={grouping}
                onChange={(event) => {
                  setGrouping(event.target.value as ProductivityGrouping);
                  setPreview(null);
                }}
              >
                <MenuItem value="SEMANAL">Semanal</MenuItem>
                <MenuItem value="MENSUAL">Mensual</MenuItem>
              </TextField>
            ) : null}
          </Box>

          <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={1.5}
              sx={{
                alignItems: { xs: 'flex-start', md: 'center' },
                justifyContent: 'space-between',
              }}
            >
              <Box>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                  <Chip label={selectedOption.category} color="primary" variant="outlined" size="small" />
                  {selectedOption.officialBackendDownload ? (
                    <Chip label="Descarga oficial" color="success" variant="outlined" size="small" />
                  ) : (
                    <Chip label="Excel desde vista previa" color="info" variant="outlined" size="small" />
                  )}
                </Stack>

                <Typography sx={{ fontWeight: 800, mt: 1 }}>
                  {selectedOption.label}
                </Typography>

                <Typography color="text.secondary" sx={{ fontSize: 14 }}>
                  {selectedOption.description}
                </Typography>
              </Box>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} sx={{ width: { xs: '100%', md: 'auto' } }}>
                <Button
                  variant="outlined"
                  startIcon={<PreviewIcon />}
                  onClick={handlePreview}
                  disabled={loading}
                >
                  {loadingPreview ? 'Consultando...' : 'Consultar datos'}
                </Button>

                <Button
                  variant="contained"
                  startIcon={<CloudDownloadIcon />}
                  onClick={handleDownload}
                  disabled={loading}
                >
                  {loadingDownload ? 'Descargando...' : 'Descargar Excel'}
                </Button>

                <Button
                  variant="outlined"
                  color="secondary"
                  startIcon={<RestartAltIcon />}
                  onClick={clearFilters}
                  disabled={loading}
                >
                  Limpiar
                </Button>
              </Stack>
            </Stack>
          </Paper>
        </Stack>
      </SectionCard>

      {preview ? (
        <SectionCard
          title={preview.title}
          subtitle={preview.subtitle}
        >
          <Stack spacing={2}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={1.5}
              sx={{
                alignItems: { xs: 'flex-start', md: 'center' },
                justifyContent: 'space-between',
              }}
            >
              <Box>
                <Typography sx={{ fontWeight: 800 }}>
                  Vista previa de datos a exportar
                </Typography>

                <Typography color="text.secondary" sx={{ fontSize: 14 }}>
                  Periodo: {formatDateLabel(fechaInicio)} al {formatDateLabel(fechaFin)}
                </Typography>
              </Box>

              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                <Chip
                  icon={<TableChartIcon />}
                  label={`${formatNumber(preview.totalRecords)} registro${preview.totalRecords === 1 ? '' : 's'} en vista previa`}
                  color="primary"
                  variant="outlined"
                  sx={{ fontWeight: 800 }}
                />
              </Stack>
            </Stack>

            {preview.helper ? (
              <Alert severity="info">
                {preview.helper}
              </Alert>
            ) : null}

            <Divider />

            <TableContainer
              component={Paper}
              variant="outlined"
              sx={{
                maxHeight: 620,
                overflow: 'auto',
                borderRadius: 3,
              }}
            >
              <Table size="small" stickyHeader sx={{ minWidth: 980 }}>
                <TableHead>
                  <TableRow>
                    {preview.columns.map((column) => (
                      <TableCell
                        key={column.key}
                        align={column.align ?? 'left'}
                        sx={{
                          fontWeight: 900,
                          minWidth: column.minWidth ?? 150,
                          bgcolor: 'background.paper',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {column.label}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>

                <TableBody>
                  {preview.rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={preview.columns.length} align="center">
                        No hay datos para el periodo seleccionado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    preview.rows.map((row, rowIndex) => (
                      <TableRow key={`preview-row-${rowIndex}`} hover>
                        {preview.columns.map((column) => (
                          <TableCell
                            key={`${rowIndex}-${column.key}`}
                            align={column.align ?? 'left'}
                            sx={{
                              verticalAlign: 'top',
                              whiteSpace: 'normal',
                              wordBreak: 'break-word',
                            }}
                          >
                            {String(row[column.key] ?? '')}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2}>
              <Button
                variant="contained"
                startIcon={<CloudDownloadIcon />}
                onClick={handleDownload}
                disabled={loading}
              >
                {loadingDownload ? 'Descargando...' : 'Descargar Excel'}
              </Button>

              <Button
                variant="outlined"
                startIcon={<PreviewIcon />}
                onClick={handlePreview}
                disabled={loading}
              >
                Actualizar vista previa
              </Button>
            </Stack>
          </Stack>
        </SectionCard>
      ) : (
        <SectionCard title="Vista previa" subtitle="Consulta los datos antes de descargar el Excel.">
          <Alert severity="info">
            Selecciona el tipo de exportación y presiona <strong>Consultar datos</strong> para visualizar la información antes de descargarla.
          </Alert>
        </SectionCard>
      )}
    </Stack>
  );
}