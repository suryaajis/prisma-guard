-- A migration with several critical / high risks.

ALTER TABLE `User` DROP COLUMN `legacyEmail`;

ALTER TABLE `User` MODIFY COLUMN `displayName` TEXT NOT NULL;

ALTER TABLE `User` ADD COLUMN `country` VARCHAR(2) NOT NULL;

DROP TABLE `LegacyAuditLog`;
