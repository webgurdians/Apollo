CREATE TABLE `medicine_orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`patientId` integer NOT NULL,
	`items` text NOT NULL,
	`totalAmount` integer NOT NULL,
	`paymentStatus` text DEFAULT 'pending' NOT NULL,
	`deliveryStatus` text DEFAULT 'placed' NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`deletedAt` integer,
	FOREIGN KEY (`patientId`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `patient_reports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`patientId` integer NOT NULL,
	`doctorId` integer NOT NULL,
	`uploadedById` integer NOT NULL,
	`reportType` text NOT NULL,
	`fileUrl` text NOT NULL,
	`fileName` text NOT NULL,
	`fileType` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`whatsappSentAt` integer,
	`sentAt` integer,
	`viewedAt` integer,
	`notes` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`deletedAt` integer,
	FOREIGN KEY (`patientId`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`doctorId`) REFERENCES `doctors`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`uploadedById`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `settings_key_unique` ON `settings` (`key`);--> statement-breakpoint
ALTER TABLE `bills` ADD `medicineOrderId` integer REFERENCES `medicine_orders`(`id`) ON UPDATE no action ON DELETE cascade;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_bills` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`appointmentId` integer,
	`medicineOrderId` integer,
	`amount` integer NOT NULL,
	`tax` integer DEFAULT 0 NOT NULL,
	`discount` integer DEFAULT 0 NOT NULL,
	`total` integer NOT NULL,
	`status` text DEFAULT 'unpaid' NOT NULL,
	`paymentMethod` text,
	`correctionNote` text,
	`lockedAt` integer,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`deletedAt` integer,
	FOREIGN KEY (`appointmentId`) REFERENCES `appointments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`medicineOrderId`) REFERENCES `medicine_orders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_bills`("id", "appointmentId", "medicineOrderId", "amount", "tax", "discount", "total", "status", "paymentMethod", "correctionNote", "lockedAt", "createdAt", "updatedAt", "deletedAt") SELECT "id", "appointmentId", "medicineOrderId", "amount", "tax", "discount", "total", "status", "paymentMethod", "correctionNote", "lockedAt", "createdAt", "updatedAt", "deletedAt" FROM `bills`;--> statement-breakpoint
DROP TABLE `bills`;--> statement-breakpoint
ALTER TABLE `__new_bills` RENAME TO `bills`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
ALTER TABLE `appointments` ADD `age` integer;--> statement-breakpoint
ALTER TABLE `appointments` ADD `appointmentNumber` integer;--> statement-breakpoint
ALTER TABLE `doctors` ADD `serviceName` text;--> statement-breakpoint
ALTER TABLE `doctors` ADD `branch` text;--> statement-breakpoint
ALTER TABLE `doctors` ADD `image` text;--> statement-breakpoint
ALTER TABLE `doctors` ADD `fees` integer DEFAULT 1200;--> statement-breakpoint
ALTER TABLE `doctors` ADD `availability` text;--> statement-breakpoint
ALTER TABLE `doctors` ADD `status` text DEFAULT 'Available' NOT NULL;--> statement-breakpoint
ALTER TABLE `doctors` ADD `availableDates` text;