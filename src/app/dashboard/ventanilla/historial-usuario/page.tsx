'use client';

import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import HistoryIcon from '@mui/icons-material/History';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
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
import { ChangeEvent, KeyboardEvent, useEffect, useState } from 'react';
import LoadingState from '@/components/dashboard/LoadingState';
import AppSnackbar, {
  AppSnackbarState,
  initialSnackbarState,
} from '@/components/ui/AppSnackbar';
import {
  exportVentanillaUserHistory,
  exportVentanillaUserHistoryPdf,
} from '@/services/export.service';
import {
  getVentanillaUserHistory,
  searchVentanillaUserHistory,
} from '@/services/ventanilla.service';
import { PageResponse } from '@/types/api.types';
import {
  VentanillaUserHistoryFilter,
  VentanillaUserHistoryResponse,
  VentanillaUserHistorySummaryResponse,
} from '@/types/operational.types';

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

function buildUserLabel(row: VentanillaUserHistorySummaryResponse) {
  if (row.nombreUsuario && row.nombreUsuario.trim()) {
    return row.nombreUsuario;
  }

  return 'Usuario sin nombre registrado';
}

export default function VentanillaHistorialUsuarioPage() {
  const [filter, setFilter] = useState<VentanillaUserHistoryFilter>({
    search: '',
    page: 0,
    size: 10,
  });

  const [pageData, setPageData] = useState<PageResponse<VentanillaUserHistorySummaryResponse> | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<VentanillaUserHistorySummaryResponse | null>(null);
  const [selectedHistory, setSelectedHistory] = useState<VentanillaUserHistoryResponse | null>(null);
  const [feedback, setFeedback] = useState<AppSnackbarState>(initialSnackbarState);

  const totalRecords = pageData?.totalElements ?? 0;
  const currentPage = pageData?.page ?? 0;
  const currentSize = pageData?.size ?? 10;
  const rows = pageData?.content ?? [];

  const showSuccess = (message: string, title = 'Operación exitosa') => {
    setFeedback({
      open: true,
      type: 'success',
      title,
      message,
    });
  };

  const showError = (message: string, title = 'Error') => {
    setFeedback({
      open: true,
      type: 'error',
      title,
      message,
    });
  };

  const closeFeedback = () => {
    setFeedback(initialSnackbarState);
  };

  const load = async (customFilter: VentanillaUserHistoryFilter = filter) => {
    setLoading(true);

    try {
      const response = await searchVentanillaUserHistory({
        search: customFilter.search?.trim() || undefined,
        page: customFilter.page ?? 0,
        size: customFilter.size ?? 10,
      });

      setPageData(response);
      setFilter(customFilter);
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : 'No fue posible consultar el historial de usuarios.';

      showError(message, 'Error al consultar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load({
      search: '',
      page: 0,
      size: 10,
    });
  }, []);

  const search = () => {
    load({
      ...filter,
      page: 0,
    });
  };

  const clearFilters = () => {
    const cleared: VentanillaUserHistoryFilter = {
      search: '',
      page: 0,
      size: filter.size ?? 10,
    };

    setFilter(cleared);
    load(cleared);
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter') {
      return;
    }

    event.preventDefault();
    search();
  };

  const handleChangePage = (_: unknown, newPage: number) => {
    load({
      ...filter,
      page: newPage,
    });
  };

  const handleChangeRowsPerPage = (event: ChangeEvent<HTMLInputElement>) => {
    load({
      ...filter,
      page: 0,
      size: Number(event.target.value),
    });
  };

  const openHistory = async (row: VentanillaUserHistorySummaryResponse) => {
    setSelectedUser(row);
    setSelectedHistory(null);
    setDetailOpen(true);
    setDetailLoading(true);

    try {
      const response = await getVentanillaUserHistory(row.cedulaUsuario);
      setSelectedHistory(response);
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : 'No fue posible consultar el detalle del historial.';

      showError(message, 'Error al consultar detalle');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeHistory = () => {
    if (detailLoading || downloadLoading || pdfLoading) {
      return;
    }

    setDetailOpen(false);
    setSelectedUser(null);
    setSelectedHistory(null);
  };

  const downloadHistory = async (cedulaUsuario: string) => {
    setDownloadLoading(true);

    try {
      await exportVentanillaUserHistory(cedulaUsuario);

      showSuccess(
        'El reporte CSV del historial fue descargado correctamente.',
        'CSV descargado'
      );
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : 'No fue posible descargar el reporte CSV del historial.';

      showError(message, 'Error al descargar CSV');
    } finally {
      setDownloadLoading(false);
    }
  };

  const downloadHistoryPdf = async (cedulaUsuario: string) => {
    setPdfLoading(true);

    try {
      await exportVentanillaUserHistoryPdf(cedulaUsuario);

      showSuccess(
        'El PDF del historial fue generado correctamente.',
        'PDF descargado'
      );
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : 'No fue posible generar el PDF del historial.';

      showError(message, 'Error al generar PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  if (loading && !pageData) {
    return <LoadingState />;
  }

  return (
    <Stack spacing={3}>
      <Card
        sx={{
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
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
                label="Módulo de consulta"
                color="primary"
                variant="outlined"
                sx={{ mb: 1.5 }}
              />

              <Typography variant="h4" sx={{ fontWeight: 800 }}>
                Historial de usuario
              </Typography>

              <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 760 }}>
                Consulta los ciudadanos registrados en Ventanilla, revisa sus visitas,
                solicitudes realizadas y descarga el reporte individual del historial.
              </Typography>
            </Box>

            <HistoryIcon
              sx={{
                fontSize: 58,
                color: 'primary.main',
                opacity: 0.85,
              }}
            />
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={1.5}
              sx={{
                alignItems: { xs: 'stretch', md: 'center' },
                justifyContent: 'space-between',
              }}
            >
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  Buscar ciudadano
                </Typography>

                <Typography color="text.secondary" sx={{ fontSize: 14 }}>
                  Puedes buscar por cédula o nombre del usuario.
                </Typography>
              </Box>

              <Chip
                label={`${totalRecords} usuario${totalRecords === 1 ? '' : 's'}`}
                color="primary"
                variant="outlined"
              />
            </Stack>

            <Divider />

            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={1.5}
              sx={{
                alignItems: { xs: 'stretch', md: 'center' },
              }}
            >
              <TextField
                label="Buscar por cédula o nombre"
                size="small"
                value={filter.search ?? ''}
                onChange={(event) =>
                  setFilter((current) => ({
                    ...current,
                    search: event.target.value,
                  }))
                }
                onKeyDown={handleSearchKeyDown}
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
                  width: { xs: '100%', md: 460 },
                }}
              />

              <Button
                variant="contained"
                startIcon={<SearchIcon />}
                onClick={search}
                disabled={loading}
              >
                Buscar
              </Button>

              <Button
                variant="outlined"
                startIcon={<RestartAltIcon />}
                onClick={clearFilters}
                disabled={loading}
              >
                Limpiar
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

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
          <Box sx={{ overflowX: 'auto' }}>
            <Table
              sx={{
                minWidth: 1180,
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
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                },
                '& .MuiTableRow-root:hover': {
                  bgcolor: '#f8fafc',
                },
              }}
            >
              <TableHead>
                <TableRow>
                  <TableCell>Ciudadano</TableCell>
                  <TableCell>Cédula</TableCell>
                  <TableCell>Teléfono</TableCell>
                  <TableCell>Total visitas</TableCell>
                  <TableCell>Total solicitudes</TableCell>
                  <TableCell>Primera visita</TableCell>
                  <TableCell>Última visita</TableCell>
                  <TableCell align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.cedulaUsuario} hover>
                    <TableCell>
                      <Stack spacing={0.3} sx={{ minWidth: 240 }}>
                        <Typography sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                          {buildUserLabel(row)}
                        </Typography>

                        <Typography color="text.secondary" sx={{ fontSize: 13 }}>
                          {row.totalVisitas} visita{row.totalVisitas === 1 ? '' : 's'} registrada{row.totalVisitas === 1 ? '' : 's'}
                        </Typography>
                      </Stack>
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={row.cedulaUsuario}
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ fontWeight: 700 }}
                      />
                    </TableCell>

                    <TableCell>
                      {row.telefono || 'Sin teléfono'}
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={row.totalVisitas}
                        size="small"
                        color="info"
                        variant="outlined"
                        sx={{ fontWeight: 800 }}
                      />
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={row.totalSolicitudes}
                        size="small"
                        color="secondary"
                        variant="outlined"
                        sx={{ fontWeight: 800 }}
                      />
                    </TableCell>

                    <TableCell>
                      {formatDate(row.primeraVisita)}
                    </TableCell>

                    <TableCell>
                      {formatDate(row.ultimaVisita)}
                    </TableCell>

                    <TableCell align="center">
                      <Stack
                        direction="row"
                        spacing={1}
                        sx={{
                          justifyContent: 'center',
                        }}
                      >
                        <Tooltip title="Ver historial">
                          <IconButton
                            onClick={() => openHistory(row)}
                            disabled={detailLoading || downloadLoading || pdfLoading}
                            sx={{
                              border: '1px solid',
                              borderColor: 'divider',
                              borderRadius: 2,
                            }}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="Descargar CSV">
                          <IconButton
                            onClick={() => downloadHistory(row.cedulaUsuario)}
                            disabled={downloadLoading || pdfLoading}
                            sx={{
                              border: '1px solid',
                              borderColor: 'divider',
                              borderRadius: 2,
                            }}
                          >
                            <DownloadIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="Generar PDF">
                          <IconButton
                            onClick={() => downloadHistoryPdf(row.cedulaUsuario)}
                            disabled={downloadLoading || pdfLoading}
                            sx={{
                              border: '1px solid',
                              borderColor: 'divider',
                              borderRadius: 2,
                              color: 'error.main',
                            }}
                          >
                            <PictureAsPdfIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}

                {!rows.length ? (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <Box sx={{ py: 5, textAlign: 'center' }}>
                        <Typography variant="h6">
                          No hay usuarios para mostrar
                        </Typography>

                        <Typography color="text.secondary" sx={{ mt: 1 }}>
                          Intenta limpiar los filtros o realizar una nueva búsqueda.
                        </Typography>
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
            rowsPerPageOptions={[10, 20, 50]}
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

      <Dialog
        open={detailOpen}
        onClose={closeHistory}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle
          sx={{
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Stack
            direction="row"
            spacing={2}
            sx={{
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                Historial de solicitudes
              </Typography>

              <Typography color="text.secondary" sx={{ fontSize: 13 }}>
                {selectedUser
                  ? `${buildUserLabel(selectedUser)} · CC: ${selectedUser.cedulaUsuario}`
                  : 'Detalle del ciudadano'}
              </Typography>
            </Box>

            <IconButton
              onClick={closeHistory}
              disabled={detailLoading || downloadLoading || pdfLoading}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
              }}
            >
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          {detailLoading ? (
            <Box sx={{ py: 5, textAlign: 'center' }}>
              <Typography sx={{ fontWeight: 800 }}>
                Consultando historial...
              </Typography>

              <Typography color="text.secondary" sx={{ mt: 1 }}>
                Por favor espera un momento.
              </Typography>
            </Box>
          ) : (
            <Stack spacing={2}>
              <Alert severity="info">
                Este historial muestra las visitas y solicitudes activas registradas para el ciudadano.
              </Alert>

              <Card
                variant="outlined"
                sx={{
                  borderRadius: 3,
                }}
              >
                <CardContent>
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
                    <Box>
                      <Typography color="text.secondary" sx={{ fontSize: 13 }}>
                        Ciudadano
                      </Typography>

                      <Typography sx={{ fontWeight: 800 }}>
                        {selectedHistory?.nombreUsuario || selectedUser?.nombreUsuario || 'Sin nombre'}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography color="text.secondary" sx={{ fontSize: 13 }}>
                        Cédula
                      </Typography>

                      <Typography sx={{ fontWeight: 800 }}>
                        {selectedHistory?.cedulaUsuario || selectedUser?.cedulaUsuario || '-'}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography color="text.secondary" sx={{ fontSize: 13 }}>
                        Total visitas
                      </Typography>

                      <Typography sx={{ fontWeight: 800 }}>
                        {selectedHistory?.totalVisitas ?? 0}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography color="text.secondary" sx={{ fontSize: 13 }}>
                        Total solicitudes
                      </Typography>

                      <Typography sx={{ fontWeight: 800 }}>
                        {selectedHistory?.totalSolicitudes ?? 0}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography color="text.secondary" sx={{ fontSize: 13 }}>
                        Primera visita
                      </Typography>

                      <Typography sx={{ fontWeight: 800 }}>
                        {formatDate(selectedHistory?.primeraVisita)}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography color="text.secondary" sx={{ fontSize: 13 }}>
                        Última visita
                      </Typography>

                      <Typography sx={{ fontWeight: 800 }}>
                        {formatDate(selectedHistory?.ultimaVisita)}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography color="text.secondary" sx={{ fontSize: 13 }}>
                        Teléfono
                      </Typography>

                      <Typography sx={{ fontWeight: 800 }}>
                        {selectedHistory?.telefono || selectedUser?.telefono || 'Sin teléfono'}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>

              <Box sx={{ overflowX: 'auto' }}>
                <Table
                  size="small"
                  sx={{
                    minWidth: 1180,
                    '& .MuiTableHead-root .MuiTableCell-root': {
                      bgcolor: '#f8fafc',
                      color: 'text.secondary',
                      fontSize: 13,
                      fontWeight: 800,
                    },
                  }}
                >
                  <TableHead>
                    <TableRow>
                      <TableCell>Fecha</TableCell>
                      <TableCell>N° Ventanilla</TableCell>
                      <TableCell>Solicitud</TableCell>
                      <TableCell>Categoría</TableCell>
                      <TableCell>Estado</TableCell>
                      <TableCell>Barrio</TableCell>
                      <TableCell>Comuna</TableCell>
                      <TableCell>Funcionario</TableCell>
                      <TableCell>Extranjero</TableCell>
                      <TableCell>Observación</TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {(selectedHistory?.solicitudes ?? []).map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{formatDate(item.fecha)}</TableCell>
                        <TableCell>{item.numeroVentanilla || '-'}</TableCell>
                        <TableCell>{item.solicitudNombre || 'Sin solicitud'}</TableCell>
                        <TableCell>{item.categoriaNombre || 'Sin categoría'}</TableCell>
                        <TableCell>{item.estadoSolicitudNombre || 'Sin estado'}</TableCell>
                        <TableCell>{item.barrioNombre || 'Sin barrio'}</TableCell>
                        <TableCell>{item.comunaNombre || 'Sin comuna'}</TableCell>
                        <TableCell>{item.funcionarioUsername || 'Sin funcionario'}</TableCell>
                        <TableCell>{item.extranjero ? 'Sí' : 'No'}</TableCell>
                        <TableCell>{item.observacion || 'Sin observación'}</TableCell>
                      </TableRow>
                    ))}

                    {(selectedHistory?.solicitudes ?? []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10}>
                          <Box sx={{ py: 4, textAlign: 'center' }}>
                            <Typography sx={{ fontWeight: 800 }}>
                              No hay solicitudes registradas para este ciudadano.
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </Box>
            </Stack>
          )}
        </DialogContent>

        <DialogActions
          sx={{
            borderTop: '1px solid',
            borderColor: 'divider',
            px: 3,
            py: 2,
          }}
        >
          <Button
            variant="outlined"
            color="inherit"
            onClick={closeHistory}
            disabled={detailLoading || downloadLoading || pdfLoading}
          >
            Cerrar
          </Button>

          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            disabled={
              detailLoading ||
              downloadLoading ||
              pdfLoading ||
              !(selectedHistory?.cedulaUsuario || selectedUser?.cedulaUsuario)
            }
            onClick={() =>
              downloadHistory(
                selectedHistory?.cedulaUsuario || selectedUser?.cedulaUsuario || ''
              )
            }
          >
            {downloadLoading ? 'Descargando...' : 'Descargar CSV'}
          </Button>

          <Button
            variant="contained"
            color="error"
            startIcon={<PictureAsPdfIcon />}
            disabled={
              detailLoading ||
              downloadLoading ||
              pdfLoading ||
              !(selectedHistory?.cedulaUsuario || selectedUser?.cedulaUsuario)
            }
            onClick={() =>
              downloadHistoryPdf(
                selectedHistory?.cedulaUsuario || selectedUser?.cedulaUsuario || ''
              )
            }
          >
            {pdfLoading ? 'Generando PDF...' : 'Generar PDF'}
          </Button>
        </DialogActions>
      </Dialog>

      <AppSnackbar
        feedback={feedback}
        onClose={closeFeedback}
      />
    </Stack>
  );
}