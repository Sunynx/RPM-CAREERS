CREATE TABLE `applications` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text NOT NULL,
	`data` text NOT NULL,
	`created` text NOT NULL,
	`updated` text NOT NULL,
	`note` text DEFAULT '' NOT NULL
);
