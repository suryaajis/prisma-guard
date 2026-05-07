-- A migration that should land in MEDIUM range.

UPDATE `User` SET `loginCount` = 0;

ALTER TABLE `Order` ADD COLUMN `note` VARCHAR(255) NULL;
ALTER TABLE `Order` ADD COLUMN `flags` INT NULL;
ALTER TABLE `Order` ADD COLUMN `traceId` VARCHAR(64) NULL;

CREATE INDEX `Order_traceId_idx` ON `Order` (`traceId`);
