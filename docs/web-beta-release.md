# Beta web de AliApp

Destino provisional confirmado por la propietaria: https://aliapp.heimdallbridge.com.

## Entorno identificado el 28 de septiembre de 2026

- Vercel: `aliapp-demo`, proyecto `prj_Wjjx7NHGAjmUbQO3su0kXS7Onh3V`, equipo `abakus-projects1`.
- El subdominio ya es un alias del despliegue de producción y responde HTTP 200.
- DNS: Porkbun; `aliapp` tiene CNAME a `cname.vercel-dns.com`. No se modificó DNS.
- Rama de producción observada: `claude/focused-allen-q43ms6`, commit `08a5daf`.
- El cliente publicado usa Supabase `stltacxvtxirqtnpuxjg`. La conexión Supabase disponible en esta sesión no tiene acceso a este proyecto. No se han aplicado migraciones remotas ni cambiado Auth.

## Implementado en esta revisión

- Crear procesos y sus alimentos en una transacción; activar, pausar, completar y cancelar desde la interfaz con permisos.
- Invitaciones mediante códigos de alta entropía, un solo uso, siete días de vigencia, hash en la base. Solo responsables/padres pueden generarlos; solo roles cuidador o profesional de lectura. Se comparten manualmente; no hay envío automático de correo.
- Lista de miembros y retirada de acceso a cuidadores/profesionales. Aceptación accesible desde onboarding y perfil.
- Recuperación de contraseña, pantalla de contraseña nueva y confirmación de correo en el alta. La configuración y entrega real de Auth deben validarse en Supabase.
- Exportación JSON por bebé y periodo mediante el RPC de informes existente. No es un PDF ni una descarga completa de la cuenta.
- Adjuntos PDF/JPEG/PNG hasta 5 MB en la interfaz web, usando el bucket privado y el esquema de adjuntos existentes. Validación de tamaño/firma en cliente; las políticas de Storage siguen siendo la frontera de autorización. Retirar de la lista es borrado lógico, no purga del archivo.
- Recordatorios web guardados para consultar dentro de AliApp. No se promete entrega con la página cerrada.
- Limpieza de caché al cambiar de usuario, selección válida al cambiar de hogar, ajustes de etiquetas, permisos y logo en pantallas estrechas.
- Verificación portable `npm run db:verify`: crea una base local desechable, aplica todas las migraciones y seed, ejecuta RLS y elimina únicamente esa base. No necesita Docker ni permisos de administrador del sistema.

## Antes de promover a producción

1. Conectar la cuenta/organización que administra `stltacxvtxirqtnpuxjg`. Revisar su historial de migraciones. No usar los otros proyectos accesibles como sustituto.
2. Aplicar `0020_atomic_journey.sql` y `0021_household_invitations.sql` mediante el flujo de migraciones de Supabase; ambas son aditivas. `app` debe permanecer fuera de los esquemas expuestos por PostgREST. El banco de pruebas `tests/db/supabase-shim.sql` nunca se aplica en remoto.
3. Configurar Auth: Site URL `https://aliapp.heimdallbridge.com`; redirect permitido `https://aliapp.heimdallbridge.com/reset-password`. Mantener los callbacks móviles existentes. Probar entrega de correo, enlace caducado y recuperación completa con una cuenta de prueba.
4. Verificar variables de compilación en Vercel: `EXPO_PUBLIC_SUPABASE_URL`, clave pública/anon y `EXPO_PUBLIC_SUPABASE_MEDIA_BUCKET=aliapp-media`. Nunca service-role. El build local y CI usan claves ficticias y sus carpetas `dist` no deben publicarse.
5. Generar preview desde la rama. Probar alta, invitación, revocación, proceso, exportación y adjuntos con dos familias de prueba contra Auth/Storage reales. Confirmar acceso directo a `/reset-password` y demás rutas SPA.
6. Verificar cámara, selección de fotos y dos lecturas OCR diferentes desde un teléfono Android en HTTPS. La comprobación del bundle no sustituye una prueba de enfoque, permisos y OCR real en el dispositivo.
7. Promover solo después de esta verificación. Las nuevas acciones de procesos/invitaciones fallan si las migraciones no están aplicadas.

## Pendientes que impiden llamarla beta completa

- Sincronización offline: no hay cola persistente ni resolución de conflictos. Sigue pendiente; ver `offline-plan.md`. Las escrituras compuestas de alimentación requieren atomicidad e idempotencia antes de reintentarse automáticamente.
- Avisos web en segundo plano: faltan service worker, suscripciones push y servicio de entrega.
- Eliminación de cuenta: falta decidir retención/transferencia del historial compartido y desarrollar la purga coordinada de Auth, referencias y Storage. No hay botón que finja eliminar datos.
- Aviso de privacidad y soporte: faltan identidad/contacto del responsable, política de conservación y canal de soporte confirmado.
- Pruebas reales de Auth/Storage y envío de correo, bloqueadas por acceso al proyecto correcto.
- Publicación móvil/Codemagic y verificación en dispositivos iOS/Android quedan pospuestas por indicación de la propietaria.

## Evidencia local

Se aplicaron las 21 migraciones y seed desde una base limpia: 52 pruebas RLS/integración pasan. Las pruebas de dominio incluyen 208 anteriores y 2 de adjuntos. TypeScript, lint y exportación web se comprueban antes del commit. El bundle contiene Tesseract y assets OCR propios, no el proveedor ficticio ni ML Kit.

La revisión de navegador usa un servidor de fixtures separado, fuera del repositorio, y datos sintéticos. Se comprobaron perfiles, cuidadores, procesos, documentos, recuperación y validaciones de formulario. No equivale a una prueba contra el backend publicado. Se observan avisos de deprecación de sombras y pointerEvents de React Native Web.
