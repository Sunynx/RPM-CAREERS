CREATE TABLE `application_owners` (
	`application_id` text PRIMARY KEY NOT NULL,
	`owner_hash` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `file_owners` (
	`file_key` text PRIMARY KEY NOT NULL,
	`owner_hash` text NOT NULL
);
