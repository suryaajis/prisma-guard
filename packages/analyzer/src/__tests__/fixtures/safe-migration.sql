-- A migration that should be considered LOW risk.
-- Adds a nullable column with a default. No index work, no destructive ops.

ALTER TABLE `User` ADD COLUMN `nickname` VARCHAR(64) NULL DEFAULT NULL;
