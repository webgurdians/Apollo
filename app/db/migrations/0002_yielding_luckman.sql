ALTER TABLE `prescription_medicines` ADD `status` text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `prescriptions` ADD `pharmacyBillingAmount` integer DEFAULT 0 NOT NULL;