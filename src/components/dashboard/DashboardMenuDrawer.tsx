'use client';

import AssessmentIcon from '@mui/icons-material/Assessment';
import CloseIcon from '@mui/icons-material/Close';
import DashboardIcon from '@mui/icons-material/Dashboard';
import DescriptionIcon from '@mui/icons-material/Description';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import HistoryIcon from '@mui/icons-material/History';
import MenuIcon from '@mui/icons-material/Menu';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import {
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
    Typography,
} from '@mui/material';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

type MenuItem = {
    label: string;
    href: string;
    icon: React.ReactNode;
};

const menuItems: MenuItem[] = [
    {
        label: 'Inicio',
        href: '/dashboard',
        icon: <DashboardIcon />,
    },
    {
        label: 'Ventanilla',
        href: '/dashboard/ventanilla',
        icon: <PeopleAltIcon />,
    },
    {
        label: 'Registros de ventanilla',
        href: '/dashboard/ventanilla/registros',
        icon: <DescriptionIcon />,
    },
    {
        label: 'DMC',
        href: '/dashboard/dmc',
        icon: <FactCheckIcon />,
    },
    {
        label: 'Registros DMC',
        href: '/dashboard/dmc/registros',
        icon: <DescriptionIcon />,
    },
    {
        label: 'Exportaciones',
        href: '/dashboard/exportaciones',
        icon: <AssessmentIcon />,
    },
    {
        label: 'Auditoría',
        href: '/dashboard/auditoria',
        icon: <HistoryIcon />,
    },
];

export default function DashboardMenuDrawer() {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);

    const closeMenu = () => {
        setOpen(false);
    };

    return (
        <>
            <IconButton
                onClick={() => setOpen(true)}
                sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                    bgcolor: 'background.paper',
                    color: 'primary.main',
                    '&:hover': {
                        bgcolor: 'rgba(0, 102, 204, 0.08)',
                    },
                }}
            >
                <MenuIcon />
            </IconButton>

            <Drawer
                anchor="left"
                open={open}
                onClose={closeMenu}
                slotProps={{
                    paper: {
                        sx: {
                            width: 310,
                            maxWidth: '86vw',
                            borderTopRightRadius: 18,
                            borderBottomRightRadius: 18,
                            overflow: 'hidden',
                        },
                    },
                }}
            >
                <Box
                    sx={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        bgcolor: '#F4F8FC',
                    }}
                >
                    <Box
                        sx={{
                            p: 2,
                            bgcolor: 'background.paper',
                            borderBottom: '1px solid',
                            borderColor: 'divider',
                        }}
                    >
                        <Box
                            sx={{
                                borderRadius: 4,
                                p: 2,
                                background: 'linear-gradient(135deg, #0066CC 0%, #004B99 100%)',
                                color: '#FFFFFF',
                                position: 'relative',
                                overflow: 'hidden',
                                '&::after': {
                                    content: '""',
                                    position: 'absolute',
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    height: 5,
                                    background: 'linear-gradient(90deg, #FCD116 0%, #E30613 100%)',
                                },
                            }}
                        >
                            <Stack
                                direction="row"
                                spacing={1.5}
                                sx={{
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                }}
                            >
                                <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                                    <Avatar
                                        sx={{
                                            bgcolor: '#FFFFFF',
                                            color: '#0066CC',
                                            fontWeight: 900,
                                        }}
                                    >
                                        S
                                    </Avatar>

                                    <Box>
                                        <Typography sx={{ fontWeight: 900 }}>
                                            Sisbén
                                        </Typography>

                                        <Typography sx={{ fontSize: 13, opacity: 0.92, fontWeight: 700 }}>
                                            Sistema de información
                                        </Typography>
                                    </Box>
                                </Stack>

                                <IconButton
                                    onClick={closeMenu}
                                    sx={{
                                        border: '1px solid rgba(255,255,255,0.40)',
                                        color: '#FFFFFF',
                                        borderRadius: 2,
                                    }}
                                >
                                    <CloseIcon />
                                </IconButton>
                            </Stack>
                        </Box>
                    </Box>

                    <List sx={{ p: 1.5 }}>
                        {menuItems.map((item) => {
                            const selected = pathname === item.href;

                            return (
                                <ListItemButton
                                    key={item.href}
                                    component={Link}
                                    href={item.href}
                                    selected={selected}
                                    onClick={closeMenu}
                                    sx={{
                                        mb: 0.5,
                                        borderRadius: 2.5,
                                        '&.Mui-selected': {
                                            bgcolor: 'primary.main',
                                            color: 'primary.contrastText',
                                            boxShadow: '0 10px 24px rgba(0, 102, 204, 0.20)',
                                            '& .MuiListItemIcon-root': {
                                                color: 'primary.contrastText',
                                            },
                                        },
                                        '&.Mui-selected:hover': {
                                            bgcolor: 'primary.dark',
                                        },
                                        '&:hover': {
                                            bgcolor: 'rgba(0, 102, 204, 0.08)',
                                        },
                                    }}
                                >
                                    <ListItemIcon
                                        sx={{
                                            minWidth: 40,
                                            color: selected ? 'primary.contrastText' : 'text.secondary',
                                        }}
                                    >
                                        {item.icon}
                                    </ListItemIcon>

                                    <ListItemText
                                        primary={
                                            <Typography sx={{ fontWeight: selected ? 900 : 700, fontSize: 14 }}>
                                                {item.label}
                                            </Typography>
                                        }
                                    />
                                </ListItemButton>
                            );
                        })}
                    </List>

                    <Box sx={{ mt: 'auto', p: 2 }}>
                        <Divider sx={{ mb: 2 }} />

                        <Typography color="text.secondary" sx={{ fontSize: 12 }}>
                            Plataforma de gestión, consulta, reportes y exportaciones del sistema de información.
                        </Typography>
                    </Box>
                </Box>
            </Drawer>
        </>
    );
}