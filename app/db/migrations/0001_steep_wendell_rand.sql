CREATE TABLE `doctors` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`credentials` text NOT NULL,
	`specialty` text NOT NULL,
	`registrationNumber` text NOT NULL,
	`signatureImageUrl` text,
	`userId` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `patients` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`age` integer NOT NULL,
	`gender` text NOT NULL,
	`phone` text NOT NULL,
	`concern` text NOT NULL,
	`status` text DEFAULT 'waiting' NOT NULL,
	`assignedDoctorId` integer,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`assignedDoctorId`) REFERENCES `doctors`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `prescription_medicines` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`prescriptionId` integer NOT NULL,
	`medicineName` text NOT NULL,
	`dosage` text NOT NULL,
	`frequency` text NOT NULL,
	`duration` text NOT NULL,
	`instructions` text,
	FOREIGN KEY (`prescriptionId`) REFERENCES `prescriptions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `prescription_tests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`prescriptionId` integer NOT NULL,
	`testName` text NOT NULL,
	`notes` text,
	`status` text DEFAULT 'pending' NOT NULL,
	FOREIGN KEY (`prescriptionId`) REFERENCES `prescriptions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `prescriptions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`patientId` integer NOT NULL,
	`doctorId` integer NOT NULL,
	`diagnosisNotes` text NOT NULL,
	`createdAt` integer NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	FOREIGN KEY (`patientId`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`doctorId`) REFERENCES `doctors`(`id`) ON UPDATE no action ON DELETE cascade
);
