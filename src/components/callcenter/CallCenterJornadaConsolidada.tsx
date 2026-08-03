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
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
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

type NextActionInfo = {
  label: string;
  detail: string;
  color: ChipColor;
};

const PAGE_SIZE_OPTIONS = [
  10,
  20,
  50,
];

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

function getLocalToday() {
  const now = new Date();

  const localTime =
    now.getTime() -
    now.getTimezoneOffset() * 60_000;

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

function getPageContent<T>(
  page: unknown,
): T[] {
  const data = page as {
    content?: T[];
    items?: T[];
    data?: T[];
  };

  return (
    data?.content ??
    data?.items ??
    data?.data ??
    []
  );
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

  return (
    data?.totalElements ??
    data?.totalItems ??
    data?.total ??
    data?.totalRecords ??
    currentLength
  );
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

export default function CallCenterJornadaConsolidada({
  funcionarios,
  encuestadores,
  loadingCatalogs = false,
  refreshKey = 0,
}: Props) {
  const router = useRouter();

  const [filters, setFilters] =
    useState<JornadaFilterState>(
      buildInitialFilters,
    );

  const [
    appliedFilters,
    setAppliedFilters,
  ] = useState<JornadaFilterState>(
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

  const pageStats = useMemo(() => {
    const programadas =
      records.filter((record) =>
        hasVisitProgramming(record),
      ).length;

    const pendientesLlamada =
      records.filter(
        (record) =>
          !isCaseFinalized(record) &&
          !hasPhoneManagement(record),
      ).length;

    const llamadasRegistradas =
      records.filter((record) =>
        hasPhoneManagement(record),
      ).length;

    const pendientesVisita =
      records.filter(
        (record) =>
          !isCaseFinalized(record) &&
          !isVisitFinalResult(record) &&
          !isVisitReprogrammed(record) &&
          hasVisitProgramming(record),
      ).length;

    const conResultado =
      records.filter((record) =>
        isVisitFinalResult(record),
      ).length;

    const reprogramadas =
      records.filter((record) =>
        isVisitReprogrammed(record),
      ).length;

    const pendientesCierre =
      records.filter(
        (record) =>
          !isCaseFinalized(record) &&
          isVisitFinalResult(record),
      ).length;

    const finalizadas =
      records.filter((record) =>
        isCaseFinalized(record),
      ).length;

    return {
      programadas,
      pendientesLlamada,
      llamadasRegistradas,
      pendientesVisita,
      conResultado,
      reprogramadas,
      pendientesCierre,
      finalizadas,
    };
  }, [records]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response =
        await searchCallCenter({
          page,
          size,

          q:
            appliedFilters.q.trim() ||
            undefined,

          fechaEncuestaInicio:
            appliedFilters.fecha ||
            undefined,

          fechaEncuestaFin:
            appliedFilters.fecha ||
            undefined,

          funcionarioCallcenterAsignadoId:
            appliedFilters.funcionarioCallcenterId ||
            undefined,

          encuestadorAsignadoId:
            appliedFilters.encuestadorId ||
            undefined,

          estadoCaso:
            appliedFilters.estadoCaso ===
            'TODOS'
              ? undefined
              : appliedFilters.estadoCaso,

          estadoVisita:
            appliedFilters.estadoVisita ===
            'TODOS'
              ? undefined
              : appliedFilters.estadoVisita,

          origenRegistro:
            appliedFilters.origenRegistro ===
            'TODOS'
              ? undefined
              : appliedFilters.origenRegistro,

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

  function updateFilter(
    field: keyof JornadaFilterState,
    value: string,
  ) {
    setFilters((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function applyFilters() {
    setPage(0);

    setAppliedFilters({
      ...filters,
    });
  }

  function clearFilters() {
    const initial =
      buildInitialFilters();

    setFilters(initial);
    setAppliedFilters(initial);
    setPage(0);
  }

  function handlePageChange(
    _: unknown,
    nextPage: number,
  ) {
    setPage(nextPage);
  }

  function handleRowsPerPageChange(
    event: ChangeEvent<
      HTMLInputElement |
      HTMLTextAreaElement
    >,
  ) {
    setSize(
      Number(event.target.value),
    );

    setPage(0);
  }

  function openCase(
    recordId: number,
  ) {
    router.push(
      `/dashboard/callcenter/registros/nuevo?id=${recordId}`,
    );
  }

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
              component="h2"
              variant="h6"
              sx={{
                fontWeight: 800,
              }}
            >
              Seguimiento consolidado de la jornada
            </Typography>

            <Typography
              component="p"
              color="text.secondary"
              sx={{
                fontSize: 14,
                mt: 0.5,
              }}
            >
              Consulta la llamada, la programación,
              el resultado de campo y el estado formal
              de cada caso.
            </Typography>
          </Box>

          <Alert severity="info">
            Los indicadores corresponden a la página
            actualmente cargada. El total general se
            obtiene de la consulta paginada del backend.
          </Alert>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                md: 'repeat(2, minmax(0, 1fr))',
                lg: 'repeat(4, minmax(0, 1fr))',
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
                    value={String(
                      funcionario.id,
                    )}
                  >
                    {funcionarioLabel(
                      funcionario,
                    )}
                  </MenuItem>
                ),
              )}
            </TextField>

            <TextField
              label="Encuestador"
              select
              value={
                filters.encuestadorId
              }
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
                    value={String(
                      encuestador.id,
                    )}
                  >
                    {encuestador.label}
                  </MenuItem>
                ),
              )}
            </TextField>

            <TextField
              label="Estado del caso"
              select
              value={
                filters.estadoCaso
              }
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
                    {formatLabel(
                      estado,
                    )}
                  </MenuItem>
                ),
              )}
            </TextField>

            <TextField
              label="Estado de visita"
              select
              value={
                filters.estadoVisita
              }
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
                    {formatLabel(
                      estado,
                    )}
                  </MenuItem>
                ),
              )}
            </TextField>

            <TextField
              label="Origen"
              select
              value={
                filters.origenRegistro
              }
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
              justifyContent:
                'space-between',
              alignItems: {
                xs: 'stretch',
                sm: 'center',
              },
            }}
          >
            <Chip
              label={`${total} registro${
                total === 1
                  ? ''
                  : 's'
              } en total`}
              color="primary"
              variant="outlined"
            />

            <Stack
              direction={{
                xs: 'column',
                sm: 'row',
              }}
              spacing={1}
            >
              <Button
                variant="text"
                onClick={
                  clearFilters
                }
                disabled={loading}
              >
                Limpiar filtros
              </Button>

              <Button
                variant="outlined"
                onClick={() =>
                  void load()
                }
                disabled={loading}
              >
                Actualizar
              </Button>

              <Button
                variant="contained"
                onClick={
                  applyFilters
                }
                disabled={loading}
              >
                Buscar
              </Button>
            </Stack>
          </Stack>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, minmax(0, 1fr))',
                lg: 'repeat(4, minmax(0, 1fr))',
              },
              gap: 1.5,
            }}
          >
            <SummaryCard
              label="Programadas"
              value={
                pageStats.programadas
              }
            />

            <SummaryCard
              label="Pendientes de llamada"
              value={
                pageStats.pendientesLlamada
              }
            />

            <SummaryCard
              label="Llamadas registradas"
              value={
                pageStats.llamadasRegistradas
              }
            />

            <SummaryCard
              label="Pendientes de visita"
              value={
                pageStats.pendientesVisita
              }
            />

            <SummaryCard
              label="Con resultado de campo"
              value={
                pageStats.conResultado
              }
            />

            <SummaryCard
              label="Reprogramadas"
              value={
                pageStats.reprogramadas
              }
            />

            <SummaryCard
              label="Pendientes de cierre"
              value={
                pageStats.pendientesCierre
              }
            />

            <SummaryCard
              label="Casos cerrados o cancelados"
              value={
                pageStats.finalizadas
              }
            />
          </Box>

          {error && (
            <Alert severity="error">
              {error}
            </Alert>
          )}

          {loading ? (
            <Paper
              variant="outlined"
              sx={{ p: 3 }}
            >
              <Stack
                direction="row"
                spacing={2}
                sx={{
                  alignItems: 'center',
                  justifyContent:
                    'center',
                }}
              >
                <CircularProgress
                  size={24}
                />

                <Typography>
                  Consultando jornada...
                </Typography>
              </Stack>
            </Paper>
          ) : records.length === 0 ? (
            <Alert severity="info">
              No se encontraron ciudadanos programados
              con los filtros seleccionados.
            </Alert>
          ) : (
            <Paper variant="outlined">
              <TableContainer>
                <Table
                  size="small"
                  sx={{
                    minWidth: 1650,
                  }}
                >
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
                        Visita
                      </TableCell>

                      <TableCell>
                        Encuesta
                      </TableCell>

                      <TableCell>
                        Estado del caso
                      </TableCell>

                      <TableCell>
                        Próxima acción
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
                      (record) => {
                        const nextAction =
                          getNextAction(
                            record,
                          );

                        return (
                          <TableRow
                            key={record.id}
                            hover
                          >
                            <TableCell>
                              <Typography
                                component="p"
                                variant="body2"
                                sx={{
                                  fontWeight: 800,
                                }}
                              >
                                #{record.id}
                              </Typography>

                              <Typography
                                component="p"
                                variant="caption"
                                color="text.secondary"
                              >
                                {formatLabel(
                                  record.tipoSolicitudCallcenter ||
                                    'NUEVA_ENCUESTA',
                                )}
                              </Typography>
                            </TableCell>

                            <TableCell>
                              <Typography
                                component="p"
                                variant="body2"
                                sx={{
                                  fontWeight: 700,
                                }}
                              >
                                {formatDate(
                                  record.fechaEncuestaProgramada,
                                )}
                              </Typography>

                              <Typography
                                component="p"
                                variant="caption"
                                color="text.secondary"
                              >
                                {hasVisitProgramming(
                                  record,
                                )
                                  ? 'Visita programada'
                                  : 'Programación pendiente'}
                              </Typography>
                            </TableCell>

                            <TableCell>
                              <Typography
                                component="p"
                                variant="body2"
                                sx={{
                                  fontWeight: 700,
                                }}
                              >
                                {record.nombreCompleto ||
                                  'Ciudadano sin nombre'}
                              </Typography>

                              <Typography
                                component="p"
                                variant="caption"
                                color="text.secondary"
                              >
                                C.C.{' '}
                                {record.cedulaSolicitante ||
                                  'Sin dato'}
                              </Typography>
                            </TableCell>

                            <TableCell>
                              <Typography
                                component="p"
                                variant="body2"
                              >
                                {record.telefono ||
                                  'Sin teléfono'}
                              </Typography>

                              <Typography
                                component="p"
                                variant="caption"
                                color="text.secondary"
                                sx={{
                                  display: 'block',
                                  maxWidth: 220,
                                  overflowWrap:
                                    'anywhere',
                                }}
                              >
                                {record.direccionTexto ||
                                  'Sin dirección'}
                              </Typography>
                            </TableCell>

                            <TableCell>
                              {getFuncionarioRegistroLabel(
                                record,
                              )}
                            </TableCell>

                            <TableCell>
                              {getEncuestadorRegistroLabel(
                                record,
                              )}
                            </TableCell>

                            <TableCell>
                              <Stack
                                spacing={0.5}
                                sx={{
                                  alignItems:
                                    'flex-start',
                                }}
                              >
                                <Chip
                                  size="small"
                                  label={
                                    getLlamadaLabel(
                                      record,
                                    )
                                  }
                                  color={
                                    getLlamadaColor(
                                      record,
                                    )
                                  }
                                  variant="outlined"
                                />

                                <Typography
                                  component="p"
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  {formatPhoneDate(
                                    record,
                                  )}
                                </Typography>
                              </Stack>
                            </TableCell>

                            <TableCell>
                              <Chip
                                size="small"
                                label={formatLabel(
                                  record.estadoVisita ||
                                    'PENDIENTE',
                                )}
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
                                  getSurveyResultLabel(
                                    record,
                                  )
                                }
                                color={
                                  getSurveyResultColor(
                                    record,
                                  )
                                }
                                variant="outlined"
                              />
                            </TableCell>

                            <TableCell>
                              <Stack
                                spacing={0.5}
                                sx={{
                                  alignItems:
                                    'flex-start',
                                }}
                              >
                                <Chip
                                  size="small"
                                  label={formatLabel(
                                    record.estadoCaso ||
                                      'SIN_ESTADO',
                                  )}
                                  color={getEstadoColor(
                                    record.estadoCaso,
                                  )}
                                  variant="outlined"
                                />

                                {!isCaseFinalized(
                                  record,
                                ) &&
                                  isVisitFinalResult(
                                    record,
                                  ) && (
                                    <Typography
                                      component="p"
                                      variant="caption"
                                      sx={{
                                        color:
                                          'warning.main',
                                      }}
                                    >
                                      Cierre pendiente
                                    </Typography>
                                  )}
                              </Stack>
                            </TableCell>

                            <TableCell>
                              <Stack
                                spacing={0.5}
                                sx={{
                                  minWidth: 185,
                                  alignItems:
                                    'flex-start',
                                }}
                              >
                                <Chip
                                  size="small"
                                  label={
                                    nextAction.label
                                  }
                                  color={
                                    nextAction.color
                                  }
                                />

                                <Typography
                                  component="p"
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  {nextAction.detail}
                                </Typography>
                              </Stack>
                            </TableCell>

                            <TableCell>
                              <Chip
                                size="small"
                                label={formatLabel(
                                  record.origenRegistro ||
                                    'SIN_ORIGEN',
                                )}
                                color={
                                  record.origenRegistro ===
                                  'VENTANILLA'
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
                                  openCase(
                                    record.id,
                                  )
                                }
                              >
                                Abrir caso
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      },
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                component="div"
                count={total}
                page={page}
                rowsPerPage={size}
                rowsPerPageOptions={
                  PAGE_SIZE_OPTIONS
                }
                onPageChange={
                  handlePageChange
                }
                onRowsPerPageChange={
                  handleRowsPerPageChange
                }
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

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography
          component="p"
          variant="caption"
          color="text.secondary"
        >
          {label}
        </Typography>

        <Typography
          component="p"
          variant="h5"
          sx={{
            fontWeight: 900,
          }}
        >
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

function getFuncionarioRegistroLabel(
  record: CallCenterResponse,
) {
  return (
    record.funcionarioCallcenterAsignadoNombre ??
    record.funcionarioCallcenterAsignadoUsername ??
    'Sin funcionario'
  );
}

function getEncuestadorRegistroLabel(
  record: CallCenterResponse,
) {
  return (
    record.encuestadorAsignadoNombre ??
    record.encuestadorProgramadoNombre ??
    'Sin encuestador'
  );
}

function hasPhoneManagement(
  record: CallCenterResponse,
) {
  const estadoCaso =
    normalizeCode(
      record.estadoCaso,
    );

  return Boolean(
    record.fechaLlamada ||
      record.horaLlamada ||
      record.llamadaConectada === true ||
      record.llamadaConectada === false ||
      estadoCaso === 'EN_GESTION_LLAMADA' ||
      estadoCaso === 'NO_CONTACTADO' ||
      estadoCaso ===
        'CONTACTADO_SIN_DISPOSICION',
  );
}

function getLlamadaLabel(
  record: CallCenterResponse,
) {
  if (
    !hasPhoneManagement(record)
  ) {
    return 'Pendiente';
  }

  if (
    record.llamadaConectada === true
  ) {
    return 'Conectada';
  }

  if (
    record.llamadaConectada === false ||
    normalizeCode(
      record.estadoCaso,
    ) === 'NO_CONTACTADO'
  ) {
    return 'No conectada';
  }

  return 'Registrada';
}

function getLlamadaColor(
  record: CallCenterResponse,
): ChipColor {
  if (
    !hasPhoneManagement(record)
  ) {
    return 'default';
  }

  if (
    record.llamadaConectada === true
  ) {
    return 'success';
  }

  if (
    record.llamadaConectada === false ||
    normalizeCode(
      record.estadoCaso,
    ) === 'NO_CONTACTADO'
  ) {
    return 'warning';
  }

  return 'info';
}

function formatPhoneDate(
  record: CallCenterResponse,
) {
  if (!record.fechaLlamada) {
    return hasPhoneManagement(record)
      ? 'Consulta el historial'
      : 'Sin intento registrado';
  }

  if (record.horaLlamada) {
    return `${formatDate(
      record.fechaLlamada,
    )} · ${record.horaLlamada.slice(
      0,
      5,
    )}`;
  }

  return formatDate(
    record.fechaLlamada,
  );
}

function hasEncuestador(
  record: CallCenterResponse,
) {
  return Boolean(
    record.encuestadorAsignadoId ||
      record.encuestadorProgramadoId ||
      record.encuestadorAsignadoNombre ||
      record.encuestadorProgramadoNombre,
  );
}

function hasVisitProgramming(
  record: CallCenterResponse,
) {
  const estadoCaso =
    normalizeCode(
      record.estadoCaso,
    );

  const estadoVisita =
    normalizeCode(
      record.estadoVisita,
    );

  return Boolean(
    record.fechaEncuestaProgramada ||
      hasEncuestador(record) ||
      estadoCaso ===
        'ASIGNADO_ENCUESTADOR' ||
      estadoCaso ===
        'VISITA_PROGRAMADA' ||
      estadoCaso ===
        'REPROGRAMADO' ||
      estadoVisita ===
        'PROGRAMADA' ||
      estadoVisita ===
        'REPROGRAMADA',
  );
}

function isVisitFinalResult(
  record: CallCenterResponse,
) {
  const estadoVisita =
    normalizeCode(
      record.estadoVisita,
    );

  return (
    record.encuestaRealizada === true ||
    estadoVisita === 'REALIZADA' ||
    estadoVisita === 'NO_ATENDIDA' ||
    estadoVisita === 'CANCELADA'
  );
}

function isVisitReprogrammed(
  record: CallCenterResponse,
) {
  return (
    normalizeCode(
      record.estadoCaso,
    ) === 'REPROGRAMADO' ||
    normalizeCode(
      record.estadoVisita,
    ) === 'REPROGRAMADA'
  );
}

function isCaseFinalized(
  record: CallCenterResponse,
) {
  const estadoCaso =
    normalizeCode(
      record.estadoCaso,
    );

  return (
    estadoCaso === 'CERRADO' ||
    estadoCaso === 'CANCELADO'
  );
}

function getSurveyResultLabel(
  record: CallCenterResponse,
) {
  if (
    record.encuestaRealizada === true
  ) {
    return 'Realizada';
  }

  if (
    record.encuestaRealizada === false
  ) {
    return 'No realizada';
  }

  return 'Pendiente';
}

function getSurveyResultColor(
  record: CallCenterResponse,
): ChipColor {
  if (
    record.encuestaRealizada === true
  ) {
    return 'success';
  }

  if (
    record.encuestaRealizada === false
  ) {
    return 'warning';
  }

  return 'default';
}

function getNextAction(
  record: CallCenterResponse,
): NextActionInfo {
  const estadoCaso =
    normalizeCode(
      record.estadoCaso,
    );

  if (
    estadoCaso === 'CANCELADO'
  ) {
    return {
      label: 'Solo consulta',
      detail:
        'El caso está cancelado.',
      color: 'default',
    };
  }

  if (
    estadoCaso === 'CERRADO'
  ) {
    return {
      label: 'Caso cerrado',
      detail:
        'El seguimiento terminó formalmente.',
      color: 'success',
    };
  }

  if (
    isVisitReprogrammed(record)
  ) {
    return {
      label: 'Continuar reprogramación',
      detail:
        'El caso permanece abierto para la nueva fecha.',
      color: 'warning',
    };
  }

  if (
    isVisitFinalResult(record)
  ) {
    return {
      label: 'Pendiente de cierre',
      detail:
        'La visita tiene resultado y el caso sigue abierto.',
      color: 'warning',
    };
  }

  const hasPhone =
    hasPhoneManagement(record);

  const hasProgramming =
    hasVisitProgramming(record);

  if (
    !hasPhone &&
    !hasProgramming
  ) {
    return {
      label: 'Llamar y programar',
      detail:
        'Falta llamada, encuestador y programación.',
      color: 'primary',
    };
  }

  if (
    !hasPhone &&
    hasProgramming
  ) {
    return {
      label: 'Registrar llamada',
      detail:
        'La visita está programada; falta el intento telefónico.',
      color: 'warning',
    };
  }

  if (
    hasPhone &&
    !hasProgramming
  ) {
    return {
      label: 'Programar visita',
      detail:
        'Falta asignar encuestador, fecha y hora.',
      color: 'warning',
    };
  }

  return {
    label: 'Esperar resultado',
    detail:
      'La llamada y la visita ya están programadas.',
    color: 'info',
  };
}

function getEstadoColor(
  value?: string | null,
): ChipColor {
  const normalized =
    normalizeCode(value);

  if (
    normalized === 'CERRADO' ||
    normalized ===
      'VISITA_REALIZADA' ||
    normalized === 'REALIZADA'
  ) {
    return 'success';
  }

  if (
    normalized === 'CANCELADO' ||
    normalized === 'CANCELADA'
  ) {
    return 'error';
  }

  if (
    normalized === 'NO_CONTACTADO' ||
    normalized ===
      'VISITA_NO_ATENDIDA' ||
    normalized === 'NO_ATENDIDA' ||
    normalized ===
      'CONTACTADO_SIN_DISPOSICION' ||
    normalized === 'REPROGRAMADO' ||
    normalized === 'REPROGRAMADA'
  ) {
    return 'warning';
  }

  if (
    normalized ===
      'VISITA_PROGRAMADA' ||
    normalized === 'PROGRAMADA' ||
    normalized ===
      'ASIGNADO_ENCUESTADOR'
  ) {
    return 'primary';
  }

  if (
    normalized.includes('PENDIENTE') ||
    normalized.includes('ASIGNADO') ||
    normalized.includes('GESTION')
  ) {
    return 'info';
  }

  return 'default';
}

function normalizeCode(
  value?: string | number | null,
) {
  return String(value ?? '')
    .trim()
    .toUpperCase();
}

function formatLabel(
  value?: string | null,
) {
  return String(
    value ??
      'Sin dato',
  )
    .split('_')
    .join(' ')
    .toLowerCase()
    .replace(
      /^\w/,
      (letter) =>
        letter.toUpperCase(),
    );
}

function formatDate(
  value?: string | null,
) {
  if (!value) {
    return 'Sin fecha';
  }

  const parts =
    value.split('-');

  if (
    parts.length !== 3
  ) {
    return value;
  }

  const [
    year,
    month,
    day,
  ] = parts;

  return `${day}/${month}/${year}`;
}