import { redirect } from 'next/navigation';

/**
 * Ruta legacy del proceso de asignación de casos
 * a funcionarios Call Center.
 *
 * El flujo ordinario ya no requiere asignación previa:
 * cada funcionario registra sus propios casos.
 *
 * Se conserva temporalmente la ruta para que enlaces
 * antiguos y marcadores no produzcan un error 404.
 */
export default function AsignarFuncionariosCallCenterPage() {
  redirect(
    '/dashboard/callcenter/mis-registros',
  );
}