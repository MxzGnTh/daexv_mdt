# Daexv_mdt — Documentacion Tecnica, Logica Funcional y Roadmap

Fecha: 2026-05-12
Recurso: `daexv_mdt`
Framework: VORP Core
Base de datos: oxmysql / MySQL
UI: NUI `html/index.html` + `html/style.css` + `html/script.js`

## 1. Resumen Ejecutivo

`daexv_mdt` es un MDT western para law enforcement en RedM. El recurso funciona como un sistema centralizado de consulta, registro y seguimiento policial, con una estetica de expediente/clipboard tipo Monroe Sheriff's Office.

El script ya cubre estos dominios:

- Registro ciudadano
- Cargos criminales
- Ordenes de arresto / buscados
- Bandas criminales
- Archivo de casos y reportes
- Dashboard operativo
- Telegramas internos
- Multas
- Reclusion y fianzas
- Evidencia
- Trabajos comunitarios / forzados
- Integracion con `Daexv_legaldocuments`

Estado funcional actual:

- Base principal del MDT: activa
- NUI Monroe base: activa
- Busqueda mixta `characters + MDT`: activa
- Penal code read-only desde LegalDocs: activo con fallback local
- Multas con jurisdiccion `Estado > Condado > Pueblo`: activo
- Modulos de bail/evidence/labor: backend operativo, UI parcial o no expuesta completamente en la navegacion principal

## 2. Arquitectura General

### 2.1 Capas del sistema

El recurso se divide en 4 capas:

1. Configuracion
- Define permisos, trabajos, penal code local fallback, tipos de caso, estados, multas, jurisdicciones, bail, evidence y labor.

2. Servidor Lua
- Contiene la logica de negocio, validaciones server-side, permisos, acceso a base de datos, integraciones y auditoria.

3. Cliente Lua
- Abre/cierra el MDT, maneja callbacks NUI y expone comandos ciudadanos (`/fines`, `/payfine`, `/bail`, `/paybail`).

4. NUI
- Interfaz visual tipo clipboard Monroe.
- Consume callbacks via `fetch('https://<resource>/<endpoint>')`.

### 2.2 Dependencias

- `vorp_core`
- `vorp_inventory`
- `oxmysql`
- `Daexv_legaldocuments` es opcional, pero cuando esta iniciado se vuelve la fuente principal del codigo penal.

## 3. Flujo de acceso al MDT

### 3.1 Apertura

Entrada principal:
- comando `/mdt`
- item usable `mdt_clipboard`

Flujo real:

1. `server/sv_main.lua` valida si el jugador pertenece a un trabajo autorizado en `Config.Jobs`.
2. Verifica cooldown anti-spam.
3. Si `Config.RequireItem = true`, valida el item `mdt_clipboard` usando varias rutas compatibles con `vorp_inventory`.
4. Actualiza login del oficial en `daexv_mdt_officers`.
5. Carga el codigo penal:
   - primero desde `Daexv_legaldocuments`
   - si falla, usa `Config.PenalCode`
6. Envia al cliente el payload de apertura con:
   - datos del oficial
   - nombre del departamento
   - sello
   - penal code
   - tipos/estados de caso
   - jurisdicciones de multas
7. Cliente abre NUI con foco.

### 3.2 Cierre

- `ESC`
- boton `Cerrar`
- cierre defensivo cuando el recurso se detiene

## 4. Modelo de datos y tablas clave

## 4.1 Tablas principales

- `daexv_mdt_individuals`
  - fichas ciudadanas MDT
  - ahora incluye `char_id` para vinculo tecnico con `characters`

- `daexv_mdt_charges`
  - cargos criminales asociados a un ciudadano

- `daexv_mdt_warrants`
  - ordenes de arresto y ciclo de vida `pending -> active -> executed/cancelled`

- `daexv_mdt_gangs`
- `daexv_mdt_gang_members`
  - organizacion criminal y plantilla

- `daexv_mdt_cases`
- `daexv_mdt_case_incidents`
- `daexv_mdt_case_charges`
  - expediente de casos, reportes, citaciones y eventos

- `daexv_mdt_telegrams`
  - mensajeria interna entre oficiales

- `daexv_mdt_legal_refs`
  - referencias documentales enlazadas desde LegalDocs

- `daexv_mdt_officers`
  - login, rank y estado del oficial

- `daexv_mdt_audit`
  - bitacora de acciones del MDT

## 4.2 Multas

- `daexv_mdt_fines`
  - soporta ahora:
    - `location`
    - `location_detail`
    - `state_name`
    - `county_name`
    - `town_name`
  - `location` queda como campo derivado de compatibilidad

- `daexv_mdt_fine_presets`
  - plantillas de multas por articulo penal

## 4.3 Modulos avanzados

- `daexv_mdt_inmates`
  - reclusion y fianzas

- `daexv_mdt_evidence`
  - evidencia, ubicacion, cadena de custodia y estado judicial

- `daexv_mdt_labor`
  - trabajos comunitarios / forzados

## 5. Logica funcional por modulo

## 5.1 Ciudadanos

Archivo: `server/sv_individuals.lua`

Funciones principales:

- `searchIndividuals`
  - ya no consulta solo `daexv_mdt_individuals`
  - combina:
    - fichas MDT existentes
    - personajes reales en `characters` aun no procesados
  - cada fila devuelve:
    - `source`
    - `hasFile`
    - `char_id`
    - `individual_id`
    - `identifier`
    - nombre / apellido
    - `job`
    - `status`

- `getIndividual`
  - abre la ficha completa
  - enriquece el ciudadano con:
    - cargos
    - warrants activos
    - bandas
    - legal refs
    - medical refs
    - multas
    - `online`
    - `currentJob`

- `createIndividual`
  - admite alta manual o alta prellenada desde `characters`
  - si llega `char_id`, valida existencia y bloquea duplicados

- `updateIndividual`
- `archiveIndividual`
- `setIndividualStatus`

Logica actual destacada:
- `char_id` es el vinculo tecnico nuevo con VORP
- `identifier` se mantiene por compatibilidad con otros modulos
- el oficial puede descubrir personajes reales del servidor desde el placeholder de busqueda, aunque no tengan ficha aun

## 5.2 Cargos criminales

Archivo: `server/sv_criminal.lua`

Funciones:
- `getCharges`
- `addCharge`
- `updateChargeStatus`
- `deleteCharge`

La NUI permite:
- seleccionar categoria penal
- seleccionar articulo
- autocompletar:
  - cargo
  - codigo penal
  - tiempo
  - multa

Fuente de articulos:
- LegalDocs si esta disponible
- fallback local si LegalDocs falla

## 5.3 Warrants / Buscados

Archivo: `server/sv_wanted.lua`

Funciones:
- `getWantedList`
- `createWarrant`
- `signWarrant`
- `executeWarrant`
- `cancelWarrant`

Flujo:
- un oficial redacta la orden
- juez firma (`signWarrant`)
- ciudadano pasa a `wanted`
- la ejecucion o cancelacion refresca el estado del ciudadano

## 5.4 Bandas

Archivo: `server/sv_gangs.lua`

Funciones:
- `getGangs`
- `getGang`
- `createGang`
- `updateGang`
- `addGangMember`
- `removeGangMember`

La UI actual muestra:
- lista de bandas
- nivel de amenaza
- descripcion
- detalle de miembros

## 5.5 Casos / Filing Cabinet

Archivo: `server/sv_cases.lua`

Funciones:
- `getCases`
- `getCase`
- `createCase`
- `updateCase`
- `updateCaseState`
- `archiveCase`

Usos:
- case file
- arrest report
- arrest warrant
- medical report
- citation
- incident report

Los casos sirven de base documental para:
- arrestos
- informes medicos
- citaciones
- reportes generales

## 5.6 Dashboard

Archivo: `server/sv_dashboard.lua`

Entrega:
- conteo de ciudadanos
- buscados
- ordenes activas
- cargos abiertos
- bandas
- actividad semanal
- multas pendientes y cobradas

Complemento:
- feed de auditoria reciente desde `daexv_mdt_audit`

## 5.7 Telegramas

Archivo: `server/sv_telegram.lua`

Funciones:
- `sendTelegram`
- `getInbox`
- `getOutbox`
- `markTelegramRead`
- `deleteTelegram`
- `getOfficersList`

Usos:
- comunicacion interna entre oficiales
- mensajes urgentes
- referencia a casos si corresponde

## 5.8 Multas

Archivo: `server/sv_fines.lua`

Funciones:
- `issueFine`
- `getFines`
- `getMyFines`
- `payFine`
- `cancelFine`
- `waiveFine`
- `getFinePresets`
- `getFineStats`
- `getAllFines`

Estado actual del sistema de multas:

- usa plantillas de multa por articulo penal
- permite emitir multa desde la ficha del ciudadano
- notifica al ciudadano online
- permite pagar via `/payfine`
- soporta `pending`, `paid`, `overdue`, `cancelled`, `waived`
- genera citacion en `daexv_mdt_cases`
- crea referencia documental en `daexv_mdt_legal_refs`
- integra jurisdiccion estructurada:
  - `Estado/Territorio`
  - `Condado/Region`
  - `Pueblo/Asentamiento`
  - `Detalle del Lugar`

Importante:
- el servidor valida combinaciones reales de jurisdiccion contra `Config.FineJurisdictions`
- `location` ya no es la fuente principal; ahora es una derivacion de compatibilidad

## 5.9 Bail / Inmates

Archivo: `server/sv_bail.lua`

Funciones:
- `registerInmate`
- `getInmates`
- `getInmate`
- `calculateBail`
- `payBail`
- `denyBail`
- `adjustBail`
- `releaseInmate`
- `getInmateStats`
- `getInmateForCitizen`

Comandos ciudadanos:
- `/bail`
- `/paybail`

Estado actual:
- backend funcional
- interfaz principal Monroe aun no expone una pestana completa dedicada

## 5.10 Evidence

Archivos:
- `server/sv_evidence.lua`
- `client/cl_evidence.lua`

Capacidades:
- recoleccion de evidencia en mundo
- spawn de casquillos
- cadena de custodia
- asociacion a caso
- estado judicial (`submitted`, `analyzed`, etc.)

Estado actual:
- backend y cliente utilitario activos
- UI MDT principal aun no tiene una pestana Monroe completa para evidencia

## 5.11 Labor

Archivo: `server/sv_labor.lua`

Capacidades:
- asignar labor
- progresar horas
- completar
- fallar
- cancelar
- estadisticas

Estado actual:
- backend operativo
- UI principal no lo expone aun como modulo visible completo

## 5.12 Exports / Integracion externa

Archivo: `server/sv_exports.lua`

Exports activos:
- `RegisterLegalDocOnCitizen`
- `GetOfficerRank`
- `GetOfficerLevel`
- `SetCitizenStatus`
- `CancelActiveWarrants`
- `AttachEvidenceToCase`
- `GetLegalDocsForCitizen`
- `CreateFineFromLegalDoc`

Esto convierte a `daexv_mdt` en una pieza reutilizable por otros recursos del ecosistema Daexv.

## 6. NUI: logica y comportamiento

## 6.1 Estructura visual

La NUI actual usa:
- `html/index.html`
- `html/style.css`
- `html/script.js`

Tabs visibles:
- Ciudadanos
- Archivo
- Buscados
- Bandas
- Panel
- Linea de Avisos

Subvistas internas:
- Ficha Ciudadana
- Detalle de Caso

## 6.2 Flujo NUI

- `script.js` centraliza toda la logica del frontend
- usa `fetch('https://<resource>/<endpoint>')`
- callbacks con `cbId`
- demo mode fuera de runtime

Comportamientos clave:
- placeholder de busqueda en vivo para ciudadanos
- click condicionado:
  - si ya existe ficha MDT -> abre perfil
  - si viene de `characters` sin ficha -> abre modal prellenado
- forms encadenados para:
  - cargos
  - warrants
  - multas
- cierre por `ESC`
- toasts y overlays de multa recibida

## 6.3 Estado visual actual

Fortalezas:
- arquitectura limpia `index + style + script`
- estetica Monroe funcional
- experiencia mas cercana al clipboard que la implementacion vieja

Puntos pendientes:
- aun puede afinarse para parecerse mas a las referencias finales
- faltan pantallas Monroe completas para bail/evidence/labor/fines globales

## 7. Integracion con VORP y LegalDocs

## 7.1 VORP

El recurso usa VORP para:
- personajes (`getUsedCharacter`)
- job del jugador
- dinero para pago de multas y fianzas
- validacion de item `mdt_clipboard`

La tabla `characters` es la fuente de personajes vivos del servidor.

## 7.2 LegalDocs

`Daexv_legaldocuments` es hoy la fuente principal del codigo penal.

Flujo:
- `sv_main.lua` intenta leer `GetPenalCodeCatalog()` desde LegalDocs
- si responde, el MDT trabaja con ese catalogo
- si falla, usa `Config.PenalCode`
- la NUI muestra aviso de contingencia si entra en fallback

Beneficio:
- un solo codigo penal real para ambos recursos
- menos divergencia entre documentos legales y uso operativo del MDT

## 8. Riesgos, limitaciones y observaciones tecnicas

## 8.1 Riesgos controlados

- Si `Daexv_legaldocuments` no responde, el MDT sigue funcionando con fallback.
- Si `vorp_inventory` falla, la apertura del item puede comportarse distinto segun el export disponible.
- Las multas viejas no tienen jurisdiccion estructurada; siguen vivas gracias a `location`.

## 8.2 Limitaciones actuales

- No hay auto-sync masivo de `characters` a `daexv_mdt_individuals`.
- No hay creacion automatica de ficha al spawn.
- `fines`, `bail`, `evidence` y `labor` no tienen aun una experiencia NUI Monroe completa dentro de la navegacion principal.
- No hay una consola admin/documentacion interna integrada para mantenimiento operativo.
- No hay capa de reportes exportables CSV/PDF.

## 8.3 Migraciones requeridas

Tras cambios recientes, es importante ejecutar `sql/install.sql` en instalaciones existentes para:
- `char_id` en ciudadanos
- jurisdiccion estructurada en multas
- columnas nuevas de compatibilidad

## 9. Mejoras futuras recomendadas

## 9.1 Prioridad alta

1. Pestana global de multas
- usar `getAllFines` y `getFineStats`
- filtros por estado, oficial, estado/condado/pueblo
- vista Monroe completa de citaciones

2. Pestana de reclusion / bail
- usar backend ya activo
- mostrar presos, estado de fianza, liberacion y stats

3. Pestana de evidencia
- listar evidencia
- cadena de custodia
- adjuntar a caso
- envio a corte

4. Pestana de labor
- asignacion desde UI
- progreso
- vencimientos

5. Pulido visual Monroe final
- densidad tipografica
- tablas inferiores
- bloques de retrato
- tabs laterales mas organicas

## 9.2 Prioridad media

6. Estadisticas por oficial
- multas emitidas
- ordenes firmadas/ejecutadas
- casos creados/cerrados
- evidencia presentada

7. Turnos / duty status real
- entrada y salida de servicio
- integracion con `daexv_mdt_officers`

8. Badge de telegramas no leidos
- numerico en tab lateral
- sonido/aviso para urgentes

9. Geolocalizacion operacional
- waypoint para wanted / evidencia / labor
- si el servidor quiere extenderlo

10. Editor de presets de multas
- alta/baja/edicion desde UI

## 9.3 Prioridad baja pero valiosa

11. Auto-vinculacion asistida de fichas huérfanas antiguas
- por coincidencia controlada con `characters`

12. Exportacion de reportes
- CSV o integracion externa

13. Webhooks de auditoria
- Discord u otro canal

14. Sanitizacion adicional de busquedas avanzadas
- reducir riesgos de consultas LIKE muy amplias

## 10. Recomendaciones operativas inmediatas

1. Ejecutar `sql/install.sql` en la base actual.
2. Probar `/mdt` con un oficial y `mdt_clipboard`.
3. Validar 4 caminos criticos:
- busqueda ciudadana con ficha
- busqueda ciudadana desde `characters` sin ficha
- emision de multa con jurisdiccion valida
- pago de multa por ciudadano
4. Verificar fallback de LegalDocs desconectando el recurso temporalmente.
5. Definir si la siguiente fase visual sera:
- multas globales
- bail
- evidence
- labor

## 11. Conclusión

`daexv_mdt` ya no es solo una libreta de ciudadanos: actualmente es una plataforma policial modular con:

- base ciudadana enlazada al servidor
- expediente criminal
- ordenes y wanted
- multas con jurisdiccion real
- archivo documental
- integracion con LegalDocs
- backend avanzado para carcel, evidencia y labor

La base actual ya es suficientemente fuerte para operar en produccion con sheriff/marshal/judge, pero todavia tiene una segunda etapa clara: exponer en la NUI Monroe todos los modulos avanzados que el backend ya posee.
