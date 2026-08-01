'use client';

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import {
  ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { searchCallCenter } from '@/services/callcenter.service';
import type { CallCenterUserOptionResponse } from '@/types/callcenter-assignment.types';
import type {
  CallCenterOrigenRegistro,
  CallCenterResponse,
} from '@/types/callcenter.types';
import type { SelectOption } from '@/types/catalog.types';

type ChipColor =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'error'
  | 'info'
  | 'success'
  | 'warning';

type JornadaFilterState = {
  fecha: string;
  q: string;
  funcionarioCallcenterId: string;
  encuestadorId: string;
  estadoCaso: string;
  estadoVisita: string;
  origenRegistro: 'TODOS' | CallCenterOrigenRegistro;
};

type Props = {
  funcionarios: CallCenterUserOptionResponse[];
  encuestadores: SelectOption[];
  loadingCatalogs?: boolean;
  refreshKey?: number;
};

const PAGE_SIZE_OPTIONS = [10, 20, 50];

const ESTADOS_CASO = [
  'PENDIENTE_ENRUTAMIENTO',
  'ASIGNADO_CALLCENTER',
  'EN_GESTION_LLAMADA',
  'NO_CONTACTADO',
  'CONTACTADO_SIN_DISPOSICION',
  'PENDIENTE_ASIGNAR_ENCUESTADOR',
  'ASIGNADO_ENCUESTADOR',
  'VISITA_PROGRAMADA',
  'VISITA_NO_ATENDIDA',
  'REPROGRAMADO',
  'VISITA_REALIZADA',
  'CERRADO',
  'CANCELADO',
];

const ESTADOS_VISITA = [
  'PENDIENTE',
  'PROGRAMADA',
  'REALIZADA',
  'NO_ATENDIDA',
  'REPROGRAMADA',
  'CANCELADA',
];

/**
 * Obtiene la fecha local actual en formato yyyy-MM-dd.
 */
function getLocalToday() {
  const now = new Date();

  const localTime =
    now.getTime()
    - now.getTimezoneOffset() * 60_000;

  return new Date(localTime)
    .toISOString()
    .slice(0, 10);
}

function buildInitialFilters(): JornadaFilterState {
  return {
    fecha: getLocalToday(),
    q: '',
    funcionarioCallcenterId: '',
    encuestadorId: '',
    estadoCaso: 'TODOS',
    estadoVisita: 'TODOS',
    origenRegistro: 'TODOS',
  };
}

function getPageContent<T>(page: unknown): T[] {
  const data = page as {
    content?: T[];
    items?: T[];
    data?: T[];
  };

  return data?.content
    ?? data?.items
    ?? data?.data
    ?? [];
}

function getTotalElements(
  page: unknown,
  currentLength: number,
) {
  const data = page as {
    totalElements?: number;
    totalItems?: number;
    total?: number;
    totalRecords?: number;
  };

  return data?.totalElements
    ?? data?.totalItems
    ?? data?.total
    ?? data?.totalRecords
    ?? currentLength;
}

function formatDate(
  value?: string | null,
) {
  if (!value) {
    return 'Sin fecha';
  }

  const parts =
    value.split('-');

  if (parts.length !== 3) {
    return value;
  }

  const [year, month, day] =
    parts;

  return `${day}/${month}/${year}`;
}

function funcionarioLabel(
  funcionario: CallCenterUserOptionResponse,
) {
  const name =
    funcionario.nombreCompleto?.trim();

  return name
    ? `${name} (${funcionario.username})`
    : funcionario.username;
}

function getFuncionarioRegistroLabel(
  record: CallCenterResponse,
) {
  return record.funcionarioCallcenterAsignadoNombre
    ?? record.funcionarioCallcenterAsignadoUsername
    ?? 'Sin funcionario';
}

function getEncuestadorRegistroLabel(
  record: CallCenterResponse,
) {
  return record.encuestadorAsignadoNombre
    ?? record.encuestadorProgramadoNombre
    ?? 'Sin encuestador';
}

function getLlamadaLabel(
  value?: boolean | null,
) {
  if (value === true) {
    return 'Conectada';
  }

  if (value === false) {
    return 'No conectada';
  }

  return 'Sin gestión';
}

function getLlamadaColor(
  value?: boolean | null,
): ChipColor {
  if (value === true) {
    return 'success';
  }

  if (value === false) {
    return 'warning';
  }

  return 'default';
}

function getEstadoColor(
  value?: string | null,
): ChipColor {
  const normalized =
    String(value ?? '')
      .trim()
      .toUpperCase();

  if (
    normalized === 'CERRADO'
    || normalized === 'VISITA_REALIZADA'
    || normalized === 'REALIZADA'
  ) {
    return 'success';
  }

  if (
    normalized === 'CANCELADO'
    || normalized === 'CANCELADA'
  ) {
    return 'error';
  }

  if (
    normalized === 'NO_CONTACTADO'
    || normalized === 'VISITA_NO_ATENDIDA'
    || normalized === 'NO_ATENDIDA'
    || normalized === 'CONTACTADO_SIN_DISPOSICION'
  ) {
    return 'warning';
  }

  if (
    normalized === 'VISITA_PROGRAMADA'
    || normalized === 'PROGRAMADA'
    || normalized === 'ASIGNADO_ENCUESTADOR'
  ) {
    return 'primary';
  }

  if (
    normalized === 'REPROGRAMADO'
    || normalized === 'REPROGRAMADA'
  ) {
    return 'info';
  }

  return 'default';
}

export default function CallCenterJornadaConsolidada({
  funcionarios,
  encuestadores,
  loadingCatalogs = false,
  refreshKey = 0,
}: Props) {
  const router =
    useRouter();

  const [filters, setFilters] =
    useState<JornadaFilterState>(
      buildInitialFilters,
    );

  const [appliedFilters, setAppliedFilters] =
    useState<JornadaFilterState>(
      buildInitialFilters,
    );

  const [records, setRecords] =
    useState<CallCenterResponse[]>([]);

  const [total, setTotal] =
    useState(0);

  const [page, setPage] =
    useState(0);

  const [size, setSize] =
    useState(20);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const pageStats =
    useMemo(
      () => ({
        conectadas:
          records.filter(
            (record) =>
              record.llamadaConectada === true,
          ).length,

        noConectadas:
          records.filter(
            (record) =>
              record.llamadaConectada === false,
          ).length,

        realizadas:
          records.filter(
            (record) =>
              record.encuestaRealizada === true
              || record.estadoVisita === 'REALIZADA'
              || record.estadoCaso === 'VISITA_REALIZADA',
          ).length,
      }),
      [records],
    );

  const load =
    useCallback(async () => {
      setLoading(true);
      setError(null);

      try {
        const response =
          await searchCallCenter({
            page,
            size,

            q:
              appliedFilters.q.trim()
              || undefined,

            fechaEncuestaInicio:
              appliedFilters.fecha
              || undefined,

            fechaEncuestaFin:
              appliedFilters.fecha
              || undefined,

            funcionarioCallcenterAsignadoId:
              appliedFilters.funcionarioCallcenterId
              || undefined,

            encuestadorAsignadoId:
              appliedFilters.encuestadorId
              || undefined,

            estadoCaso:
              appliedFilters.estadoCaso === 'TODOS'
                ? undefined
                : appliedFilters.estadoCaso,

            estadoVisita:
              appliedFilters.estadoVisita === 'TODOS'
                ? undefined
                : appliedFilters.estadoVisita,

            origenRegistro:
              appliedFilters.origenRegistro === 'TODOS'
                ? undefined
                : appliedFilters.origenRegistro,

            solicitoNuevaEncuesta: true,
            activo: true,
          });

        const content =
          getPageContent<CallCenterResponse>(
            response,
          );

        setRecords(content);

        setTotal(
          getTotalElements(
            response,
            content.length,
          ),
        );
      } catch (loadError) {
        const message =
          loadError instanceof Error
            ? loadError.message
            : 'No fue posible consultar la jornada.';

        setError(message);
        setRecords([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    }, [
      appliedFilters,
      page,
      size,
    ]);

  useEffect(() => {
    void load();
  }, [
    load,
    refreshKey,
  ]);

  const updateFilter = (
    field: keyof JornadaFilterState,
    value: string,
  ) => {
    setFilters((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const applyFilters = () => {
    setPage(0);

    setAppliedFilters({
      ...filters,
    });
  };

  const clearFilters = () => {
    const initial =
      buildInitialFilters();

    setFilters(initial);

    setAppliedFilters({
      ...initial,
    });

    setPage(0);
  };

  const handlePageChange = (
    _: unknown,
    nextPage: number,
  ) => {
    setPage(nextPage);
  };

  const handleRowsPerPageChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    setSize(
      Number(event.target.value),
    );

    setPage(0);
  };

  return (
    <Card>
      <CardContent
        sx={{
          p: {
            xs: 2,
            md: 3,
          },
        }}
      >
        <Stack spacing={2.5}>
          <Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 800,
              }}
            >
              Seguimiento consolidado de la jornada
            </Typography>

            <Typography
              color="text.secondary"
              sx={{
                fontSize: 14,
                mt: 0.5,
              }}
            >
              Consulta ciudadanos programados, asignaciones,
              llamadas y estado actual de las visitas.
            </Typography>
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                md: 'repeat(2, 1fr)',
                lg: 'repeat(4, 1fr)',
              },
              gap: 2,
            }}
          >
            <TextField
              label="Fecha de jornada"
              type="date"
              value={filters.fecha}
              onChange={(event) =>
                updateFilter(
                  'fecha',
                  event.target.value,
                )
              }
              size="small"
              fullWidth
              slotProps={{
                inputLabel: {
                  shrink: true,
                },
              }}
            />

            <TextField
              label="Buscar ciudadano"
              value={filters.q}
              onChange={(event) =>
                updateFilter(
                  'q',
                  event.target.value,
                )
              }
              size="small"
              fullWidth
              placeholder="Nombre, cédula, teléfono o dirección"
            />

            <TextField
              label="Funcionario Call Center"
              select
              value={
                filters.funcionarioCallcenterId
              }
              onChange={(event) =>
                updateFilter(
                  'funcionarioCallcenterId',
                  event.target.value,
                )
              }
              size="small"
              fullWidth
              disabled={loadingCatalogs}
            >
              <MenuItem value="">
                Todos los funcionarios
              </MenuItem>

              {funcionarios.map(
                (funcionario) => (
                  <MenuItem
                    key={funcionario.id}
                    value={String(funcionario.id)}
                  >
                    {funcionarioLabel(funcionario)}
                  </MenuItem>
                ),
              )}
            </TextField>

            <TextField
              label="Encuestador"
              select
              value={filters.encuestadorId}
              onChange={(event) =>
                updateFilter(
                  'encuestadorId',
                  event.target.value,
                )
              }
              size="small"
              fullWidth
              disabled={loadingCatalogs}
            >
              <MenuItem value="">
                Todos los encuestadores
              </MenuItem>

              {encuestadores.map(
                (encuestador) => (
                  <MenuItem
                    key={encuestador.id}
                    value={String(encuestador.id)}
                  >
                    {encuestador.label}
                  </MenuItem>
                ),
              )}
            </TextField>

            <TextField
              label="Estado del caso"
              select
              value={filters.estadoCaso}
              onChange={(event) =>
                updateFilter(
                  'estadoCaso',
                  event.target.value,
                )
              }
              size="small"
              fullWidth
            >
              <MenuItem value="TODOS">
                Todos los estados
              </MenuItem>

              {ESTADOS_CASO.map(
                (estado) => (
                  <MenuItem
                    key={estado}
                    value={estado}
                  >
                    {estado}
                  </MenuItem>
                ),
              )}
            </TextField>

            <TextField
              label="Estado de visita"
              select
              value={filters.estadoVisita}
              onChange={(event) =>
                updateFilter(
                  'estadoVisita',
                  event.target.value,
                )
              }
              size="small"
              fullWidth
            >
              <MenuItem value="TODOS">
                Todos los estados
              </MenuItem>

              {ESTADOS_VISITA.map(
                (estado) => (
                  <MenuItem
                    key={estado}
                    value={estado}
                  >
                    {estado}
                  </MenuItem>
                ),
              )}
            </TextField>

            <TextField
              label="Origen"
              select
              value={filters.origenRegistro}
              onChange={(event) =>
                updateFilter(
                  'origenRegistro',
                  event.target.value,
                )
              }
              size="small"
              fullWidth
            >
              <MenuItem value="TODOS">
                Todos los orígenes
              </MenuItem>

              <MenuItem value="MANUAL">
                Manual
              </MenuItem>

              <MenuItem value="VENTANILLA">
                Ventanilla
              </MenuItem>

              <MenuItem value="IMPORTACION">
                Importación
              </MenuItem>
            </TextField>
          </Box>

          <Stack
            direction={{
              xs: 'column',
              sm: 'row',
            }}
            spacing={1}
            sx={{
              justifyContent: 'space-between',
              alignItems: {
                xs: 'stretch',
                sm: 'center',
              },
            }}
          >
            <Stack
              direction={{
                xs: 'column',
                sm: 'row',
              }}
              spacing={1}
            >
              <Chip
                label={`${total} registro${total === 1 ? '' : 's'}`}
                color="primary"
                variant="outlined"
              />

              <Chip
                label={`${pageStats.conectadas} conectada${pageStats.conectadas === 1 ? '' : 's'} en página`}
                color="success"
                variant="outlined"
              />

              <Chip
                label={`${pageStats.noConectadas} no conectada${pageStats.noConectadas === 1 ? '' : 's'} en página`}
                color="warning"
                variant="outlined"
              />

              <Chip
                label={`${pageStats.realizadas} realizada${pageStats.realizadas === 1 ? '' : 's'} en página`}
                color="info"
                variant="outlined"
              />
            </Stack>

            <Stack
              direction={{
                xs: 'column',
                sm: 'row',
              }}
              spacing={1}
            >
              <Button
                variant="text"
                onClick={clearFilters}
                disabled={loading}
              >
                Limpiar filtros
              </Button>

              <Button
                variant="outlined"
                onClick={() => void load()}
                disabled={loading}
              >
                Actualizar
              </Button>

              <Button
                variant="contained"
                onClick={applyFilters}
                disabled={loading}
              >
                Buscar
              </Button>
            </Stack>
          </Stack>

          {error && (
            <Alert severity="error">
              {error}
            </Alert>
          )}

          {loading ? (
            <Paper
              variant="outlined"
              sx={{
                p: 3,
              }}
            >
              <Stack
                direction="row"
                spacing={2}
                sx={{
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CircularProgress size={24} />

                <Typography>
                  Consultando jornada...
                </Typography>
              </Stack>
            </Paper>
          ) : records.length === 0 ? (
            <Alert severity="info">
              No se encontraron ciudadanos programados con
              los filtros seleccionados.
            </Alert>
          ) : (
            <Paper variant="outlined">
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>
                        Caso
                      </TableCell>

                      <TableCell>
                        Programación
                      </TableCell>

                      <TableCell>
                        Ciudadano
                      </TableCell>

                      <TableCell>
                        Contacto
                      </TableCell>

                      <TableCell>
                        Funcionario Call Center
                      </TableCell>

                      <TableCell>
                        Encuestador
                      </TableCell>

                      <TableCell>
                        Llamada
                      </TableCell>

                      <TableCell>
                        Estado del caso
                      </TableCell>

                      <TableCell>
                        Visita
                      </TableCell>

                      <TableCell>
                        Origen
                      </TableCell>

                      <TableCell align="right">
                        Acción
                      </TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {records.map(
                      (record) => (
                        <TableRow
                          key={record.id}
                          hover
                        >
                          <TableCell>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 800,
                              }}
                            >
                              #{record.id}
                            </Typography>
                          </TableCell>

                          <TableCell>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 700,
                              }}
                            >
                              {formatDate(
                                record.fechaEncuestaProgramada,
                              )}
                            </Typography>
                          </TableCell>

                          <TableCell>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 700,
                              }}
                            >
                              {record.nombreCompleto}
                            </Typography>

                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              C.C. {record.cedulaSolicitante}
                            </Typography>
                          </TableCell>

                          <TableCell>
                            <Typography variant="body2">
                              {record.telefono || 'Sin teléfono'}
                            </Typography>

                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {record.direccionTexto || 'Sin dirección'}
                            </Typography>
                          </TableCell>

                          <TableCell>
                            {getFuncionarioRegistroLabel(record)}
                          </TableCell>

                          <TableCell>
                            {getEncuestadorRegistroLabel(record)}
                          </TableCell>

                          <TableCell>
                            <Chip
                              size="small"
                              label={getLlamadaLabel(
                                record.llamadaConectada,
                              )}
                              color={getLlamadaColor(
                                record.llamadaConectada,
                              )}
                              variant="outlined"
                            />
                          </TableCell>

                          <TableCell>
                            <Chip
                              size="small"
                              label={
                                record.estadoCaso
                                ?? 'SIN_ESTADO'
                              }
                              color={getEstadoColor(
                                record.estadoCaso,
                              )}
                              variant="outlined"
                            />
                          </TableCell>

                          <TableCell>
                            <Chip
                              size="small"
                              label={
                                record.estadoVisita
                                ?? 'PENDIENTE'
                              }
                              color={getEstadoColor(
                                record.estadoVisita,
                              )}
                              variant="outlined"
                            />
                          </TableCell>

                          <TableCell>
                            <Chip
                              size="small"
                              label={
                                record.origenRegistro
                                ?? 'SIN_ORIGEN'
                              }
                              color={
                                record.origenRegistro === 'VENTANILLA'
                                  ? 'primary'
                                  : 'default'
                              }
                              variant="outlined"
                            />
                          </TableCell>

                          <TableCell align="right">
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() =>
                                router.push(
                                  `/dashboard/callcenter/registros/nuevo?id=${record.id}`,
                                )
                              }
                            >
                              Editar caso
                            </Button>
                          </TableCell>
                        </TableRow>
                      ),
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                component="div"
                count={total}
                page={page}
                rowsPerPage={size}
                rowsPerPageOptions={PAGE_SIZE_OPTIONS}
                onPageChange={handlePageChange}
                onRowsPerPageChange={handleRowsPerPageChange}
                labelRowsPerPage="Filas"
                labelDisplayedRows={({
                  from,
                  to,
                  count,
                }) =>
                  `${from}-${to} de ${
                    count !== -1
                      ? count
                      : `más de ${to}`
                  }`
                }
              />
            </Paper>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}