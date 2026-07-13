'use client';

import { MenuItem, TextField } from '@mui/material';
import { SelectOption } from '@/types/catalog.types';

type SelectFieldProps = {
  label: string;
  value: string;
  options: SelectOption[];
  required?: boolean;
  onChange: (value: string) => void;
};

export default function SelectField({
  label,
  value,
  options,
  required,
  onChange,
}: SelectFieldProps) {
  return (
    <TextField
      select
      label={label}
      size="small"
      fullWidth
      required={required}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      <MenuItem value="">
        Seleccionar
      </MenuItem>

      {options.map((item) => (
        <MenuItem key={item.id} value={String(item.id)}>
          {item.label}
        </MenuItem>
      ))}
    </TextField>
  );
}