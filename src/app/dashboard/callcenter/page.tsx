'use client';

import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EditIcon from '@mui/icons-material/Edit';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import SourceIcon from '@mui/icons-material/Source';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import {
  canAccessDashboardPath,
  currentRole,
} from '@/lib/roleAccess';
import type { AppRole } from '@/lib/roleAccess';

type FlowAction = {
  label: string;
  path: string;
  variant: 'contained' | 'outlined';
  icon: ReactNode;
};

type FlowStep = {
  number: number;
  title: string;
  description: string;
  responsible: string;
  result: string;
  icon: ReactNode;
  color: 'primary' | 'secondary' | 'success' | 'warning' | 'info';
  actions: FlowAction[];
};

const FLOW_STEPS: FlowStep[] = [
  {
    number: 1,
    title: 'Ingresar casos',
    description:
      'Incorpora ciudadanos desde Ventanilla o registra manualmente un caso de Call Center.',
    responsible: 'Coordinación o supervisión',
    result: 'Caso disponible para distribución',
    icon: <SourceIcon />,
    color: 'primary',
    actions: [
      {
        label: 'Importar desde Ventanilla',
        path: '/dashboard/callcenter/registros/cargar-ventanilla',
        variant: 'contained',
        icon: <SourceIcon />,
      },
      {
        label: 'Registro manual',
        path: '/dashboard/callcenter/registros/nuevo',
        variant: 'outlined',
        icon: <AddIcon />,
      },
    ],
  },
  {
    number: 2,
    title: 'Distribuir casos',
    description:
      'Asigna los casos pendientes a los funcionarios responsables de realizar la gestión telefónica.',
    responsible: 'Coordinación o supervisión',
    result: 'Caso asignado a un funcionario Call Center',
    icon: <EditIcon />,
    color: 'secondary',
    actions: [
      {
        label: 'Distribuir casos',
        path: '/dashboard/callcenter/asignar-funcionarios',
        variant: 'contained',
        icon: <EditIcon />,
      },
    ],
  },
  {
    number: 3,
    title: 'Gestionar llamadas',
    description:
      'El funcionario consulta sus casos, registra cada intento de llamada y actualiza los datos confirmados.',
    responsible: 'Funcionario de Call Center',
    result: 'Gestión telefónica registrada',
    icon: <SearchIcon />,
    color: 'info',
    actions: [
      {
        label: 'Casos por gestionar',
        path: '/dashboard/callcenter/mis-registros',
        variant: 'contained',
        icon: <SearchIcon />,
      },
    ],
  },
  {
    number: 4,
    title: 'Ejecutar la jornada de campo',
    description:
      'Consulta ciudadanos programados, encuestadores asignados, estados de visita y ciudadanos de última hora.',
    responsible: 'Coordinación y encuestadores',
    result: 'Visitas organizadas y resultados registrados',
    icon: <RefreshIcon />,
    color: 'warning',
    actions: [
      {
        label: 'Jornada de campo',
        path: '/dashboard/callcenter/jornada',
        variant: 'contained',
        icon: <RefreshIcon />,
      },
      {
        label: 'Visitas asignadas',
        path: '/dashboard/callcenter/mis-asignaciones',
        variant: 'outlined',
        icon: <CheckCircleIcon />,
      },
    ],
  },
  {
    number: 5,
    title: 'Supervisar resultados',
    description:
      'Consulta todos los casos, responsables, orígenes, llamadas, visitas y estados del proceso.',
    responsible: 'Coordinación o supervisión',
    result: 'Seguimiento general del proceso',
    icon: <CheckCircleIcon />,
    color: 'success',
    actions: [
      {
        label: 'Control general de casos',
        path: '/dashboard/callcenter/registros',
        variant: 'contained',
        icon: <CheckCircleIcon />,
      },
    ],
  },
];

type ReferenceView = {
  title: string;
  description: string;
  buttonLabel: string;
  path: string;
};

const REFERENCE_VIEWS: ReferenceView[] = [
  {
    title: 'Casos por gestionar',
    description:
      'Bandeja del funcionario Call Center. Contiene los casos que requieren gestión telefónica y seguimiento.',
    buttonLabel: 'Abrir casos',
    path: '/dashboard/callcenter/mis-registros',
  },
  {
    title: 'Visitas asignadas',
    description:
      'Bandeja del encuestador. Contiene las visitas asignadas y permite registrar el resultado de campo.',
    buttonLabel: 'Abrir visitas',
    path: '/dashboard/callcenter/mis-asignaciones',
  },
  {
    title: 'Control general de casos',
    description:
      'Consulta administrativa para supervisar todos los casos, responsables, llamadas y visitas.',
    buttonLabel: 'Abrir control general',
    path: '/dashboard/callcenter/registros',
  },
];

export default function CallCenterHomePage() {
  const router = useRouter();

  const [role, setRole] = useState<AppRole | ''>('');

  useEffect(() => {
    setRole(currentRole());
  }, []);

  const steps = useMemo(
    () =>
      FLOW_STEPS.map((step) => ({
        ...step,
        actions: step.actions.filter((action) =>
          canAccessDashboardPath(role, action.path),
        ),
      })),
    [role],
  );

  const canOpen = (path: string) =>
    canAccessDashboardPath(role, path);

  return (
    <Box>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            Call Center
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.5 }}
          >
            Sigue el proceso en orden: ingresar casos, distribuirlos,
            gestionar llamadas, ejecutar la jornada y supervisar resultados.
          </Typography>
        </Box>

        <Alert severity="info">
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            La llamada es informativa y de confirmación.
          </Typography>

          <Typography variant="body2">
            Cuando el ciudadano no contesta, el intento debe quedar
            registrado. La visita programada continúa y el encuestador debe
            realizarla en la fecha asignada.
          </Typography>
        </Alert>

        <Paper sx={{ p: { xs: 2, md: 3 } }}>
          <Stack spacing={1}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Flujo de trabajo
            </Typography>

            <Typography variant="body2" color="text.secondary">
              Cada pantalla tiene una responsabilidad concreta. Los botones
              disponibles dependen del rol del usuario autenticado.
            </Typography>
          </Stack>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                lg: 'repeat(2, minmax(0, 1fr))',
              },
              gap: 2,
              mt: 3,
            }}
          >
            {steps.map((step) => (
              <Card
                key={step.number}
                variant="outlined"
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 280,
                }}
              >
                <CardContent
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                  }}
                >
                  <Stack
                    direction="row"
                    spacing={1.5}
                    sx={{
                      alignItems: 'flex-start',
                    }}
                  >
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: `${step.color}.main`,
                        color: `${step.color}.contrastText`,
                        flexShrink: 0,
                      }}
                    >
                      {step.icon}
                    </Box>

                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Stack
                        direction="row"
                        sx={{
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: 1,
                        }}
                      >
                        <Chip
                          size="small"
                          color={step.color}
                          label={`Paso ${step.number}`}
                        />

                        <Typography
                          variant="h6"
                          sx={{ fontWeight: 800 }}
                        >
                          {step.title}
                        </Typography>
                      </Stack>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 1 }}
                      >
                        {step.description}
                      </Typography>
                    </Box>
                  </Stack>

                  <Divider sx={{ my: 2 }} />

                  <Stack spacing={1}>
                    <Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'block' }}
                      >
                        Responsable
                      </Typography>

                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 700 }}
                      >
                        {step.responsible}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'block' }}
                      >
                        Resultado esperado
                      </Typography>

                      <Typography variant="body2">
                        {step.result}
                      </Typography>
                    </Box>
                  </Stack>

                  {step.actions.length > 0 && (
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={1}
                      sx={{
                        mt: 'auto',
                        pt: 2,
                      }}
                    >
                      {step.actions.map((action) => (
                        <Button
                          key={action.path}
                          variant={action.variant}
                          startIcon={action.icon}
                          onClick={() => router.push(action.path)}
                        >
                          {action.label}
                        </Button>
                      ))}
                    </Stack>
                  )}
                </CardContent>
              </Card>
            ))}
          </Box>
        </Paper>

        <Paper sx={{ p: { xs: 2, md: 3 } }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Diferencia entre las vistas operativas
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.5 }}
          >
            Cada bandeja corresponde a una responsabilidad distinta.
          </Typography>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                md: 'repeat(3, minmax(0, 1fr))',
              },
              gap: 2,
              mt: 2,
            }}
          >
            {REFERENCE_VIEWS.map((view) => (
              <Card key={view.path} variant="outlined">
                <CardContent>
                  <Typography
                    variant="subtitle1"
                    sx={{ fontWeight: 800 }}
                  >
                    {view.title}
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 1 }}
                  >
                    {view.description}
                  </Typography>

                  {canOpen(view.path) && (
                    <Button
                      size="small"
                      sx={{ mt: 1.5 }}
                      onClick={() => router.push(view.path)}
                    >
                      {view.buttonLabel}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </Box>
        </Paper>

        <Alert severity="success" icon={<CheckCircleIcon />}>
          <Typography variant="body2">
            Las búsquedas, filtros, edición, activación e inactivación están
            concentradas en <strong>Control general de casos</strong>.
          </Typography>
        </Alert>
      </Stack>
    </Box>
  );
}