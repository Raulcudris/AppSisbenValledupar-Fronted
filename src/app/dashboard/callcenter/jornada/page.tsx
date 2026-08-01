'use client';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Divider,
    MenuItem,
    Snackbar,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';

import { ApiClientError } from '@/lib/apiClient';
import { crearCiudadanoUltimaHora } from '@/services/callcenter-jornada.service';
import {
    findVentanillaByCedulaForCallCenter,
    getCallCenterBarriosOptions,
    getCallCenterEncuestadoresOptions,
    getFuncionariosCallCenterOptions,
} from '@/services/callcenter.service';
import type { CallCenterUserOptionResponse } from '@/types/callcenter-assignment.types';
import type {
    CallCenterUltimaHoraRequest,
    CallCenterUltimaHoraResponse,
} from '@/types/callcenter-jornada.types';
import type { SelectOption } from '@/types/catalog.types';
import { FormEvent } from 'react';


type FormState = {
    fechaCaso: string;
    ventanillaRegistroId: string;
    cedulaSolicitante: string;
    nombreCompleto: string;
    telefono: string;
    direccionTexto: string;
    barrioId: string;
    funcionarioCallcenterId: string;
    encuestadorId: string;
    fechaProgramada: string;
    horaProgramada: string;
    observacion: string;
};

type SnackbarSeverity =
    | 'success'
    | 'error'
    | 'warning'
    | 'info';

type SnackbarState = {
    open: boolean;
    message: string;
    severity: SnackbarSeverity;
};

/**
 * Obtiene la fecha local actual en formato yyyy-MM-dd.
 *
 * Se ajusta la zona horaria antes de convertirla para evitar
 * que la fecha cambie por el uso directo de toISOString().
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

function buildInitialForm(): FormState {
    const today = getLocalToday();

    return {
        fechaCaso: today,
        ventanillaRegistroId: '',
        cedulaSolicitante: '',
        nombreCompleto: '',
        telefono: '',
        direccionTexto: '',
        barrioId: '',
        funcionarioCallcenterId: '',
        encuestadorId: '',
        fechaProgramada: today,
        horaProgramada: '',
        observacion: '',
    };
}

function funcionarioLabel(
    funcionario: CallCenterUserOptionResponse,
) {
    const fullName =
        funcionario.nombreCompleto?.trim();

    if (fullName) {
        return `${fullName} (${funcionario.username})`;
    }

    return funcionario.username;
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

export default function CallCenterJornadaPage() {
    const router =
        useRouter();

    const [form, setForm] =
        useState<FormState>(
            buildInitialForm,
        );

    const [funcionarios, setFuncionarios] =
        useState<CallCenterUserOptionResponse[]>([]);

    const [encuestadores, setEncuestadores] =
        useState<SelectOption[]>([]);

    const [barrios, setBarrios] =
        useState<SelectOption[]>([]);

    const [loadingCatalogs, setLoadingCatalogs] =
        useState(true);

    const [searchingVentanilla, setSearchingVentanilla] =
        useState(false);

    const [saving, setSaving] =
        useState(false);

    const [result, setResult] =
        useState<CallCenterUltimaHoraResponse | null>(
            null,
        );

    const [snackbar, setSnackbar] =
        useState<SnackbarState>({
            open: false,
            message: '',
            severity: 'success',
        });

    const linkedToVentanilla =
        Boolean(
            form.ventanillaRegistroId,
        );

    const selectedFuncionario =
        useMemo(
            () =>
                funcionarios.find(
                    (item) =>
                        String(item.id)
                        === form.funcionarioCallcenterId,
                ) ?? null,
            [
                form.funcionarioCallcenterId,
                funcionarios,
            ],
        );

    const selectedEncuestador =
        useMemo(
            () =>
                encuestadores.find(
                    (item) =>
                        String(item.id)
                        === form.encuestadorId,
                ) ?? null,
            [
                encuestadores,
                form.encuestadorId,
            ],
        );

    const showMessage = (
        message: string,
        severity: SnackbarSeverity = 'success',
    ) => {
        setSnackbar({
            open: true,
            message,
            severity,
        });
    };

    const closeSnackbar = () => {
        setSnackbar((current) => ({
            ...current,
            open: false,
        }));
    };

    const loadCatalogs =
        useCallback(async () => {
            setLoadingCatalogs(true);

            try {
                const [
                    funcionariosResponse,
                    encuestadoresResponse,
                    barriosResponse,
                ] = await Promise.all([
                    getFuncionariosCallCenterOptions(),
                    getCallCenterEncuestadoresOptions(),
                    getCallCenterBarriosOptions(),
                ]);

                setFuncionarios(
                    funcionariosResponse.filter(
                        (item) =>
                            item.activo !== false,
                    ),
                );

                setEncuestadores(
                    encuestadoresResponse,
                );

                setBarrios(
                    barriosResponse,
                );
            } catch (error) {
                const message =
                    error instanceof Error
                        ? error.message
                        : 'No fue posible cargar los catálogos de la jornada.';

                showMessage(
                    message,
                    'error',
                );
            } finally {
                setLoadingCatalogs(false);
            }
        }, []);

    useEffect(() => {
        void loadCatalogs();
    }, [loadCatalogs]);

    const updateForm = (
        field: keyof FormState,
        value: string,
    ) => {
        setForm((current) => ({
            ...current,
            [field]: value,
        }));
    };

    /**
     * Busca el ciudadano en Ventanilla por cédula.
     *
     * Cuando se encuentra, conserva su ID para que el backend
     * clasifique el origen como VENTANILLA y completa los datos
     * que estén disponibles.
     */
    const searchInVentanilla =
        async () => {
            const cedula =
                form.cedulaSolicitante.trim();

            if (!cedula) {
                showMessage(
                    'Escribe la cédula antes de buscar en Ventanilla.',
                    'warning',
                );

                return;
            }

            setSearchingVentanilla(true);

            try {
                const ventanilla =
                    await findVentanillaByCedulaForCallCenter(
                        cedula,
                    );

                if (!ventanilla) {
                    setForm((current) => ({
                        ...current,
                        ventanillaRegistroId: '',
                    }));

                    showMessage(
                        'No se encontró un registro activo de Ventanilla para esta cédula. Puedes continuar como registro manual.',
                        'info',
                    );

                    return;
                }

                setForm((current) => ({
                    ...current,
                    ventanillaRegistroId:
                        String(ventanilla.id),

                    cedulaSolicitante:
                        ventanilla.cedulaUsuario?.trim()
                        || current.cedulaSolicitante,

                    nombreCompleto:
                        ventanilla.nombreUsuario?.trim()
                        || current.nombreCompleto,

                    telefono:
                        ventanilla.telefono?.trim()
                        || current.telefono,

                    direccionTexto:
                        ventanilla.direccion?.trim()
                        || current.direccionTexto,

                    barrioId:
                        ventanilla.barrioId
                            ? String(
                                ventanilla.barrioId,
                            )
                            : current.barrioId,
                }));

                showMessage(
                    `Registro de Ventanilla #${ventanilla.id} vinculado correctamente.`,
                    'success',
                );
            } catch (error) {
                const message =
                    error instanceof Error
                        ? error.message
                        : 'No fue posible consultar el ciudadano en Ventanilla.';

                showMessage(
                    message,
                    'error',
                );
            } finally {
                setSearchingVentanilla(false);
            }
        };

    /**
     * Desvincula el ID de Ventanilla.
     *
     * Los datos ya copiados permanecen en el formulario para evitar
     * que el usuario tenga que escribirlos nuevamente.
     */
    const unlinkVentanilla = () => {
        setForm((current) => ({
            ...current,
            ventanillaRegistroId: '',
        }));

        showMessage(
            'El caso se registrará con origen MANUAL.',
            'info',
        );
    };

    const validateForm = () => {
        if (!form.fechaCaso) {
            return 'La fecha del caso es obligatoria.';
        }

        if (!form.cedulaSolicitante.trim()) {
            return 'La cédula del solicitante es obligatoria.';
        }

        if (!form.nombreCompleto.trim()) {
            return 'El nombre completo es obligatorio.';
        }

        if (!form.direccionTexto.trim()) {
            return 'La dirección es obligatoria.';
        }

        if (!form.funcionarioCallcenterId) {
            return 'Debe seleccionar el funcionario Call Center.';
        }

        if (!form.encuestadorId) {
            return 'Debe seleccionar el encuestador.';
        }

        if (!form.fechaProgramada) {
            return 'La fecha programada de la visita es obligatoria.';
        }

        return null;
    };

    const buildRequest =
        (): CallCenterUltimaHoraRequest => ({
            fechaCaso:
                form.fechaCaso,

            ventanillaRegistroId:
                form.ventanillaRegistroId
                    ? Number(
                        form.ventanillaRegistroId,
                    )
                    : null,

            cedulaSolicitante:
                form.cedulaSolicitante.trim(),

            nombreCompleto:
                form.nombreCompleto.trim(),

            telefono:
                form.telefono.trim()
                || null,

            direccionTexto:
                form.direccionTexto.trim(),

            barrioId:
                form.barrioId
                    ? Number(
                        form.barrioId,
                    )
                    : null,

            funcionarioCallcenterId:
                Number(
                    form.funcionarioCallcenterId,
                ),

            encuestadorId:
                Number(
                    form.encuestadorId,
                ),

            fechaProgramada:
                form.fechaProgramada,

            horaProgramada:
                form.horaProgramada
                || null,

            observacion:
                form.observacion.trim()
                || null,
        });

    const submit = async (
        event: FormEvent<HTMLFormElement>,
    ) => {
        event.preventDefault();

        const validationMessage =
            validateForm();

        if (validationMessage) {
            showMessage(
                validationMessage,
                'warning',
            );

            return;
        }

        setSaving(true);
        setResult(null);

        try {
            const response =
                await crearCiudadanoUltimaHora(
                    buildRequest(),
                );

            setResult(response);

            showMessage(
                'Ciudadano agregado y asignado correctamente.',
                'success',
            );
        } catch (error) {
            let message =
                'No fue posible agregar el ciudadano de última hora.';

            if (
                error instanceof ApiClientError
                || error instanceof Error
            ) {
                message =
                    error.message;
            }

            showMessage(
                message,
                'error',
            );
        } finally {
            setSaving(false);
        }
    };

    const clearForm = () => {
        setForm(
            buildInitialForm(),
        );

        setResult(null);

        showMessage(
            'Formulario limpiado.',
            'info',
        );
    };

    return (
        <Stack spacing={3}>
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: {
                        xs: 'column',
                        md: 'row',
                    },
                    alignItems: {
                        xs: 'stretch',
                        md: 'center',
                    },
                    justifyContent: 'space-between',
                    gap: 2,
                }}
            >
                <Box>
                    <Typography
                        variant="h4"
                        sx={{
                            fontWeight: 900,
                        }}
                    >
                        Jornada de encuestas
                    </Typography>

                    <Typography
                        color="text.secondary"
                        sx={{
                            mt: 0.5,
                        }}
                    >
                        Agrega un ciudadano de última hora y asigna
                        su visita en una sola operación.
                    </Typography>
                </Box>

                <Button
                    variant="outlined"
                    onClick={() =>
                        router.push(
                            '/dashboard/callcenter/registros',
                        )
                    }
                >
                    Volver a registros
                </Button>
            </Box>

            <Alert severity="info">
                La llamada telefónica es informativa y no condiciona
                la visita. El ciudadano quedará asignado al encuestador
                para la fecha programada aunque no haya sido contactado.
            </Alert>

            {loadingCatalogs && (
                <Card variant="outlined">
                    <CardContent>
                        <Stack
                            direction="row"
                            spacing={2}
                            sx={{
                                alignItems: 'center',
                            }}
                        >
                            <CircularProgress
                                size={24}
                            />

                            <Typography>
                                Cargando funcionarios,
                                encuestadores y barrios...
                            </Typography>
                        </Stack>
                    </CardContent>
                </Card>
            )}

            <Box
                component="form"
                onSubmit={submit}
            >
                <Stack spacing={3}>
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
                                        Datos del ciudadano
                                    </Typography>

                                    <Typography
                                        color="text.secondary"
                                        sx={{
                                            fontSize: 14,
                                        }}
                                    >
                                        Puede buscar primero en Ventanilla
                                        o continuar con un registro manual.
                                    </Typography>
                                </Box>

                                <Divider />

                                <Box
                                    sx={{
                                        display: 'grid',
                                        gridTemplateColumns: {
                                            xs: '1fr',
                                            md: '1fr auto',
                                        },
                                        gap: 1.5,
                                        alignItems: 'start',
                                    }}
                                >
                                    <TextField
                                        label="Cédula del solicitante"
                                        value={form.cedulaSolicitante}
                                        onChange={(event) =>
                                            updateForm(
                                                'cedulaSolicitante',
                                                event.target.value,
                                            )
                                        }
                                        required
                                        fullWidth
                                        slotProps={{
                                            htmlInput: {
                                                maxLength: 30,
                                            },
                                        }}
                                    />

                                    <Button
                                        variant="outlined"
                                        onClick={
                                            searchInVentanilla
                                        }
                                        disabled={
                                            searchingVentanilla
                                            || saving
                                        }
                                        sx={{
                                            minHeight: 56,
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {searchingVentanilla && (
                                            <CircularProgress
                                                size={18}
                                                sx={{
                                                    mr: 1,
                                                }}
                                            />
                                        )}

                                        {searchingVentanilla
                                            ? 'Buscando...'
                                            : 'Buscar en Ventanilla'}
                                    </Button>
                                </Box>

                                {linkedToVentanilla && (
                                    <Alert
                                        severity="success"
                                        action={
                                            <Button
                                                color="inherit"
                                                size="small"
                                                onClick={
                                                    unlinkVentanilla
                                                }
                                            >
                                                Desvincular
                                            </Button>
                                        }
                                    >
                                        Registro vinculado a Ventanilla ID:
                                        {' '}
                                        <strong>
                                            {form.ventanillaRegistroId}
                                        </strong>
                                        . El origen será VENTANILLA.
                                    </Alert>
                                )}

                                {!linkedToVentanilla && (
                                    <Chip
                                        label="Origen: MANUAL"
                                        color="info"
                                        variant="outlined"
                                        sx={{
                                            alignSelf: 'flex-start',
                                            fontWeight: 700,
                                        }}
                                    />
                                )}

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
                                        label="Nombre completo"
                                        value={form.nombreCompleto}
                                        onChange={(event) =>
                                            updateForm(
                                                'nombreCompleto',
                                                event.target.value,
                                            )
                                        }
                                        required
                                        fullWidth
                                        slotProps={{
                                            htmlInput: {
                                                maxLength: 250,
                                            },
                                        }}
                                    />
                                    <TextField
                                        label="Teléfono"
                                        value={form.telefono}
                                        onChange={(event) =>
                                            updateForm(
                                                'telefono',
                                                event.target.value,
                                            )
                                        }
                                        fullWidth
                                        slotProps={{
                                            htmlInput: {
                                                maxLength: 30,
                                            },
                                        }}
                                    />
                                    <TextField
                                        label="Barrio"
                                        select
                                        value={
                                            form.barrioId
                                        }
                                        onChange={(event) =>
                                            updateForm(
                                                'barrioId',
                                                event.target.value,
                                            )
                                        }
                                        fullWidth
                                        disabled={
                                            loadingCatalogs
                                        }
                                    >
                                        <MenuItem value="">
                                            Sin barrio seleccionado
                                        </MenuItem>

                                        {barrios.map(
                                            (barrio) => (
                                                <MenuItem
                                                    key={barrio.id}
                                                    value={
                                                        String(
                                                            barrio.id,
                                                        )
                                                    }
                                                >
                                                    {barrio.label}
                                                </MenuItem>
                                            ),
                                        )}
                                    </TextField>

                                    <TextField
                                        label="Fecha del caso"
                                        type="date"
                                        value={
                                            form.fechaCaso
                                        }
                                        onChange={(event) =>
                                            updateForm(
                                                'fechaCaso',
                                                event.target.value,
                                            )
                                        }
                                        required
                                        fullWidth
                                        slotProps={{
                                            inputLabel: {
                                                shrink: true,
                                            },
                                        }}
                                    />
                                </Box>

                                <TextField
                                    label="Dirección"
                                    value={form.direccionTexto}
                                    onChange={(event) =>
                                        updateForm(
                                            'direccionTexto',
                                            event.target.value,
                                        )
                                    }
                                    required
                                    fullWidth
                                    multiline
                                    minRows={2}
                                    slotProps={{
                                        htmlInput: {
                                            maxLength: 500,
                                        },
                                    }}
                                />
                            </Stack>
                        </CardContent>
                    </Card>

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
                                        Asignación de la jornada
                                    </Typography>

                                    <Typography
                                        color="text.secondary"
                                        sx={{
                                            fontSize: 14,
                                        }}
                                    >
                                        Selecciona quién realizará la gestión
                                        Call Center y quién efectuará la visita.
                                    </Typography>
                                </Box>

                                <Divider />

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
                                        label="Funcionario Call Center"
                                        select
                                        value={
                                            form.funcionarioCallcenterId
                                        }
                                        onChange={(event) =>
                                            updateForm(
                                                'funcionarioCallcenterId',
                                                event.target.value,
                                            )
                                        }
                                        required
                                        fullWidth
                                        disabled={
                                            loadingCatalogs
                                        }
                                    >
                                        <MenuItem value="">
                                            Seleccione un funcionario
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
                                            form.encuestadorId
                                        }
                                        onChange={(event) =>
                                            updateForm(
                                                'encuestadorId',
                                                event.target.value,
                                            )
                                        }
                                        required
                                        fullWidth
                                        disabled={
                                            loadingCatalogs
                                        }
                                    >
                                        <MenuItem value="">
                                            Seleccione un encuestador
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

                                    <TextField
                                        label="Fecha programada"
                                        type="date"
                                        value={
                                            form.fechaProgramada
                                        }
                                        onChange={(event) =>
                                            updateForm(
                                                'fechaProgramada',
                                                event.target.value,
                                            )
                                        }
                                        required
                                        fullWidth
                                        slotProps={{
                                            inputLabel: {
                                                shrink: true,
                                            },
                                        }}
                                    />

                                    <TextField
                                        label="Hora programada"
                                        type="time"
                                        value={
                                            form.horaProgramada
                                        }
                                        onChange={(event) =>
                                            updateForm(
                                                'horaProgramada',
                                                event.target.value,
                                            )
                                        }
                                        fullWidth
                                        slotProps={{
                                            inputLabel: {
                                                shrink: true,
                                            },
                                        }}
                                    />
                                </Box>

                                <TextField
                                    label="Observación"
                                    value={
                                        form.observacion
                                    }
                                    onChange={(event) =>
                                        updateForm(
                                            'observacion',
                                            event.target.value,
                                        )
                                    }
                                    fullWidth
                                    multiline
                                    minRows={3}
                                    placeholder="Ejemplo: ciudadano agregado durante la jornada por solicitud del coordinador."
                                />

                                {(selectedFuncionario
                                    || selectedEncuestador) && (
                                        <Alert severity="info">
                                            Funcionario:
                                            {' '}
                                            <strong>
                                                {selectedFuncionario
                                                    ? funcionarioLabel(
                                                        selectedFuncionario,
                                                    )
                                                    : 'Sin seleccionar'}
                                            </strong>
                                            .
                                            {' '}
                                            Encuestador:
                                            {' '}
                                            <strong>
                                                {selectedEncuestador?.label
                                                    ?? 'Sin seleccionar'}
                                            </strong>
                                            .
                                        </Alert>
                                    )}
                            </Stack>
                        </CardContent>
                    </Card>

                    <Card variant="outlined">
                        <CardContent>
                            <Stack
                                direction={{
                                    xs: 'column',
                                    sm: 'row',
                                }}
                                spacing={1.5}
                                sx={{
                                    justifyContent: 'flex-end',
                                }}
                            >
                                <Button
                                    variant="outlined"
                                    color="secondary"
                                    onClick={
                                        clearForm
                                    }
                                    disabled={
                                        saving
                                    }
                                >
                                    Limpiar
                                </Button>

                                <Button
                                    type="submit"
                                    variant="contained"
                                    disabled={
                                        saving
                                        || loadingCatalogs
                                    }
                                >
                                    {saving && (
                                        <CircularProgress
                                            size={18}
                                            color="inherit"
                                            sx={{
                                                mr: 1,
                                            }}
                                        />
                                    )}

                                    {saving
                                        ? 'Registrando...'
                                        : 'Agregar y asignar ciudadano'}
                                </Button>
                            </Stack>
                        </CardContent>
                    </Card>
                </Stack>
            </Box>

            {result && (
                <Card
                    sx={{
                        borderColor: 'success.main',
                    }}
                >
                    <CardContent
                        sx={{
                            p: {
                                xs: 2,
                                md: 3,
                            },
                        }}
                    >
                        <Stack spacing={2}>
                            <Stack
                                direction="row"
                                spacing={1}
                                sx={{
                                    alignItems: 'center',
                                }}
                            >
                                <CheckCircleIcon
                                    color="success"
                                />

                                <Typography
                                    variant="h6"
                                    sx={{
                                        fontWeight: 800,
                                    }}
                                >
                                    Ciudadano asignado correctamente
                                </Typography>
                            </Stack>

                            <Divider />

                            <Box
                                sx={{
                                    display: 'grid',
                                    gridTemplateColumns: {
                                        xs: '1fr',
                                        sm: 'repeat(2, 1fr)',
                                        lg: 'repeat(3, 1fr)',
                                    },
                                    gap: 2,
                                }}
                            >
                                <ResultItem
                                    label="Caso Call Center"
                                    value={
                                        `#${result.registro.id}`
                                    }
                                />

                                <ResultItem
                                    label="Ciudadano"
                                    value={
                                        result.registro.nombreCompleto
                                    }
                                />

                                <ResultItem
                                    label="Cédula"
                                    value={
                                        result.registro.cedulaSolicitante
                                    }
                                />

                                <ResultItem
                                    label="Estado del caso"
                                    value={
                                        result.registro.estadoCaso
                                        ?? 'Sin estado'
                                    }
                                />

                                <ResultItem
                                    label="Funcionario Call Center"
                                    value={
                                        result.registro
                                            .funcionarioCallcenterAsignadoNombre
                                        ?? result.registro
                                            .funcionarioCallcenterAsignadoUsername
                                        ?? 'Sin funcionario'
                                    }
                                />

                                <ResultItem
                                    label="Encuestador"
                                    value={
                                        result.visita.encuestadorNombre
                                        ?? `Encuestador #${result.visita.encuestadorId}`
                                    }
                                />

                                <ResultItem
                                    label="Fecha de visita"
                                    value={
                                        formatDate(
                                            result.visita.fechaProgramada,
                                        )
                                    }
                                />

                                <ResultItem
                                    label="Hora de visita"
                                    value={
                                        result.visita.horaProgramada
                                        ?? 'Sin hora'
                                    }
                                />

                                <ResultItem
                                    label="Origen"
                                    value={
                                        result.registro.origenRegistro
                                        ?? 'Sin origen'
                                    }
                                />
                            </Box>
                        </Stack>
                    </CardContent>
                </Card>
            )}

            <Snackbar
                open={
                    snackbar.open
                }
                autoHideDuration={5000}
                onClose={
                    closeSnackbar
                }
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
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
                        width: '100%',
                    }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Stack>
    );
}

function ResultItem({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <Box
            sx={{
                p: 1.5,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                bgcolor: 'background.paper',
            }}
        >
            <Typography
                variant="caption"
                color="text.secondary"
            >
                {label}
            </Typography>

            <Typography
                sx={{
                    fontWeight: 800,
                    mt: 0.3,
                }}
            >
                {value}
            </Typography>
        </Box>
    );
}