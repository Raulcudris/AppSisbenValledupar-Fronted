import { getStoredUser } from './authToken';
import { AuthUserResponse } from '@/types/auth.types';

export type AppRole =
  | 'ADMIN'
  | 'SUPERVISOR'
  | 'COORDINADOR_CALLCENTER'
  | 'FUNCIONARIO_VENTANILLA'
  | 'FUNCIONARIO_DMC'
  | 'FUNCIONARIO_CALLCENTER'
  | 'FUNCIONARIO_ENCUESTADOR'
  | 'CONSULTA';

export type DashboardIconKey =
  | 'dashboard'
  | 'ventanilla'
  | 'dmc'
  | 'callcenter'
  | 'encuestador'
  | 'auditoria'
  | 'exportaciones'
  | 'usuarios'
  | 'password'
  | 'barrios'
  | 'comunas'
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
  'COORDINADOR_CALLCENTER',
  'FUNCIONARIO_VENTANILLA',
  'FUNCIONARIO_DMC',
  'FUNCIONARIO_CALLCENTER',
  'FUNCIONARIO_ENCUESTADOR',
  'CONSULTA',
];

const CALLCENTER_ADMIN_ROLES: AppRole[] = [
  'ADMIN',
  'SUPERVISOR',
  'COORDINADOR_CALLCENTER',
];

const CALLCENTER_REGISTROS_ROLES: AppRole[] = [
  'ADMIN',
  'SUPERVISOR',
  'COORDINADOR_CALLCENTER',
  'FUNCIONARIO_CALLCENTER',
];

const CALLCENTER_FUNCIONARIO_ROLES: AppRole[] = [
  'ADMIN',
  'FUNCIONARIO_CALLCENTER',
];

/**
 * Roles autorizados para registrar formalmente
 * el resultado de una visita.
 */
const CALLCENTER_ENCUESTADOR_ROLES: AppRole[] = [
  'ADMIN',
  'FUNCIONARIO_ENCUESTADOR',
];

/**
 * Roles que pueden ingresar a la pantalla
 * Mis asignaciones.
 *
 * ADMIN, COORDINADOR_CALLCENTER y FUNCIONARIO_CALLCENTER
 * pueden utilizarla como consulta administrativa.
 *
 * FUNCIONARIO_ENCUESTADOR continúa utilizando la pantalla
 * como agenda operativa propia.
 */
const CALLCENTER_MIS_ASIGNACIONES_ROLES: AppRole[] = [
  'ADMIN',
  'COORDINADOR_CALLCENTER',
  'FUNCIONARIO_CALLCENTER',
  'FUNCIONARIO_ENCUESTADOR',
];

/**
 * Roles que pueden seleccionar un encuestador
 * dentro del filtro de Mis asignaciones.
 *
 * FUNCIONARIO_ENCUESTADOR se excluye para impedir
 * que seleccione asignaciones de otro encuestador.
 */
const CALLCENTER_MIS_ASIGNACIONES_FILTER_ROLES: AppRole[] = [
  'ADMIN',
  'COORDINADOR_CALLCENTER',
  'FUNCIONARIO_CALLCENTER',
];

const CALLCENTER_AGENDA_VISITAS_ROLES: AppRole[] = [
  'ADMIN',
  'COORDINADOR_CALLCENTER',
  'FUNCIONARIO_CALLCENTER',
];

const EXACT_ONLY_PATHS = [
  '/dashboard',
  '/dashboard/ventanilla',
  '/dashboard/dmc',
  '/dashboard/callcenter',
  '/dashboard/callcenter/registros',
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
    roles: [
      'ADMIN',
      'SUPERVISOR',
      'FUNCIONARIO_VENTANILLA',
    ],
  },
  {
    label: 'Historial usuario',
    href: '/dashboard/ventanilla/historial-usuario',
    iconKey: 'ventanilla',
    roles: ['ADMIN'],
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
    roles: [
      'ADMIN',
      'SUPERVISOR',
      'FUNCIONARIO_DMC',
    ],
  },
  {
    label: 'DMC',
    href: '/dashboard/dmc',
    iconKey: 'dmc',
    roles: ['CONSULTA'],
  },
  {
    label: 'Registros Call Center',
    href: '/dashboard/callcenter/registros',
    iconKey: 'callcenter',
    roles: CALLCENTER_REGISTROS_ROLES,
  },
  {
    label: 'Mis registros Call Center',
    href: '/dashboard/callcenter/mis-registros',
    iconKey: 'callcenter',
    roles: CALLCENTER_FUNCIONARIO_ROLES,
  },
  {
    label: 'Agenda de visitas',
    href: '/dashboard/callcenter/agenda-visitas',
    iconKey: 'encuestador',
    roles: CALLCENTER_AGENDA_VISITAS_ROLES,
  },
  {
    label: 'Mis asignaciones',
    href: '/dashboard/callcenter/mis-asignaciones',
    iconKey: 'encuestador',
    roles: CALLCENTER_MIS_ASIGNACIONES_ROLES,
  },
  {
    label: 'Call Center',
    href: '/dashboard/callcenter',
    iconKey: 'callcenter',
    roles: ['CONSULTA'],
  },
  {
    label: 'Barrios',
    href: '/dashboard/territory/barrios',
    iconKey: 'barrios',
    roles: ['ADMIN'],
  },
  {
    label: 'Comunas',
    href: '/dashboard/territory/comunas',
    iconKey: 'comunas',
    roles: ['ADMIN'],
  },
  {
    label: 'Auditoría',
    href: '/dashboard/auditoria',
    iconKey: 'auditoria',
    roles: [
      'ADMIN',
      'SUPERVISOR',
    ],
  },
  {
    label: 'Reportes',
    href: '/dashboard/reportes',
    iconKey: 'reportes',
    roles: [
      'ADMIN',
      'SUPERVISOR',
      'CONSULTA',
    ],
  },
  {
    label: 'Exportaciones',
    href: '/dashboard/exportaciones',
    iconKey: 'exportaciones',
    roles: [
      'ADMIN',
      'SUPERVISOR',
    ],
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
    description:
      'Consulta, registra y actualiza solicitudes de atención en ventanilla.',
    href: '/dashboard/ventanilla/registros',
    buttonLabel: 'Abrir Ventanilla',
    iconKey: 'ventanilla',
    roles: [
      'ADMIN',
      'SUPERVISOR',
      'FUNCIONARIO_VENTANILLA',
    ],
    primary: true,
  },
  {
    title: 'Historial de usuario',
    description:
      'Consulta visitas, solicitudes y reportes individuales por ciudadano.',
    href: '/dashboard/ventanilla/historial-usuario',
    buttonLabel: 'Abrir Historial',
    iconKey: 'ventanilla',
    roles: ['ADMIN'],
  },
  {
    title: 'Consultar Ventanilla',
    description:
      'Revisa la información general de solicitudes de ventanilla.',
    href: '/dashboard/ventanilla',
    buttonLabel: 'Ver Ventanilla',
    iconKey: 'ventanilla',
    roles: ['CONSULTA'],
    primary: true,
  },
  {
    title: 'Trabajar DMC',
    description:
      'Consulta, registra y actualiza registros de DMC.',
    href: '/dashboard/dmc/registros',
    buttonLabel: 'Abrir DMC',
    iconKey: 'dmc',
    roles: [
      'ADMIN',
      'SUPERVISOR',
      'FUNCIONARIO_DMC',
    ],
    primary: true,
  },
  {
    title: 'Consultar DMC',
    description:
      'Revisa la información general de registros DMC.',
    href: '/dashboard/dmc',
    buttonLabel: 'Ver DMC',
    iconKey: 'dmc',
    roles: ['CONSULTA'],
  },
  {
    title: 'Registros Call Center',
    description:
      'Consulta, filtra y administra los casos generales del módulo Call Center.',
    href: '/dashboard/callcenter/registros',
    buttonLabel: 'Abrir registros',
    iconKey: 'callcenter',
    roles: CALLCENTER_ADMIN_ROLES,
    primary: true,
  },
  {
    title: 'Mis registros Call Center',
    description:
      'Consulta, busca y gestiona los casos relacionados con tu usuario.',
    href: '/dashboard/callcenter/registros',
    buttonLabel: 'Abrir mis registros',
    iconKey: 'callcenter',
    roles: [
      'FUNCIONARIO_CALLCENTER',
    ],
    primary: true,
  },
  {
    title: 'Agenda de visitas',
    description:
      'Consulta las personas programadas para visitar por encuestador y fecha.',
    href: '/dashboard/callcenter/agenda-visitas',
    buttonLabel: 'Consultar agenda',
    iconKey: 'encuestador',
    roles: CALLCENTER_AGENDA_VISITAS_ROLES,
    primary: true,
  },
  {
    title: 'Mis asignaciones',
    description:
      'Consulta las visitas asignadas y el estado del trabajo de campo.',
    href: '/dashboard/callcenter/mis-asignaciones',
    buttonLabel: 'Abrir asignaciones',
    iconKey: 'encuestador',
    roles: CALLCENTER_MIS_ASIGNACIONES_ROLES,
    primary: true,
  },
  {
    title: 'Consultar Call Center',
    description:
      'Revisa la información general de llamadas registradas.',
    href: '/dashboard/callcenter',
    buttonLabel: 'Ver Call Center',
    iconKey: 'callcenter',
    roles: ['CONSULTA'],
  },
  {
    title: 'Administrar barrios',
    description:
      'Consulta, crea, actualiza, activa e inactiva barrios por comuna.',
    href: '/dashboard/territory/barrios',
    buttonLabel: 'Abrir Barrios',
    iconKey: 'barrios',
    roles: ['ADMIN'],
  },
  {
    title: 'Administrar comunas',
    description:
      'Consulta, crea, actualiza, activa e inactiva comunas.',
    href: '/dashboard/territory/comunas',
    buttonLabel: 'Abrir Comunas',
    iconKey: 'comunas',
    roles: ['ADMIN'],
  },
  {
    title: 'Revisar Auditoría',
    description:
      'Consulta la trazabilidad de ingresos, cambios, registros y exportaciones.',
    href: '/dashboard/auditoria',
    buttonLabel: 'Abrir Auditoría',
    iconKey: 'auditoria',
    roles: [
      'ADMIN',
      'SUPERVISOR',
    ],
  },
  {
    title: 'Exportar información',
    description:
      'Descarga archivos Excel de ventanilla, DMC y reportes consolidados.',
    href: '/dashboard/exportaciones',
    buttonLabel: 'Ir a Exportaciones',
    iconKey: 'exportaciones',
    roles: [
      'ADMIN',
      'SUPERVISOR',
    ],
  },
  {
    title: 'Gestionar usuarios',
    description:
      'Crea, actualiza, activa, inactiva usuarios y restablece contraseñas.',
    href: '/dashboard/usuarios',
    buttonLabel: 'Abrir Usuarios',
    iconKey: 'usuarios',
    roles: ['ADMIN'],
  },
  {
    title: 'Cambiar contraseña',
    description:
      'Actualiza tu contraseña de ingreso a la app web.',
    href: '/dashboard/cuenta/cambiar-password',
    buttonLabel: 'Cambiar contraseña',
    iconKey: 'password',
    roles: ALL_ROLES,
  },
];

const allowedDashboardPathsByRole: Record<
  AppRole,
  string[]
> = {
  ADMIN: [
    '/dashboard',
    '/dashboard/ventanilla',
    '/dashboard/ventanilla/registros',
    '/dashboard/ventanilla/historial-usuario',
    '/dashboard/dmc',
    '/dashboard/dmc/registros',
    '/dashboard/callcenter',
    '/dashboard/callcenter/registros',
    '/dashboard/callcenter/registros/nuevo',
    '/dashboard/callcenter/registros/cargar-ventanilla',
    '/dashboard/callcenter/asignar-funcionarios',
    '/dashboard/callcenter/mis-registros',
    '/dashboard/callcenter/mis-asignaciones',
    '/dashboard/callcenter/agenda-visitas',
    '/dashboard/territory/barrios',
    '/dashboard/territory/comunas',
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
    '/dashboard/dmc',
    '/dashboard/dmc/registros',
    '/dashboard/callcenter',
    '/dashboard/callcenter/registros',
    '/dashboard/callcenter/registros/nuevo',
    '/dashboard/callcenter/registros/cargar-ventanilla',
    '/dashboard/callcenter/asignar-funcionarios',
    '/dashboard/auditoria',
    '/dashboard/reportes',
    '/dashboard/exportaciones',
    '/dashboard/cuenta/cambiar-password',
  ],

  COORDINADOR_CALLCENTER: [
    '/dashboard',
    '/dashboard/callcenter',
    '/dashboard/callcenter/registros',
    '/dashboard/callcenter/registros/nuevo',
    '/dashboard/callcenter/registros/cargar-ventanilla',
    '/dashboard/callcenter/asignar-funcionarios',
    '/dashboard/callcenter/mis-asignaciones',
    '/dashboard/callcenter/agenda-visitas',
    '/dashboard/cuenta/cambiar-password',
  ],

  FUNCIONARIO_VENTANILLA: [
    '/dashboard',
    '/dashboard/ventanilla',
    '/dashboard/ventanilla/registros',
    '/dashboard/cuenta/cambiar-password',
  ],

  FUNCIONARIO_DMC: [
    '/dashboard',
    '/dashboard/dmc',
    '/dashboard/dmc/registros',
    '/dashboard/cuenta/cambiar-password',
  ],

  FUNCIONARIO_CALLCENTER: [
    '/dashboard',
    '/dashboard/callcenter/registros',
    '/dashboard/callcenter/registros/nuevo',
    '/dashboard/callcenter/mis-registros',
    '/dashboard/callcenter/mis-asignaciones',
    '/dashboard/callcenter/agenda-visitas',
    '/dashboard/cuenta/cambiar-password',
  ],

  FUNCIONARIO_ENCUESTADOR: [
    '/dashboard',
    '/dashboard/callcenter/mis-asignaciones',
    '/dashboard/cuenta/cambiar-password',
  ],

  CONSULTA: [
    '/dashboard',
    '/dashboard/ventanilla',
    '/dashboard/dmc',
    '/dashboard/callcenter',
    '/dashboard/reportes',
    '/dashboard/cuenta/cambiar-password',
  ],
};

export function normalizeRole(
  role?: string | null,
): AppRole | '' {
  const value =
    String(role ?? '')
      .trim()
      .toUpperCase();

  if (
    value === 'ADMIN'
    || value === 'SUPERVISOR'
    || value === 'COORDINADOR_CALLCENTER'
    || value === 'FUNCIONARIO_VENTANILLA'
    || value === 'FUNCIONARIO_DMC'
    || value === 'FUNCIONARIO_CALLCENTER'
    || value === 'FUNCIONARIO_ENCUESTADOR'
    || value === 'CONSULTA'
  ) {
    return value;
  }

  return '';
}

export function currentRole() {
  return normalizeRole(
    getStoredUser<AuthUserResponse>()
      ?.rolCodigo,
  );
}

export function getDashboardMenuByRole(
  role?: string | null,
) {
  const normalizedRole =
    normalizeRole(role);

  if (!normalizedRole) {
    return [];
  }

  return dashboardMenuItems.filter(
    (item) =>
      item.roles.includes(
        normalizedRole,
      ),
  );
}

export function getDashboardActionsByRole(
  role?: string | null,
) {
  const normalizedRole =
    normalizeRole(role);

  if (!normalizedRole) {
    return [];
  }

  return dashboardActions.filter(
    (item) =>
      item.roles.includes(
        normalizedRole,
      ),
  );
}

export function getDefaultDashboardPathByRole(
  role?: string | null,
) {
  const normalizedRole =
    normalizeRole(role);

  if (
    normalizedRole
    === 'FUNCIONARIO_VENTANILLA'
  ) {
    return '/dashboard/ventanilla/registros';
  }

  if (
    normalizedRole
    === 'FUNCIONARIO_DMC'
  ) {
    return '/dashboard/dmc/registros';
  }

  if (
    normalizedRole
    === 'COORDINADOR_CALLCENTER'
  ) {
    return '/dashboard/callcenter/registros';
  }

  if (
    normalizedRole
    === 'FUNCIONARIO_CALLCENTER'
  ) {
    return '/dashboard/callcenter/registros';
  }

  if (
    normalizedRole
    === 'FUNCIONARIO_ENCUESTADOR'
  ) {
    return '/dashboard/callcenter/mis-asignaciones';
  }

  if (
    normalizedRole === 'ADMIN'
    || normalizedRole === 'SUPERVISOR'
    || normalizedRole === 'CONSULTA'
  ) {
    return '/dashboard';
  }

  return '/login';
}

export function canAccessDashboardPath(
  role: string | null | undefined,
  path: string,
) {
  const normalizedRole =
    normalizeRole(role);

  if (!normalizedRole) {
    return false;
  }

  const allowedPaths =
    allowedDashboardPathsByRole[
      normalizedRole
    ];

  return allowedPaths.some(
    (allowedPath) => {
      if (
        path === allowedPath
      ) {
        return true;
      }

      if (
        EXACT_ONLY_PATHS.includes(
          allowedPath,
        )
      ) {
        return false;
      }

      return path.startsWith(
        `${allowedPath}/`,
      );
    },
  );
}

export function canWriteVentanilla(
  role:
    | string
    | null
    | undefined = currentRole(),
) {
  const normalizedRole =
    normalizeRole(role);

  return [
    'ADMIN',
    'SUPERVISOR',
    'FUNCIONARIO_VENTANILLA',
  ].includes(
    normalizedRole,
  );
}

export function canDeleteVentanilla(
  role:
    | string
    | null
    | undefined = currentRole(),
) {
  const normalizedRole =
    normalizeRole(role);

  return [
    'ADMIN',
    'SUPERVISOR',
    'FUNCIONARIO_VENTANILLA',
  ].includes(
    normalizedRole,
  );
}

export function canWriteDmc(
  role:
    | string
    | null
    | undefined = currentRole(),
) {
  const normalizedRole =
    normalizeRole(role);

  return [
    'ADMIN',
    'SUPERVISOR',
    'FUNCIONARIO_DMC',
  ].includes(
    normalizedRole,
  );
}

export function canExport(
  role:
    | string
    | null
    | undefined = currentRole(),
) {
  const normalizedRole =
    normalizeRole(role);

  return [
    'ADMIN',
    'SUPERVISOR',
  ].includes(
    normalizedRole,
  );
}

export function canViewAudit(
  role:
    | string
    | null
    | undefined = currentRole(),
) {
  const normalizedRole =
    normalizeRole(role);

  return [
    'ADMIN',
    'SUPERVISOR',
  ].includes(
    normalizedRole,
  );
}

export function canManageVentanillaStatus(
  role:
    | string
    | null
    | undefined = currentRole(),
) {
  return normalizeRole(
    role,
  ) === 'ADMIN';
}

export function canHardDeleteVentanilla(
  role:
    | string
    | null
    | undefined = currentRole(),
) {
  return normalizeRole(
    role,
  ) === 'ADMIN';
}

export function canManageUsers(
  role:
    | string
    | null
    | undefined = currentRole(),
) {
  return normalizeRole(
    role,
  ) === 'ADMIN';
}

export function canViewUserHistory(
  role:
    | string
    | null
    | undefined = currentRole(),
) {
  return normalizeRole(
    role,
  ) === 'ADMIN';
}

export function canManageTerritory(
  role:
    | string
    | null
    | undefined = currentRole(),
) {
  return normalizeRole(
    role,
  ) === 'ADMIN';
}

export function canWriteCallCenter(
  role:
    | string
    | null
    | undefined = currentRole(),
) {
  const normalizedRole =
    normalizeRole(
      role,
    );

  return CALLCENTER_ADMIN_ROLES.includes(
    normalizedRole as AppRole,
  );
}

export function canManageCallCenterStatus(
  role:
    | string
    | null
    | undefined = currentRole(),
) {
  const normalizedRole =
    normalizeRole(
      role,
    );

  return CALLCENTER_ADMIN_ROLES.includes(
    normalizedRole as AppRole,
  );
}

export function canAssignCallCenterFuncionario(
  role:
    | string
    | null
    | undefined = currentRole(),
) {
  const normalizedRole =
    normalizeRole(
      role,
    );

  return CALLCENTER_ADMIN_ROLES.includes(
    normalizedRole as AppRole,
  );
}

export function canViewMisRegistrosCallCenter(
  role:
    | string
    | null
    | undefined = currentRole(),
) {
  const normalizedRole =
    normalizeRole(
      role,
    );

  return normalizedRole === 'ADMIN'
    || normalizedRole
      === 'FUNCIONARIO_CALLCENTER';
}

/**
 * Permite ingresar a la pantalla Mis asignaciones.
 *
 * ADMIN, COORDINADOR_CALLCENTER y FUNCIONARIO_CALLCENTER
 * la utilizan como consulta administrativa.
 *
 * FUNCIONARIO_ENCUESTADOR conserva su flujo operativo.
 */
export function canViewMisAsignacionesEncuestador(
  role:
    | string
    | null
    | undefined = currentRole(),
) {
  const normalizedRole =
    normalizeRole(
      role,
    );

  return CALLCENTER_MIS_ASIGNACIONES_ROLES.includes(
    normalizedRole as AppRole,
  );
}

/**
 * Permite utilizar el filtro de encuestador
 * dentro de Mis asignaciones.
 *
 * El encuestador operativo queda expresamente excluido.
 */
export function canFilterMisAsignacionesByEncuestador(
  role:
    | string
    | null
    | undefined = currentRole(),
) {
  const normalizedRole =
    normalizeRole(
      role,
    );

  return CALLCENTER_MIS_ASIGNACIONES_FILTER_ROLES.includes(
    normalizedRole as AppRole,
  );
}

export function canViewCallCenterAgendaVisitas(
  role:
    | string
    | null
    | undefined = currentRole(),
) {
  const normalizedRole =
    normalizeRole(
      role,
    );

  return CALLCENTER_AGENDA_VISITAS_ROLES.includes(
    normalizedRole as AppRole,
  );
}

/**
 * Mantiene separada la capacidad de consulta
 * de la capacidad de registrar resultados.
 *
 * COORDINADOR_CALLCENTER y FUNCIONARIO_CALLCENTER pueden
 * consultar Mis asignaciones, pero no registrar resultados.
 */
export function canUpdateEncuestadorVisit(
  role:
    | string
    | null
    | undefined = currentRole(),
) {
  const normalizedRole =
    normalizeRole(
      role,
    );

  return CALLCENTER_ENCUESTADOR_ROLES.includes(
    normalizedRole as AppRole,
  );
}