CREATE INDEX `prescription_medicines_prescription_id_idx` ON `prescription_medicines` (`prescriptionId`);--> statement-breakpoint
CREATE INDEX `prescription_tests_prescription_id_idx` ON `prescription_tests` (`prescriptionId`);--> statement-breakpoint
CREATE INDEX `prescriptions_patient_id_idx` ON `prescriptions` (`patientId`);--> statement-breakpoint
CREATE INDEX `prescriptions_patient_id_created_at_idx` ON `prescriptions` (`patientId`,`createdAt`);