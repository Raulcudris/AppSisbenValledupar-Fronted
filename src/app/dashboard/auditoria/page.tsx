'use client';

import DownloadIcon from '@mui/icons-material/Download';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SearchIcon from '@mui/icons-material/Search';
import {
  Alert,
  Autocomplete,
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
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import jsPDF from 'jspdf';
import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';

import { PageTitle } from '@/components/dashboard/ReportCharts';
import { AccessMessage, LoadingState } from '@/components/dashboard/States';
import { ApiClientError } from '@/lib/apiClient';
import { searchAudit } from '@/services/audit.service';
import { PageResponse } from '@/types/api.types';
import { AuditFilter, AuditLogResponse } from '@/types/audit.types';

type AuditOption = {
  label: string;
  value: string;
};

const DEFAULT_ACTION_OPTIONS: AuditOption[] = [
  { label: 'LOGIN', value: 'LOGIN' },
  { label: 'LOGOUT', value: 'LOGOUT' },
  { label: 'CREATE', value: 'CREATE' },
  { label: 'UPDATE', value: 'UPDATE' },
  { label: 'DELETE', value: 'DELETE' },
  { label: 'EXPORT', value: 'EXPORT' },
];

const DEFAULT_TABLE_OPTIONS: AuditOption[] = [
  { label: 'usuario', value: 'usuario' },
  { label: 'ventanilla_registro', value: 'ventanilla_registro' },
  { label: 'dmc_registro', value: 'dmc_registro' },
  { label: 'solicitud', value: 'solicitud' },
  { label: 'categoria', value: 'categoria' },
  { label: 'barrio', value: 'barrio' },
];

function formatDateTime(value?: string | null) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function normalizeOptionValue(value?: string | null) {
  return String(value ?? '').trim();
}

function uniqueOptions(values: Array<string | null | undefined>) {
  const unique = new Map<string, AuditOption>();

  values.forEach((value) => {
    const cleanValue = normalizeOptionValue(value);

    if (!cleanValue) {
      return;
    }

    const key = cleanValue.toLowerCase();

    if (!unique.has(key)) {
      unique.set(key, {
        label: cleanValue,
        value: cleanValue,
      });
    }
  });

  return Array.from(unique.values()).sort((a, b) =>
    a.label.localeCompare(b.label, 'es')
  );
}

function mergeOptions(baseOptions: AuditOption[], newOptions: AuditOption[]) {
  const merged = new Map<string, AuditOption>();

  [...baseOptions, ...newOptions].forEach((option) => {
    const cleanValue = normalizeOptionValue(option.value);

    if (!cleanValue) {
      return;
    }

    merged.set(cleanValue.toLowerCase(), {
      label: option.label,
      value: cleanValue,
    });
  });

  return Array.from(merged.values()).sort((a, b) =>
    a.label.localeCompare(b.label, 'es')
  );
}

function getOptionByValue(options: AuditOption[], value?: string | null) {
  const cleanValue = normalizeOptionValue(value);

  if (!cleanValue) {
    return null;
  }

  return options.find((option) => option.value === cleanValue)
    ?? {
      label: cleanValue,
      value: cleanValue,
    };
}

function buildExportRows(rows: AuditLogResponse[]) {
  return rows.map((item) => ({
    ID: item.id,
    Fecha: formatDateTime(item.fechaAccion),
    Usuario: item.username ?? 'N/A',
    Accion: item.accion ?? 'N/A',
    Tabla: item.tablaAfectada ?? 'N/A',
    Registro: item.registroId ?? 'N/A',
    IP: item.ipOrigen ?? 'N/A',
  }));
}

function buildExportFileName(extension: 'xlsx' | 'pdf') {
  const now = new Date();
  const stamp = now
    .toISOString()
    .slice(0, 16)
    .replace('T', '-')
    .replace(':', '');

  return `auditoria-${stamp}.${extension}`;
}

export default function AuditoriaPage() {
  const [pageData, setPageData] = useState<PageResponse<AuditLogResponse> | null>(null);
  const [filter, setFilter] = useState<AuditFilter>({
    page: 0,
    size: 20,
  });

  const [usernameOptions, setUsernameOptions] = useState<AuditOption[]>([]);
  const [actionOptions, setActionOptions] = useState<AuditOption[]>(DEFAULT_ACTION_OPTIONS);
  const [tableOptions, setTableOptions] = useState<AuditOption[]>(DEFAULT_TABLE_OPTIONS);

  const [loading, setLoading] = useState(true);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [restricted, setRestricted] = useState(false);
  const [error, setError] = useState('');

  const rows = pageData?.content ?? [];
  const totalRecords = pageData?.totalElements ?? 0;
  const currentPage = pageData?.page ?? filter.page ?? 0;
  const currentSize = pageData?.size ?? filter.size ?? 20;

  const hasActiveFilters = useMemo(() => (
    Boolean(filter.username)
    || Boolean(filter.accion)
    || Boolean(filter.tablaAfectada)
    || Boolean(filter.fechaInicio)
    || Boolean(filter.fechaFin)
  ), [filter]);

  function syncOptionsFromRows(nextRows: AuditLogResponse[]) {
    setUsernameOptions((current) =>
      mergeOptions(current, uniqueOptions(nextRows.map((item) => item.username)))
    );

    setActionOptions((current) =>
      mergeOptions(current, uniqueOptions(nextRows.map((item) => item.accion)))
    );

    setTableOptions((current) =>
      mergeOptions(current, uniqueOptions(nextRows.map((item) => item.tablaAfectada)))
    );
  }

  async function load(customFilter: AuditFilter = filter) {
    setLoading(true);
    setRestricted(false);
    setError('');

    try {
      const page = await searchAudit({
        ...customFilter,
        page: customFilter.page ?? 0,
        size: customFilter.size ?? 20,
      });

      setPageData(page);
      setFilter({
        ...customFilter,
        page: page.page,
        size: page.size,
      });
      syncOptionsFromRows(page.content);
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

  async function loadComboboxOptions() {
    setOptionsLoading(true);

    try {
      const page = await searchAudit({
        page: 0,
        size: 1000,
      });

      syncOptionsFromRows(page.content);
    } catch {
      // Si no se pueden precargar las opciones, la página sigue funcionando
      // porque los combobox permiten escribir valores manualmente.
    } finally {
      setOptionsLoading(false);
    }
  }

  useEffect(() => {
    load({
      page: 0,
      size: 20,
    });
    loadComboboxOptions();
  }, []);

  function update(key: keyof AuditFilter, value: string) {
    setFilter((current) => ({
      ...current,
      [key]: value || undefined,
    }));
  }

  function handleSearch() {
    load({
      ...filter,
      page: 0,
    });
  }

  function clearFilters() {
    const cleared: AuditFilter = {
      page: 0,
      size: filter.size ?? 20,
    };

    setFilter(cleared);
    load(cleared);
  }

  function handleChangePage(_: unknown, newPage: number) {
    load({
      ...filter,
      page: newPage,
    });
  }

  function handleChangeRowsPerPage(event: ChangeEvent<HTMLInputElement>) {
    load({
      ...filter,
      page: 0,
      size: Number(event.target.value),
    });
  }

  async function getRowsForExport() {
    const page = await searchAudit({
      ...filter,
      page: 0,
      size: 10000,
    });

    syncOptionsFromRows(page.content);

    return page.content;
  }

  async function exportExcel() {
    setExportingExcel(true);
    setError('');

    try {
      const exportRows = await getRowsForExport();
      const worksheet = XLSX.utils.json_to_sheet(buildExportRows(exportRows));
      const workbook = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(workbook, worksheet, 'Auditoria');
      XLSX.writeFile(workbook, buildExportFileName('xlsx'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible exportar auditoría en Excel.');
    } finally {
      setExportingExcel(false);
    }
  }

  async function exportPdf() {
    setExportingPdf(true);
    setError('');

    try {
      const exportRows = await getRowsForExport();
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'pt',
        format: 'a4',
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      const marginX = 32;
      let cursorY = 38;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('Reporte de Auditoría', marginX, cursorY);

      cursorY += 18;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Generado: ${formatDateTime(new Date().toISOString())}`, marginX, cursorY);

      cursorY += 14;
      doc.text(`Total registros exportados: ${exportRows.length}`, marginX, cursorY);

      cursorY += 18;

      const headers = ['ID', 'Fecha', 'Usuario', 'Acción', 'Tabla', 'Registro', 'IP'];
      const columnWidths = [45, 105, 130, 80, 150, 80, 120];
      const rowHeight = 22;

      function drawHeader() {
        doc.setFillColor(245, 247, 250);
        doc.rect(marginX, cursorY - 13, pageWidth - marginX * 2, rowHeight, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);

        let x = marginX + 4;
        headers.forEach((header, index) => {
          doc.text(header, x, cursorY);
          x += columnWidths[index];
        });

        cursorY += rowHeight;
      }

      drawHeader();

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);

      exportRows.forEach((item) => {
        if (cursorY > pageHeight - 40) {
          doc.addPage();
          cursorY = 38;
          drawHeader();
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
        }

        const values = [
          String(item.id ?? ''),
          formatDateTime(item.fechaAccion),
          item.username ?? 'N/A',
          item.accion ?? 'N/A',
          item.tablaAfectada ?? 'N/A',
          String(item.registroId ?? 'N/A'),
          item.ipOrigen ?? 'N/A',
        ];

        let x = marginX + 4;
        values.forEach((value, index) => {
          const clippedText = doc.splitTextToSize(String(value), columnWidths[index] - 8)[0] ?? '';
          doc.text(clippedText, x, cursorY);
          x += columnWidths[index];
        });

        cursorY += rowHeight;
      });

      if (!exportRows.length) {
        doc.text('No hay registros de auditoría para los filtros seleccionados.', marginX + 4, cursorY);
      }

      doc.save(buildExportFileName('pdf'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible exportar auditoría en PDF.');
    } finally {
      setExportingPdf(false);
    }
  }

  if (loading && !pageData) {
    return <LoadingState />;
  }

  return (
    <Stack spacing={3}>
      <PageTitle
        title="Auditoría"
        subtitle="Consulta, filtra y exporta las acciones registradas por usuarios del sistema."
        action={
          !restricted ? (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={exportExcel}
                disabled={exportingExcel || exportingPdf || loading}
              >
                {exportingExcel ? 'Exportando...' : 'Excel'}
              </Button>

              <Button
                variant="contained"
                color="error"
                startIcon={<PictureAsPdfIcon />}
                onClick={exportPdf}
                disabled={exportingExcel || exportingPdf || loading}
              >
                {exportingPdf ? 'Generando...' : 'PDF'}
              </Button>
            </Stack>
          ) : null
        }
      />

      {restricted ? (
        <AccessMessage />
      ) : (
        <>
          <Card
            sx={{
              borderRadius: 4,
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: '0 16px 40px rgba(15, 23, 42, 0.08)',
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Stack spacing={2}>
                <Stack
                  direction={{ xs: 'column', md: 'row' }}
                  spacing={1}
                  sx={{
                    alignItems: { xs: 'flex-start', md: 'center' },
                    justifyContent: 'space-between',
                  }}
                >
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                      Filtros de auditoría
                    </Typography>

                    <Typography color="text.secondary" sx={{ fontSize: 14 }}>
                      Filtra por usuario, acción, tabla afectada y rango de fechas.
                    </Typography>
                  </Box>

                  <Stack direction="row" spacing={1}>
                    {hasActiveFilters ? (
                      <Chip
                        label="Filtros aplicados"
                        color="primary"
                        variant="outlined"
                        size="small"
                        sx={{ fontWeight: 700 }}
                      />
                    ) : null}

                    <Chip
                      label={`${totalRecords} registro${totalRecords === 1 ? '' : 's'}`}
                      color="primary"
                      variant="outlined"
                      size="small"
                      sx={{ fontWeight: 700 }}
                    />
                  </Stack>
                </Stack>

                <Divider />

                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: '1fr',
                      md: 'repeat(3, 1fr)',
                    },
                    gap: 2,
                  }}
                >
                  <Autocomplete<AuditOption, false, false, true>
                    freeSolo
                    options={usernameOptions}
                    value={getOptionByValue(usernameOptions, filter.username)}
                    inputValue={filter.username ?? ''}
                    onInputChange={(_, value) => update('username', value)}
                    onChange={(_, option) => {
                      if (typeof option === 'string') {
                        update('username', option);
                        return;
                      }

                      update('username', option?.value ?? '');
                    }}
                    getOptionLabel={(option) =>
                      typeof option === 'string' ? option : option.label
                    }
                    isOptionEqualToValue={(option, value) =>
                      typeof value !== 'string' && option.value === value.value
                    }
                    loading={optionsLoading}
                    noOptionsText="No hay usuarios"
                    clearText="Limpiar"
                    openText="Abrir"
                    closeText="Cerrar"
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Usuario"
                        size="small"
                        placeholder="Selecciona o escribe usuario"
                      />
                    )}
                  />

                  <Autocomplete<AuditOption, false, false, true>
                    freeSolo
                    options={actionOptions}
                    value={getOptionByValue(actionOptions, filter.accion)}
                    inputValue={filter.accion ?? ''}
                    onInputChange={(_, value) => update('accion', value)}
                    onChange={(_, option) => {
                      if (typeof option === 'string') {
                        update('accion', option);
                        return;
                      }

                      update('accion', option?.value ?? '');
                    }}
                    getOptionLabel={(option) =>
                      typeof option === 'string' ? option : option.label
                    }
                    isOptionEqualToValue={(option, value) =>
                      typeof value !== 'string' && option.value === value.value
                    }
                    loading={optionsLoading}
                    noOptionsText="No hay acciones"
                    clearText="Limpiar"
                    openText="Abrir"
                    closeText="Cerrar"
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Acción"
                        size="small"
                        placeholder="LOGIN, CREATE, UPDATE..."
                      />
                    )}
                  />

                  <Autocomplete<AuditOption, false, false, true>
                    freeSolo
                    options={tableOptions}
                    value={getOptionByValue(tableOptions, filter.tablaAfectada)}
                    inputValue={filter.tablaAfectada ?? ''}
                    onInputChange={(_, value) => update('tablaAfectada', value)}
                    onChange={(_, option) => {
                      if (typeof option === 'string') {
                        update('tablaAfectada', option);
                        return;
                      }

                      update('tablaAfectada', option?.value ?? '');
                    }}
                    getOptionLabel={(option) =>
                      typeof option === 'string' ? option : option.label
                    }
                    isOptionEqualToValue={(option, value) =>
                      typeof value !== 'string' && option.value === value.value
                    }
                    loading={optionsLoading}
                    noOptionsText="No hay tablas"
                    clearText="Limpiar"
                    openText="Abrir"
                    closeText="Cerrar"
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Tabla"
                        size="small"
                        placeholder="Selecciona o escribe tabla"
                      />
                    )}
                  />

                  <TextField
                    label="Fecha inicio"
                    type="date"
                    size="small"
                    value={filter.fechaInicio ?? ''}
                    onChange={(event) => update('fechaInicio', event.target.value)}
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
                    onChange={(event) => update('fechaFin', event.target.value)}
                    slotProps={{
                      inputLabel: {
                        shrink: true,
                      },
                    }}
                  />

                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="contained"
                      onClick={handleSearch}
                      startIcon={<SearchIcon />}
                      disabled={loading}
                    >
                      Buscar
                    </Button>

                    <Button
                      variant="outlined"
                      onClick={clearFilters}
                      startIcon={<RestartAltIcon />}
                      disabled={loading}
                    >
                      Limpiar
                    </Button>
                  </Stack>
                </Box>
              </Stack>
            </CardContent>
          </Card>

          {error ? <Alert severity="error">{error}</Alert> : null}

          <Card
            sx={{
              borderRadius: 4,
              overflow: 'hidden',
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: '0 16px 40px rgba(15, 23, 42, 0.08)',
            }}
          >
            <CardContent sx={{ p: 0 }}>
              <Box
                sx={{
                  px: { xs: 2, md: 2.5 },
                  py: 2,
                  display: 'flex',
                  gap: 2,
                  alignItems: { xs: 'stretch', sm: 'center' },
                  justifyContent: 'space-between',
                  flexDirection: { xs: 'column', sm: 'row' },
                  bgcolor: 'background.paper',
                }}
              >
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    Registros de auditoría
                  </Typography>

                  <Typography color="text.secondary" sx={{ fontSize: 14 }}>
                    Mostrando {rows.length} de {totalRecords} registro{totalRecords === 1 ? '' : 's'}.
                  </Typography>
                </Box>

                <Chip
                  label={`${totalRecords} total`}
                  color="primary"
                  variant="outlined"
                  sx={{ width: 'fit-content', fontWeight: 800 }}
                />
              </Box>

              <Box sx={{ overflowX: 'auto' }}>
                <Table
                  sx={{
                    minWidth: 1080,
                    '& .MuiTableCell-root': {
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                    },
                    '& .MuiTableHead-root .MuiTableCell-root': {
                      bgcolor: '#f8fafc',
                      color: 'text.secondary',
                      fontSize: 13,
                      fontWeight: 800,
                      py: 1.6,
                    },
                    '& .MuiTableBody-root .MuiTableCell-root': {
                      py: 1.7,
                      fontSize: 14,
                    },
                    '& .MuiTableRow-root:hover': {
                      bgcolor: '#f8fafc',
                    },
                  }}
                >
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
                      <TableRow key={item.id} hover>
                        <TableCell>
                          <Typography sx={{ fontWeight: 800 }}>
                            {item.id}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <Typography sx={{ minWidth: 150, fontWeight: 700 }}>
                            {formatDateTime(item.fechaAccion)}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <Typography sx={{ minWidth: 150, fontWeight: 700 }}>
                            {item.username ?? 'N/A'}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <Chip
                            label={item.accion ?? 'N/A'}
                            size="small"
                            color="primary"
                            variant="outlined"
                            sx={{ fontWeight: 800 }}
                          />
                        </TableCell>

                        <TableCell>
                          <Tooltip title={item.tablaAfectada ?? 'N/A'} arrow>
                            <Typography
                              sx={{
                                maxWidth: 190,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                fontWeight: 700,
                              }}
                            >
                              {item.tablaAfectada ?? 'N/A'}
                            </Typography>
                          </Tooltip>
                        </TableCell>

                        <TableCell>
                          <Chip
                            label={item.registroId ?? 'N/A'}
                            size="small"
                            variant="outlined"
                            sx={{ fontWeight: 700 }}
                          />
                        </TableCell>

                        <TableCell>
                          <Typography sx={{ minWidth: 110 }}>
                            {item.ipOrigen ?? 'N/A'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}

                    {!rows.length ? (
                      <TableRow>
                        <TableCell colSpan={7}>
                          <Box sx={{ py: 5 }}>
                            <Alert severity="info">
                              No hay registros de auditoría para los filtros seleccionados.
                            </Alert>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </Box>

              <TablePagination
                component="div"
                count={totalRecords}
                page={currentPage}
                onPageChange={handleChangePage}
                rowsPerPage={currentSize}
                onRowsPerPageChange={handleChangeRowsPerPage}
                rowsPerPageOptions={[10, 20, 50, 100]}
                labelRowsPerPage="Filas por página"
                labelDisplayedRows={({ from, to, count }) =>
                  `${from}-${to} de ${count !== -1 ? count : `más de ${to}`}`
                }
                sx={{
                  borderTop: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                }}
              />
            </CardContent>
          </Card>
        </>
      )}
    </Stack>
  );
}