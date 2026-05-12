# Daexv_mdt - Multas y Daexv_legaldocuments

## Instalacion

1. Ejecutar `sql/install.sql`.
2. Verificar el item `mdt_clipboard` o ejecutar `sql/item_mdt_clipboard.sql`.
3. Iniciar `vorp_core`, `oxmysql` y opcionalmente `vorp_inventory`.
4. Iniciar con `ensure daexv_mdt`.

## Flujo de multas

- Oficial abre `/mdt`, busca ciudadano y usa `Emitir Multa`.
- La multa queda en `daexv_mdt_fines` como `pending`.
- Al vencer `due_date`, el servidor la marca `overdue`.
- Ciudadano usa `/fines` para ver multas y `/payfine ID cash` para pagar.
- Pago bancario queda desactivado hasta conectar un sistema bancario real.

## Estados

`pending` Pendiente, `overdue` Vencida, `paid` Pagada, `cancelled` Cancelada, `waived` Perdonada.

## Bridge opcional

`Daexv_mdt` no depende de `Daexv_legaldocuments`. Otro recurso puede llamar:

```lua
exports['daexv_mdt']:RegisterLegalDocOnCitizen(identifier, {
    type = 'multa', doc_code = 'AV-MUL', title = 'Multa: Alteracion del orden - $25',
    doc_id = 42, section = 'fines', issued_by = officerIdentifier,
})

local fineId = exports['daexv_mdt']:CreateFineFromLegalDoc(citizenIdentifier, 25, 'Alteracion del orden', legalDocId, officerIdentifier, officerName)
```

Exports disponibles: `GetOfficerRank`, `GetOfficerLevel`, `SetCitizenStatus`, `CancelActiveWarrants`, `AttachEvidenceToCase`, `GetLegalDocsForCitizen`.