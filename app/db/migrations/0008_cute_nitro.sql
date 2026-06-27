ALTER TABLE `medicine_orders` ADD `prescriptionUrl` text;--> statement-breakpoint
ALTER TABLE `medicine_orders` ADD `awbNo` text;--> statement-breakpoint
CREATE INDEX `appointments_deleted_at_created_at_idx` ON `appointments` (`deletedAt`,`createdAt`);--> statement-breakpoint
CREATE INDEX `appointments_doctor_id_idx` ON `appointments` (`doctorId`);--> statement-breakpoint
CREATE INDEX `contacts_deleted_at_created_at_idx` ON `contacts` (`deletedAt`,`createdAt`);--> statement-breakpoint
CREATE INDEX `patients_deleted_at_idx` ON `patients` (`deletedAt`);--> statement-breakpoint
CREATE INDEX `patients_phone_idx` ON `patients` (`phone`);--> statement-breakpoint
CREATE INDEX `patients_name_idx` ON `patients` (`name`);