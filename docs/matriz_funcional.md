# Daexv_mdt - Matriz funcional

| Modulo | NUI endpoint | Cliente | Servidor | Estado UI | Nota |
|---|---|---|---|---|---|
| Ciudadanos | search/get/create/update/archive/status | cl_main.lua | sv_individuals.lua | Activo | Registro y perfil dentro de Ciudadanos. |
| Cargos | get/add/update/delete charge | cl_main.lua | sv_criminal.lua | Parcial | Se muestran en perfil; gestion avanzada queda como siguiente mejora visual. |
| Ordenes | wanted/create/sign/execute/cancel | cl_main.lua | sv_wanted.lua | Parcial | Lista y creacion activas; firma/ejecucion/cancelacion por callback disponible. |
| Bandas | gangs/gang/create/update/members | cl_main.lua | sv_gangs.lua | Parcial | Lista y creacion activas; vista de miembros requiere pantalla dedicada. |
| Archivo | cases/case/create/update/archive | cl_main.lua | sv_cases.lua | Activo | Expedientes y detalle dentro de Archivo. |
| Multas | fines/presets/stats/all/cancel/waive | cl_main.lua | sv_fines.lua | Activo | Perfil ciudadano + Archivo/Citaciones + Panel. |
| Telegramas | inbox/outbox/send/read/delete/officers | cl_main.lua | sv_telegram.lua | Parcial | Entrada/salida y envio activos; detalle/responder queda pendiente. |
| Evidencia | collect/get/attach/update/submit/remove | cl_main.lua + cl_evidence.lua | sv_evidence.lua | Backend sin UI completa | Integrar como seccion de expedientes. |
| Inmates/Fianza | register/get/pay/deny/adjust/release/stats | cl_main.lua + cl_fines.lua | sv_bail.lua | Backend sin UI completa | Integrar en Archivo o Perfil. |
| Labor | assign/get/update/complete/fail/cancel/stats | cl_main.lua | sv_labor.lua | Backend sin UI completa | Integrar en Perfil ciudadano. |
| Exports | legal docs/officer/status/warrants/evidence/fines | sv_exports.lua | sv_exports.lua | Activo | Puente opcional, sin dependencia obligatoria. |

## Sugerencias NUI

- Agregar selector negro de secciones al crear documentos de Archivo.
- Crear vista de detalle para Linea de Avisos con responder, archivar y copiar.
- Agregar panel de evidencia dentro del detalle de expediente.
- Agregar subvista de fianza/labor dentro de perfil ciudadano.