CREATE TABLE IF NOT EXISTS `items` (
    `item` VARCHAR(50) NOT NULL,
    `label` VARCHAR(50) NOT NULL,
    `limit` INT NOT NULL DEFAULT 1,
    `can_remove` TINYINT NOT NULL DEFAULT 1,
    `type` VARCHAR(50) NULL DEFAULT NULL,
    `usable` TINYINT NULL DEFAULT NULL,
    PRIMARY KEY (`item`) USING BTREE
) COLLATE='utf8mb4_general_ci'
ENGINE=InnoDB
ROW_FORMAT=DYNAMIC;

INSERT INTO `items`(`item`, `label`, `limit`, `can_remove`, `type`, `usable`) VALUES ('mdt_clipboard', 'MDT Clipboard', 1, 1, 'item_standard', 1) ON DUPLICATE KEY UPDATE `label` = VALUES(`label`), `usable` = 1;

CREATE TABLE IF NOT EXISTS `daexv_mdt_individuals` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `identifier` VARCHAR(60) NOT NULL,
    `firstname` VARCHAR(50) NOT NULL,
    `lastname` VARCHAR(50) NOT NULL,
    `dob` VARCHAR(20) DEFAULT '',
    `description` TEXT,
    `image_url` VARCHAR(500) DEFAULT '',
    `aliases` VARCHAR(255) DEFAULT '',
    `affiliations` VARCHAR(255) DEFAULT '',
    `telegram` VARCHAR(50) DEFAULT '',
    `status` ENUM('clear','wanted','dangerous','deceased','missing','archived') DEFAULT 'clear',
    `known_associates` TEXT,
    `notes` TEXT,
    `created_by` VARCHAR(60),
    `created_by_name` VARCHAR(100),
    `updated_by` VARCHAR(60),
    `updated_by_name` VARCHAR(100),
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_identifier (`identifier`),
    INDEX idx_name (`firstname`, `lastname`),
    INDEX idx_status (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `daexv_mdt_charges` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `individual_id` INT NOT NULL,
    `officer_identifier` VARCHAR(60),
    `officer_name` VARCHAR(100),
    `charge` VARCHAR(255) NOT NULL,
    `penal_code` VARCHAR(20) DEFAULT '',
    `category` VARCHAR(50) DEFAULT '',
    `description` TEXT,
    `sentence_time` INT DEFAULT 0,
    `fine` INT DEFAULT 0,
    `plea` ENUM('guilty','not_guilty','no_plea') DEFAULT 'no_plea',
    `status` ENUM('open','closed','appealed') DEFAULT 'open',
    `case_ref_id` INT DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`individual_id`) REFERENCES `daexv_mdt_individuals`(`id`) ON DELETE CASCADE,
    INDEX idx_individual (`individual_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `daexv_mdt_warrants` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `individual_id` INT NOT NULL,
    `identifier` VARCHAR(60) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `charges` TEXT,
    `reason` TEXT,
    `danger_level` ENUM('low','medium','high','extreme') DEFAULT 'medium',
    `bounty` INT DEFAULT 0,
    `status` ENUM('pending','active','executed','cancelled') DEFAULT 'pending',
    `created_by` VARCHAR(60),
    `created_by_name` VARCHAR(100),
    `signed_by` VARCHAR(60) DEFAULT NULL,
    `signed_by_name` VARCHAR(100) DEFAULT NULL,
    `signed_at` TIMESTAMP NULL,
    `executed_by` VARCHAR(60) DEFAULT NULL,
    `executed_by_name` VARCHAR(100) DEFAULT NULL,
    `executed_at` TIMESTAMP NULL,
    `cancelled_reason` TEXT DEFAULT NULL,
    `legal_doc_ref` INT DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`individual_id`) REFERENCES `daexv_mdt_individuals`(`id`) ON DELETE CASCADE,
    INDEX idx_status (`status`),
    INDEX idx_individual (`individual_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `daexv_mdt_gangs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `alias` VARCHAR(100) DEFAULT '',
    `territory` VARCHAR(200) DEFAULT '',
    `threat_level` ENUM('low','medium','high','extreme') DEFAULT 'low',
    `status` ENUM('active','dismantled','unknown') DEFAULT 'active',
    `description` TEXT,
    `notes` TEXT,
    `created_by` VARCHAR(60),
    `created_by_name` VARCHAR(100),
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `daexv_mdt_gang_members` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `gang_id` INT NOT NULL,
    `individual_id` INT NOT NULL,
    `role` VARCHAR(80) DEFAULT 'Member',
    `status` ENUM('active','inactive','deceased','unknown') DEFAULT 'active',
    `joined_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`gang_id`) REFERENCES `daexv_mdt_gangs`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`individual_id`) REFERENCES `daexv_mdt_individuals`(`id`) ON DELETE CASCADE,
    UNIQUE KEY unique_member (`gang_id`, `individual_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `daexv_mdt_cases` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `title` VARCHAR(255) NOT NULL,
    `case_type` VARCHAR(50) NOT NULL DEFAULT 'case_file',
    `state` VARCHAR(30) NOT NULL DEFAULT 'open',
    `summary` TEXT,
    `content` LONGTEXT,
    `access_level` VARCHAR(30) DEFAULT 'law',
    `citizen_id` INT DEFAULT NULL,
    `citizen_name` VARCHAR(100) DEFAULT '',
    `created_by` VARCHAR(60),
    `created_by_name` VARCHAR(100),
    `updated_by` VARCHAR(60),
    `updated_by_name` VARCHAR(100),
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`citizen_id`) REFERENCES `daexv_mdt_individuals`(`id`) ON DELETE SET NULL,
    INDEX idx_type (`case_type`),
    INDEX idx_state (`state`),
    INDEX idx_citizen (`citizen_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `daexv_mdt_case_incidents` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `case_id` INT NOT NULL,
    `title` VARCHAR(255) DEFAULT '',
    `location` VARCHAR(200) DEFAULT '',
    `date` VARCHAR(50) DEFAULT '',
    `details` TEXT,
    `sort_order` INT DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (`case_id`) REFERENCES `daexv_mdt_cases`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `daexv_mdt_case_charges` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `case_id` INT NOT NULL,
    `charge_name` VARCHAR(255) NOT NULL,
    `penal_code` VARCHAR(20) DEFAULT '',
    `category` VARCHAR(50) DEFAULT '',
    `plea` ENUM('guilty','not_guilty','no_plea') DEFAULT 'no_plea',
    `sentence_time` INT DEFAULT 0,
    `fine` INT DEFAULT 0,
    FOREIGN KEY (`case_id`) REFERENCES `daexv_mdt_cases`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `daexv_mdt_telegrams` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `from_identifier` VARCHAR(60) NOT NULL,
    `from_name` VARCHAR(100) NOT NULL,
    `to_identifier` VARCHAR(60) NOT NULL,
    `to_name` VARCHAR(100) DEFAULT '',
    `subject` VARCHAR(200) NOT NULL,
    `body` TEXT NOT NULL,
    `urgent` TINYINT(1) DEFAULT 0,
    `read_at` TIMESTAMP NULL,
    `ref_case_id` INT DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_to (`to_identifier`),
    INDEX idx_from (`from_identifier`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `daexv_mdt_legal_refs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `identifier` VARCHAR(60) NOT NULL,
    `doc_type` VARCHAR(50),
    `doc_code` VARCHAR(20) DEFAULT '',
    `doc_title` VARCHAR(255),
    `ref_id` INT NOT NULL,
    `section` VARCHAR(50) DEFAULT '',
    `issued_by` VARCHAR(60),
    `issued_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_identifier (`identifier`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `daexv_mdt_officers` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `identifier` VARCHAR(60) NOT NULL UNIQUE,
    `name` VARCHAR(100),
    `rank` VARCHAR(30),
    `badge_number` VARCHAR(20) DEFAULT '',
    `duty_status` ENUM('active','medical_leave','suspended','retired') DEFAULT 'active',
    `leave_days` INT DEFAULT 0,
    `leave_doc_id` INT DEFAULT NULL,
    `leave_issued_by` VARCHAR(60) DEFAULT NULL,
    `last_login` TIMESTAMP NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_identifier (`identifier`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `daexv_mdt_audit` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `officer_identifier` VARCHAR(60),
    `officer_name` VARCHAR(100),
    `action` VARCHAR(100) NOT NULL,
    `target_type` VARCHAR(50) DEFAULT '',
    `target_id` INT DEFAULT NULL,
    `details` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_date (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE `daexv_mdt_individuals` MODIFY `status` ENUM('clear','wanted','dangerous','deceased','missing','archived') DEFAULT 'clear';
ALTER TABLE `daexv_mdt_individuals` ADD COLUMN IF NOT EXISTS `created_by_name` VARCHAR(100) NULL AFTER `created_by`;
ALTER TABLE `daexv_mdt_individuals` ADD COLUMN IF NOT EXISTS `updated_by_name` VARCHAR(100) NULL AFTER `updated_by`;
ALTER TABLE `daexv_mdt_charges` ADD COLUMN IF NOT EXISTS `category` VARCHAR(50) DEFAULT '' AFTER `penal_code`;
ALTER TABLE `daexv_mdt_charges` ADD COLUMN IF NOT EXISTS `sentence_time` INT DEFAULT 0 AFTER `description`;
ALTER TABLE `daexv_mdt_charges` ADD COLUMN IF NOT EXISTS `case_ref_id` INT DEFAULT NULL AFTER `status`;
ALTER TABLE `daexv_mdt_warrants` ADD COLUMN IF NOT EXISTS `created_by_name` VARCHAR(100) NULL AFTER `created_by`;
ALTER TABLE `daexv_mdt_warrants` ADD COLUMN IF NOT EXISTS `signed_by_name` VARCHAR(100) NULL AFTER `signed_by`;
ALTER TABLE `daexv_mdt_warrants` ADD COLUMN IF NOT EXISTS `executed_by_name` VARCHAR(100) NULL AFTER `executed_by`;
ALTER TABLE `daexv_mdt_warrants` ADD COLUMN IF NOT EXISTS `cancelled_reason` TEXT NULL AFTER `executed_at`;
ALTER TABLE `daexv_mdt_gangs` ADD COLUMN IF NOT EXISTS `created_by_name` VARCHAR(100) NULL AFTER `created_by`;
ALTER TABLE `daexv_mdt_telegrams` ADD COLUMN IF NOT EXISTS `to_name` VARCHAR(100) DEFAULT '' AFTER `to_identifier`;
ALTER TABLE `daexv_mdt_legal_refs` ADD COLUMN IF NOT EXISTS `doc_code` VARCHAR(20) DEFAULT '' AFTER `doc_type`;
ALTER TABLE `daexv_mdt_legal_refs` ADD COLUMN IF NOT EXISTS `section` VARCHAR(50) DEFAULT '' AFTER `ref_id`;

ALTER TABLE `daexv_mdt_charges` MODIFY `plea` ENUM('guilty','not_guilty','no_plea') DEFAULT 'no_plea';
ALTER TABLE `daexv_mdt_charges` ADD COLUMN IF NOT EXISTS `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER `case_ref_id`;
ALTER TABLE `daexv_mdt_gangs` ADD COLUMN IF NOT EXISTS `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`;


CREATE TABLE IF NOT EXISTS `daexv_mdt_fines` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `individual_id` INT NOT NULL,
    `citizen_identifier` VARCHAR(60) NOT NULL,
    `citizen_name` VARCHAR(100) NOT NULL,
    `charge` VARCHAR(255) NOT NULL,
    `penal_code` VARCHAR(20) DEFAULT '',
    `category` VARCHAR(50) DEFAULT '',
    `description` TEXT,
    `location` VARCHAR(200) DEFAULT '',
    `amount` INT NOT NULL DEFAULT 0,
    `status` ENUM('pending','paid','overdue','cancelled','waived') DEFAULT 'pending',
    `due_date` TIMESTAMP NULL,
    `paid_at` TIMESTAMP NULL,
    `paid_amount` INT DEFAULT 0,
    `payment_method` ENUM('cash','bank','seized','other') DEFAULT NULL,
    `payment_note` VARCHAR(255) DEFAULT '',
    `officer_identifier` VARCHAR(60) NOT NULL,
    `officer_name` VARCHAR(100) NOT NULL,
    `officer_rank` VARCHAR(30) DEFAULT '',
    `cancelled_by` VARCHAR(60) DEFAULT NULL,
    `cancelled_by_name` VARCHAR(100) DEFAULT NULL,
    `cancelled_reason` TEXT DEFAULT NULL,
    `case_ref_id` INT DEFAULT NULL,
    `charge_ref_id` INT DEFAULT NULL,
    `legal_doc_ref` INT DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`individual_id`) REFERENCES `daexv_mdt_individuals`(`id`) ON DELETE CASCADE,
    INDEX idx_citizen (`citizen_identifier`),
    INDEX idx_status (`status`),
    INDEX idx_officer (`officer_identifier`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `daexv_mdt_fine_presets` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `penal_code` VARCHAR(20) NOT NULL,
    `charge` VARCHAR(255) NOT NULL,
    `category` VARCHAR(50) DEFAULT '',
    `amount` INT NOT NULL DEFAULT 0,
    `description` VARCHAR(255) DEFAULT '',
    `active` TINYINT(1) DEFAULT 1,
    UNIQUE KEY unique_fine_preset (`penal_code`, `charge`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO `daexv_mdt_fine_presets` (`penal_code`, `charge`, `category`, `amount`, `description`) VALUES
('CP-104', 'Assault', 'PERSONS', 100, 'Physical assault against another person'),
('CP-110', 'Harassment', 'PERSONS', 50, 'Verbal or physical harassment'),
('CP-204', 'Petty Theft', 'PROPERTY', 50, 'Theft of items of minor value'),
('CP-207', 'Vandalism', 'PROPERTY', 75, 'Willful destruction of property'),
('CP-210', 'Trespassing', 'PROPERTY', 50, 'Unlawful entry onto private property'),
('CP-301', 'Disorderly Conduct', 'ORDER', 25, 'Disruptive behavior in public'),
('CP-302', 'Public Intoxication', 'ORDER', 15, 'Drunk and disorderly in public'),
('CP-303', 'Disturbing the Peace', 'ORDER', 30, 'Creating noise or disruption'),
('CP-305', 'Failure to Identify', 'ORDER', 50, 'Refusing to provide identification'),
('CP-306', 'Disobeying a Lawful Order', 'ORDER', 75, 'Refusing to comply with officer'),
('CP-401', 'Brandishing a Firearm', 'WEAPONS', 75, 'Displaying a weapon in a threatening manner'),
('CP-402', 'Unlawful Discharge', 'WEAPONS', 100, 'Firing a weapon in a restricted area');

ALTER TABLE `daexv_mdt_fines` ADD COLUMN IF NOT EXISTS `legal_doc_ref` INT DEFAULT NULL AFTER `charge_ref_id`;

-- ============================================================
-- v2: TABLAS NUEVAS
-- ============================================================

CREATE TABLE IF NOT EXISTS `daexv_mdt_inmates` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `individual_id` INT NOT NULL,
    `citizen_identifier` VARCHAR(60) NOT NULL,
    `citizen_name` VARCHAR(100) NOT NULL,
    `charges_summary` TEXT COMMENT 'JSON array de cargos',
    `sentence_time` INT NOT NULL DEFAULT 0 COMMENT 'Total minutos de condena',
    `time_served` INT NOT NULL DEFAULT 0 COMMENT 'Minutos ya cumplidos',
    `bail_amount` INT NOT NULL DEFAULT 0,
    `bail_status` ENUM('available','paid','denied','not_applicable') DEFAULT 'available',
    `bail_paid_by` VARCHAR(60) DEFAULT NULL,
    `bail_paid_by_name` VARCHAR(100) DEFAULT NULL,
    `bail_paid_at` TIMESTAMP NULL,
    `release_type` ENUM('served','bail','pardon','escape','transfer') DEFAULT NULL,
    `prison_location` VARCHAR(100) DEFAULT 'Sisika',
    `status` ENUM('incarcerated','released','escaped','transferred') DEFAULT 'incarcerated',
    `arrested_by` VARCHAR(60) DEFAULT NULL,
    `arrested_by_name` VARCHAR(100) DEFAULT NULL,
    `case_ref_id` INT DEFAULT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `released_at` TIMESTAMP NULL,
    INDEX `idx_inmates_status` (`status`),
    INDEX `idx_inmates_citizen` (`citizen_identifier`),
    INDEX `idx_inmates_individual` (`individual_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `daexv_mdt_evidence` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `case_id` INT NOT NULL,
    `evidence_type` ENUM('bullet_casing','testimony','physical_item','photograph','fingerprint','other') NOT NULL DEFAULT 'other',
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT,
    `location_x` FLOAT DEFAULT NULL,
    `location_y` FLOAT DEFAULT NULL,
    `location_z` FLOAT DEFAULT NULL,
    `location_name` VARCHAR(200) DEFAULT NULL,
    `weapon_type` VARCHAR(100) DEFAULT NULL,
    `linked_individual_id` INT DEFAULT NULL,
    `collected_by` VARCHAR(60) NOT NULL,
    `collected_by_name` VARCHAR(100) NOT NULL,
    `chain_of_custody` TEXT COMMENT 'JSON array [{officer,action,timestamp}]',
    `status` ENUM('collected','in_custody','submitted','analyzed','discarded') DEFAULT 'collected',
    `submitted_to_court` TINYINT(1) DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_evidence_case` (`case_id`),
    INDEX `idx_evidence_type` (`evidence_type`),
    INDEX `idx_evidence_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `daexv_mdt_labor` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `individual_id` INT NOT NULL,
    `citizen_identifier` VARCHAR(60) NOT NULL,
    `citizen_name` VARCHAR(100) NOT NULL,
    `labor_type` ENUM('community_service','forced_labor','fine_and_labor') NOT NULL,
    `description` TEXT,
    `hours_assigned` INT NOT NULL DEFAULT 1,
    `hours_completed` INT NOT NULL DEFAULT 0,
    `deadline` TIMESTAMP NULL,
    `status` ENUM('assigned','in_progress','completed','failed','cancelled') DEFAULT 'assigned',
    `assigned_by` VARCHAR(60) NOT NULL,
    `assigned_by_name` VARCHAR(100) NOT NULL,
    `case_ref_id` INT DEFAULT NULL,
    `charge_ref_id` INT DEFAULT NULL,
    `fine_ref_id` INT DEFAULT NULL,
    `notes` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `completed_at` TIMESTAMP NULL,
    INDEX `idx_labor_citizen` (`citizen_identifier`),
    INDEX `idx_labor_individual` (`individual_id`),
    INDEX `idx_labor_status` (`status`),
    INDEX `idx_labor_deadline` (`deadline`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
