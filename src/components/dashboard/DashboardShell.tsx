'use client';

import AssessmentIcon from '@mui/icons-material/Assessment';
import BarChartIcon from '@mui/icons-material/BarChart';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import DashboardIcon from '@mui/icons-material/Dashboard';
import LockResetIcon from '@mui/icons-material/LockReset';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import PeopleIcon from '@mui/icons-material/People';
import SecurityIcon from '@mui/icons-material/Security';
import {
  AppBar,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { clearSession, getStoredUser, getToken } from '@/lib/authToken';
import {
  canAccessDashboardPath,
  DashboardIconKey,
  getDashboardMenuByRole,
  getDefaultDashboardPathByRole,
} from '@/lib/roleAccess';
import { AuthUserResponse } from '@/types/auth.types';

const drawerWidth = 288;
const collapsedDrawerWidth = 78;
const headerHeight = 72;
const sisbenLogoPath = '/images/logo-sisben.png';

const dashboardIcons: Record<DashboardIconKey, ReactNode> = {
  dashboard: <DashboardIcon />,
  ventanilla: <AssessmentIcon />,
  dmc: <BarChartIcon />,
  auditoria: <SecurityIcon />,
  exportaciones: <CloudDownloadIcon />,
  usuarios: <PeopleIcon />,
  password: <LockResetIcon />,
  reportes: <CloudDownloadIcon />,
};

type DashboardShellProps = {
  children: ReactNode;
};

function getCurrentModuleLabel(pathname: string) {
  if (pathname.includes('/dashboard/ventanilla')) {
    return 'Ventanilla';
  }

  if (pathname.includes('/dashboard/dmc')) {
    return 'DMC';
  }

  if (pathname.includes('/dashboard/reportes')) {
    return 'Reportes';
  }

  if (pathname.includes('/dashboard/exportaciones')) {
    return 'Exportaciones';
  }

  if (pathname.includes('/dashboard/auditoria')) {
    return 'Auditoría';
  }

  if (pathname.includes('/dashboard/usuarios')) {
    return 'Usuarios';
  }

  if (pathname.includes('/dashboard/password')) {
    return 'Cambiar contraseña';
  }

  return 'Inicio';
}

function SisbenLogo({ compact }: { compact: boolean }) {
  return (
    <Box
      sx={{
        height: headerHeight,
        px: compact ? 1 : 1.7,
        bgcolor: '#FFFFFF',
        borderBottom: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Box
        sx={{
          width: compact ? 48 : 136,
          height: 46,
          borderRadius: 999,
          bgcolor: '#FFFFFF',
          border: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: compact ? 0.7 : 1.5,
          boxShadow: '0 8px 20px rgba(0, 77, 153, 0.08)',
          position: 'relative',
          overflow: 'hidden',
          '&::after': {
            content: '""',
            position: 'absolute',
            left: compact ? 9 : 24,
            right: compact ? 9 : 24,
            bottom: 5,
            height: 3,
            borderRadius: 999,
            background: 'linear-gradient(90deg, #0066CC 0%, #E30613 72%, #FCD116 100%)',
          },
        }}
      >
        <Box
          component="img"
          src={sisbenLogoPath}
          alt="Logo Sisbén"
          sx={{
            width: compact ? 32 : 88,
            height: compact ? 32 : 30,
            objectFit: 'contain',
            display: 'block',
            transform: compact ? 'none' : 'translateY(-1px)',
          }}
        />
      </Box>
    </Box>
  );
}

export default function DashboardShell({ children }: DashboardShellProps) {
  const theme = useTheme();

  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'), {
    noSsr: true,
  });

  const router = useRouter();
  const pathname = usePathname();

  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [user, setUser] = useState<AuthUserResponse | null>(null);

  const roleCode = user?.rolCodigo ?? '';

  const menuItems = useMemo(() => {
    return getDashboardMenuByRole(roleCode);
  }, [roleCode]);

  const expanded = sidebarExpanded || !isDesktop;
  const currentDrawerWidth = isDesktop
    ? sidebarExpanded ? drawerWidth : collapsedDrawerWidth
    : drawerWidth;
  const currentModule = getCurrentModuleLabel(pathname);

  useEffect(() => {
    setMounted(true);

    const token = getToken();
    const storedUser = getStoredUser<AuthUserResponse>();

    if (!token || !storedUser) {
      router.replace('/login');
      return;
    }

    setUser(storedUser);
    setCheckingAccess(false);
  }, [router]);

  useEffect(() => {
    if (!mounted || checkingAccess || !user) {
      return;
    }

    const canAccess = canAccessDashboardPath(user.rolCodigo, pathname);

    if (!canAccess) {
      router.replace(getDefaultDashboardPathByRole(user.rolCodigo));
    }
  }, [mounted, checkingAccess, pathname, router, user]);

  const toggleSidebar = () => {
    if (isDesktop) {
      setSidebarExpanded((current) => !current);
      return;
    }

    setMobileOpen(true);
  };

  const closeMobileMenu = () => {
    setMobileOpen(false);
  };

  const handleLogout = () => {
    clearSession();
    router.replace('/login');
  };

  if (!mounted || checkingAccess || !user) {
    return null;
  }

  const drawer = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#F4F8FC',
        overflowX: 'hidden',
      }}
    >
      <SisbenLogo compact={!expanded} />

      <Box
        sx={{
          px: expanded ? 1.7 : 1,
          py: 1.5,
        }}
      >
        {expanded ? (
          <Typography
            sx={{
              fontSize: 12,
              fontWeight: 900,
              color: 'text.secondary',
              textTransform: 'uppercase',
              letterSpacing: 0.8,
              mb: 1,
              px: 0.7,
            }}
          >
            Navegación
          </Typography>
        ) : null}

        <List sx={{ p: 0 }}>
          {menuItems.map((item) => {
            const selected = pathname === item.href;

            const button = (
              <ListItemButton
                key={item.href}
                selected={selected}
                onClick={() => {
                  router.push(item.href);

                  if (!isDesktop) {
                    closeMobileMenu();
                  }
                }}
                sx={{
                  borderRadius: 3,
                  mb: 0.7,
                  py: 1.15,
                  px: expanded ? 1.4 : 1,
                  minHeight: 46,
                  justifyContent: expanded ? 'flex-start' : 'center',
                  '&.Mui-selected': {
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    boxShadow: '0 10px 24px rgba(0, 102, 204, 0.20)',
                  },
                  '&.Mui-selected:hover': {
                    bgcolor: 'primary.dark',
                  },
                  '&.Mui-selected .MuiListItemIcon-root': {
                    color: 'primary.contrastText',
                  },
                  '&:hover': {
                    bgcolor: 'rgba(0, 102, 204, 0.08)',
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: expanded ? 42 : 0,
                    color: selected ? 'primary.contrastText' : 'text.secondary',
                    justifyContent: 'center',
                  }}
                >
                  {dashboardIcons[item.iconKey]}
                </ListItemIcon>

                {expanded ? (
                  <ListItemText
                    primary={
                      <Typography
                        noWrap
                        sx={{
                          fontWeight: selected ? 900 : 700,
                          fontSize: 14,
                        }}
                      >
                        {item.label}
                      </Typography>
                    }
                  />
                ) : null}
              </ListItemButton>
            );

            if (!expanded) {
              return (
                <Tooltip key={item.href} title={item.label} placement="right">
                  {button}
                </Tooltip>
              );
            }

            return button;
          })}
        </List>
      </Box>

      <Divider sx={{ mt: 'auto' }} />

      <Box sx={{ p: expanded ? 1.7 : 1 }}>
        <Stack spacing={1.4}>
          {expanded ? (
            <Box
              sx={{
                p: 1.5,
                borderRadius: 3,
                bgcolor: '#FFFFFF',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography noWrap color="text.primary" sx={{ fontWeight: 900 }}>
                {user.username ?? 'Usuario'}
              </Typography>

              <Typography noWrap color="text.secondary" sx={{ fontSize: 13 }}>
                {user.rolNombre ?? user.rolCodigo ?? 'Rol no disponible'}
              </Typography>
            </Box>
          ) : null}

          <Tooltip
            title={!expanded ? 'Cerrar sesión' : ''}
            placement="right"
          >
            <ListItemButton
              onClick={handleLogout}
              sx={{
                borderRadius: 3,
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                justifyContent: expanded ? 'flex-start' : 'center',
                px: expanded ? 1.5 : 1,
                minHeight: 46,
                '&:hover': {
                  bgcolor: 'rgba(227, 6, 19, 0.08)',
                  color: 'secondary.main',
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: expanded ? 42 : 0,
                  justifyContent: 'center',
                  color: 'inherit',
                }}
              >
                <LogoutIcon />
              </ListItemIcon>

              {expanded ? (
                <ListItemText
                  primary={
                    <Typography noWrap sx={{ fontWeight: 800, fontSize: 14 }}>
                      Cerrar sesión
                    </Typography>
                  }
                />
              ) : null}
            </ListItemButton>
          </Tooltip>
        </Stack>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          transition: 'width 0.25s ease, margin-left 0.25s ease',
          width: {
            xs: '100%',
            lg: `calc(100% - ${currentDrawerWidth}px)`,
          },
          ml: {
            xs: 0,
            lg: `${currentDrawerWidth}px`,
          },
        }}
      >
        <Toolbar
          sx={{
            bgcolor: 'background.paper',
            minHeight: `${headerHeight}px !important`,
            height: headerHeight,
            px: { xs: 2, md: 3 },
            alignItems: 'center',
          }}
        >
          <IconButton
            edge="start"
            onClick={toggleSidebar}
            sx={{
              mr: 1.5,
              width: 38,
              height: 38,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              bgcolor: isDesktop && sidebarExpanded ? 'primary.main' : 'background.paper',
              color: isDesktop && sidebarExpanded ? 'primary.contrastText' : 'text.primary',
              '&:hover': {
                bgcolor: isDesktop && sidebarExpanded ? 'primary.dark' : 'rgba(0, 102, 204, 0.08)',
              },
            }}
          >
            <MenuIcon fontSize="small" />
          </IconButton>

          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <Typography
              variant="h6"
              noWrap
              sx={{
                fontWeight: 900,
                lineHeight: 1.15,
              }}
            >
              {currentModule}
            </Typography>

            <Typography
              noWrap
              color="text.secondary"
              sx={{
                fontSize: 12.5,
                fontWeight: 600,
                mt: 0.2,
              }}
            >
              Sistema de información Sisbén · {user.rolNombre ?? user.rolCodigo}
            </Typography>
          </Box>

          <Box
            component="img"
            src={sisbenLogoPath}
            alt="Logo Sisbén"
            sx={{
              display: { xs: 'none', md: 'block' },
              width: 82,
              height: 30,
              objectFit: 'contain',
              ml: 2,
            }}
          />
        </Toolbar>
      </AppBar>

      <Drawer
        anchor="left"
        variant={isDesktop ? 'permanent' : 'temporary'}
        open={isDesktop ? true : mobileOpen}
        onClose={closeMobileMenu}
        ModalProps={{ keepMounted: true }}
        slotProps={{
          paper: {
            sx: {
              width: {
                xs: drawerWidth,
                lg: currentDrawerWidth,
              },
              maxWidth: '88vw',
              transition: 'width 0.25s ease',
              borderRight: '1px solid',
              borderColor: 'divider',
              borderTopRightRadius: {
                xs: 18,
                lg: 0,
              },
              borderBottomRightRadius: {
                xs: 18,
                lg: 0,
              },
              overflow: 'hidden',
            },
          },
        }}
      >
        {drawer}
      </Drawer>

      <Box
        component="main"
        sx={{
          pt: `${headerHeight + 24}px`,
          px: { xs: 2, md: 3 },
          pb: 4,
          minHeight: '100vh',
          transition: 'margin-left 0.25s ease',
          ml: {
            xs: 0,
            lg: `${currentDrawerWidth}px`,
          },
        }}
      >
        {children}
      </Box>
    </Box>
  );
}