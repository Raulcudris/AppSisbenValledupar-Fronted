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
  activateComuna,
  createComuna,
  deactivateComuna,
  searchComunas,
  updateComuna,
} from '@/services/territory.service';
import { PageResponse } from '@/types/api.types';
import {
  ComunaFilter,
  ComunaRequest,
  ComunaResponse,
} from '@/types/territory.types';

type FormState = {
  id?: number;
  codigo: string;
  nombre: string;
  estrato: string;
  descripcion: string;
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
  codigo: '',
  nombre: '',
  estrato: '',
  descripcion: '',
  activo: true,
};

function normalizeSearchText(value?: string | number | boolean | null) {
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

  const normalizedValue = normalizeSearchText(value);

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

export default function ComunasPage() {
  const [filter, setFilter] = useState<ComunaFilter>({
    page: 0,
    size: 10,
  });

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [pageData, setPageData] = useState<PageResponse<ComunaResponse> | null>(null);

  const [loading, setLoading] = useState(true);
  const [restricted, setRestricted] = useState(false);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(initialForm);

  const [tableSearch, setTableSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [menuRecord, setMenuRecord] = useState<ComunaResponse | null>(null);

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmRecord, setConfirmRecord] = useState<ComunaResponse | null>(null);
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
    row.codigo,
    row.nombre,
    row.estrato ? `estrato ${row.estrato}` : '',
    row.descripcion,
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

  const load = async (
    customFilter: ComunaFilter = filter,
    customStatus: StatusFilter = statusFilter
  ) => {
    setLoading(true);
    setRestricted(false);
    setError('');

    try {
      const response = await searchComunas({
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
          : 'No fue posible consultar las comunas.';

        setError(message);
        showSnackbar(message, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load({
      page: 0,
      size: 10,
    }, 'ALL');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateFilter = (key: keyof ComunaFilter, value: string) => {
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

  const openCreate = () => {
    setError('');
    setForm(initialForm);
    setDialogOpen(true);
  };

  const openEdit = (row: ComunaResponse) => {
    setError('');
    setForm({
      id: row.id,
      codigo: row.codigo ?? '',
      nombre: row.nombre ?? '',
      estrato: row.estrato ? String(row.estrato) : '',
      descripcion: row.descripcion ?? '',
      activo: row.activo,
    });
    setDialogOpen(true);
  };

  const closeFormDialog = () => {
    setDialogOpen(false);
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
    row: ComunaResponse
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

  const openConfirmDialog = (row: ComunaResponse, action: ConfirmAction) => {
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
        await activateComuna(confirmRecord.id);
        showSnackbar('Comuna activada correctamente.', 'success');
      } else {
        await deactivateComuna(confirmRecord.id);
        showSnackbar('Comuna inactivada correctamente.', 'success');
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
        : 'No fue posible cambiar el estado de la comuna.';

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
    if (!form.nombre.trim()) {
      return 'El nombre de la comuna es obligatorio.';
    }

    if (form.nombre.trim().length > 120) {
      return 'El nombre no puede superar los 120 caracteres.';
    }

    if (!form.estrato) {
      return 'Selecciona el estrato principal.';
    }

    const estrato = Number(form.estrato);

    if (!Number.isInteger(estrato) || estrato < 1 || estrato > 6) {
      return 'El estrato debe estar entre 1 y 6.';
    }

    if (form.descripcion.trim().length > 1000) {
      return 'La descripción no puede superar los 1000 caracteres.';
    }

    return '';
  };

  const buildRequest = (): ComunaRequest => ({
    codigo: form.codigo || undefined,
    nombre: normalizeText(form.nombre),
    estrato: Number(form.estrato),
    descripcion: form.descripcion.trim() || null,
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
        await updateComuna(form.id, buildRequest());

        showSnackbar('Comuna actualizada correctamente.', 'success');
      } else {
        await createComuna(buildRequest());

        showSnackbar('Comuna creada correctamente.', 'success');
      }

      setDialogOpen(false);
      setForm(initialForm);

      await load({
        ...filter,
        page: 0,
      }, statusFilter);
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : 'No fue posible guardar la comuna.';

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
        title="Comunas"
        subtitle="Consulta, filtra, crea y actualiza las comunas del territorio."
        primaryAction={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openCreate}
            disabled={!allowWrite}
          >
            Nueva comuna
          </Button>
        }
      />

      {!allowWrite ? (
        <Alert severity="info">
          Tu rol permite consultar, pero no crear ni actualizar comunas.
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
                  Buscar comunas
                </Typography>

                <Typography color="text.secondary" sx={{ fontSize: 14 }}>
                  Puedes buscar por código, nombre, estrato o descripción.
                </Typography>
              </Box>

              <Chip
                label={`${totalRecords} comuna${totalRecords === 1 ? '' : 's'}`}
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
                placeholder="Código, nombre o descripción"
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
              placeholder="Buscar código, nombre, estrato, descripción..."
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
                minWidth: 980,
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
                  <TableCell>Código</TableCell>
                  <TableCell>Nombre</TableCell>
                  <TableCell>Estrato</TableCell>
                  <TableCell>Descripción</TableCell>
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
                      <Chip
                        label={row.codigo || '-'}
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ fontWeight: 700 }}
                      />
                    </TableCell>

                    <TableCell>
                      <Typography sx={{ fontWeight: 700, minWidth: 220 }}>
                        {row.nombre || 'Sin nombre'}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={row.estrato ? `Estrato ${row.estrato}` : 'Sin estrato'}
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 700 }}
                      />
                    </TableCell>

                    <TableCell>
                      <Typography color="text.secondary" sx={{ minWidth: 260, fontSize: 13 }}>
                        {row.descripcion || 'Sin descripción'}
                      </Typography>
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
                    <TableCell colSpan={7}>
                      <Box sx={{ py: 5, textAlign: 'center' }}>
                        <Typography variant="h6">
                          No hay comunas para mostrar
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
                {form.id ? 'Editar comuna' : 'Nueva comuna'}
              </Typography>

              <Typography color="text.secondary" sx={{ fontSize: 14 }}>
                Completa la información territorial de la comuna.
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
                  <TextField
                    label="Código"
                    size="small"
                    value={form.codigo || 'Se genera automáticamente'}
                    disabled
                    helperText="El código se asigna automáticamente desde el backend."
                  />

                  <TextField
                    label="Nombre de la comuna"
                    size="small"
                    required
                    value={form.nombre}
                    onChange={(event) => updateForm('nombre', event.target.value)}
                    slotProps={{
                      htmlInput: {
                        maxLength: 120,
                      },
                    }}
                  />

                  <TextField
                    select
                    label="Estrato principal"
                    size="small"
                    required
                    value={form.estrato}
                    onChange={(event) => updateForm('estrato', event.target.value)}
                  >
                    <MenuItem value="">Seleccione un estrato</MenuItem>

                    {[1, 2, 3, 4, 5, 6].map((estrato) => (
                      <MenuItem key={estrato} value={String(estrato)}>
                        Estrato {estrato}
                      </MenuItem>
                    ))}
                  </TextField>

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

                  <TextField
                    label="Descripción"
                    size="small"
                    multiline
                    minRows={4}
                    value={form.descripcion}
                    onChange={(event) => updateForm('descripcion', event.target.value)}
                    helperText={`${form.descripcion.trim().length}/1000 caracteres`}
                    sx={{ gridColumn: { md: '1 / -1' } }}
                    slotProps={{
                      htmlInput: {
                        maxLength: 1000,
                      },
                    }}
                  />
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
            {form.id ? 'Actualizar comuna' : 'Guardar comuna'}
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
          {confirmAction === 'ACTIVATE' ? 'Activar comuna' : 'Inactivar comuna'}
        </DialogTitle>

        <DialogContent>
          <Stack spacing={2}>
            <Alert severity={confirmAction === 'ACTIVATE' ? 'info' : 'warning'}>
              {confirmAction === 'ACTIVATE'
                ? 'La comuna volverá a estar disponible para ser usada en barrios y catálogos.'
                : 'La comuna quedará inactiva y dejará de estar disponible para nuevas selecciones.'}
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
                {confirmRecord?.nombre ?? 'Comuna seleccionada'}
              </Typography>

              <Typography color="text.secondary" sx={{ fontSize: 14 }}>
                Código: {confirmRecord?.codigo ?? '-'} · Estrato: {confirmRecord?.estrato ?? '-'}
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