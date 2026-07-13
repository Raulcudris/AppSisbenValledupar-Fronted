# Dashboard Material UI - AppSisbenValledupar

## Objetivo

Frontend base con Next.js, TypeScript y Material UI para consumir el backend `AppSisbenValledupar`.

## Pantallas incluidas

```text
/login
/dashboard
/dashboard/ventanilla
/dashboard/dmc
/dashboard/auditoria
/dashboard/exportaciones
```

## Instalación

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Abrir:

```text
http://localhost:3000
```

Backend esperado:

```text
http://localhost:6095
```

## Usuarios de prueba

```text
ADMIN / Admin123*
SUPERVISOR_TEST / Admin123*
VENTANILLA_TEST / Admin123*
DMC_TEST / Admin123*
CONSULTA_TEST / Admin123*
```

## Endpoints consumidos

```text
POST /api/auth/login
GET  /api/auth/me

GET /api/reports/ventanilla/summary
GET /api/reports/ventanilla/by-status
GET /api/reports/ventanilla/by-request-type
GET /api/reports/ventanilla/by-user
GET /api/reports/ventanilla/by-comuna

GET /api/reports/dmc/summary
GET /api/reports/dmc/by-type
GET /api/reports/dmc/by-surveyor
GET /api/reports/dmc/by-user
GET /api/reports/dmc/by-comuna

GET /api/audit/search

GET /api/export/ventanilla
GET /api/export/dmc
GET /api/export/reports/ventanilla
GET /api/export/reports/dmc
```

## Nota

El frontend no reemplaza la seguridad del backend. Si el rol no tiene permiso, el backend responde `403` y la pantalla muestra acceso restringido.
