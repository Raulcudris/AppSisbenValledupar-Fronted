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
  Avatar,
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

const drawerWidth = 300;
const collapsedDrawerWidth = 76;

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

  const currentDrawerWidth = sidebarExpanded ? drawerWidth : collapsedDrawerWidth;

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
        bgcolor: '#f8fafc',
        overflowX: 'hidden',
      }}
    >
      <Box
        sx={{
          p: sidebarExpanded ? 2.5 : 1.5,
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Stack
          direction="row"
          spacing={sidebarExpanded ? 1.5 : 0}
          sx={{
            alignItems: 'center',
            justifyContent: sidebarExpanded ? 'flex-start' : 'center',
          }}
        >
          <Avatar sx={{ bgcolor: 'primary.main', fontWeight: 800 }}>
            S
          </Avatar>

          {sidebarExpanded || !isDesktop ? (
            <Box>
              <Typography variant="h6" sx={{ lineHeight: 1.1, fontWeight: 800 }}>
                AppSisben
              </Typography>

              <Typography color="text.secondary" sx={{ fontSize: 13 }}>
                Valledupar
              </Typography>
            </Box>
          ) : null}
        </Stack>
      </Box>

      <List sx={{ px: 1.2, py: 2, flex: 1 }}>
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
                borderRadius: 2,
                mb: 0.7,
                py: 1.1,
                px: sidebarExpanded || !isDesktop ? 1.5 : 1,
                justifyContent: sidebarExpanded || !isDesktop ? 'flex-start' : 'center',
                '&.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                },
                '&.Mui-selected:hover': {
                  bgcolor: 'primary.dark',
                },
                '&.Mui-selected .MuiListItemIcon-root': {
                  color: 'primary.contrastText',
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: sidebarExpanded || !isDesktop ? 42 : 0,
                  color: selected ? 'primary.contrastText' : 'text.secondary',
                  justifyContent: 'center',
                }}
              >
                {dashboardIcons[item.iconKey]}
              </ListItemIcon>

              {sidebarExpanded || !isDesktop ? (
                <ListItemText
                  primary={
                    <Typography
                      sx={{
                        fontWeight: selected ? 800 : 600,
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

          if (!sidebarExpanded && isDesktop) {
            return (
              <Tooltip key={item.href} title={item.label} placement="right">
                {button}
              </Tooltip>
            );
          }

          return button;
        })}
      </List>

      <Divider />

      <Box sx={{ p: sidebarExpanded || !isDesktop ? 2 : 1.2 }}>
        <Stack spacing={1.5}>
          {sidebarExpanded || !isDesktop ? (
            <Box>
              <Typography color="text.secondary" sx={{ fontWeight: 700 }}>
                {user.username ?? 'Usuario'}
              </Typography>

              <Typography color="text.secondary" sx={{ fontSize: 13 }}>
                {user.rolNombre ?? user.rolCodigo ?? 'Rol no disponible'}
              </Typography>
            </Box>
          ) : null}

          <Tooltip
            title={!sidebarExpanded && isDesktop ? 'Cerrar sesión' : ''}
            placement="right"
          >
            <ListItemButton
              onClick={handleLogout}
              sx={{
                borderRadius: 2,
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                justifyContent: sidebarExpanded || !isDesktop ? 'flex-start' : 'center',
                px: sidebarExpanded || !isDesktop ? 1.5 : 1,
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: sidebarExpanded || !isDesktop ? 42 : 0,
                  justifyContent: 'center',
                }}
              >
                <LogoutIcon />
              </ListItemIcon>

              {sidebarExpanded || !isDesktop ? (
                <ListItemText
                  primary={
                    <Typography sx={{ fontWeight: 700, fontSize: 14 }}>
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
        color="inherit"
        elevation={0}
        sx={{
          borderBottom: '1px solid',
          borderColor: 'divider',
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
        <Toolbar>
          <IconButton
            edge="start"
            onClick={toggleSidebar}
            sx={{
              mr: 1.5,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              bgcolor: sidebarExpanded ? 'primary.main' : 'background.paper',
              color: sidebarExpanded ? 'primary.contrastText' : 'text.primary',
              '&:hover': {
                bgcolor: sidebarExpanded ? 'primary.dark' : 'background.paper',
              },
            }}
          >
            <MenuIcon />
          </IconButton>

          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Panel principal
            </Typography>

            <Typography color="text.secondary" sx={{ fontSize: 13 }}>
              Accesos disponibles para {user.rolNombre ?? user.rolCodigo}
            </Typography>
          </Box>
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
          pt: 11,
          px: { xs: 2, md: 3 },
          pb: 4,
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