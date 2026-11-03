CREATE TABLE `comment_moderation` (
	`comment_id` text PRIMARY KEY NOT NULL,
	`action` text NOT NULL,
	`score` integer NOT NULL,
	`reasons` text NOT NULL,
	`policy_revision` integer NOT NULL,
	`evaluated_at` integer NOT NULL,
	FOREIGN KEY (`comment_id`) REFERENCES `comment`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_comment_moderation_action_evaluated` ON `comment_moderation` (`action`,`evaluated_at`);--> statement-breakpoint
CREATE TABLE `moderation_policy_revision` (
	`revision` integer PRIMARY KEY NOT NULL,
	`settings` text NOT NULL,
	`actor_id` text NOT NULL,
	`created_at` integer NOT NULL
);
