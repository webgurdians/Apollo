CREATE TABLE `activity_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`userName` text NOT NULL,
	`userRole` text NOT NULL,
	`action` text NOT NULL,
	`entity` text NOT NULL,
	`entityId` integer,
	`details` text,
	`createdAt` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `appointments` ADD `startTime` integer;--> statement-breakpoint
ALTER TABLE `appointments` ADD `endTime` integer;--> statement-breakpoint
ALTER TABLE `appointments` ADD `doctorId` integer REFERENCES doctors(id);--> statement-breakpoint
ALTER TABLE `appointments` ADD `deletedAt` integer;--> statement-breakpoint
ALTER TABLE `bills` ADD `correctionNote` text;--> statement-breakpoint
ALTER TABLE `bills` ADD `lockedAt` integer;--> statement-breakpoint
ALTER TABLE `bills` ADD `deletedAt` integer;--> statement-breakpoint
ALTER TABLE `contacts` ADD `deletedAt` integer;--> statement-breakpoint
ALTER TABLE `doctors` ADD `deletedAt` integer;--> statement-breakpoint
ALTER TABLE `patients` ADD `deletedAt` integer;--> statement-breakpoint
ALTER TABLE `prescription_medicines` ADD `deletedAt` integer;--> statement-breakpoint
ALTER TABLE `prescription_tests` ADD `deletedAt` integer;--> statement-breakpoint
ALTER TABLE `prescriptions` ADD `deletedAt` integer;--> statement-breakpoint
ALTER TABLE `users` ADD `deletedAt` integer;