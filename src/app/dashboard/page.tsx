'use client';

import AssessmentIcon from '@mui/icons-material/Assessment';
import BarChartIcon from '@mui/icons-material/BarChart';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SecurityIcon from '@mui/icons-material/Security';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { getStoredUser } from '@/lib/authToken';
import {
  DashboardIconKey,
  getDashboardActionsByRole,
  normalizeRole,
} from '@/lib/roleAccess';
import { AuthUserResponse } from '@/types/auth.types';
import PeopleIcon from '@mui/icons-material/People';
import LockResetIcon from '@mui/icons-material/LockReset';

const actionIcons: Record<DashboardIconKey, ReactNode> = {
  dashboard: <DashboardIcon />,
  ventanilla: <AssessmentIcon />,
  dmc: <BarChartIcon />,
  auditoria: <SecurityIcon />,
  exportaciones: <CloudDownloadIcon />,
  usuarios: <PeopleIcon />,
  password: <LockResetIcon />,
  reportes: <CloudDownloadIcon />,
};

function getRoleFriendlyName(role?: string | null) {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === 'ADMIN') {
    return 'Administrador';
  }

  if (normalizedRole === 'SUPERVISOR') {
    return 'Supervisor';
  }

  if (normalizedRole === 'FUNCIONARIO_VENTANILLA') {
    return 'Funcionario de Ventanilla';
  }

  if (normalizedRole === 'FUNCIONARIO_DMC') {
    return 'Funcionario DMC';
  }

  if (normalizedRole === 'CONSULTA') {
    return 'Usuario de Consulta';
  }

  return 'Usuario';
}

function getRoleDescription(role?: string | null) {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === 'ADMIN') {
    return 'Tienes acceso general a los módulos operativos, auditoría y exportaciones.';
  }

  if (normalizedRole === 'SUPERVISOR') {
    return 'Puedes revisar la operación, consultar trazabilidad y exportar información.';
  }

  if (normalizedRole === 'FUNCIONARIO_VENTANILLA') {
    return 'Tu trabajo principal es registrar, consultar y actualizar la atención de ventanilla.';
  }

  if (normalizedRole === 'FUNCIONARIO_DMC') {
    return 'Tu trabajo principal es registrar, consultar y actualizar la información DMC.';
  }

  if (normalizedRole === 'CONSULTA') {
    return 'Puedes revisar información general sin modificar registros.';
  }

  return 'Selecciona una opción disponible para continuar.';
}

function getRoleSteps(role?: string | null) {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === 'FUNCIONARIO_VENTANILLA') {
    return [
      'Ingresa al módulo Ventanilla.',
      'Busca por fecha, cédula, estado o barrio.',
      'Crea o actualiza el registro según corresponda.',
    ];
  }

  if (normalizedRole === 'FUNCIONARIO_DMC') {
    return [
      'Ingresa al módulo DMC.',
      'Filtra por fecha, tipo DMC, encuestador o barrio.',
      'Crea o actualiza el registro según corresponda.',
    ];
  }

  if (normalizedRole === 'CONSULTA') {
    return [
      'Entra a Ventanilla o DMC para revisar información.',
      'Utiliza los filtros para ubicar la información.',
      'No tendrás opciones de creación, edición ni exportación.',
    ];
  }

  return [
    'Elige Ventanilla o DMC según el proceso que quieras revisar.',
    'Usa Auditoría para verificar trazabilidad cuando sea necesario.',
    'Usa Exportaciones cuando necesites descargar información en Excel.',
  ];
}

export default function DashboardPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<AuthUserResponse | null>(null);

  useEffect(() => {
    setMounted(true);
    setUser(getStoredUser<AuthUserResponse>());
  }, []);

  const actions = useMemo(() => {
    return getDashboardActionsByRole(user?.rolCodigo);
  }, [user?.rolCodigo]);

  const steps = useMemo(() => {
    return getRoleSteps(user?.rolCodigo);
  }, [user?.rolCodigo]);

  if (!mounted || !user) {
    return (
      <Box
        sx={{
          minHeight: 360,
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <Stack spacing={2} sx={{ alignItems: 'center' }}>
          <CircularProgress />

          <Typography color="text.secondary">
            Preparando tu panel...
          </Typography>
        </Stack>
      </Box>
    );
  }

  const roleName = getRoleFriendlyName(user.rolCodigo);
  const roleDescription = getRoleDescription(user.rolCodigo);

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
              'linear-gradient(135deg, rgba(25, 118, 210, 0.12), rgba(25, 118, 210, 0.02))',
          }}
        >
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={3}
            sx={{
              alignItems: { xs: 'flex-start', md: 'center' },
              justifyContent: 'space-between',
            }}
          >
            <Box>
              <Chip
                label={roleName}
                color="primary"
                variant="outlined"
                sx={{ mb: 2 }}
              />

              <Typography variant="h4" sx={{ fontWeight: 800 }}>
                Hola, {user.username ?? 'usuario'}
              </Typography>

              <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 720 }}>
                {roleDescription}
              </Typography>
            </Box>

            <Button
              variant="contained"
              size="large"
              onClick={() => {
                if (actions[0]) {
                  router.push(actions[0].href);
                }
              }}
              disabled={!actions[0]}
            >
              Empezar
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Alert severity="info">
        Este panel muestra únicamente las acciones habilitadas para tu rol.
        Así el sistema es más fácil de entender y evita opciones innecesarias.
      </Alert>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            md: 'repeat(2, 1fr)',
            xl: 'repeat(3, 1fr)',
          },
          gap: 2,
        }}
      >
        {actions.map((action) => (
          <Card
            key={`${action.href}-${action.title}`}
            sx={{
              borderRadius: 3,
              border: action.primary ? '1px solid' : undefined,
              borderColor: action.primary ? 'primary.main' : undefined,
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Stack spacing={2}>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: action.primary ? 'primary.main' : 'action.hover',
                    color: action.primary ? 'primary.contrastText' : 'text.primary',
                  }}
                >
                  {actionIcons[action.iconKey]}
                </Box>

                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {action.title}
                  </Typography>

                  <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                    {action.description}
                  </Typography>
                </Box>

                <Button
                  variant={action.primary ? 'contained' : 'outlined'}
                  onClick={() => router.push(action.href)}
                  fullWidth
                >
                  {action.buttonLabel}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Card sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            Ruta recomendada de trabajo
          </Typography>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                md: 'repeat(3, 1fr)',
              },
              gap: 2,
            }}
          >
            {steps.map((step, index) => (
              <Box
                key={step}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                }}
              >
                <Chip
                  label={`Paso ${index + 1}`}
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ mb: 1 }}
                />

                <Typography>
                  {step}
                </Typography>
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>
    </Stack>
  );
}