# Edge Functions

Vacío a propósito.

Una Edge Function solo se añade cuando algo **no puede** resolverse con SQL,
RLS y el cliente tipado: por ejemplo, invitaciones por correo o la generación
del informe en PDF cuando llegue.

Hoy nada lo necesita: la autorización vive en las políticas RLS, la línea de
tiempo y el panel de alimentos son vistas, y los informes salen de
`public.build_report()`.
