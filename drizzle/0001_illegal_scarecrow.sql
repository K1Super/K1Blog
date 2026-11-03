DROP INDEX `idx_comment_email_hash_created`;--> statement-breakpoint
ALTER TABLE `comment` DROP COLUMN `author_email_encrypted`;--> statement-breakpoint
ALTER TABLE `comment` DROP COLUMN `author_email_hash`;