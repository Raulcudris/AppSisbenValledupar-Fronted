'use client';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import PersonIcon from '@mui/icons-material/Person';
import PhoneIcon from '@mui/icons-material/Phone';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableFooter,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type ReactNode,
} from 'react';

import {
  asignarFuncionarioCallCenter,
  getFuncionariosCallCenterOptions,
  getPendientesAsignarFuncionarioCallCenter,
  searchCallCenter,
} from '@/services/callcenter.service';
import type { PageResponse } from '@/types/api.types';
import type { CallCenterUserOptionResponse } from '@/types/callcenter-assignment.types';
import type { CallCenterResponse } from '@/types/callcenter.types';

type SnackbarState = {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'warning' | 'info';
};

type ChipColor =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'error'
  | 'info'
  | 'success'
  | 'warning';

type AssignedFilterState = {
  funcionarioId: string;
  q: string;
};

const PENDING_PAGE_SIZE = 20;
const ASSIGNED_PAGE_SIZE = 10;

const PAGE_SIZE_OPTIONS = [
  10,
  20,
  50,
  100,
];

const initialAssignedFilters: AssignedFilterState = {
  funcionarioId: '',
  q: '',
};

/**
 * Distribuye casos pendientes entre los funcionarios Call Center
 * y permite consultar los casos activos ya asignados.
 */
export default function AsignarFuncionariosCallCenterPage() {
  const router = useRouter();

  const [pageData, setPageData] =
    useState<PageResponse<CallCenterResponse> | null>(null);

  const [assignedPageData, setAssignedPageData] =
    useState<PageResponse<CallCenterResponse> | null>(null);

  const [funcionarios, setFuncionarios] =
    useState<CallCenterUserOptionResponse[]>([]);

  const [selectedIds, setSelectedIds] =
    useState<number[]>([]);

  const [funcionarioId, setFuncionarioId] =
    useState('');

  const [
    assignedFuncionarioId,
    setAssignedFuncionarioId,
  ] = useState('');

  const [
    assignedSearchText,
    setAssignedSearchText,
  ] = useState('');

  const [
    appliedAssignedFilters,
    setAppliedAssignedFilters,
  ] = useState<AssignedFilterState>(
    initialAssignedFilters,
  );

  const [loadingPending, setLoadingPending] =
    useState(false);

  const [loadingAssigned, setLoadingAssigned] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [confirmOpen, setConfirmOpen] =
    useState(false);

  const [snackbar, setSnackbar] =
    useState<SnackbarState>({
      open: false,
      message: '',
      severity: 'success',
    });

  const records =
    pageData?.content ?? [];

  const page =
    pageData?.page ?? 0;

  const size =
    pageData?.size ?? PENDING_PAGE_SIZE;

  const total =
    pageData?.totalElements ?? 0;

  const assignedRecords =
    assignedPageData?.content ?? [];

  const assignedPage =
    assignedPageData?.page ?? 0;

  const assignedSize =
    assignedPageData?.size ?? ASSIGNED_PAGE_SIZE;

  const assignedTotal =
    assignedPageData?.totalElements ?? 0;

  const allVisibleSelected =
    records.length > 0 &&
    records.every((record) =>
      selectedIds.includes(record.id),
    );

  const someVisibleSelected =
    records.some((record) =>
      selectedIds.includes(record.id),
    );

  const selectedCount =
    selectedIds.length;

  const selectedFuncionario = useMemo(
    () =>
      funcionarios.find(
        (item) =>
          String(item.id) === funcionarioId,
      ),
    [funcionarios, funcionarioId],
  );

  const selectedFuncionarioName =
    getFuncionarioLabel(
      selectedFuncionario,
    );

  const appliedAssignedFuncionario = useMemo(
    () =>
      funcionarios.find(
        (item) =>
          String(item.id) ===
          appliedAssignedFilters.funcionarioId,
      ),
    [
      funcionarios,
      appliedAssignedFilters.funcionarioId,
    ],
  );

  const appliedAssignedFuncionarioName =
    getFuncionarioLabel(
      appliedAssignedFuncionario,
    );

  const assignedHasFilters = Boolean(
    assignedFuncionarioId ||
    assignedSearchText.trim() ||
    appliedAssignedFilters.funcionarioId ||
    appliedAssignedFilters.q,
  );

  const assignedFiltersChanged =
    assignedFuncionarioId !==
    appliedAssignedFilters.funcionarioId ||
    assignedSearchText.trim() !==
    appliedAssignedFilters.q;

  useEffect(() => {
    void loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadInitialData() {
    await Promise.all([
      loadCatalogs(),
      loadPending(
        0,
        PENDING_PAGE_SIZE,
      ),
    ]);
  }

  function showMessage(
    message: string,
    severity: SnackbarState['severity'] = 'success',
  ) {
    setSnackbar({
      open: true,
      message,
      severity,
    });
  }

  function closeSnackbar() {
    setSnackbar((current) => ({
      ...current,
      open: false,
    }));
  }

  /**
   * Carga funcionarios activos disponibles para recibir casos.
   */
  async function loadCatalogs() {
    try {
      const data =
        await getFuncionariosCallCenterOptions();

      setFuncionarios(data);
    } catch {
      showMessage(
        'No fue posible cargar los funcionarios Call Center.',
        'warning',
      );
    }
  }

  /**
   * Carga los casos que todavía no tienen funcionario asignado.
   *
   * La selección se limpia al cambiar de página para evitar que
   * el usuario crea que está asignando registros no visibles.
   */
  async function loadPending(
    nextPage = 0,
    nextSize = PENDING_PAGE_SIZE,
  ) {
    setLoadingPending(true);

    try {
      const response =
        await getPendientesAsignarFuncionarioCallCenter({
          page: nextPage,
          size: nextSize,
        });

      setPageData(response);
      setSelectedIds([]);
    } catch (error) {
      showMessage(
        getErrorMessage(
          error,
          'No fue posible cargar los casos pendientes de distribución.',
        ),
        'error',
      );
    } finally {
      setLoadingPending(false);
    }
  }

  /**
   * Consulta casos activos ya asignados a un funcionario.
   */
  async function loadAssigned(
    nextPage = 0,
    nextSize = ASSIGNED_PAGE_SIZE,
    filters: AssignedFilterState =
      appliedAssignedFilters,
  ) {
    if (!filters.funcionarioId) {
      setAssignedPageData(null);
      return;
    }

    setLoadingAssigned(true);

    try {
      const response =
        await searchCallCenter({
          page: nextPage,
          size: nextSize,
          q:
            filters.q.trim() ||
            undefined,
          funcionarioCallcenterAsignadoId:
            Number(filters.funcionarioId),
          activo: true,
        });

      setAssignedPageData(response);
    } catch (error) {
      showMessage(
        getErrorMessage(
          error,
          'No fue posible consultar los casos asignados al funcionario.',
        ),
        'error',
      );
    } finally {
      setLoadingAssigned(false);
    }
  }

  /**
   * Refresca las dos consultas sin modificar filtros ni paginación.
   */
  async function refreshData() {
    const requests: Promise<unknown>[] = [
      loadPending(page, size),
    ];

    if (
      appliedAssignedFilters.funcionarioId
    ) {
      requests.push(
        loadAssigned(
          assignedPage,
          assignedSize,
          appliedAssignedFilters,
        ),
      );
    }

    await Promise.all(requests);
  }

  function toggleRecord(
    id: number,
  ) {
    if (
      saving ||
      loadingPending
    ) {
      return;
    }

    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter(
          (item) => item !== id,
        )
        : [
          ...current,
          id,
        ],
    );
  }

  function toggleAllVisible() {
    if (
      saving ||
      loadingPending
    ) {
      return;
    }

    const visibleIds =
      records.map(
        (record) => record.id,
      );

    if (allVisibleSelected) {
      setSelectedIds((current) =>
        current.filter(
          (id) =>
            !visibleIds.includes(id),
        ),
      );

      return;
    }

    setSelectedIds((current) =>
      Array.from(
        new Set([
          ...current,
          ...visibleIds,
        ]),
      ),
    );
  }

  /**
   * Valida los datos y abre la confirmación de asignación.
   */
  function requestAssignment() {
    if (!funcionarioId) {
      showMessage(
        'Selecciona el funcionario Call Center.',
        'warning',
      );
      return;
    }

    if (selectedIds.length === 0) {
      showMessage(
        'Selecciona al menos un caso pendiente.',
        'warning',
      );
      return;
    }

    setConfirmOpen(true);
  }

  function closeAssignmentConfirmation() {
    if (saving) {
      return;
    }

    setConfirmOpen(false);
  }

  /**
   * Ejecuta la asignación masiva con el contrato confirmado.
   */
  async function assign() {
    if (
      !funcionarioId ||
      selectedIds.length === 0
    ) {
      return;
    }

    const targetFuncionarioId =
      funcionarioId;

    const targetFuncionarioName =
      selectedFuncionarioName;

    const assignedCount =
      selectedIds.length;

    setSaving(true);

    try {
      await asignarFuncionarioCallCenter({
        funcionarioCallcenterId:
          Number(targetFuncionarioId),
        registroIds: selectedIds,
      });

      const nextAssignedFilters: AssignedFilterState = {
        funcionarioId:
          targetFuncionarioId,
        q: '',
      };

      setConfirmOpen(false);
      setAssignedFuncionarioId(
        targetFuncionarioId,
      );
      setAssignedSearchText('');
      setAppliedAssignedFilters(
        nextAssignedFilters,
      );
      setFuncionarioId('');

      showMessage(
        `${assignedCount} caso(s) asignado(s) correctamente a ${targetFuncionarioName}.`,
        'success',
      );

      await Promise.all([
        loadPending(
          page,
          size,
        ),
        loadAssigned(
          0,
          assignedSize,
          nextAssignedFilters,
        ),
      ]);
    } catch (error) {
      showMessage(
        getErrorMessage(
          error,
          'No fue posible asignar los casos seleccionados.',
        ),
        'error',
      );
    } finally {
      setSaving(false);
    }
  }

  function searchAssigned() {
    if (!assignedFuncionarioId) {
      showMessage(
        'Selecciona un funcionario para consultar sus casos asignados.',
        'warning',
      );
      return;
    }

    const nextFilters: AssignedFilterState = {
      funcionarioId:
        assignedFuncionarioId,
      q:
        assignedSearchText.trim(),
    };

    setAppliedAssignedFilters(
      nextFilters,
    );

    void loadAssigned(
      0,
      assignedSize,
      nextFilters,
    );
  }

  function clearAssignedFilters() {
    setAssignedFuncionarioId('');
    setAssignedSearchText('');
    setAppliedAssignedFilters(
      initialAssignedFilters,
    );
    setAssignedPageData(null);
  }

  function handlePageChange(
    _: unknown,
    nextPage: number,
  ) {
    void loadPending(
      nextPage,
      size,
    );
  }

  function handleRowsPerPageChange(
    event: ChangeEvent<
      HTMLInputElement |
      HTMLTextAreaElement
    >,
  ) {
    void loadPending(
      0,
      Number(event.target.value),
    );
  }

  function handleAssignedPageChange(
    _: unknown,
    nextPage: number,
  ) {
    void loadAssigned(
      nextPage,
      assignedSize,
      appliedAssignedFilters,
    );
  }

  function handleAssignedRowsPerPageChange(
    event: ChangeEvent<
      HTMLInputElement |
      HTMLTextAreaElement
    >,
  ) {
    void loadAssigned(
      0,
      Number(event.target.value),
      appliedAssignedFilters,
    );
  }

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: {
              xs: 'column',
              md: 'row',
            },
            gap: 2,
            justifyContent:
              'space-between',
          }}
        >
          <Box>
            <Typography
              component="h1"
              variant="h5"
              sx={{ fontWeight: 800 }}
            >
              Distribuir casos
            </Typography>

            <Typography
              component="p"
              variant="body2"
              sx={{
                color: 'text.secondary',
                mt: 0.5,
              }}
            >
              Asigna los casos pendientes a los funcionarios
              responsables de realizar la gestión telefónica.
            </Typography>
          </Box>

          <Box
            sx={{
              display: 'flex',
              flexDirection: {
                xs: 'column',
                sm: 'row',
              },
              gap: 1,
            }}
          >
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() =>
                router.push(
                  '/dashboard/callcenter',
                )
              }
            >
              Volver a Call Center
            </Button>

            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() =>
                void refreshData()
              }
              disabled={
                loadingPending ||
                loadingAssigned ||
                saving
              }
            >
              Actualizar
            </Button>
          </Box>
        </Box>

        <Alert severity="info">
          <Typography
            component="p"
            variant="body2"
            sx={{ fontWeight: 800 }}
          >
            Esta pantalla distribuye únicamente casos pendientes.
          </Typography>

          <Typography
            component="p"
            variant="body2"
          >
            Los casos ya asignados se muestran solo para consulta.
            La gestión de llamadas corresponde a la bandeja
            <strong> Casos por gestionar</strong>.
          </Typography>
        </Alert>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, minmax(0, 1fr))',
              lg: 'repeat(5, minmax(0, 1fr))',
            },
            gap: 1.5,
          }}
        >
          <SummaryCard
            label="Pendientes totales"
            value={total}
          />

          <SummaryCard
            label="Pendientes en esta página"
            value={records.length}
          />

          <SummaryCard
            label="Seleccionados en esta página"
            value={selectedCount}
          />

          <SummaryCard
            label="Funcionarios disponibles"
            value={funcionarios.length}
          />

          <SummaryCard
            label="Asignados consultados"
            value={assignedTotal}
          />
        </Box>

        <Card variant="outlined">
          <CardContent>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              <Box>
                <Typography
                  component="h2"
                  variant="h6"
                  sx={{ fontWeight: 800 }}
                >
                  Asignar pendientes
                </Typography>

                <Typography
                  component="p"
                  variant="body2"
                  sx={{
                    color: 'text.secondary',
                  }}
                >
                  Selecciona los casos visibles en la tabla y el
                  funcionario que realizará la gestión telefónica.
                  La selección se limpia al cambiar de página.
                </Typography>
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    md: '2fr auto',
                  },
                  gap: 1.5,
                  alignItems: 'center',
                }}
              >
                <FormControl
                  fullWidth
                  size="small"
                  disabled={
                    saving ||
                    loadingPending
                  }
                >
                  <InputLabel>
                    Funcionario Call Center
                  </InputLabel>

                  <Select
                    label="Funcionario Call Center"
                    value={funcionarioId}
                    onChange={(event) =>
                      setFuncionarioId(
                        String(
                          event.target.value,
                        ),
                      )
                    }
                  >
                    <MenuItem value="">
                      Selecciona un funcionario
                    </MenuItem>

                    {funcionarios.map(
                      (item) => (
                        <MenuItem
                          key={item.id}
                          value={String(item.id)}
                        >
                          {getFuncionarioLabel(
                            item,
                          )}
                        </MenuItem>
                      ),
                    )}
                  </Select>
                </FormControl>

                <Button
                  variant="contained"
                  startIcon={
                    <AssignmentIndIcon />
                  }
                  onClick={
                    requestAssignment
                  }
                  disabled={
                    saving ||
                    loadingPending ||
                    selectedCount === 0 ||
                    !funcionarioId
                  }
                >
                  {saving
                    ? 'Asignando...'
                    : `Asignar seleccionados (${selectedCount})`}
                </Button>
              </Box>

              {funcionarioId && (
                <Alert severity="info">
                  Los {selectedCount} caso(s) seleccionado(s) se
                  asignarán a{' '}
                  <strong>
                    {selectedFuncionarioName}
                  </strong>
                  .
                </Alert>
              )}
            </Box>
          </CardContent>
        </Card>

        <PendingRecordsTable
          records={records}
          loading={loadingPending}
          disabled={saving}
          selectedIds={selectedIds}
          allVisibleSelected={
            allVisibleSelected
          }
          someVisibleSelected={
            someVisibleSelected
          }
          total={total}
          page={page}
          size={size}
          onToggleRecord={
            toggleRecord
          }
          onToggleAllVisible={
            toggleAllVisible
          }
          onPageChange={
            handlePageChange
          }
          onRowsPerPageChange={
            handleRowsPerPageChange
          }
        />

        <Card variant="outlined">
          <CardContent>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              <Box>
                <Typography
                  component="h2"
                  variant="h6"
                  sx={{ fontWeight: 800 }}
                >
                  Consultar asignados por funcionario
                </Typography>

                <Typography
                  component="p"
                  variant="body2"
                  sx={{
                    color: 'text.secondary',
                  }}
                >
                  Consulta de solo lectura para revisar los casos
                  activos que ya fueron distribuidos.
                </Typography>
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    md: '1.5fr 2fr auto auto',
                  },
                  gap: 1.5,
                  alignItems: 'center',
                }}
              >
                <FormControl
                  fullWidth
                  size="small"
                  disabled={loadingAssigned}
                >
                  <InputLabel>
                    Funcionario asignado
                  </InputLabel>

                  <Select
                    label="Funcionario asignado"
                    value={
                      assignedFuncionarioId
                    }
                    onChange={(event) =>
                      setAssignedFuncionarioId(
                        String(
                          event.target.value,
                        ),
                      )
                    }
                  >
                    <MenuItem value="">
                      Selecciona un funcionario
                    </MenuItem>

                    {funcionarios.map(
                      (item) => (
                        <MenuItem
                          key={item.id}
                          value={String(item.id)}
                        >
                          {getFuncionarioLabel(
                            item,
                          )}
                        </MenuItem>
                      ),
                    )}
                  </Select>
                </FormControl>

                <TextField
                  label="Buscar ciudadano asignado"
                  value={
                    assignedSearchText
                  }
                  onChange={(event) =>
                    setAssignedSearchText(
                      event.target.value,
                    )
                  }
                  placeholder="Nombre, cédula, teléfono, barrio o dirección"
                  size="small"
                  fullWidth
                  disabled={loadingAssigned}
                />

                <Button
                  variant="contained"
                  startIcon={<SearchIcon />}
                  onClick={searchAssigned}
                  disabled={
                    loadingAssigned ||
                    !assignedFuncionarioId
                  }
                >
                  Buscar
                </Button>

                <Button
                  variant="text"
                  startIcon={
                    <FilterAltOffIcon />
                  }
                  onClick={
                    clearAssignedFilters
                  }
                  disabled={
                    loadingAssigned ||
                    !assignedHasFilters
                  }
                >
                  Limpiar
                </Button>
              </Box>

              {appliedAssignedFilters.funcionarioId && (
                <Alert severity="success">
                  Mostrando casos activos asignados a{' '}
                  <strong>
                    {appliedAssignedFuncionarioName}
                  </strong>
                  .
                </Alert>
              )}

              {assignedFiltersChanged &&
                appliedAssignedFilters.funcionarioId && (
                  <Alert severity="warning">
                    Modificaste los criterios de consulta. Pulsa
                    <strong> Buscar</strong> para aplicar los
                    cambios.
                  </Alert>
                )}
            </Box>
          </CardContent>
        </Card>

        <AssignedRecordsTable
          records={assignedRecords}
          loading={loadingAssigned}
          total={assignedTotal}
          page={assignedPage}
          size={assignedSize}
          hasFuncionarioFilter={Boolean(
            appliedAssignedFilters.funcionarioId,
          )}
          onPageChange={
            handleAssignedPageChange
          }
          onRowsPerPageChange={
            handleAssignedRowsPerPageChange
          }
        />
      </Box>

      <Dialog
        open={confirmOpen}
        onClose={
          closeAssignmentConfirmation
        }
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          Confirmar distribución de casos
        </DialogTitle>

        <DialogContent dividers>
          <Alert severity="warning">
            Verifica el funcionario seleccionado antes de
            confirmar la asignación.
          </Alert>

          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5,
              mt: 2,
            }}
          >
            <InfoItem
              label="Funcionario destino"
              value={
                selectedFuncionarioName
              }
            />

            <InfoItem
              label="Cantidad de casos"
              value={String(
                selectedCount,
              )}
            />

            <Typography
              component="p"
              variant="body2"
              sx={{
                color: 'text.secondary',
              }}
            >
              Los casos dejarán de aparecer en la lista de
              pendientes y quedarán disponibles en la bandeja
              personal del funcionario.
            </Typography>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button
            onClick={
              closeAssignmentConfirmation
            }
            disabled={saving}
          >
            Cancelar
          </Button>

          <Button
            variant="contained"
            startIcon={
              <AssignmentIndIcon />
            }
            onClick={() =>
              void assign()
            }
            disabled={
              saving ||
              !funcionarioId ||
              selectedCount === 0
            }
          >
            {saving
              ? 'Asignando...'
              : 'Confirmar asignación'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={closeSnackbar}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={closeSnackbar}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

type PendingRecordsTableProps = {
  records: CallCenterResponse[];
  loading: boolean;
  disabled: boolean;
  selectedIds: number[];
  allVisibleSelected: boolean;
  someVisibleSelected: boolean;
  total: number;
  page: number;
  size: number;
  onToggleRecord: (id: number) => void;
  onToggleAllVisible: () => void;
  onPageChange: (
    event: unknown,
    nextPage: number,
  ) => void;
  onRowsPerPageChange: (
    event: ChangeEvent<
      HTMLInputElement |
      HTMLTextAreaElement
    >,
  ) => void;
};

function PendingRecordsTable({
  records,
  loading,
  disabled,
  selectedIds,
  allVisibleSelected,
  someVisibleSelected,
  total,
  page,
  size,
  onToggleRecord,
  onToggleAllVisible,
  onPageChange,
  onRowsPerPageChange,
}: PendingRecordsTableProps) {
  if (
    loading &&
    records.length === 0
  ) {
    return (
      <Paper sx={{ p: 3 }}>
        <Alert severity="info">
          Cargando casos pendientes...
        </Alert>
      </Paper>
    );
  }

  if (records.length === 0) {
    return (
      <Paper sx={{ p: 3 }}>
        <Alert severity="success">
          No hay casos pendientes por asignar a un funcionario
          Call Center.
        </Alert>
      </Paper>
    );
  }

  return (
    <Paper
      sx={{
        opacity:
          loading
            ? 0.65
            : 1,
      }}
    >
      <Box sx={{ p: 2 }}>
        <Typography
          component="h2"
          variant="h6"
          sx={{ fontWeight: 800 }}
        >
          Pendientes por distribuir
        </Typography>

        <Typography
          component="p"
          variant="body2"
          sx={{
            color: 'text.secondary',
          }}
        >
          Mostrando {records.length} de {total} caso(s).
          La selección aplica únicamente a la página visible.
        </Typography>
      </Box>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={allVisibleSelected}
                  indeterminate={
                    !allVisibleSelected &&
                    someVisibleSelected
                  }
                  onChange={onToggleAllVisible}
                  disabled={disabled}
                  slotProps={{
                    input: {
                      'aria-label': 'Seleccionar casos visibles',
                    },
                  }}
                />
              </TableCell>

              <TableCell>
                Caso
              </TableCell>

              <TableCell>
                Ciudadano
              </TableCell>

              <TableCell>
                Contacto
              </TableCell>

              <TableCell>
                Barrio / Comuna
              </TableCell>

              <TableCell>
                Origen
              </TableCell>

              <TableCell>
                Solicitud
              </TableCell>

              <TableCell>
                Estado
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {records.map((record) => {
              const estadoCaso =
                record.estadoCaso ||
                'PENDIENTE_ENRUTAMIENTO';

              const tipoSolicitud =
                record.tipoSolicitudCallcenter ||
                'NUEVA_ENCUESTA';

              const selected =
                selectedIds.includes(
                  record.id,
                );

              return (
                <TableRow
                  key={record.id}
                  hover
                  selected={selected}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selected}
                      onChange={() =>
                        onToggleRecord(
                          record.id,
                        )
                      }
                      disabled={disabled}
                      slotProps={{
                        input: {
                          'aria-label': '...',
                        },
                      }}
                    />
                  </TableCell>

                  <TableCell>
                    <Typography
                      component="p"
                      variant="body2"
                      sx={{ fontWeight: 800 }}
                    >
                      {`Caso #${record.id}`}
                    </Typography>

                    <Typography
                      component="p"
                      variant="caption"
                      sx={{
                        color: 'text.secondary',
                      }}
                    >
                      {record.fechaLlamada ||
                        'Sin fecha'}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <InfoCell
                      icon={
                        <PersonIcon fontSize="small" />
                      }
                      title={
                        record.nombreCompleto ||
                        'Sin nombre'
                      }
                      subtitle={
                        `C.C. ${record.cedulaSolicitante || 'Sin dato'}`
                      }
                    />
                  </TableCell>

                  <TableCell>
                    <InfoCell
                      icon={
                        <PhoneIcon fontSize="small" />
                      }
                      title={
                        record.telefono ||
                        'Sin teléfono'
                      }
                      subtitle={
                        record.direccionTexto ||
                        'Sin dirección'
                      }
                    />
                  </TableCell>

                  <TableCell>
                    <Typography
                      component="p"
                      variant="body2"
                    >
                      {record.barrioNombre ||
                        'Sin barrio'}
                    </Typography>

                    <Typography
                      component="p"
                      variant="caption"
                      sx={{
                        color: 'text.secondary',
                      }}
                    >
                      {record.comunaNombre ||
                        'Sin comuna'}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Chip
                      size="small"
                      color={getOriginColor(
                        record.origenRegistro,
                      )}
                      label={
                        record.origenRegistro ||
                        'MANUAL'
                      }
                    />
                  </TableCell>

                  <TableCell>
                    <Chip
                      size="small"
                      variant="outlined"
                      label={formatLabel(
                        tipoSolicitud,
                      )}
                    />
                  </TableCell>

                  <TableCell>
                    <Chip
                      size="small"
                      color={getStatusColor(
                        estadoCaso,
                      )}
                      label={formatLabel(
                        estadoCaso,
                      )}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>

          <TableFooter>
            <TableRow>
              <TablePagination
                component="td"
                colSpan={8}
                count={total}
                page={page}
                rowsPerPage={size}
                rowsPerPageOptions={
                  PAGE_SIZE_OPTIONS
                }
                onPageChange={
                  onPageChange
                }
                onRowsPerPageChange={
                  onRowsPerPageChange
                }
                labelRowsPerPage="Filas"
              />
            </TableRow>
          </TableFooter>
        </Table>
      </TableContainer>
    </Paper>
  );
}

type AssignedRecordsTableProps = {
  records: CallCenterResponse[];
  loading: boolean;
  total: number;
  page: number;
  size: number;
  hasFuncionarioFilter: boolean;
  onPageChange: (
    event: unknown,
    nextPage: number,
  ) => void;
  onRowsPerPageChange: (
    event: ChangeEvent<
      HTMLInputElement |
      HTMLTextAreaElement
    >,
  ) => void;
};

function AssignedRecordsTable({
  records,
  loading,
  total,
  page,
  size,
  hasFuncionarioFilter,
  onPageChange,
  onRowsPerPageChange,
}: AssignedRecordsTableProps) {
  if (!hasFuncionarioFilter) {
    return (
      <Paper sx={{ p: 3 }}>
        <Alert severity="info">
          Selecciona un funcionario Call Center y pulsa Buscar
          para consultar sus casos asignados.
        </Alert>
      </Paper>
    );
  }

  if (
    loading &&
    records.length === 0
  ) {
    return (
      <Paper sx={{ p: 3 }}>
        <Alert severity="info">
          Consultando casos asignados...
        </Alert>
      </Paper>
    );
  }

  if (records.length === 0) {
    return (
      <Paper sx={{ p: 3 }}>
        <Alert severity="warning">
          No se encontraron casos activos asignados al
          funcionario seleccionado.
        </Alert>
      </Paper>
    );
  }

  return (
    <Paper
      sx={{
        opacity:
          loading
            ? 0.65
            : 1,
      }}
    >
      <Box sx={{ p: 2 }}>
        <Typography
          component="h2"
          variant="h6"
          sx={{ fontWeight: 800 }}
        >
          Casos asignados al funcionario
        </Typography>

        <Typography
          component="p"
          variant="body2"
          sx={{
            color: 'text.secondary',
          }}
        >
          Mostrando {records.length} de {total} caso(s)
          activos. Esta tabla es de solo lectura.
        </Typography>
      </Box>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>
                Funcionario y caso
              </TableCell>

              <TableCell>
                Ciudadano
              </TableCell>

              <TableCell>
                Contacto
              </TableCell>

              <TableCell>
                Barrio / Comuna
              </TableCell>

              <TableCell>
                Origen y solicitud
              </TableCell>

              <TableCell>
                Estado
              </TableCell>

              <TableCell>
                Fecha de asignación
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {records.map((record) => {
              const funcionarioNombre =
                record.funcionarioCallcenterAsignadoNombre ||
                record.funcionarioCallcenterAsignadoUsername ||
                'Sin funcionario';

              const estadoCaso =
                record.estadoCaso ||
                'ASIGNADO_CALLCENTER';

              const tipoSolicitud =
                record.tipoSolicitudCallcenter ||
                'NUEVA_ENCUESTA';

              return (
                <TableRow
                  key={record.id}
                  hover
                >
                  <TableCell>
                    <Typography
                      component="p"
                      variant="body2"
                      sx={{ fontWeight: 800 }}
                    >
                      {funcionarioNombre}
                    </Typography>

                    <Typography
                      component="p"
                      variant="caption"
                      sx={{
                        color: 'text.secondary',
                      }}
                    >
                      {`Caso #${record.id}`}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <InfoCell
                      icon={
                        <PersonIcon fontSize="small" />
                      }
                      title={
                        record.nombreCompleto ||
                        'Sin nombre'
                      }
                      subtitle={
                        `C.C. ${record.cedulaSolicitante || 'Sin dato'}`
                      }
                    />
                  </TableCell>

                  <TableCell>
                    <InfoCell
                      icon={
                        <PhoneIcon fontSize="small" />
                      }
                      title={
                        record.telefono ||
                        'Sin teléfono'
                      }
                      subtitle={
                        record.direccionTexto ||
                        'Sin dirección'
                      }
                    />
                  </TableCell>

                  <TableCell>
                    <Typography
                      component="p"
                      variant="body2"
                    >
                      {record.barrioNombre ||
                        'Sin barrio'}
                    </Typography>

                    <Typography
                      component="p"
                      variant="caption"
                      sx={{
                        color: 'text.secondary',
                      }}
                    >
                      {record.comunaNombre ||
                        'Sin comuna'}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        gap: 0.5,
                      }}
                    >
                      <Chip
                        size="small"
                        color={getOriginColor(
                          record.origenRegistro,
                        )}
                        label={
                          record.origenRegistro ||
                          'MANUAL'
                        }
                      />

                      <Chip
                        size="small"
                        variant="outlined"
                        label={formatLabel(
                          tipoSolicitud,
                        )}
                      />
                    </Box>
                  </TableCell>

                  <TableCell>
                    <Chip
                      size="small"
                      color={getStatusColor(
                        estadoCaso,
                      )}
                      label={formatLabel(
                        estadoCaso,
                      )}
                    />
                  </TableCell>

                  <TableCell>
                    {formatDateTime(
                      record.fechaAsignacionCallcenter,
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>

          <TableFooter>
            <TableRow>
              <TablePagination
                component="td"
                colSpan={7}
                count={total}
                page={page}
                rowsPerPage={size}
                rowsPerPageOptions={
                  PAGE_SIZE_OPTIONS
                }
                onPageChange={
                  onPageChange
                }
                onRowsPerPageChange={
                  onRowsPerPageChange
                }
                labelRowsPerPage="Filas"
              />
            </TableRow>
          </TableFooter>
        </Table>
      </TableContainer>
    </Paper>
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
          sx={{
            color: 'text.secondary',
          }}
        >
          {label}
        </Typography>

        <Typography
          component="p"
          variant="h5"
          sx={{ fontWeight: 900 }}
        >
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

function InfoCell({
  icon,
  title,
  subtitle,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1,
      }}
    >
      <Box
        sx={{
          color: 'text.secondary',
          mt: 0.2,
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>

      <Box sx={{ minWidth: 0 }}>
        <Typography
          component="p"
          variant="body2"
          sx={{
            fontWeight: 700,
            overflowWrap: 'anywhere',
          }}
        >
          {title}
        </Typography>

        <Typography
          component="p"
          variant="caption"
          sx={{
            color: 'text.secondary',
            overflowWrap: 'anywhere',
          }}
        >
          {subtitle}
        </Typography>
      </Box>
    </Box>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <Box>
      <Typography
        component="p"
        variant="caption"
        sx={{
          color: 'text.secondary',
        }}
      >
        {label}
      </Typography>

      <Typography
        component="p"
        variant="body2"
        sx={{
          fontWeight: 800,
          overflowWrap: 'anywhere',
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

function getFuncionarioLabel(
  item?: CallCenterUserOptionResponse,
) {
  if (!item) {
    return 'Sin funcionario';
  }

  const fullName =
    item.nombreCompleto?.trim();

  if (
    fullName &&
    item.username
  ) {
    return `${fullName} (${item.username})`;
  }

  return (
    fullName ||
    item.username ||
    `Funcionario #${item.id}`
  );
}

function getOriginColor(
  value?: string | null,
): ChipColor {
  const normalized =
    normalizeCode(value);

  if (
    normalized === 'VENTANILLA'
  ) {
    return 'primary';
  }

  if (
    normalized === 'IMPORTACION'
  ) {
    return 'secondary';
  }

  return 'default';
}

function formatLabel(
  value?: string | null,
) {
  return String(
    value ||
    'Sin estado',
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

function formatDateTime(
  value?: string | null,
) {
  if (!value) {
    return 'Sin fecha';
  }

  return value
    .replace('T', ' ')
    .slice(0, 16);
}

function normalizeCode(
  value?: string | number | null,
) {
  return String(value ?? '')
    .trim()
    .toUpperCase();
}

function getStatusColor(
  value?: string | null,
): ChipColor {
  const normalized =
    normalizeCode(value);

  /*
   * Los resultados negativos se evalúan antes de CONTACTADO,
   * porque NO_CONTACTADO contiene ese mismo texto.
   */
  if (
    normalized.includes('CANCELADO') ||
    normalized.includes('CANCELADA') ||
    normalized.includes('SIN_DISPOSICION') ||
    normalized.includes('NO_ACEPTA')
  ) {
    return 'error';
  }

  if (
    normalized.includes('REPROGRAMADO') ||
    normalized.includes('REPROGRAMADA') ||
    normalized.includes('NO_CONTACTADO') ||
    normalized.includes('NO_ATENDIDA')
  ) {
    return 'warning';
  }

  if (
    normalized.includes('CERRADO') ||
    normalized.includes('REALIZADA') ||
    normalized === 'CONTACTADO_ACEPTA_VISITA'
  ) {
    return 'success';
  }

  if (
    normalized.includes('PENDIENTE') ||
    normalized.includes('ASIGNADO') ||
    normalized.includes('GESTION') ||
    normalized.includes('PROGRAMADA')
  ) {
    return 'info';
  }

  return 'default';
}

function getErrorMessage(
  error: unknown,
  fallback: string,
) {
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }

  return fallback;
}