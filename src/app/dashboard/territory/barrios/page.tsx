'use client';

import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import FilterListIcon from '@mui/icons-material/FilterList';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import RestoreIcon from '@mui/icons-material/Restore';
import SearchIcon from '@mui/icons-material/Search';
import ToggleOffIcon from '@mui/icons-material/ToggleOff';
import {
  Alert,
  Autocomplete,
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
  Divider,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { ChangeEvent, MouseEvent, useEffect, useMemo, useState } from 'react';

import AccessMessage from '@/components/dashboard/AccessMessage';
import LoadingState from '@/components/dashboard/LoadingState';
import CrudPageHeader from '@/components/operational/CrudPageHeader';
import { ApiClientError } from '@/lib/apiClient';
import { currentRole } from '@/lib/roleAccess';
import {
  activateBarrio,
  createBarrio,
  deactivateBarrio,
  getComunasOptions,
  searchBarrios,
  updateBarrio,
} from '@/services/territory.service';
import { PageResponse } from '@/types/api.types';
import { SelectOption } from '@/types/catalog.types';
import {
  BarrioFilter,
  BarrioRequest,
  BarrioResponse,
} from '@/types/territory.types';

type FormState = {
  id?: number;
  comunaId: string;
  nombre: string;
  activo: boolean;
};

type SnackbarSeverity = 'success' | 'error' | 'warning' | 'info';

type SnackbarState = {
  open: boolean;
  message: string;
  severity: SnackbarSeverity;
};

type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

type ConfirmAction = 'ACTIVATE' | 'DEACTIVATE';

const initialSnackbar: SnackbarState = {
  open: false,
  message: '',
  severity: 'success',
};

const initialForm: FormState = {
  comunaId: '',
  nombre: '',
  activo: true,
};

function normalizeSearchText(value?: string | null) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function matchesByFirstLetters(
  value: string | number | boolean | null | undefined,
  searchValue: string
) {
  const searchText = normalizeSearchText(searchValue);

  if (!searchText) {
    return true;
  }

  const normalizedValue = normalizeSearchText(String(value ?? ''));

  if (!normalizedValue) {
    return false;
  }

  return normalizedValue
    .split(/[\s\-_.]+/)
    .filter(Boolean)
    .some((word) => word.startsWith(searchText));
}

function matchesAnyByFirstLetters(
  searchValue: string,
  values: Array<string | number | boolean | null | undefined>
) {
  const searchText = normalizeSearchText(searchValue);

  if (!searchText) {
    return true;
  }

  return values.some((value) => matchesByFirstLetters(value, searchText));
}

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, ' ').toUpperCase();
}

function getActivoFromStatus(status: StatusFilter) {
  if (status === 'ACTIVE') {
    return true;
  }

  if (status === 'INACTIVE') {
    return false;
  }

  return undefined;
}

function canManageTerritory() {
  const role = currentRole();

  return role === 'ADMIN' || role === 'SUPERVISOR';
}

export default function BarriosPage() {
  const [filter, setFilter] = useState<BarrioFilter>({
    page: 0,
    size: 10,
  });

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [pageData, setPageData] = useState<PageResponse<BarrioResponse> | null>(null);
  const [comunas, setComunas] = useState<SelectOption[]>([]);

  const [loading, setLoading] = useState(true);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [restricted, setRestricted] = useState(false);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(initialForm);
  const [comunaInputText, setComunaInputText] = useState('');

  const [tableSearch, setTableSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [menuRecord, setMenuRecord] = useState<BarrioResponse | null>(null);

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmRecord, setConfirmRecord] = useState<BarrioResponse | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>('DEACTIVATE');
  const [processingAction, setProcessingAction] = useState(false);

  const [snackbar, setSnackbar] = useState<SnackbarState>(initialSnackbar);

  const allowWrite = useMemo(() => canManageTerritory(), []);

  const totalRecords = pageData?.totalElements ?? 0;
  const currentPage = pageData?.page ?? 0;
  const currentSize = pageData?.size ?? 10;
  const menuOpen = Boolean(menuAnchorEl);

const visibleRows = (pageData?.content ?? []).filter((row) =>
  matchesAnyByFirstLetters(tableSearch, [
    row.nombre,
    row.comunaNombre,
    row.activo ? 'activo' : 'inactivo',
  ])
);

  const visibleSelectedCount = visibleRows.filter((row) =>
    selectedIds.includes(row.id)
  ).length;

  const allVisibleSelected = visibleRows.length > 0
    && visibleSelectedCount === visibleRows.length;

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

  const filterCatalogOptions = (options: SelectOption[], inputValue: string) => {
  const searchText = normalizeSearchText(inputValue);

  if (!searchText) {
    return options;
  }

  return options.filter((option) =>
    matchesByFirstLetters(option.label, searchText)
  );
};

  const getComunaLabelById = (comunaId?: string | number | null) => {
    if (!comunaId) {
      return '';
    }

    return comunas.find((option) => String(option.id) === String(comunaId))?.label ?? '';
  };

  const loadCatalogs = async () => {
    setCatalogLoading(true);

    try {
      const comunasData = await getComunasOptions();

      setComunas(comunasData);
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : 'No fue posible cargar las comunas.';

      setError(message);
      showSnackbar(message, 'error');
    } finally {
      setCatalogLoading(false);
    }
  };

  const refreshComunasCatalog = async () => {
    setCatalogLoading(true);

    try {
      const comunasData = await getComunasOptions();

      setComunas(comunasData);

      return comunasData;
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : 'No fue posible actualizar el listado de comunas.';

      setError(message);
      showSnackbar(message, 'error');

      return comunas;
    } finally {
      setCatalogLoading(false);
    }
  };

  const load = async (
    customFilter: BarrioFilter = filter,
    customStatus: StatusFilter = statusFilter
  ) => {
    setLoading(true);
    setRestricted(false);
    setError('');

    try {
      const response = await searchBarrios({
        ...customFilter,
        activo: getActivoFromStatus(customStatus),
      });

      setPageData(response);
      setFilter(customFilter);
      setStatusFilter(customStatus);
      setSelectedIds([]);
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 403) {
        setRestricted(true);
      } else {
        const message = err instanceof Error
          ? err.message
          : 'No fue posible consultar los barrios.';

        setError(message);
        showSnackbar(message, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalogs();
    load({
      page: 0,
      size: 10,
    }, 'ALL');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!dialogOpen || !form.comunaId) {
      return;
    }

    const selectedComunaLabel = getComunaLabelById(form.comunaId);

    if (selectedComunaLabel) {
      setComunaInputText(selectedComunaLabel);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogOpen, comunas, form.comunaId]);

  const updateFilter = (key: keyof BarrioFilter, value: string) => {
    setFilter((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const search = () => {
    load({
      ...filter,
      page: 0,
    }, statusFilter);
  };

  const clearFilters = () => {
    const cleared = {
      page: 0,
      size: filter.size ?? 10,
    };

    setFilter(cleared);
    setStatusFilter('ALL');
    setTableSearch('');
    setSelectedIds([]);
    load(cleared, 'ALL');
  };

  const handleStatusFilterChange = (value: string) => {
    const nextStatus = (value || 'ALL') as StatusFilter;

    load({
      ...filter,
      page: 0,
    }, nextStatus);
  };

  const handleChangePage = (_: unknown, newPage: number) => {
    load({
      ...filter,
      page: newPage,
    }, statusFilter);
  };

  const handleChangeRowsPerPage = (event: ChangeEvent<HTMLInputElement>) => {
    load({
      ...filter,
      page: 0,
      size: Number(event.target.value),
    }, statusFilter);
  };

  const openCreate = async () => {
    setError('');
    setComunaInputText('');
    setForm(initialForm);

    await refreshComunasCatalog();

    setDialogOpen(true);
  };

  const openEdit = async (row: BarrioResponse) => {
    const comunasActualizadas = await refreshComunasCatalog();

    const comunaId = row.comunaId ? String(row.comunaId) : '';
    const comunaLabel =
      comunasActualizadas.find((option) => String(option.id) === comunaId)?.label
      || row.comunaNombre
      || getComunaLabelById(comunaId);

    setError('');
    setComunaInputText(comunaLabel);
    setForm({
      id: row.id,
      comunaId,
      nombre: row.nombre ?? '',
      activo: row.activo,
    });

    setDialogOpen(true);
  };

  const closeFormDialog = () => {
    setDialogOpen(false);
    setComunaInputText('');
    setForm(initialForm);
    setError('');
  };

  const handleFormDialogClose = (
    _: unknown,
    reason?: 'backdropClick' | 'escapeKeyDown'
  ) => {
    if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
      return;
    }

    closeFormDialog();
  };

  const openRowMenu = (
    event: MouseEvent<HTMLButtonElement>,
    row: BarrioResponse
  ) => {
    setMenuAnchorEl(event.currentTarget);
    setMenuRecord(row);
  };

  const closeRowMenu = () => {
    setMenuAnchorEl(null);
    setMenuRecord(null);
  };

  const handleMenuEdit = () => {
    if (!menuRecord) {
      return;
    }

    const record = menuRecord;
    closeRowMenu();
    openEdit(record);
  };

  const openConfirmDialog = (row: BarrioResponse, action: ConfirmAction) => {
    setConfirmRecord(row);
    setConfirmAction(action);
    setConfirmDialogOpen(true);
  };

  const handleMenuStatus = () => {
    if (!menuRecord) {
      return;
    }

    const record = menuRecord;
    closeRowMenu();
    openConfirmDialog(record, record.activo ? 'DEACTIVATE' : 'ACTIVATE');
  };

  const closeConfirmDialog = () => {
    if (processingAction) {
      return;
    }

    setConfirmDialogOpen(false);
    setConfirmRecord(null);
  };

  const confirmStatusAction = async () => {
    if (!confirmRecord) {
      return;
    }

    setProcessingAction(true);
    setError('');

    try {
      if (confirmAction === 'ACTIVATE') {
        await activateBarrio(confirmRecord.id);
        showSnackbar('Barrio activado correctamente.', 'success');
      } else {
        await deactivateBarrio(confirmRecord.id);
        showSnackbar('Barrio inactivado correctamente.', 'success');
      }

      setConfirmDialogOpen(false);
      setConfirmRecord(null);

      await load({
        ...filter,
        page: 0,
      }, statusFilter);
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : 'No fue posible cambiar el estado del barrio.';

      setError(message);
      showSnackbar(message, 'error');
    } finally {
      setProcessingAction(false);
    }
  };

  const toggleSelected = (id: number) => {
    setSelectedIds((current) => {
      if (current.includes(id)) {
        return current.filter((item) => item !== id);
      }

      return [...current, id];
    });
  };

  const toggleAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedIds((current) =>
        current.filter((id) => !visibleRows.some((row) => row.id === id))
      );

      return;
    }

    setSelectedIds((current) => {
      const ids = visibleRows.map((row) => row.id);
      const merged = new Set([...current, ...ids]);

      return Array.from(merged);
    });
  };

  const updateForm = (key: keyof FormState, value: string | boolean) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const validateForm = () => {
    if (!form.comunaId || Number(form.comunaId) <= 0) {
      return 'Escribe y selecciona la comuna.';
    }

    if (!form.nombre.trim()) {
      return 'El nombre del barrio es obligatorio.';
    }

    if (form.nombre.trim().length > 150) {
      return 'El nombre no puede superar los 150 caracteres.';
    }

    return '';
  };

  const buildRequest = (): BarrioRequest => ({
    comunaId: Number(form.comunaId),
    nombre: normalizeText(form.nombre),
    activo: form.activo,
  });

  const save = async () => {
    setError('');

    const validationMessage = validateForm();

    if (validationMessage) {
      setError(validationMessage);
      showSnackbar(validationMessage, 'warning');
      return;
    }

    try {
      if (form.id) {
        await updateBarrio(form.id, buildRequest());

        showSnackbar('Barrio actualizado correctamente.', 'success');
      } else {
        await createBarrio(buildRequest());

        showSnackbar('Barrio creado correctamente.', 'success');
      }

      setDialogOpen(false);
      setComunaInputText('');
      setForm(initialForm);

      await load({
        ...filter,
        page: 0,
      }, statusFilter);
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : 'No fue posible guardar el barrio.';

      setError(message);
      showSnackbar(message, 'error');
    }
  };

  if (loading && !pageData) {
    return <LoadingState />;
  }

  return (
    <Stack spacing={3}>
      <CrudPageHeader
        title="Barrios"
        subtitle="Consulta, filtra, crea y actualiza los barrios por comuna."
        primaryAction={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openCreate}
            disabled={!allowWrite || catalogLoading}
          >
            Nuevo barrio
          </Button>
        }
      />

      {!allowWrite ? (
        <Alert severity="info">
          Tu rol permite consultar, pero no crear ni actualizar barrios.
        </Alert>
      ) : null}

      {restricted ? <AccessMessage /> : null}

      {error ? (
        <Alert severity="error">
          {error}
        </Alert>
      ) : null}

      <Card sx={{ borderRadius: 3 }}>
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
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Buscar barrios
                </Typography>

                <Typography color="text.secondary" sx={{ fontSize: 14 }}>
                  Puedes buscar por nombre, comuna o estado.
                </Typography>
              </Box>

              <Chip
                label={`${totalRecords} barrio${totalRecords === 1 ? '' : 's'}`}
                color="primary"
                variant="outlined"
              />
            </Stack>

            <Divider />

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
              <TextField
                label="Buscar"
                size="small"
                value={filter.q ?? ''}
                onChange={(event) => updateFilter('q', event.target.value)}
                placeholder="Nombre del barrio"
              />

              <Autocomplete
                options={comunas}
                loading={catalogLoading}
                value={
                  comunas.find((option) => String(option.id) === String(filter.comunaId ?? '')) ?? null
                }
                onOpen={() => {
                  refreshComunasCatalog();
                }}
                onChange={(_, selectedOption) =>
                  updateFilter('comunaId', selectedOption ? String(selectedOption.id) : '')
                }
                getOptionLabel={(option) => option.label ?? ''}
                isOptionEqualToValue={(option, value) =>
                  String(option.id) === String(value.id)
                }
                filterOptions={(options, state) =>
                  filterCatalogOptions(options, state.inputValue)
                }
                autoHighlight
                clearOnEscape
                noOptionsText="No se encontraron comunas"
                loadingText="Actualizando comunas..."
                clearText="Limpiar"
                openText="Abrir"
                closeText="Cerrar"
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Comuna"
                    size="small"
                    placeholder="Escribe el nombre de la comuna"
                  />
                )}
              />

              <TextField
                select
                label="Estado"
                size="small"
                value={statusFilter}
                onChange={(event) => handleStatusFilterChange(event.target.value)}
              >
                <MenuItem value="ALL">Todos</MenuItem>
                <MenuItem value="ACTIVE">Activos</MenuItem>
                <MenuItem value="INACTIVE">Inactivos</MenuItem>
              </TextField>

              <Stack direction="row" spacing={1}>
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
            </Box>
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
            <TextField
              placeholder="Buscar barrio, comuna o estado..."
              size="small"
              value={tableSearch}
              onChange={(event) => setTableSearch(event.target.value)}
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
                width: { xs: '100%', sm: 520, md: 620 },
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2.5,
                  bgcolor: '#ffffff',
                },
              }}
            />

            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Chip
                label={`${visibleRows.length} visible${visibleRows.length === 1 ? '' : 's'}`}
                size="small"
                color="primary"
                variant="outlined"
              />

              {visibleSelectedCount > 0 ? (
                <Chip
                  label={`${visibleSelectedCount} seleccionado${visibleSelectedCount === 1 ? '' : 's'}`}
                  size="small"
                  color="success"
                  variant="outlined"
                />
              ) : null}

              <IconButton
                onClick={search}
                disabled={loading}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                }}
              >
                <FilterListIcon />
              </IconButton>
            </Stack>
          </Box>

          <Box sx={{ overflowX: 'auto' }}>
            <Table
              sx={{
                minWidth: 900,
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
                  <TableCell padding="checkbox">
                    <Checkbox
                      size="small"
                      checked={allVisibleSelected}
                      indeterminate={visibleSelectedCount > 0 && !allVisibleSelected}
                      onChange={toggleAllVisible}
                    />
                  </TableCell>
                  <TableCell>Barrio</TableCell>
                  <TableCell>Comuna</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {visibleRows.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell padding="checkbox">
                      <Checkbox
                        size="small"
                        checked={selectedIds.includes(row.id)}
                        onChange={() => toggleSelected(row.id)}
                      />
                    </TableCell>

                    <TableCell>
                      <Typography sx={{ fontWeight: 700, minWidth: 220 }}>
                        {row.nombre || 'Sin nombre'}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={row.comunaNombre || 'Sin comuna'}
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ fontWeight: 700 }}
                      />
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={row.activo ? 'Activo' : 'Inactivo'}
                        size="small"
                        color={row.activo ? 'success' : 'warning'}
                        variant="outlined"
                        sx={{ fontWeight: 700 }}
                      />
                    </TableCell>

                    <TableCell align="center">
                      {allowWrite ? (
                        <IconButton
                          onClick={(event) => openRowMenu(event, row)}
                          sx={{
                            borderRadius: 2,
                            color: 'text.secondary',
                          }}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      ) : (
                        <Typography color="text.secondary" sx={{ fontSize: 13 }}>
                          Solo lectura
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}

                {!visibleRows.length ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <Box sx={{ py: 5, textAlign: 'center' }}>
                        <Typography variant="h6">
                          No hay barrios para mostrar
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

          <Menu
            anchorEl={menuAnchorEl}
            open={menuOpen}
            onClose={closeRowMenu}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            slotProps={{
              paper: {
                sx: {
                  mt: 1,
                  minWidth: 190,
                  borderRadius: 3,
                  boxShadow: '0 16px 40px rgba(15, 23, 42, 0.16)',
                },
              },
            }}
          >
            <MenuItem
              onClick={handleMenuEdit}
              sx={{
                gap: 1.5,
                color: 'info.main',
                fontWeight: 700,
              }}
            >
              <EditIcon fontSize="small" />
              Modificar
            </MenuItem>

            <MenuItem
              onClick={handleMenuStatus}
              sx={{
                gap: 1.5,
                color: menuRecord?.activo ? 'error.main' : 'success.main',
                fontWeight: 700,
              }}
            >
              {menuRecord?.activo ? (
                <ToggleOffIcon fontSize="small" />
              ) : (
                <RestoreIcon fontSize="small" />
              )}
              {menuRecord?.activo ? 'Inactivar' : 'Activar'}
            </MenuItem>
          </Menu>
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onClose={handleFormDialogClose}
        fullScreen
      >
        <DialogTitle
          sx={{
            px: { xs: 2, md: 4 },
            py: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
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
                {form.id ? 'Editar barrio' : 'Nuevo barrio'}
              </Typography>

              <Typography color="text.secondary" sx={{ fontSize: 14 }}>
                Completa la información territorial del barrio.
              </Typography>
            </Box>

            <IconButton
              onClick={closeFormDialog}
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

        <DialogContent
          sx={{
            p: { xs: 2, md: 4 },
            bgcolor: '#f8fafc',
          }}
        >
          <Stack
            spacing={3}
            sx={{
              maxWidth: 1100,
              mx: 'auto',
              pt: 1,
            }}
          >
            <Card
              sx={{
                borderRadius: 4,
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <CardContent sx={{ p: { xs: 2, md: 3 } }}>
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
                  <Autocomplete
                    options={comunas}
                    loading={catalogLoading}
                    value={
                      comunas.find((option) => String(option.id) === String(form.comunaId)) ?? null
                    }
                    inputValue={comunaInputText}
                    onOpen={() => {
                      refreshComunasCatalog();
                    }}
                    onInputChange={(_, newInputValue, reason) => {
                      if (reason === 'input') {
                        setComunaInputText(newInputValue);
                        updateForm('comunaId', '');
                        return;
                      }

                      if (reason === 'clear') {
                        setComunaInputText('');
                        updateForm('comunaId', '');
                      }
                    }}
                    onChange={(_, selectedOption) => {
                      updateForm('comunaId', selectedOption ? String(selectedOption.id) : '');
                      setComunaInputText(selectedOption?.label ?? '');
                    }}
                    getOptionLabel={(option) => option.label ?? ''}
                    isOptionEqualToValue={(option, value) =>
                      String(option.id) === String(value.id)
                    }
                    filterOptions={(options, state) =>
                      filterCatalogOptions(options, state.inputValue)
                    }
                    autoHighlight
                    clearOnEscape
                    noOptionsText="No se encontraron comunas"
                    loadingText="Actualizando comunas..."
                    clearText="Limpiar"
                    openText="Abrir"
                    closeText="Cerrar"
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Comuna"
                        size="small"
                        required
                        helperText={
                          catalogLoading
                            ? 'Actualizando comunas...'
                            : 'Escribe las primeras letras y selecciona la comuna.'
                        }
                      />
                    )}
                  />

                  <TextField
                    label="Nombre del barrio"
                    size="small"
                    required
                    value={form.nombre}
                    onChange={(event) => updateForm('nombre', event.target.value)}
                    slotProps={{
                      htmlInput: {
                        maxLength: 150,
                      },
                    }}
                  />

                  <TextField
                    select
                    label="Estado"
                    size="small"
                    value={form.activo ? 'ACTIVE' : 'INACTIVE'}
                    onChange={(event) => updateForm('activo', event.target.value === 'ACTIVE')}
                  >
                    <MenuItem value="ACTIVE">Activo</MenuItem>
                    <MenuItem value="INACTIVE">Inactivo</MenuItem>
                  </TextField>
                </Box>
              </CardContent>
            </Card>
          </Stack>
        </DialogContent>

        <DialogActions
          sx={{
            px: { xs: 2, md: 4 },
            py: 2,
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            justifyContent: 'flex-end',
          }}
        >
          <Button
            variant="outlined"
            color="inherit"
            onClick={closeFormDialog}
          >
            Cancelar
          </Button>

          <Button
            variant="contained"
            color={form.id ? 'info' : 'primary'}
            onClick={save}
            disabled={!allowWrite}
          >
            {form.id ? 'Actualizar barrio' : 'Guardar barrio'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={confirmDialogOpen}
        onClose={closeConfirmDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle
          sx={{
            fontWeight: 900,
            color: confirmAction === 'ACTIVATE' ? 'success.main' : 'error.main',
          }}
        >
          {confirmAction === 'ACTIVATE' ? 'Activar barrio' : 'Inactivar barrio'}
        </DialogTitle>

        <DialogContent>
          <Stack spacing={2}>
            <Alert severity={confirmAction === 'ACTIVATE' ? 'info' : 'warning'}>
              {confirmAction === 'ACTIVATE'
                ? 'El barrio volverá a estar disponible para formularios como Ventanilla y DMC.'
                : 'El barrio quedará inactivo y dejará de estar disponible para nuevas selecciones.'}
            </Alert>

            <Box
              sx={{
                p: 2,
                borderRadius: 3,
                bgcolor: '#F8FAFC',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography sx={{ fontWeight: 900 }}>
                {confirmRecord?.nombre ?? 'Barrio seleccionado'}
              </Typography>

              <Typography color="text.secondary" sx={{ fontSize: 14 }}>
                Comuna: {confirmRecord?.comunaNombre ?? '-'}
              </Typography>
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button
            variant="outlined"
            color="inherit"
            onClick={closeConfirmDialog}
            disabled={processingAction}
          >
            Cancelar
          </Button>

          <Button
            variant="contained"
            color={confirmAction === 'ACTIVATE' ? 'success' : 'error'}
            onClick={confirmStatusAction}
            disabled={processingAction}
          >
            {processingAction
              ? 'Procesando...'
              : confirmAction === 'ACTIVATE' ? 'Activar' : 'Inactivar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3500}
        onClose={() => closeSnackbar()}
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