CREATE TABLE `homepage_content` (
	`id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`data` text NOT NULL,
	`created` text NOT NULL,
	`updated` text NOT NULL
);
