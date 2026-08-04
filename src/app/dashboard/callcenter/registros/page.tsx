'use client';

import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import RefreshIcon from '@mui/icons-material/Refresh';
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
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableFooter,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';

import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useRouter } from 'next/navigation';

import {
  currentRole,
  type AppRole,
} from '@/lib/roleAccess';

import {
  activateCallCenterRegistro,
  deactivateCallCenterRegistro,
  getCallCenterEncuestadoresOptions,
  getFuncionariosCallCenterOptions,
  searchCallCenter,
} from '@/services/callcenter.service';

import type {
  CallCenterUserOptionResponse,
} from '@/types/callcenter-assignment.types';

import type {
  CallCenterFilter,
  CallCenterOrigenRegistro,
  CallCenterResponse,
} from '@/types/callcenter.types';

import type {
  SelectOption,
} from '@/types/catalog.types';

type SnackbarState = {
  open: boolean;
  message: string;
  severity:
    | 'success'
    | 'error'
    | 'warning'
    | 'info';
};

type ConfirmAction =
  | 'ACTIVATE'
  | 'DEACTIVATE'
  | null;

type BooleanFilterValue =
  | 'ALL'
  | 'true'
  | 'false';

type FilterState = {
  q: string;
  fechaInicio: string;
  fechaFin: string;

  funcionarioCallcenterAsignadoId:
    string;

  encuestadorAsignadoId:
    string;

  origenRegistro:
    | 'ALL'
    | CallCenterOrigenRegistro;

  llamadaConectada:
    BooleanFilterValue;

  activo:
    BooleanFilterValue;

  page: number;
  size: number;
};

const PAGE_SIZE_OPTIONS = [
  10,
  20,
  50,
  100,
];

const SEARCH_DEBOUNCE_MS = 450;

const initialFilter: FilterState = {
  q: '',
  fechaInicio: '',
  fechaFin: '',

  funcionarioCallcenterAsignadoId:
    '',

  encuestadorAsignadoId:
    '',

  origenRegistro:
    'ALL',

  llamadaConectada:
    'ALL',

  activo:
    'true',

  page:
    0,

  size:
    20,
};

function getLocalDateISO(
  date = new Date(),
): string {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1,
    ).padStart(2, '0');

  const day =
    String(
      date.getDate(),
    ).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function buildFuncionarioInitialFilter():
  FilterState {
  const today =
    getLocalDateISO();

  return {
    ...initialFilter,

    fechaInicio:
      today,

    fechaFin:
      today,
  };
}

function toBoolean(
  value: BooleanFilterValue,
): boolean | null {
  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return null;
}

function normalizeText(
  value?: string | null,
): string {
  return value?.trim() ?? '';
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
    data?.content
    ?? data?.items
    ?? data?.data
    ?? []
  );
}

function getTotalElements(
  page: unknown,
  currentLength: number,
): number {
  const data = page as {
    totalElements?: number;
    total?: number;
    totalRecords?: number;
  };

  return (
    data?.totalElements
    ?? data?.total
    ?? data?.totalRecords
    ?? currentLength
  );
}

function isOrigenRegistroFilter(
  value: string,
): value is FilterState['origenRegistro'] {
  return (
    value === 'ALL'
    || value === 'VENTANILLA'
    || value === 'MANUAL'
    || value === 'IMPORTACION'
  );
}

function isBooleanFilterValue(
  value: string,
): value is BooleanFilterValue {
  return (
    value === 'ALL'
    || value === 'true'
    || value === 'false'
  );
}

function origenColor(
  origen?: string | null,
) {
  if (origen === 'VENTANILLA') {
    return 'primary' as const;
  }

  if (origen === 'IMPORTACION') {
    return 'secondary' as const;
  }

  return 'default' as const;
}

function getLlamadaStatus(
  value?: boolean | null,
) {
  if (value === true) {
    return {
      label:
        'Conectada',

      color:
        'success' as const,
    };
  }

  if (value === false) {
    return {
      label:
        'No conectada',

      color:
        'warning' as const,
    };
  }

  return {
    label:
      'Sin registrar',

    color:
      'default' as const,
  };
}

function getVisitaStatus(
  value?: string | null,
) {
  const estado =
    String(
      value ?? 'PENDIENTE',
    )
      .trim()
      .toUpperCase();

  if (estado === 'REALIZADA') {
    return {
      label:
        'Visitada',

      color:
        'success' as const,
    };
  }

  if (estado === 'PROGRAMADA') {
    return {
      label:
        'Programada',

      color:
        'info' as const,
    };
  }

  if (estado === 'REPROGRAMADA') {
    return {
      label:
        'Reprogramada',

      color:
        'warning' as const,
    };
  }

  if (estado === 'NO_ATENDIDA') {
    return {
      label:
        'No atendida',

      color:
        'warning' as const,
    };
  }

  if (estado === 'CANCELADA') {
    return {
      label:
        'Cancelada',

      color:
        'error' as const,
    };
  }

  return {
    label:
      'Pendiente',

    color:
      'default' as const,
  };
}

function getFuncionarioLabel(
  funcionario:
    CallCenterUserOptionResponse,
): string {
  const nombreCompleto =
    funcionario
      .nombreCompleto
      ?.trim();

  if (nombreCompleto) {
    return `${nombreCompleto} (${funcionario.username})`;
  }

  return funcionario.username;
}

function buildFilter(
  filter: FilterState,
): CallCenterFilter {
  const llamadaConectada =
    toBoolean(
      filter.llamadaConectada,
    );

  const activo =
    toBoolean(
      filter.activo,
    );

  return {
    page:
      filter.page,

    size:
      filter.size,

    q:
      normalizeText(
        filter.q,
      ) || undefined,

    fechaInicio:
      filter.fechaInicio
      || undefined,

    fechaFin:
      filter.fechaFin
      || undefined,

    funcionarioCallcenterAsignadoId:
      filter
        .funcionarioCallcenterAsignadoId
      || undefined,

    encuestadorAsignadoId:
      filter.encuestadorAsignadoId
      || undefined,

    origenRegistro:
      filter.origenRegistro === 'ALL'
        ? undefined
        : filter.origenRegistro,

    llamadaConectada:
      llamadaConectada
      ?? undefined,

    activo:
      activo
      ?? undefined,
  };
}

export default function CallCenterRegistrosPage() {
  const router =
    useRouter();

  const [
    role,
    setRole,
  ] = useState<AppRole | ''>('');

  const [
    initialized,
    setInitialized,
  ] = useState(false);

  const [
    records,
    setRecords,
  ] = useState<CallCenterResponse[]>([]);

  const [
    total,
    setTotal,
  ] = useState(0);

  const [
    filter,
    setFilter,
  ] = useState<FilterState>(
    initialFilter,
  );

  const [
    searchText,
    setSearchText,
  ] = useState('');

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    loadingCatalogs,
    setLoadingCatalogs,
  ] = useState(false);

  const [
    encuestadores,
    setEncuestadores,
  ] = useState<SelectOption[]>([]);

  const [
    funcionarios,
    setFuncionarios,
  ] = useState<
    CallCenterUserOptionResponse[]
  >([]);

  const [
    confirmAction,
    setConfirmAction,
  ] = useState<ConfirmAction>(null);

  const [
    selectedRecord,
    setSelectedRecord,
  ] = useState<CallCenterResponse | null>(
    null,
  );

  const [
    snackbar,
    setSnackbar,
  ] = useState<SnackbarState>({
    open:
      false,

    message:
      '',

    severity:
      'success',
  });

  const isAdministrativeRole =
    role === 'ADMIN'
    || role === 'SUPERVISOR'
    || role === 'COORDINADOR_CALLCENTER';

  const isFuncionarioCallCenter =
    role === 'FUNCIONARIO_CALLCENTER';

  const canCreateCompleteRecord =
    role === 'ADMIN'
    || role === 'FUNCIONARIO_CALLCENTER';

  const canViewCompleteInformation =
    role === 'ADMIN'
    || role === 'FUNCIONARIO_CALLCENTER';

  const showMessage =
    useCallback(
      (
        message: string,

        severity:
          SnackbarState['severity'] =
            'success',
      ) => {
        setSnackbar({
          open:
            true,

          message,

          severity,
        });
      },
      [],
    );

  const closeSnackbar = () => {
    setSnackbar(
      (current) => ({
        ...current,

        open:
          false,
      }),
    );
  };

  const load =
    useCallback(
      async () => {
        setLoading(true);

        try {
          const page =
            await searchCallCenter(
              buildFilter(
                filter,
              ),
            );

          const content =
            getPageContent<
              CallCenterResponse
            >(
              page,
            );

          setRecords(
            content,
          );

          setTotal(
            getTotalElements(
              page,
              content.length,
            ),
          );
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : 'No fue posible cargar los registros de Call Center.';

          showMessage(
            message,
            'error',
          );
        } finally {
          setLoading(false);
        }
      },
      [
        filter,
        showMessage,
      ],
    );

  useEffect(() => {
    const detectedRole =
      currentRole();

    setRole(
      detectedRole,
    );

    if (
      detectedRole
      === 'FUNCIONARIO_CALLCENTER'
    ) {
      setFilter(
        buildFuncionarioInitialFilter(),
      );
    } else {
      setFilter(
        initialFilter,
      );
    }

    setInitialized(true);
  }, []);

  useEffect(() => {
    if (!initialized) {
      return;
    }

    void load();
  }, [
    initialized,
    load,
  ]);

  useEffect(() => {
    const timeoutId =
      window.setTimeout(
        () => {
          const normalized =
            normalizeText(
              searchText,
            );

          setFilter(
            (current) => {
              if (
                current.q
                === normalized
              ) {
                return current;
              }

              return {
                ...current,

                q:
                  normalized,

                page:
                  0,
              };
            },
          );
        },
        SEARCH_DEBOUNCE_MS,
      );

    return () => {
      window.clearTimeout(
        timeoutId,
      );
    };
  }, [
    searchText,
  ]);

  useEffect(() => {
    let active =
      true;

    async function loadCatalogs() {
      setLoadingCatalogs(true);

      try {
        const [
          encuestadoresData,
          funcionariosData,
        ] = await Promise.all([
          getCallCenterEncuestadoresOptions(),
          getFuncionariosCallCenterOptions(),
        ]);

        if (!active) {
          return;
        }

        setEncuestadores(
          encuestadoresData,
        );

        setFuncionarios(
          funcionariosData.filter(
            (item) =>
              item.activo !== false,
          ),
        );
      } catch (error) {
        if (!active) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : 'No fue posible cargar los catálogos de filtros.';

        showMessage(
          message,
          'warning',
        );
      } finally {
        if (active) {
          setLoadingCatalogs(false);
        }
      }
    }

    void loadCatalogs();

    return () => {
      active =
        false;
    };
  }, [
    showMessage,
  ]);

  const stats =
    useMemo(
      () => {
        const ventanilla =
          records.filter(
            (item) =>
              item.origenRegistro
              === 'VENTANILLA',
          ).length;

        const manual =
          records.filter(
            (item) =>
              item.origenRegistro
              === 'MANUAL',
          ).length;

        const connected =
          records.filter(
            (item) =>
              item.llamadaConectada
              === true,
          ).length;

        return {
          ventanilla,
          manual,
          connected,
        };
      },
      [
        records,
      ],
    );

  function updateFilter<
    K extends keyof FilterState
  >(
    field: K,
    value: FilterState[K],
  ) {
    setFilter(
      (current) => ({
        ...current,

        [field]:
          value,

        page:
          field === 'page'
            ? Number(value)
            : 0,
      }),
    );
  }

  function handleExactDateChange(
    value: string,
  ) {
    setFilter(
      (current) => ({
        ...current,

        fechaInicio:
          value,

        fechaFin:
          value,

        page:
          0,
      }),
    );
  }

  const handleFuncionarioChange = (
    event:
      ChangeEvent<
        HTMLInputElement
        | HTMLTextAreaElement
      >,
  ) => {
    updateFilter(
      'funcionarioCallcenterAsignadoId',
      event.target.value,
    );
  };

  const handleEncuestadorChange = (
    event:
      ChangeEvent<
        HTMLInputElement
        | HTMLTextAreaElement
      >,
  ) => {
    updateFilter(
      'encuestadorAsignadoId',
      event.target.value,
    );
  };

  const handleOrigenRegistroChange = (
    event:
      ChangeEvent<
        HTMLInputElement
        | HTMLTextAreaElement
      >,
  ) => {
    const value =
      event.target.value;

    if (
      !isOrigenRegistroFilter(
        value,
      )
    ) {
      return;
    }

    updateFilter(
      'origenRegistro',
      value,
    );
  };

  const handleLlamadaConectadaChange = (
    event:
      ChangeEvent<
        HTMLInputElement
        | HTMLTextAreaElement
      >,
  ) => {
    const value =
      event.target.value;

    if (
      !isBooleanFilterValue(
        value,
      )
    ) {
      return;
    }

    updateFilter(
      'llamadaConectada',
      value,
    );
  };

  const handleActivoChange = (
    event:
      ChangeEvent<
        HTMLInputElement
        | HTMLTextAreaElement
      >,
  ) => {
    const value =
      event.target.value;

    if (
      !isBooleanFilterValue(
        value,
      )
    ) {
      return;
    }

    updateFilter(
      'activo',
      value,
    );
  };

  const clearFilters = () => {
    setSearchText('');

    if (
      isFuncionarioCallCenter
    ) {
      setFilter(
        buildFuncionarioInitialFilter(),
      );

      return;
    }

    setFilter(
      initialFilter,
    );
  };

  const applySearchImmediately = () => {
    setFilter(
      (current) => ({
        ...current,

        q:
          normalizeText(
            searchText,
          ),

        page:
          0,
      }),
    );
  };

  const openConfirm = (
    record:
      CallCenterResponse,

    action:
      ConfirmAction,
  ) => {
    setSelectedRecord(
      record,
    );

    setConfirmAction(
      action,
    );
  };

  const closeConfirm = () => {
    setSelectedRecord(
      null,
    );

    setConfirmAction(
      null,
    );
  };

  const confirmStatusChange =
    async () => {
      if (
        !selectedRecord
        || !confirmAction
      ) {
        return;
      }

      try {
        if (
          confirmAction
          === 'ACTIVATE'
        ) {
          await activateCallCenterRegistro(
            selectedRecord.id,
          );

          showMessage(
            'Registro activado correctamente.',
            'success',
          );
        }

        if (
          confirmAction
          === 'DEACTIVATE'
        ) {
          await deactivateCallCenterRegistro(
            selectedRecord.id,
          );

          showMessage(
            'Registro inactivado correctamente.',
            'success',
          );
        }

        closeConfirm();

        await load();
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'No fue posible cambiar el estado del registro.';

        showMessage(
          message,
          'error',
        );
      }
    };

  const handlePageChange = (
    _: unknown,
    page: number,
  ) => {
    setFilter(
      (current) => ({
        ...current,

        page,
      }),
    );
  };

  const handleRowsPerPageChange = (
    event:
      ChangeEvent<HTMLInputElement>,
  ) => {
    setFilter(
      (current) => ({
        ...current,

        page:
          0,

        size:
          Number(
            event.target.value,
          ),
      }),
    );
  };

  if (!initialized) {
    return (
      <Paper
        sx={{
          p:
            3,
        }}
      >
        <Alert severity="info">
          Cargando vista de registros Call Center...
        </Alert>
      </Paper>
    );
  }

  return (
    <Box>
      <Stack spacing={3}>
        <Box
          sx={{
            display:
              'flex',

            flexDirection: {
              xs:
                'column',

              md:
                'row',
            },

            justifyContent:
              'space-between',

            alignItems: {
              xs:
                'stretch',

              md:
                'flex-start',
            },

            gap:
              2,
          }}
        >
          <Box>
            <Typography
              variant="h5"
              sx={{
                fontWeight:
                  800,
              }}
            >
              Registros Call Center
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
            >
              Consulta ciudadanos, llamadas y visitas
              registradas en el módulo Call Center.
            </Typography>
          </Box>

          <Box
            sx={{
              display:
                'flex',

              flexDirection: {
                xs:
                  'column',

                sm:
                  'row',
              },

              gap:
                1,
            }}
          >
            <Button
              variant="outlined"
              startIcon={
                <RefreshIcon />
              }
              onClick={() => {
                void load();
              }}
              disabled={
                loading
              }
            >
              Actualizar
            </Button>

            {canCreateCompleteRecord ? (
              <Button
                variant="contained"
                startIcon={
                  <AddIcon />
                }
                onClick={() => {
                  router.push(
                    '/dashboard/callcenter/registros/nuevo',
                  );
                }}
              >
                Nuevo registro
              </Button>
            ) : null}
          </Box>
        </Box>

        {isFuncionarioCallCenter ? (
          <Alert severity="info">
            Consulta los registros de todos los funcionarios
            Call Center correspondientes a la fecha
            seleccionada. También puedes filtrar por
            funcionario responsable y encuestador.
          </Alert>
        ) : null}

        {!isFuncionarioCallCenter ? (
          <Box
            sx={{
              display:
                'grid',

              gridTemplateColumns: {
                xs:
                  '1fr',

                sm:
                  'repeat(2, 1fr)',

                md:
                  'repeat(4, 1fr)',
              },

              gap:
                2,
            }}
          >
            <Card>
              <CardContent>
                <Typography
                  variant="body2"
                  color="text.secondary"
                >
                  Total página
                </Typography>

                <Typography
                  variant="h5"
                  sx={{
                    fontWeight:
                      800,
                  }}
                >
                  {records.length}
                </Typography>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography
                  variant="body2"
                  color="text.secondary"
                >
                  Desde Ventanilla
                </Typography>

                <Typography
                  variant="h5"
                  sx={{
                    fontWeight:
                      800,
                  }}
                >
                  {stats.ventanilla}
                </Typography>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography
                  variant="body2"
                  color="text.secondary"
                >
                  Manuales
                </Typography>

                <Typography
                  variant="h5"
                  sx={{
                    fontWeight:
                      800,
                  }}
                >
                  {stats.manual}
                </Typography>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography
                  variant="body2"
                  color="text.secondary"
                >
                  Llamadas conectadas
                </Typography>

                <Typography
                  variant="h5"
                  sx={{
                    fontWeight:
                      800,
                  }}
                >
                  {stats.connected}
                </Typography>
              </CardContent>
            </Card>
          </Box>
        ) : null}

        <Paper
          sx={{
            p: {
              xs:
                2,

              md:
                2.5,
            },
          }}
        >
          {isFuncionarioCallCenter ? (
            <Box
              sx={{
                display:
                  'flex',

                flexDirection:
                  'column',

                gap:
                  2,
              }}
            >
              <Box>
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight:
                      800,
                  }}
                >
                  Consultar registros diarios
                </Typography>

                <Typography
                  variant="body2"
                  color="text.secondary"
                >
                  Selecciona la fecha, el funcionario Call
                  Center o el encuestador para consultar los
                  registros.
                </Typography>
              </Box>

              <Box
                sx={{
                  display:
                    'grid',

                  gridTemplateColumns: {
                    xs:
                      '1fr',

                    md:
                      'repeat(2, minmax(0, 1fr))',

                    xl:
                      'minmax(260px, 1.4fr) '
                      + 'minmax(210px, 0.8fr) '
                      + 'minmax(220px, 0.9fr) '
                      + 'minmax(220px, 0.9fr) '
                      + 'auto',
                  },

                  alignItems:
                    'start',

                  gap:
                    2,
                }}
              >
                <TextField
                  label="Buscar ciudadano o caso"
                  placeholder={
                    'Nombre, cédula, teléfono, dirección u observación'
                  }
                  value={
                    searchText
                  }
                  onChange={(event) => {
                    setSearchText(
                      event.target.value,
                    );
                  }}
                  onKeyDown={(event) => {
                    if (
                      event.key
                      === 'Enter'
                    ) {
                      applySearchImmediately();
                    }
                  }}
                  fullWidth
                  size="medium"
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon />
                        </InputAdornment>
                      ),
                    },
                  }}
                  sx={{
                    '& .MuiInputBase-root': {
                      minHeight:
                        56,
                    },
                  }}
                />

                <TextField
                  label="Fecha del registro"
                  type="date"
                  value={
                    filter.fechaInicio
                  }
                  onChange={(event) => {
                    handleExactDateChange(
                      event.target.value,
                    );
                  }}
                  fullWidth
                  size="medium"
                  slotProps={{
                    inputLabel: {
                      shrink:
                        true,
                    },

                    htmlInput: {
                      max:
                        getLocalDateISO(),
                    },
                  }}
                  sx={{
                    '& .MuiInputBase-root': {
                      minHeight:
                        56,
                    },

                    '& input': {
                      fontSize:
                        '1rem',

                      fontWeight:
                        700,

                      cursor:
                        'pointer',
                    },
                  }}
                />

                <TextField
                  label="Funcionario Call Center"
                  select
                  value={
                    filter
                      .funcionarioCallcenterAsignadoId
                  }
                  onChange={
                    handleFuncionarioChange
                  }
                  fullWidth
                  size="medium"
                  disabled={
                    loadingCatalogs
                  }
                  sx={{
                    '& .MuiInputBase-root': {
                      minHeight:
                        56,
                    },
                  }}
                >
                  <MenuItem value="">
                    Todos los funcionarios
                  </MenuItem>

                  {funcionarios.map(
                    (funcionario) => (
                      <MenuItem
                        key={
                          funcionario.id
                        }
                        value={
                          String(
                            funcionario.id,
                          )
                        }
                      >
                        {
                          getFuncionarioLabel(
                            funcionario,
                          )
                        }
                      </MenuItem>
                    ),
                  )}
                </TextField>

                <TextField
                  label="Encuestador"
                  select
                  value={
                    filter
                      .encuestadorAsignadoId
                  }
                  onChange={
                    handleEncuestadorChange
                  }
                  fullWidth
                  size="medium"
                  disabled={
                    loadingCatalogs
                  }
                  sx={{
                    '& .MuiInputBase-root': {
                      minHeight:
                        56,
                    },
                  }}
                >
                  <MenuItem value="">
                    Todos los encuestadores
                  </MenuItem>

                  {encuestadores.map(
                    (encuestador) => (
                      <MenuItem
                        key={
                          encuestador.id
                        }
                        value={
                          String(
                            encuestador.id,
                          )
                        }
                      >
                        {encuestador.label}
                      </MenuItem>
                    ),
                  )}
                </TextField>

                <Button
                  variant="outlined"
                  startIcon={
                    <RestartAltIcon />
                  }
                  onClick={
                    clearFilters
                  }
                  sx={{
                    minWidth:
                      160,

                    minHeight:
                      56,

                    width: {
                      xs:
                        '100%',

                      xl:
                        'auto',
                    },
                  }}
                >
                  Restablecer
                </Button>
              </Box>
            </Box>
          ) : isAdministrativeRole ? (
            <Stack spacing={2}>
              <Box
                sx={{
                  display:
                    'flex',

                  flexDirection: {
                    xs:
                      'column',

                    md:
                      'row',
                  },

                  alignItems: {
                    xs:
                      'stretch',

                    md:
                      'center',
                  },

                  flexWrap: {
                    xs:
                      'nowrap',

                    md:
                      'wrap',
                  },

                  gap:
                    2,
                }}
              >
                <TextField
                  label="Buscar ciudadano o caso"
                  placeholder={
                    'Nombre, cédula, teléfono, dirección, observación o estado'
                  }
                  value={
                    searchText
                  }
                  onChange={(event) => {
                    setSearchText(
                      event.target.value,
                    );
                  }}
                  onKeyDown={(event) => {
                    if (
                      event.key
                      === 'Enter'
                    ) {
                      applySearchImmediately();
                    }
                  }}
                  fullWidth
                  size="small"
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" />
                        </InputAdornment>
                      ),
                    },
                  }}
                  sx={{
                    minWidth: {
                      xs:
                        '100%',

                      md:
                        280,
                    },

                    flex: {
                      md:
                        1,
                    },
                  }}
                />

                <TextField
                  label="Encuestador asignado"
                  select
                  value={
                    filter
                      .encuestadorAsignadoId
                  }
                  onChange={
                    handleEncuestadorChange
                  }
                  size="small"
                  sx={{
                    width: {
                      xs:
                        '100%',

                      md:
                        250,
                    },

                    flexShrink:
                      0,
                  }}
                >
                  <MenuItem value="">
                    Todos los encuestadores
                  </MenuItem>

                  {encuestadores.map(
                    (option) => (
                      <MenuItem
                        key={
                          option.id
                        }
                        value={
                          String(
                            option.id,
                          )
                        }
                      >
                        {option.label}
                      </MenuItem>
                    ),
                  )}
                </TextField>

                <TextField
                  label="Fecha llamada desde"
                  type="date"
                  value={
                    filter.fechaInicio
                  }
                  onChange={(event) => {
                    updateFilter(
                      'fechaInicio',
                      event.target.value,
                    );
                  }}
                  size="small"
                  sx={{
                    width: {
                      xs:
                        '100%',

                      md:
                        190,
                    },

                    flexShrink:
                      0,
                  }}
                  slotProps={{
                    inputLabel: {
                      shrink:
                        true,
                    },
                  }}
                />

                <TextField
                  label="Fecha llamada hasta"
                  type="date"
                  value={
                    filter.fechaFin
                  }
                  onChange={(event) => {
                    updateFilter(
                      'fechaFin',
                      event.target.value,
                    );
                  }}
                  size="small"
                  sx={{
                    width: {
                      xs:
                        '100%',

                      md:
                        190,
                    },

                    flexShrink:
                      0,
                  }}
                  slotProps={{
                    inputLabel: {
                      shrink:
                        true,
                    },
                  }}
                />
              </Box>

              <Box
                sx={{
                  display:
                    'flex',

                  flexDirection: {
                    xs:
                      'column',

                    md:
                      'row',
                  },

                  alignItems: {
                    xs:
                      'stretch',

                    md:
                      'center',
                  },

                  flexWrap: {
                    xs:
                      'nowrap',

                    md:
                      'wrap',
                  },

                  gap:
                    2,
                }}
              >
                <TextField
                  label="Origen"
                  select
                  value={
                    filter.origenRegistro
                  }
                  onChange={
                    handleOrigenRegistroChange
                  }
                  size="small"
                  sx={{
                    width: {
                      xs:
                        '100%',

                      md:
                        180,
                    },

                    flexShrink:
                      0,
                  }}
                >
                  <MenuItem value="ALL">
                    Todos
                  </MenuItem>

                  <MenuItem value="VENTANILLA">
                    Ventanilla
                  </MenuItem>

                  <MenuItem value="MANUAL">
                    Manual
                  </MenuItem>

                  <MenuItem value="IMPORTACION">
                    Importación
                  </MenuItem>
                </TextField>

                <TextField
                  label="Resultado llamada"
                  select
                  value={
                    filter
                      .llamadaConectada
                  }
                  onChange={
                    handleLlamadaConectadaChange
                  }
                  size="small"
                  sx={{
                    width: {
                      xs:
                        '100%',

                      md:
                        190,
                    },

                    flexShrink:
                      0,
                  }}
                >
                  <MenuItem value="ALL">
                    Todas
                  </MenuItem>

                  <MenuItem value="true">
                    Conectada
                  </MenuItem>

                  <MenuItem value="false">
                    No conectada
                  </MenuItem>
                </TextField>

                <TextField
                  label="Estado lógico"
                  select
                  value={
                    filter.activo
                  }
                  onChange={
                    handleActivoChange
                  }
                  size="small"
                  sx={{
                    width: {
                      xs:
                        '100%',

                      md:
                        170,
                    },

                    flexShrink:
                      0,
                  }}
                >
                  <MenuItem value="true">
                    Activos
                  </MenuItem>

                  <MenuItem value="false">
                    Inactivos
                  </MenuItem>

                  <MenuItem value="ALL">
                    Todos
                  </MenuItem>
                </TextField>

                <Button
                  variant="outlined"
                  startIcon={
                    <RestartAltIcon />
                  }
                  onClick={
                    clearFilters
                  }
                  sx={{
                    minWidth:
                      170,

                    width: {
                      xs:
                        '100%',

                      md:
                        'auto',
                    },

                    flexShrink:
                      0,
                  }}
                >
                  Limpiar filtros
                </Button>
              </Box>
            </Stack>
          ) : (
            <TextField
              label="Buscar ciudadano o caso"
              placeholder={
                'Nombre, cédula, teléfono, dirección u observación'
              }
              value={
                searchText
              }
              onChange={(event) => {
                setSearchText(
                  event.target.value,
                );
              }}
              fullWidth
              size="small"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                },
              }}
            />
          )}
        </Paper>

        {loading ? (
          <Paper
            sx={{
              p:
                3,
            }}
          >
            <Alert severity="info">
              Cargando registros de Call Center...
            </Alert>
          </Paper>
        ) : records.length === 0 ? (
          <Paper
            sx={{
              p:
                3,
            }}
          >
            <Alert severity="info">
              No se encontraron registros de Call Center
              con los filtros actuales.
            </Alert>
          </Paper>
        ) : (
          <Paper>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>
                      Fecha
                    </TableCell>

                    <TableCell>
                      Origen
                    </TableCell>

                    <TableCell>
                      Ciudadano
                    </TableCell>

                    <TableCell>
                      Teléfono
                    </TableCell>

                    <TableCell>
                      Dirección
                    </TableCell>

                    <TableCell>
                      Llamada
                    </TableCell>

                    <TableCell>
                      Funcionario Call Center
                    </TableCell>

                    <TableCell>
                      Encuestador
                    </TableCell>

                    <TableCell>
                      Visita
                    </TableCell>

                    <TableCell align="right">
                      Acciones
                    </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {records.map(
                    (record) => {
                      const llamada =
                        getLlamadaStatus(
                          record
                            .llamadaConectada,
                        );

                      const visita =
                        getVisitaStatus(
                          record
                            .estadoVisita,
                        );

                      const funcionarioCallCenter =
                        record
                          .funcionarioCallcenterAsignadoNombre
                        || record
                          .funcionarioCallcenterAsignadoUsername
                        || 'Sin funcionario';

                      return (
                        <TableRow
                          key={
                            record.id
                          }
                          hover
                        >
                          <TableCell>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight:
                                  700,
                              }}
                            >
                              {
                                record.fechaLlamada
                                || 'Sin fecha'
                              }
                            </Typography>

                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {
                                record
                                  .horaLlamada
                                  ?.slice(
                                    0,
                                    5,
                                  )
                                || 'Sin hora'
                              }
                            </Typography>
                          </TableCell>

                          <TableCell>
                            <Stack spacing={0.5}>
                              <Chip
                                size="small"
                                label={
                                  record
                                    .origenRegistro
                                  || 'MANUAL'
                                }
                                color={
                                  origenColor(
                                    record
                                      .origenRegistro,
                                  )
                                }
                              />

                              {
                                record
                                  .ventanillaNumeroVentanilla
                                ? (
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    Ventanilla{' '}
                                    {
                                      record
                                        .ventanillaNumeroVentanilla
                                    }
                                  </Typography>
                                )
                                : null
                              }
                            </Stack>
                          </TableCell>

                          <TableCell>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight:
                                  700,
                              }}
                            >
                              {
                                record
                                  .nombreCompleto
                                || 'Sin nombre'
                              }
                            </Typography>

                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              C.C.{' '}
                              {
                                record
                                  .cedulaSolicitante
                                || 'Sin dato'
                              }
                            </Typography>
                          </TableCell>

                          <TableCell>
                            {
                              record.telefono
                              || 'Sin dato'
                            }
                          </TableCell>

                          <TableCell>
                            <Typography variant="body2">
                              {
                                record
                                  .direccionTexto
                                || 'Sin dirección'
                              }
                            </Typography>

                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {
                                record
                                  .barrioNombre
                                || 'Sin barrio'
                              }
                            </Typography>
                          </TableCell>

                          <TableCell>
                            <Chip
                              size="small"
                              color={
                                llamada.color
                              }
                              label={
                                llamada.label
                              }
                            />
                          </TableCell>

                          <TableCell>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight:
                                  700,

                                minWidth:
                                  150,
                              }}
                            >
                              {funcionarioCallCenter}
                            </Typography>

                            {
                              record
                                .funcionarioCallcenterAsignadoUsername
                              && record
                                .funcionarioCallcenterAsignadoNombre
                              ? (
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  {
                                    record
                                      .funcionarioCallcenterAsignadoUsername
                                  }
                                </Typography>
                              )
                              : null
                            }
                          </TableCell>

                          <TableCell>
                            {
                              record
                                .encuestadorAsignadoNombre
                              || record
                                .encuestadorProgramadoNombre
                              || 'Sin asignar'
                            }
                          </TableCell>

                          <TableCell>
                            <Chip
                              size="small"
                              variant="outlined"
                              color={
                                visita.color
                              }
                              label={
                                visita.label
                              }
                            />
                          </TableCell>

                          <TableCell align="right">
                            <Box
                              sx={{
                                display:
                                  'flex',

                                justifyContent:
                                  'flex-end',

                                alignItems:
                                  'center',

                                flexWrap:
                                  'wrap',

                                gap:
                                  0.5,
                              }}
                            >
                              {
                                canViewCompleteInformation
                                ? (
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={
                                      <VisibilityIcon />
                                    }
                                    onClick={() => {
                                      router.push(
                                        `/dashboard/callcenter/mis-registros/${record.id}`,
                                      );
                                    }}
                                  >
                                    Ver información
                                  </Button>
                                )
                                : null
                              }

                              {
                                isAdministrativeRole
                                ? (
                                  <Tooltip title="Editar">
                                    <IconButton
                                      size="small"
                                      onClick={() => {
                                        router.push(
                                          `/dashboard/callcenter/registros/nuevo?id=${record.id}`,
                                        );
                                      }}
                                    >
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                )
                                : null
                              }

                              {
                                isAdministrativeRole
                                && record.activo
                                ? (
                                  <Tooltip title="Inactivar">
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() => {
                                        openConfirm(
                                          record,
                                          'DEACTIVATE',
                                        );
                                      }}
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                )
                                : null
                              }

                              {
                                isAdministrativeRole
                                && !record.activo
                                ? (
                                  <Tooltip title="Activar">
                                    <IconButton
                                      size="small"
                                      color="success"
                                      onClick={() => {
                                        openConfirm(
                                          record,
                                          'ACTIVATE',
                                        );
                                      }}
                                    >
                                      <CheckCircleIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                )
                                : null
                              }
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    },
                  )}
                </TableBody>

                <TableFooter>
                  <TableRow>
                    <TablePagination
                      colSpan={10}
                      count={
                        total
                      }
                      page={
                        filter.page
                      }
                      rowsPerPage={
                        filter.size
                      }
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
                  </TableRow>
                </TableFooter>
              </Table>
            </TableContainer>
          </Paper>
        )}
      </Stack>

      <Dialog
        open={
          Boolean(
            confirmAction,
          )
        }
        onClose={
          closeConfirm
        }
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>
          {
            confirmAction
            === 'ACTIVATE'
              ? 'Activar registro'
              : 'Inactivar registro'
          }
        </DialogTitle>

        <DialogContent dividers>
          <Typography variant="body2">
            Confirma la acción para el registro de{' '}
            <strong>
              {
                selectedRecord
                  ?.nombreCompleto
              }
            </strong>
            .
          </Typography>
        </DialogContent>

        <DialogActions>
          <Button
            onClick={
              closeConfirm
            }
          >
            Cancelar
          </Button>

          <Button
            variant="contained"
            color={
              confirmAction
              === 'ACTIVATE'
                ? 'success'
                : 'error'
            }
            onClick={() => {
              void confirmStatusChange();
            }}
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={
          snackbar.open
        }
        autoHideDuration={5000}
        onClose={
          closeSnackbar
        }
        anchorOrigin={{
          vertical:
            'bottom',

          horizontal:
            'right',
        }}
      >
        <Alert
          severity={
            snackbar.severity
          }
          onClose={
            closeSnackbar
          }
          sx={{
            width:
              '100%',
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}