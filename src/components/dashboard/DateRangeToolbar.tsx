'use client';

import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SearchIcon from '@mui/icons-material/Search';
import { Box, Button, TextField } from '@mui/material';

type DateRangeToolbarProps = {
  fechaInicio: string;
  fechaFin: string;
  loading?: boolean;
  onFechaInicioChange: (value: string) => void;
  onFechaFinChange: (value: string) => void;
  onSearch: () => void;
  onClear: () => void;
};

export default function DateRangeToolbar({
  fechaInicio,
  fechaFin,
  loading,
  onFechaInicioChange,
  onFechaFinChange,
  onSearch,
  onClear,
}: DateRangeToolbarProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: {
          xs: 'column',
          md: 'row',
        },
        gap: 2,
        alignItems: {
          xs: 'stretch',
          md: 'center',
        },
      }}
    >
      <TextField
        label="Fecha inicio"
        type="date"
        size="small"
        value={fechaInicio}
        onChange={(event) => onFechaInicioChange(event.target.value)}
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
        value={fechaFin}
        onChange={(event) => onFechaFinChange(event.target.value)}
        slotProps={{
          inputLabel: {
            shrink: true,
          },
        }}
      />

      <Button
        variant="contained"
        startIcon={<SearchIcon />}
        onClick={onSearch}
        disabled={loading}
      >
        Consultar
      </Button>

      <Button
        variant="outlined"
        startIcon={<RestartAltIcon />}
        onClick={onClear}
        disabled={loading}
      >
        Limpiar
      </Button>
    </Box>
  );
}