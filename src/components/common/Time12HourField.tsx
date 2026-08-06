'use client';

import {
  Box,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from '@mui/material';

import {
  type ReactNode,
  useEffect,
  useState,
} from 'react';

type TimePeriod =
  | 'AM'
  | 'PM';

type Time12HourFieldProps = {
  label: string;

  value?:
    | string
    | null;

  onChange:
    (value: string) => void;

  required?: boolean;
  disabled?: boolean;
  error?: boolean;

  helperText?:
    ReactNode;

  size?:
    | 'small'
    | 'medium';
};

type ParsedTime = {
  hour12: string;
  minute: string;
  period: TimePeriod;
};

const HOURS = Array.from(
  {
    length:
      12,
  },
  (_, index) =>
    String(
      index + 1,
    ),
);

const MINUTES = Array.from(
  {
    length:
      60,
  },
  (_, index) =>
    String(
      index,
    ).padStart(
      2,
      '0',
    ),
);

/**
 * Convierte una hora HH:mm o HH:mm:ss a sus partes
 * visibles en formato de 12 horas.
 */
function parseTimeValue(
  value?:
    | string
    | null,
): ParsedTime | null {
  const normalized =
    String(
      value ?? '',
    ).trim();

  const match =
    /^(\d{1,2}):(\d{2})/.exec(
      normalized,
    );

  if (!match) {
    return null;
  }

  const hour24 =
    Number(
      match[1],
    );

  const minute =
    Number(
      match[2],
    );

  if (
    !Number.isInteger(
      hour24,
    )
    || hour24 < 0
    || hour24 > 23
    || !Number.isInteger(
      minute,
    )
    || minute < 0
    || minute > 59
  ) {
    return null;
  }

  return {
    hour12:
      String(
        hour24 % 12 || 12,
      ),

    minute:
      String(
        minute,
      ).padStart(
        2,
        '0',
      ),

    period:
      hour24 >= 12
        ? 'PM'
        : 'AM',
  };
}

/**
 * Convierte las partes visibles de 12 horas al formato
 * técnico HH:mm utilizado por los contratos actuales.
 */
function buildTimeValue(
  hour12:
    string,

  minute:
    string,

  period:
    TimePeriod,
) {
  const numericHour =
    Number(
      hour12,
    );

  if (
    !Number.isInteger(
      numericHour,
    )
    || numericHour < 1
    || numericHour > 12
  ) {
    return '';
  }

  let hour24 =
    numericHour % 12;

  if (
    period === 'PM'
  ) {
    hour24 +=
      12;
  }

  return `${String(
    hour24,
  ).padStart(
    2,
    '0',
  )}:${minute}`;
}

/**
 * Formatea una hora técnica para mostrarla en la interfaz.
 *
 * Ejemplos:
 * 00:00 -> 12:00 a. m.
 * 12:00 -> 12:00 p. m.
 * 18:30 -> 6:30 p. m.
 */
export function formatTime12Hour(
  value?:
    | string
    | null,
) {
  const parsed =
    parseTimeValue(
      value,
    );

  if (!parsed) {
    return '';
  }

  return `${parsed.hour12}:${parsed.minute} ${
    parsed.period === 'AM'
      ? 'a. m.'
      : 'p. m.'
  }`;
}

export default function Time12HourField({
  label,
  value,
  onChange,
  required = false,
  disabled = false,
  error = false,
  helperText,
  size = 'medium',
}: Time12HourFieldProps) {
  const [
    hour,
    setHour,
  ] = useState('');

  const [
    minute,
    setMinute,
  ] = useState('');

  const [
    period,
    setPeriod,
  ] = useState<
    | TimePeriod
    | ''
  >('');

  useEffect(() => {
    const parsed =
      parseTimeValue(
        value,
      );

    if (!parsed) {
      setHour('');
      setMinute('');
      setPeriod('');
      return;
    }

    setHour(
      parsed.hour12,
    );

    setMinute(
      parsed.minute,
    );

    setPeriod(
      parsed.period,
    );
  }, [
    value,
  ]);

  function emitValue(
    nextHour:
      string,

    nextMinute:
      string,

    nextPeriod:
      | TimePeriod
      | '',
  ) {
    if (
      !nextHour
      || !nextMinute
      || !nextPeriod
    ) {
      onChange('');
      return;
    }

    onChange(
      buildTimeValue(
        nextHour,
        nextMinute,
        nextPeriod,
      ),
    );
  }

  function handleHourChange(
    nextHour:
      string,
  ) {
    setHour(
      nextHour,
    );

    emitValue(
      nextHour,
      minute,
      period,
    );
  }

  function handleMinuteChange(
    nextMinute:
      string,
  ) {
    setMinute(
      nextMinute,
    );

    emitValue(
      hour,
      nextMinute,
      period,
    );
  }

  function handlePeriodChange(
    nextPeriod:
      | TimePeriod
      | '',
  ) {
    setPeriod(
      nextPeriod,
    );

    emitValue(
      hour,
      minute,
      nextPeriod,
    );
  }

  return (
    <Box
      role="group"
      aria-label={
        label
      }
      sx={{
        width:
          '100%',
      }}
    >
      <Typography
        component="p"
        variant="caption"
        color={
          error
            ? 'error'
            : 'text.secondary'
        }
        sx={{
          mb:
            0.75,

          fontWeight:
            required
              ? 700
              : 500,
        }}
      >
        {label}
        {required
          ? ' *'
          : ''}
      </Typography>

      <Box
        sx={{
          display:
            'grid',

          gridTemplateColumns:
            'minmax(90px, 1fr) minmax(100px, 1fr) minmax(115px, 1fr)',

          gap:
            1,
        }}
      >
        <FormControl
          size={
            size
          }
          required={
            required
          }
          disabled={
            disabled
          }
          error={
            error
          }
          fullWidth
        >
          <InputLabel>
            Hora
          </InputLabel>

          <Select
            label="Hora"
            value={
              hour
            }
            onChange={(event) => {
              handleHourChange(
                String(
                  event.target.value,
                ),
              );
            }}
          >
            <MenuItem value="">
              Selecciona
            </MenuItem>

            {HOURS.map(
              (item) => (
                <MenuItem
                  key={
                    item
                  }
                  value={
                    item
                  }
                >
                  {item}
                </MenuItem>
              ),
            )}
          </Select>
        </FormControl>

        <FormControl
          size={
            size
          }
          required={
            required
          }
          disabled={
            disabled
          }
          error={
            error
          }
          fullWidth
        >
          <InputLabel>
            Minutos
          </InputLabel>

          <Select
            label="Minutos"
            value={
              minute
            }
            onChange={(event) => {
              handleMinuteChange(
                String(
                  event.target.value,
                ),
              );
            }}
          >
            <MenuItem value="">
              Selecciona
            </MenuItem>

            {MINUTES.map(
              (item) => (
                <MenuItem
                  key={
                    item
                  }
                  value={
                    item
                  }
                >
                  {item}
                </MenuItem>
              ),
            )}
          </Select>
        </FormControl>

        <FormControl
          size={
            size
          }
          required={
            required
          }
          disabled={
            disabled
          }
          error={
            error
          }
          fullWidth
        >
          <InputLabel>
            Período
          </InputLabel>

          <Select
            label="Período"
            value={
              period
            }
            onChange={(event) => {
              handlePeriodChange(
                event.target
                  .value as
                    | TimePeriod
                    | '',
              );
            }}
          >
            <MenuItem value="">
              Selecciona
            </MenuItem>

            <MenuItem value="AM">
              a. m.
            </MenuItem>

            <MenuItem value="PM">
              p. m.
            </MenuItem>
          </Select>
        </FormControl>
      </Box>

      {helperText ? (
        <FormHelperText
          error={
            error
          }
          sx={{
            mx:
              0,
          }}
        >
          {helperText}
        </FormHelperText>
      ) : null}
    </Box>
  );
}