import { getStoredUser } from './authToken';
import { AuthUserResponse } from '@/types/auth.types';

export type AppRole =
  | 'ADMIN'
  | 'SUPERVISOR'
  | 'FUNCIONARIO_VENTANILLA'
  | 'FUNCIONARIO_DMC'
  | 'CONSULTA';

export type DashboardIconKey =
  | 'dashboard'
  | 'ventanilla'
  | 'dmc'
  | 'auditoria'
  | 'exportaciones'
  | 'usuarios'
  | 'password'
  | 'reportes';

export type DashboardMenuItem = {
  label: string;
  href: string;
  iconKey: DashboardIconKey;
  roles: AppRole[];
};

export type DashboardActionItem = {
  title: string;
  description: string;
  href: string;
  buttonLabel: string;
  iconKey: DashboardIconKey;
  roles: AppRole[];
  primary?: boolean;
};

const ALL_ROLES: AppRole[] = [
  'ADMIN',
  'SUPERVISOR',
  'FUNCIONARIO_VENTANILLA',
  'FUNCIONARIO_DMC',
  'CONSULTA',
];

export const dashboardMenuItems: DashboardMenuItem[] = [
  {
    label: 'Inicio',
    href: '/dashboard',
    iconKey: 'dashboard',
    roles: ALL_ROLES,
  },
  {
    label: 'Ventanilla',
    href: '/dashboard/ventanilla/registros',
    iconKey: 'ventanilla',
    roles: ['ADMIN', 'SUPERVISOR', 'FUNCIONARIO_VENTANILLA'],
  },
  {
    label: 'Historial usuario',
    href: '/dashboard/ventanilla/historial-usuario',
    iconKey: 'ventanilla',
    roles: ['ADMIN', 'SUPERVISOR', 'FUNCIONARIO_VENTANILLA'],
  },
  {
    label: 'Ventanilla',
    href: '/dashboard/ventanilla',
    iconKey: 'ventanilla',
    roles: ['CONSULTA'],
  },
  {
    label: 'DMC',
    href: '/dashboard/dmc/registros',
    iconKey: 'dmc',
    roles: ['ADMIN', 'SUPERVISOR', 'FUNCIONARIO_DMC'],
  },
  {
    label: 'DMC',
    href: '/dashboard/dmc',
    iconKey: 'dmc',
    roles: ['CONSULTA'],
  },
  {
    label: 'Auditoría',
    href: '/dashboard/auditoria',
    iconKey: 'auditoria',
    roles: ['ADMIN', 'SUPERVISOR'],
  },
  {
    label: 'Reportes',
    href: '/dashboard/reportes',
    iconKey: 'reportes',
    roles: ['ADMIN', 'SUPERVISOR', 'CONSULTA'],
  },
  {
    label: 'Exportaciones',
    href: '/dashboard/exportaciones',
    iconKey: 'exportaciones',
    roles: ['ADMIN', 'SUPERVISOR'],
  },
  {
    label: 'Gestión de usuarios',
    href: '/dashboard/usuarios',
    iconKey: 'usuarios',
    roles: ['ADMIN'],
  },
  {
    label: 'Cambiar contraseña',
    href: '/dashboard/cuenta/cambiar-password',
    iconKey: 'password',
    roles: ALL_ROLES,
  },
];

export const dashboardActions: DashboardActionItem[] = [
  {
    title: 'Trabajar Ventanilla',
    description: 'Consulta, registra y actualiza solicitudes de atención en ventanilla.',
    href: '/dashboard/ventanilla/registros',
    buttonLabel: 'Abrir Ventanilla',
    iconKey: 'ventanilla',
    roles: ['ADMIN', 'SUPERVISOR', 'FUNCIONARIO_VENTANILLA'],
    primary: true,
  },
  {
    title: 'Historial de usuario',
    description: 'Consulta visitas, solicitudes y reportes individuales por ciudadano.',
    href: '/dashboard/ventanilla/historial-usuario',
    buttonLabel: 'Abrir Historial',
    iconKey: 'ventanilla',
    roles: ['ADMIN', 'SUPERVISOR', 'FUNCIONARIO_VENTANILLA'],
  },
  {
    title: 'Consultar Ventanilla',
    description: 'Revisa la información general de solicitudes de ventanilla.',
    href: '/dashboard/ventanilla',
    buttonLabel: 'Ver Ventanilla',
    iconKey: 'ventanilla',
    roles: ['CONSULTA'],
    primary: true,
  },
  {
    title: 'Trabajar DMC',
    description: 'Consulta, registra y actualiza registros de DMC.',
    href: '/dashboard/dmc/registros',
    buttonLabel: 'Abrir DMC',
    iconKey: 'dmc',
    roles: ['ADMIN', 'SUPERVISOR', 'FUNCIONARIO_DMC'],
    primary: true,
  },
  {
    title: 'Consultar DMC',
    description: 'Revisa la información general de registros DMC.',
    href: '/dashboard/dmc',
    buttonLabel: 'Ver DMC',
    iconKey: 'dmc',
    roles: ['CONSULTA'],
  },
  {
    title: 'Revisar Auditoría',
    description: 'Consulta la trazabilidad de ingresos, cambios, registros y exportaciones.',
    href: '/dashboard/auditoria',
    buttonLabel: 'Abrir Auditoría',
    iconKey: 'auditoria',
    roles: ['ADMIN', 'SUPERVISOR'],
  },
  {
    title: 'Exportar información',
    description: 'Descarga archivos Excel de ventanilla, DMC y reportes consolidados.',
    href: '/dashboard/exportaciones',
    buttonLabel: 'Ir a Exportaciones',
    iconKey: 'exportaciones',
    roles: ['ADMIN', 'SUPERVISOR'],
  },
  {
    title: 'Gestionar usuarios',
    description: 'Crea, actualiza, activa, inactiva usuarios y restablece contraseñas.',
    href: '/dashboard/usuarios',
    buttonLabel: 'Abrir Usuarios',
    iconKey: 'usuarios',
    roles: ['ADMIN'],
  },
  {
    title: 'Cambiar contraseña',
    description: 'Actualiza tu contraseña de ingreso a la app web.',
    href: '/dashboard/cuenta/cambiar-password',
    buttonLabel: 'Cambiar contraseña',
    iconKey: 'password',
    roles: ALL_ROLES,
  },
];

const allowedDashboardPathsByRole: Record<AppRole, string[]> = {
  ADMIN: [
    '/dashboard',
    '/dashboard/ventanilla',
    '/dashboard/ventanilla/registros',
    '/dashboard/ventanilla/historial-usuario',
    '/dashboard/dmc',
    '/dashboard/dmc/registros',
    '/dashboard/auditoria',
    '/dashboard/reportes',
    '/dashboard/exportaciones',
    '/dashboard/usuarios',
    '/dashboard/cuenta/cambiar-password',
  ],
  SUPERVISOR: [
    '/dashboard',
    '/dashboard/ventanilla',
    '/dashboard/ventanilla/registros',
    '/dashboard/ventanilla/historial-usuario',
    '/dashboard/dmc',
    '/dashboard/dmc/registros',
    '/dashboard/auditoria',
    '/dashboard/reportes',
    '/dashboard/exportaciones',
    '/dashboard/cuenta/cambiar-password',
  ],
  FUNCIONARIO_VENTANILLA: [
    '/dashboard',
    '/dashboard/ventanilla',
    '/dashboard/ventanilla/registros',
    '/dashboard/ventanilla/historial-usuario',
    '/dashboard/cuenta/cambiar-password',
  ],
  FUNCIONARIO_DMC: [
    '/dashboard',
    '/dashboard/dmc',
    '/dashboard/dmc/registros',
    '/dashboard/cuenta/cambiar-password',
  ],
  CONSULTA: [
    '/dashboard',
    '/dashboard/ventanilla',
    '/dashboard/dmc',
    '/dashboard/reportes',
    '/dashboard/cuenta/cambiar-password',
  ],
};

export function normalizeRole(role?: string | null): AppRole | '' {
  const value = String(role ?? '').trim().toUpperCase();

  if (
    value === 'ADMIN' ||
    value === 'SUPERVISOR' ||
    value === 'FUNCIONARIO_VENTANILLA' ||
    value === 'FUNCIONARIO_DMC' ||
    value === 'CONSULTA'
  ) {
    return value;
  }

  return '';
}

export function currentRole() {
  return normalizeRole(getStoredUser<AuthUserResponse>()?.rolCodigo);
}

export function getDashboardMenuByRole(role?: string | null) {
  const normalizedRole = normalizeRole(role);

  if (!normalizedRole) {
    return [];
  }

  return dashboardMenuItems.filter((item) => item.roles.includes(normalizedRole));
}

export function getDashboardActionsByRole(role?: string | null) {
  const normalizedRole = normalizeRole(role);

  if (!normalizedRole) {
    return [];
  }

  return dashboardActions.filter((item) => item.roles.includes(normalizedRole));
}

export function getDefaultDashboardPathByRole(role?: string | null) {
  const normalizedRole = normalizeRole(role);

  if (
    normalizedRole === 'ADMIN' ||
    normalizedRole === 'SUPERVISOR' ||
    normalizedRole === 'FUNCIONARIO_VENTANILLA' ||
    normalizedRole === 'FUNCIONARIO_DMC' ||
    normalizedRole === 'CONSULTA'
  ) {
    return '/dashboard';
  }

  return '/login';
}

export function canAccessDashboardPath(role: string | null | undefined, path: string) {
  const normalizedRole = normalizeRole(role);

  if (!normalizedRole) {
    return false;
  }

  return allowedDashboardPathsByRole[normalizedRole].includes(path);
}

export function canWriteVentanilla(role: string | null | undefined = currentRole()) {
  const normalizedRole = normalizeRole(role);

  return ['ADMIN', 'SUPERVISOR', 'FUNCIONARIO_VENTANILLA'].includes(normalizedRole);
}

export function canDeleteVentanilla(role: string | null | undefined = currentRole()) {
  const normalizedRole = normalizeRole(role);

  return ['ADMIN', 'SUPERVISOR', 'FUNCIONARIO_VENTANILLA'].includes(normalizedRole);
}

export function canWriteDmc(role: string | null | undefined = currentRole()) {
  const normalizedRole = normalizeRole(role);

  return ['ADMIN', 'SUPERVISOR', 'FUNCIONARIO_DMC'].includes(normalizedRole);
}

export function canExport(role: string | null | undefined = currentRole()) {
  const normalizedRole = normalizeRole(role);

  return ['ADMIN', 'SUPERVISOR'].includes(normalizedRole);
}

export function canViewAudit(role: string | null | undefined = currentRole()) {
  const normalizedRole = normalizeRole(role);

  return ['ADMIN', 'SUPERVISOR'].includes(normalizedRole);
}

export function canManageVentanillaStatus(role: string | null | undefined = currentRole()) {
  const normalizedRole = normalizeRole(role);

  return normalizedRole === 'ADMIN';
}

export function canHardDeleteVentanilla(role: string | null | undefined = currentRole()) {
  const normalizedRole = normalizeRole(role);

  return normalizedRole === 'ADMIN';
}

export function canManageUsers(role: string | null | undefined = currentRole()) {
  const normalizedRole = normalizeRole(role);

  return normalizedRole === 'ADMIN';
}