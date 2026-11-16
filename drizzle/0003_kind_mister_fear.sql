CREATE TABLE `mail_receipts` (
	`id` text PRIMARY KEY NOT NULL,
	`application_id` text NOT NULL,
	`payload` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` text DEFAULT '0' NOT NULL,
	`error` text DEFAULT '' NOT NULL,
	`created` text NOT NULL,
	`updated` text NOT NULL
);
