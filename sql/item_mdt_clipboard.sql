INSERT INTO `items` (`item`, `label`, `limit`, `can_remove`, `type`, `usable`)
VALUES ('mdt_clipboard', 'MDT Clipboard', 1, 1, 'item_standard', 1)
ON DUPLICATE KEY UPDATE
    `label` = VALUES(`label`),
    `limit` = VALUES(`limit`),
    `can_remove` = VALUES(`can_remove`),
    `type` = VALUES(`type`),
    `usable` = VALUES(`usable`);