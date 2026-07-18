'use client';

import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import EditIcon from '@mui/icons-material/Edit';
import FilterListIcon from '@mui/icons-material/FilterList';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
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
import SelectField from '@/components/operational/SelectField';
import { ApiClientError } from '@/lib/apiClient';
import { canExport, canWriteDmc } from '@/lib/roleAccess';
import {
  getBarriosOptions,
  getEncuestadoresOptions,
  getTiposDmcOptions,
} from '@/services/catalog.service';
import {
  createDmc,
  searchDmc,
  updateDmc,
} from '@/services/dmc.service';
import { exportDmc } from '@/services/export.service';
import { PageResponse } from '@/types/api.types';
import { SelectOption } from '@/types/catalog.types';
import {
  DmcFilter,
  DmcRequest,
  DmcResponse,
} from '@/types/operational.types';

type FormState = {
  id?: number;
  fecha: string;
  tipoDmcId: string;
  encuestadorId: string;
  cantidad: string;
  observacion: string;
  barrioId: string;
};

type SnackbarSeverity = 'success' | 'error' | 'warning' | 'info';

type SnackbarState = {
  open: boolean;
  message: string;
  severity: SnackbarSeverity;
};

const initialSnackbar: SnackbarState = {
  open: false,
  message: '',
  severity: 'success',
};

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function getInitialForm(): FormState {
  return {
    fecha: getTodayDate(),
    tipoDmcId: '',
    encuestadorId: '',
    cantidad: '1',
    observacion: '',
    barrioId: '',
  };
}

export default function DmcRegistrosPage() {
  const [filter, setFilter] = useState<DmcFilter>({
    page: 0,
    size: 10,
  });

  const [pageData, setPageData] = useState<PageResponse<DmcResponse> | null>(null);
  const [tiposDmc, setTiposDmc] = useState<SelectOption[]>([]);
  const [encuestadores, setEncuestadores] = useState<SelectOption[]>([]);
  const [barrios, setBarrios] = useState<SelectOption[]>([]);

  const [loading, setLoading] = useState(true);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [form, setForm] = useState<FormState>(getInitialForm);
  const [restricted, setRestricted] = useState(false);
  const [error, setError] = useState('');
  const [tableSearch, setTableSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [menuRecord, setMenuRecord] = useState<DmcResponse | null>(null);

  const [snackbar, setSnackbar] = useState<SnackbarState>(initialSnackbar);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicateDialogMessage, setDuplicateDialogMessage] = useState('');

  const allowWrite = useMemo(() => canWriteDmc(), []);
  const allowExport = useMemo(() => canExport(), []);

  const totalRecords = pageData?.totalElements ?? 0;
  const currentPage = pageData?.page ?? 0;
  const currentSize = pageData?.size ?? 10;

  const menuOpen = Boolean(menuAnchorEl);

  const visibleRows = (pageData?.content ?? []).filter((row) => {
    const searchText = tableSearch.trim().toLowerCase();

    if (!searchText) {
      return true;
    }

    return [
      row.fecha,
      row.tipoDmcNombre,
      row.encuestadorNombre,
      row.cantidad,
      row.barrioNombre,
      row.comunaNombre,
      row.funcionarioUsername,
      row.observacion,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(searchText));
  });

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

  const loadCatalogs = async () => {
    setCatalogLoading(true);

    try {
      const [tiposData, encuestadoresData, barriosData] = await Promise.all([
        getTiposDmcOptions(),
        getEncuestadoresOptions(),
        getBarriosOptions(),
      ]);

      setTiposDmc(tiposData);
      setEncuestadores(encuestadoresData);
      setBarrios(barriosData);
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : 'No fue posible cargar los catálogos DMC.';

      setError(message);
      showSnackbar(message, 'error');
    } finally {
      setCatalogLoading(false);
    }
  };

  const load = async (customFilter: DmcFilter = filter) => {
    setLoading(true);
    setRestricted(false);
    setError('');

    try {
      const response = await searchDmc(customFilter);

      setPageData(response);
      setFilter(customFilter);
      setSelectedIds([]);
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 403) {
        setRestricted(true);
      } else {
        const message = err instanceof Error
          ? err.message
          : 'No fue posible consultar registros DMC.';

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
    });
  }, []);

  const updateFilter = (key: keyof DmcFilter, value: string) => {
    setFilter((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const search = () => {
    load({
      ...filter,
      page: 0,
    });
  };

  const clearFilters = () => {
    const cleared = {
      page: 0,
      size: filter.size ?? 10,
    };

    setFilter(cleared);
    setTableSearch('');
    setSelectedIds([]);
    load(cleared);
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

  const openCreate = () => {
    setError('');
    setForm(getInitialForm());
    setDialogOpen(true);
  };

  const openEdit = (row: DmcResponse) => {
    setError('');
    setForm({
      id: row.id,
      fecha: row.fecha,
      tipoDmcId: String(row.tipoDmcId),
      encuestadorId: String(row.encuestadorId),
      cantidad: String(row.cantidad),
      observacion: row.observacion ?? '',
      barrioId: String(row.barrioId),
    });

    setDialogOpen(true);
  };

  const closeFormDialog = () => {
    setDialogOpen(false);
  };

  const handleFormDialogClose = (
    _: unknown,
    reason?: 'backdropClick' | 'escapeKeyDown'
  ) => {
    if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
      return;
    }
  };

  const openRowMenu = (
    event: MouseEvent<HTMLButtonElement>,
    row: DmcResponse
  ) => {
    setMenuAnchorEl(event.currentTarget);
    setMenuRecord(row);
  };

  const closeRowMenu = () => {
    setMenuAnchorEl(null);
    setMenuRecord(null);
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

  const handleMenuEdit = () => {
    if (!menuRecord) {
      return;
    }

    const record = menuRecord;
    closeRowMenu();
    openEdit(record);
  };

  const updateForm = (key: keyof FormState, value: string) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const buildRequest = (): DmcRequest => ({
    fecha: form.fecha,
    tipoDmcId: Number(form.tipoDmcId),
    encuestadorId: Number(form.encuestadorId),
    cantidad: Number(form.cantidad),
    observacion: form.observacion.trim(),
    barrioId: Number(form.barrioId),
  });

  const validateForm = () => {
    if (!form.fecha) {
      return 'La fecha es obligatoria.';
    }

    const today = getTodayDate();

    if (form.fecha > today) {
      return 'La fecha no puede ser mayor al día actual.';
    }

    if (!form.tipoDmcId || Number(form.tipoDmcId) <= 0) {
      return 'Selecciona el tipo DMC.';
    }

    if (!form.encuestadorId || Number(form.encuestadorId) <= 0) {
      return 'Selecciona el encuestador.';
    }

    if (!form.cantidad) {
      return 'La cantidad es obligatoria.';
    }

    const cantidad = Number(form.cantidad);

    if (Number.isNaN(cantidad)) {
      return 'La cantidad debe ser un número válido.';
    }

    if (!Number.isInteger(cantidad)) {
      return 'La cantidad debe ser un número entero.';
    }

    if (cantidad <= 0) {
      return 'La cantidad debe ser mayor que cero.';
    }

    if (!form.barrioId || Number(form.barrioId) <= 0) {
      return 'Selecciona el barrio.';
    }

    if (form.observacion.trim().length > 500) {
      return 'La observación no puede superar los 500 caracteres.';
    }

    return '';
  };

  const isDuplicateDmcError = (err: unknown) => {
    if (err instanceof ApiClientError && err.status === 409) {
      return true;
    }

    if (!(err instanceof Error)) {
      return false;
    }

    const message = err.message.toLowerCase();

    return (
      message.includes('duplicate entry')
      || message.includes('uq_dmc_fecha_tipo_encuestador')
      || message.includes('dmc_duplicate_record')
      || message.includes('registro dmc guardado previamente')
      || message.includes('misma fecha, tipo dmc y encuestador')
      || message.includes('constraint')
      || message.includes('unique')
      || message.includes('duplicado')
      || message.includes('ya existe')
      || message.includes('ya ha realizado')
      || message.includes('guardado anterior')
    );
  };

  const openDuplicateDmcDialog = () => {
    setError('');

    const activeElement = document.activeElement;

    if (activeElement instanceof HTMLElement) {
      activeElement.blur();
    }

    setDialogOpen(false);

    window.setTimeout(() => {
      setDuplicateDialogMessage(
        'No se puede guardar este registro porque ya existe un registro DMC guardado previamente con la misma fecha, tipo DMC y encuestador. Por favor revisa la información antes de intentar guardarlo nuevamente.'
      );
      setDuplicateDialogOpen(true);
    }, 150);
  };

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
        await updateDmc(form.id, buildRequest());

        showSnackbar(
          'Registro DMC actualizado correctamente. Puedes seguir revisando o cerrar el formulario.',
          'success'
        );
      } else {
        await createDmc(buildRequest());

        showSnackbar(
          'Registro DMC creado correctamente. Puedes registrar uno nuevo o cerrar el formulario.',
          'success'
        );

        setForm(getInitialForm());
      }

      load(filter);
    } catch (err) {
      if (isDuplicateDmcError(err)) {
        openDuplicateDmcDialog();
        return;
      }

      const message = err instanceof Error
        ? err.message
        : 'No fue posible guardar el registro.';

      setError(message);
      showSnackbar(message, 'error');
    }
  };

  const exportData = async () => {
    try {
      await exportDmc({
        fechaInicio: filter.fechaInicio,
        fechaFin: filter.fechaFin,
      });

      showSnackbar('La exportación DMC fue generada correctamente.', 'success');
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : 'No fue posible exportar.';

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
        title="Registros DMC"
        subtitle="Consulta, filtra, crea y actualiza registros DMC."
        secondaryAction={
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={exportData}
            disabled={!allowExport}
          >
            Exportar
          </Button>
        }
        primaryAction={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openCreate}
            disabled={!allowWrite || catalogLoading}
          >
            Nuevo registro
          </Button>
        }
      />

      {!allowWrite ? (
        <Alert severity="info">
          Tu rol permite consultar, pero no crear ni actualizar registros DMC.
        </Alert>
      ) : null}

      {!allowExport ? (
        <Alert severity="info">
          La exportación está habilitada solo para ADMIN y SUPERVISOR.
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
                  Buscar registros DMC
                </Typography>

                <Typography color="text.secondary" sx={{ fontSize: 14 }}>
                  Puedes buscar por fecha, tipo DMC, encuestador o barrio.
                </Typography>
              </Box>

              <Chip
                label={`${totalRecords} registro${totalRecords === 1 ? '' : 's'}`}
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
                label="Fecha inicio"
                type="date"
                size="small"
                value={filter.fechaInicio ?? ''}
                onChange={(event) => updateFilter('fechaInicio', event.target.value)}
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
                onChange={(event) => updateFilter('fechaFin', event.target.value)}
                slotProps={{
                  inputLabel: {
                    shrink: true,
                  },
                }}
              />

              <SelectField
                label="Tipo DMC"
                value={filter.tipoDmcId ?? ''}
                options={tiposDmc}
                onChange={(value) => updateFilter('tipoDmcId', value)}
              />

              <SelectField
                label="Encuestador"
                value={filter.encuestadorId ?? ''}
                options={encuestadores}
                onChange={(value) => updateFilter('encuestadorId', value)}
              />

              <SelectField
                label="Barrio"
                value={filter.barrioId ?? ''}
                options={barrios}
                onChange={(value) => updateFilter('barrioId', value)}
              />

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
              placeholder="Buscar fecha, tipo, encuestador, barrio..."
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
                minWidth: 1020,
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

                  <TableCell>Fecha</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Encuestador</TableCell>
                  <TableCell>Cantidad</TableCell>
                  <TableCell>Barrio</TableCell>
                  <TableCell>Comuna</TableCell>
                  <TableCell>Funcionario</TableCell>
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
                      <Typography sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {row.fecha}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={row.tipoDmcNombre}
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ fontWeight: 700 }}
                      />
                    </TableCell>

                    <TableCell>
                      <Typography sx={{ fontWeight: 700, minWidth: 180 }}>
                        {row.encuestadorNombre}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={row.cantidad}
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 700 }}
                      />
                    </TableCell>

                    <TableCell>
                      <Typography sx={{ minWidth: 150 }}>
                        {row.barrioNombre || 'Sin barrio'}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography sx={{ minWidth: 130 }}>
                        {row.comunaNombre ?? 'N/A'}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={row.funcionarioUsername || 'Sin funcionario'}
                        size="small"
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
                    <TableCell colSpan={9}>
                      <Box sx={{ py: 5, textAlign: 'center' }}>
                        <Typography variant="h6">
                          No hay registros para mostrar
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
              Actualizar
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
                {form.id ? 'Editar registro DMC' : 'Nuevo registro DMC'}
              </Typography>

              <Typography color="text.secondary" sx={{ fontSize: 14 }}>
                Completa la información del registro DMC.
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
                    label="Fecha"
                    type="date"
                    size="small"
                    required
                    value={form.fecha}
                    onChange={(event) => updateForm('fecha', event.target.value)}
                    slotProps={{
                      inputLabel: {
                        shrink: true,
                      },
                    }}
                  />

                  <SelectField
                    label="Tipo DMC"
                    value={form.tipoDmcId}
                    options={tiposDmc}
                    required
                    onChange={(value) => updateForm('tipoDmcId', value)}
                  />

                  <SelectField
                    label="Encuestador"
                    value={form.encuestadorId}
                    options={encuestadores}
                    required
                    onChange={(value) => updateForm('encuestadorId', value)}
                  />

                  <TextField
                    label="Cantidad"
                    type="number"
                    size="small"
                    required
                    value={form.cantidad}
                    onChange={(event) => updateForm('cantidad', event.target.value)}
                  />

                  <SelectField
                    label="Barrio"
                    value={form.barrioId}
                    options={barrios}
                    required
                    onChange={(value) => updateForm('barrioId', value)}
                  />

                  <TextField
                    label="Observación"
                    size="small"
                    multiline
                    minRows={3}
                    value={form.observacion}
                    onChange={(event) => updateForm('observacion', event.target.value)}
                    sx={{ gridColumn: { md: '1 / -1' } }}
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
          >
            {form.id ? 'Actualizar registro' : 'Guardar registro'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={duplicateDialogOpen}
        onClose={() => setDuplicateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle
          sx={{
            fontWeight: 900,
            color: 'warning.main',
          }}
        >
          Registro DMC duplicado
        </DialogTitle>

        <DialogContent>
          <Stack spacing={2}>
            <Alert severity="warning">
              {duplicateDialogMessage}
            </Alert>

            <Typography color="text.secondary" sx={{ fontSize: 14 }}>
              Este control evita que se registren dos veces los mismos datos para la misma fecha,
              tipo DMC y encuestador.
            </Typography>
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button
            variant="outlined"
            color="inherit"
            onClick={() => setDuplicateDialogOpen(false)}
          >
            Entendido
          </Button>

          <Button
            variant="contained"
            color="warning"
            onClick={() => {
              setDuplicateDialogOpen(false);
              setDialogOpen(false);
              search();
            }}
          >
            Revisar registros
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