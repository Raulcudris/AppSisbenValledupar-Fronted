# AppSisben Valledupar - App Web

Aplicación web administrativa para la gestión operativa del sistema AppSisben Valledupar.

La app permite consultar, registrar, actualizar y exportar información relacionada con los módulos de Ventanilla, DMC, Auditoría, Exportaciones y Panel principal, según los permisos asignados al rol del usuario autenticado.

---

## Tecnologías utilizadas

- Next.js
- React
- TypeScript
- Material UI
- App Router de Next.js
- Consumo de API REST
- Autenticación por token
- Control de acceso por roles

---

## Estructura principal del proyecto

```text
src/
├── app/
│   ├── dashboard/
│   │   ├── auditoria/
│   │   │   └── page.tsx
│   │   ├── dmc/
│   │   │   ├── registros/
│   │   │   │   └── page.tsx
│   │   │   └── page.tsx
│   │   ├── exportaciones/
│   │   │   └── page.tsx
│   │   ├── ventanilla/
│   │   │   ├── registros/
│   │   │   │   └── page.tsx
│   │   │   └── page.tsx
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── login/
│   ├── layout.tsx
│   ├── page.tsx
│   └── providers.tsx
│
├── components/
│   ├── dashboard/
│   │   ├── AccessMessage.tsx
│   │   ├── DashboardShell.tsx
│   │   ├── DateRangeToolbar.tsx
│   │   ├── LoadingState.tsx
│   │   ├── ReportCharts.tsx
│   │   ├── SectionCard.tsx
│   │   ├── StatCard.tsx
│   │   └── States.tsx
│   │
│   ├── operational/
│   │   ├── CrudPageHeader.tsx
│   │   └── SelectField.tsx
│   │
│   └── ui/
│       ├── AppSnackbar.tsx
│       └── ConfirmActionDialog.tsx
│
├── lib/
├── services/
├── theme/
└── types/