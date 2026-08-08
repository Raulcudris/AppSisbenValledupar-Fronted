'use client';

import BadgeIcon from '@mui/icons-material/Badge';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import PhoneIcon from '@mui/icons-material/Phone';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';

import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  getCallCenterAgendaVisitas,
  getEncuestadoresAgenda,
} from '@/services/callcenter-agenda-visitas.service';

import type {
  CallCenterAgendaVisitaResponse,
  EncuestadorAgendaOption,
} from '@/types/callcenter-agenda-visitas.types';

type AppliedFilter = {
  encuestadorId:
    number;

  fecha:
    string;
};

function getLocalDateISO(
  date =
    new Date(),
) {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1,
    ).padStart(
      2,
      '0',
    );

  const day =
    String(
      date.getDate(),
    ).padStart(
      2,
      '0',
    );

  return `${year}-${month}-${day}`;
}

export default function AgendaVisitasPage() {
  const [
    encuestadores,
    setEncuestadores,
  ] = useState<
    EncuestadorAgendaOption[]
  >(
    [],
  );

  const [
    encuestadorId,
    setEncuestadorId,
  ] = useState(
    '',
  );

  const [
    fecha,
    setFecha,
  ] = useState(
    getLocalDateISO,
  );

  const [
    appliedFilter,
    setAppliedFilter,
  ] = useState<
    AppliedFilter | null
  >(
    null,
  );

  const [
    items,
    setItems,
  ] = useState<
    CallCenterAgendaVisitaResponse[]
  >(
    [],
  );

  const [
    page,
    setPage,
  ] = useState(
    0,
  );

  const [
    size,
    setSize,
  ] = useState(
    20,
  );

  const [
    total,
    setTotal,
  ] = useState(
    0,
  );

  const [
    loadingCatalog,
    setLoadingCatalog,
  ] = useState(
    true,
  );

  const [
    loading,
    setLoading,
  ] = useState(
    false,
  );

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(
    null,
  );

  const selectedEncuestador =
    useMemo(
      () => {
        if (
          !appliedFilter
        ) {
          return null;
        }

        return (
          encuestadores.find(
            (item) =>
              item.id
              === appliedFilter
                .encuestadorId,
          )
          ?? null
        );
      },
      [
        appliedFilter,
        encuestadores,
      ],
    );

  const loadCatalog =
    useCallback(
      async () => {
        setLoadingCatalog(
          true,
        );

        setError(
          null,
        );

        try {
          const response =
            await getEncuestadoresAgenda();

          setEncuestadores(
            response,
          );
        } catch (exception) {
          setError(
            getErrorMessage(
              exception,
              'No fue posible cargar el catálogo de encuestadores.',
            ),
          );
        } finally {
          setLoadingCatalog(
            false,
          );
        }
      },
      [],
    );

  useEffect(
    () => {
      void loadCatalog();
    },
    [
      loadCatalog,
    ],
  );

  const loadAgenda =
    useCallback(
      async () => {
        if (
          !appliedFilter
        ) {
          return;
        }

        setLoading(
          true,
        );

        setError(
          null,
        );

        try {
          const response =
            await getCallCenterAgendaVisitas({
              encuestadorId:
                appliedFilter.encuestadorId,

              fecha:
                appliedFilter.fecha,

              page,

              size,
            });

          const content =
            getPageContent<
              CallCenterAgendaVisitaResponse
            >(
              response,
            );

          setItems(
            content,
          );

          setTotal(
            getTotalElements(
              response,
              content.length,
            ),
          );
        } catch (exception) {
          setItems(
            [],
          );

          setTotal(
            0,
          );

          setError(
            getErrorMessage(
              exception,
              'No fue posible consultar la agenda de visitas.',
            ),
          );
        } finally {
          setLoading(
            false,
          );
        }
      },
      [
        appliedFilter,
        page,
        size,
      ],
    );

  useEffect(
    () => {
      void loadAgenda();
    },
    [
      loadAgenda,
    ],
  );

  function handleSearch() {
    setError(
      null,
    );

    const selectedId =
      Number(
        encuestadorId,
      );

    if (
      !Number.isSafeInteger(
        selectedId,
      )
      || selectedId <= 0
    ) {
      setError(
        'Debe seleccionar un encuestador.',
      );

      return;
    }

    if (
      !fecha
    ) {
      setError(
        'Debe seleccionar la fecha de la visita.',
      );

      return;
    }

    setPage(
      0,
    );

    setAppliedFilter({
      encuestadorId:
        selectedId,

      fecha,
    });
  }

  function handleRefresh() {
    if (
      !appliedFilter
    ) {
      handleSearch();

      return;
    }

    void loadAgenda();
  }

  return (
    <Box
      sx={{
        display:
          'flex',

        flexDirection:
          'column',

        gap:
          2.5,
      }}
    >
      <Box
        sx={{
          display:
            'flex',

          flexDirection: {
            xs:
              'column',

            md:
              'row',
          },

          alignItems: {
            xs:
              'stretch',

            md:
              'flex-start',
          },

          justifyContent:
            'space-between',

          gap:
            2,
        }}
      >
        <Box>
          <Typography
            component="h1"
            variant="h5"
            sx={{
              fontWeight:
                900,
            }}
          >
            Agenda de visitas por encuestador
          </Typography>

          <Typography
            component="p"
            variant="body2"
            color="text.secondary"
          >
            Selecciona un encuestador y una fecha para consultar
            las personas programadas para visitar.
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={
            <RefreshIcon />
          }
          onClick={
            handleRefresh
          }
          disabled={
            loading
            || loadingCatalog
          }
        >
          Actualizar
        </Button>
      </Box>

      <Card
        variant="outlined"
        sx={{
          borderRadius:
            3,
        }}
      >
        <CardContent
          sx={{
            p: {
              xs:
                2,

              md:
                3,
            },

            '&:last-child': {
              pb: {
                xs:
                  2,

                md:
                  3,
              },
            },
          }}
        >
          <Box
            sx={{
              display:
                'grid',

              gridTemplateColumns: {
                xs:
                  '1fr',

                md:
                  'minmax(280px, 2fr) minmax(200px, 1fr) auto',
              },

              alignItems:
                'end',

              gap:
                2,
            }}
          >
            <FormControl
              fullWidth
              disabled={
                loadingCatalog
              }
            >
              <InputLabel>
                Encuestador
              </InputLabel>

              <Select
                label="Encuestador"
                value={
                  encuestadorId
                }
                onChange={(event) => {
                  setEncuestadorId(
                    String(
                      event.target.value,
                    ),
                  );
                }}
              >
                <MenuItem value="">
                  Selecciona un encuestador
                </MenuItem>

                {encuestadores.map(
                  (item) => (
                    <MenuItem
                      key={
                        item.id
                      }
                      value={
                        String(
                          item.id,
                        )
                      }
                    >
                      {item.nombre}
                    </MenuItem>
                  ),
                )}
              </Select>
            </FormControl>

            <TextField
              label="Fecha de visita"
              type="date"
              value={
                fecha
              }
              onChange={(event) => {
                setFecha(
                  event.target.value,
                );
              }}
              slotProps={{
                inputLabel: {
                  shrink:
                    true,
                },
              }}
              fullWidth
            />

            <Button
              variant="contained"
              startIcon={
                loading
                  ? (
                    <CircularProgress
                      color="inherit"
                      size={
                        18
                      }
                    />
                  )
                  : (
                    <SearchIcon />
                  )
              }
              onClick={
                handleSearch
              }
              disabled={
                loading
                || loadingCatalog
              }
              sx={{
                minHeight:
                  56,
              }}
            >
              {loading
                ? 'Consultando...'
                : 'Consultar'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {error ? (
        <Alert severity="error">
          {error}
        </Alert>
      ) : null}

      {appliedFilter ? (
        <Paper
          variant="outlined"
          sx={{
            p: {
              xs:
                2,

              md:
                3,
            },

            borderRadius:
              3,

            bgcolor:
              'action.hover',
          }}
        >
          <Box
            sx={{
              display:
                'grid',

              gridTemplateColumns: {
                xs:
                  '1fr',

                sm:
                  'repeat(2, minmax(0, 1fr))',
              },

              gap:
                2,
            }}
          >
            <HeaderInformation
              icon={
                <PersonSearchIcon />
              }
              label="Encuestador"
              value={
                selectedEncuestador
                  ?.nombre
                ?? `Encuestador #${appliedFilter.encuestadorId}`
              }
            />

            <HeaderInformation
              icon={
                <CalendarMonthIcon />
              }
              label="Fecha de visita"
              value={
                formatDateLong(
                  appliedFilter.fecha,
                )
              }
            />
          </Box>
        </Paper>
      ) : null}

      {loading ? (
        <Box
          sx={{
            minHeight:
              220,

            display:
              'flex',

            flexDirection:
              'column',

            alignItems:
              'center',

            justifyContent:
              'center',

            gap:
              2,
          }}
        >
          <CircularProgress />

          <Typography
            component="p"
            variant="body2"
            color="text.secondary"
          >
            Consultando usuarios programados...
          </Typography>
        </Box>
      ) : null}

      {!loading
      && appliedFilter
      && items.length === 0
      && !error ? (
        <Alert severity="info">
          El encuestador no tiene personas programadas para
          visitar en la fecha seleccionada.
        </Alert>
      ) : null}

      {!loading
      && items.length > 0 ? (
        <>
          <Box
            sx={{
              display: {
                xs:
                  'none',

                md:
                  'block',
              },
            }}
          >
            <TableContainer
              component={
                Paper
              }
              variant="outlined"
              sx={{
                borderRadius:
                  3,
              }}
            >
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{
                        fontWeight:
                          900,
                      }}
                    >
                      Cédula
                    </TableCell>

                    <TableCell
                      sx={{
                        fontWeight:
                          900,
                      }}
                    >
                      Nombre completo
                    </TableCell>

                    <TableCell
                      sx={{
                        fontWeight:
                          900,
                      }}
                    >
                      Dirección
                    </TableCell>

                    <TableCell
                      sx={{
                        fontWeight:
                          900,
                      }}
                    >
                      Barrio
                    </TableCell>

                    <TableCell
                      sx={{
                        fontWeight:
                          900,
                      }}
                    >
                      Teléfono
                    </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {items.map(
                    (item) => (
                      <TableRow
                        key={
                          item.id
                        }
                        hover
                      >
                        <TableCell>
                          {item.cedulaSolicitante
                          ?? 'Sin cédula'}
                        </TableCell>

                        <TableCell
                          sx={{
                            fontWeight:
                              700,
                          }}
                        >
                          {item.nombreCompleto
                          ?? 'Sin nombre'}
                        </TableCell>

                        <TableCell>
                          {item.direccionTexto
                          ?? 'Sin dirección'}
                        </TableCell>

                        <TableCell>
                          {item.barrioNombre
                          ?? 'Sin barrio'}
                        </TableCell>

                        <TableCell>
                          {item.telefono
                          ?? 'Sin teléfono'}
                        </TableCell>
                      </TableRow>
                    ),
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          <Box
            sx={{
              display: {
                xs:
                  'grid',

                md:
                  'none',
              },

              gridTemplateColumns:
                '1fr',

              gap:
                1.5,
            }}
          >
            {items.map(
              (item) => (
                <VisitCard
                  key={
                    item.id
                  }
                  item={
                    item
                  }
                />
              ),
            )}
          </Box>

          <TablePagination
            component="div"
            count={
              total
            }
            page={
              page
            }
            rowsPerPage={
              size
            }
            onPageChange={(
              _event,
              nextPage,
            ) => {
              setPage(
                nextPage,
              );
            }}
            onRowsPerPageChange={(event) => {
              setSize(
                Number(
                  event.target.value,
                ),
              );

              setPage(
                0,
              );
            }}
            rowsPerPageOptions={[
              10,
              20,
              50,
            ]}
            labelRowsPerPage="Registros por página"
            labelDisplayedRows={({
              from,
              to,
              count,
            }) =>
              `${from}-${to} de ${
                count !== -1
                  ? count
                  : `más de ${to}`
              }`
            }
          />
        </>
      ) : null}
    </Box>
  );
}

function HeaderInformation({
  icon,
  label,
  value,
}: {
  icon:
    ReactNode;

  label:
    string;

  value:
    string;
}) {
  return (
    <Box
      sx={{
        display:
          'flex',

        alignItems:
          'center',

        gap:
          1.5,
      }}
    >
      <Box
        sx={{
          width:
            44,

          height:
            44,

          borderRadius:
            2,

          display:
            'flex',

          alignItems:
            'center',

          justifyContent:
            'center',

          color:
            'primary.main',

          bgcolor:
            'background.paper',
        }}
      >
        {icon}
      </Box>

      <Box>
        <Typography
          component="p"
          variant="caption"
          color="text.secondary"
        >
          {label}
        </Typography>

        <Typography
          component="p"
          variant="h6"
          sx={{
            fontWeight:
              900,
          }}
        >
          {value}
        </Typography>
      </Box>
    </Box>
  );
}

function VisitCard({
  item,
}: {
  item:
    CallCenterAgendaVisitaResponse;
}) {
  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius:
          3,

        borderLeft:
          '5px solid',

        borderLeftColor:
          'primary.main',
      }}
    >
      <CardContent>
        <Box
          sx={{
            display:
              'flex',

            flexDirection:
              'column',

            gap:
              1.5,
          }}
        >
          <Typography
            component="p"
            variant="subtitle1"
            sx={{
              fontWeight:
                900,
            }}
          >
            {item.nombreCompleto
            ?? 'Ciudadano sin nombre'}
          </Typography>

          <InformationLine
            icon={
              <BadgeIcon />
            }
            label="Cédula"
            value={
              item.cedulaSolicitante
              ?? 'Sin cédula'
            }
          />

          <InformationLine
            icon={
              <LocationOnIcon />
            }
            label="Dirección"
            value={
              item.direccionTexto
              ?? 'Sin dirección'
            }
          />

          <InformationLine
            icon={
              <LocationCityIcon />
            }
            label="Barrio"
            value={
              item.barrioNombre
              ?? 'Sin barrio'
            }
          />

          <InformationLine
            icon={
              <PhoneIcon />
            }
            label="Teléfono"
            value={
              item.telefono
              ?? 'Sin teléfono'
            }
          />
        </Box>
      </CardContent>
    </Card>
  );
}

function InformationLine({
  icon,
  label,
  value,
}: {
  icon:
    ReactNode;

  label:
    string;

  value:
    string;
}) {
  return (
    <Box
      sx={{
        display:
          'flex',

        alignItems:
          'flex-start',

        gap:
          1,
      }}
    >
      <Box
        sx={{
          display:
            'flex',

          color:
            'text.secondary',

          '& svg': {
            fontSize:
              19,
          },
        }}
      >
        {icon}
      </Box>

      <Box>
        <Typography
          component="p"
          variant="caption"
          color="text.secondary"
        >
          {label}
        </Typography>

        <Typography
          component="p"
          variant="body2"
          sx={{
            fontWeight:
              700,

            overflowWrap:
              'anywhere',
          }}
        >
          {value}
        </Typography>
      </Box>
    </Box>
  );
}

function getPageContent<T>(
  response:
    unknown,
): T[] {
  const data =
    response as {
      content?: T[];
      items?: T[];
      data?: T[];
    };

  return (
    data?.content
    ?? data?.items
    ?? data?.data
    ?? []
  );
}

function getTotalElements(
  response:
    unknown,

  fallback:
    number,
) {
  const data =
    response as {
      totalElements?: number;
      totalItems?: number;
      total?: number;
      totalRecords?: number;
    };

  return (
    data?.totalElements
    ?? data?.totalItems
    ?? data?.total
    ?? data?.totalRecords
    ?? fallback
  );
}

function getErrorMessage(
  exception:
    unknown,

  fallback:
    string,
) {
  if (
    exception
    && typeof exception
      === 'object'
    && 'message' in exception
    && typeof exception.message
      === 'string'
  ) {
    return exception.message;
  }

  return fallback;
}

function formatDateLong(
  value:
    string,
) {
  const date =
    new Date(
      `${value}T00:00:00`,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return date.toLocaleDateString(
    'es-CO',
    {
      weekday:
        'long',

      year:
        'numeric',

      month:
        'long',

      day:
        'numeric',
    },
  );
}