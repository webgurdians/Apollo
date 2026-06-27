import { relations } from "drizzle-orm";
import {
  users, appointments, bills, doctors, patients,
  prescriptions, prescriptionMedicines, prescriptionTests, activityLogs,
  patientReports,
} from "./schema";

export const usersRelations = relations(users, ({ many }) => ({
  doctors: many(doctors),
  activityLogs: many(activityLogs),
}));

export const doctorsRelations = relations(doctors, ({ one, many }) => ({
  user: one(users, { fields: [doctors.userId], references: [users.id] }),
  patients: many(patients),
  prescriptions: many(prescriptions),
}));

export const patientsRelations = relations(patients, ({ one, many }) => ({
  assignedDoctor: one(doctors, { fields: [patients.assignedDoctorId], references: [doctors.id] }),
  prescriptions: many(prescriptions),
}));

export const prescriptionsRelations = relations(prescriptions, ({ one, many }) => ({
  patient: one(patients, { fields: [prescriptions.patientId], references: [patients.id] }),
  doctor: one(doctors, { fields: [prescriptions.doctorId], references: [doctors.id] }),
  medicines: many(prescriptionMedicines),
  tests: many(prescriptionTests),
}));

export const prescriptionMedicinesRelations = relations(prescriptionMedicines, ({ one }) => ({
  prescription: one(prescriptions, { fields: [prescriptionMedicines.prescriptionId], references: [prescriptions.id] }),
}));

export const prescriptionTestsRelations = relations(prescriptionTests, ({ one }) => ({
  prescription: one(prescriptions, { fields: [prescriptionTests.prescriptionId], references: [prescriptions.id] }),
}));

export const appointmentsRelations = relations(appointments, ({ many }) => ({
  bills: many(bills),
}));

export const billsRelations = relations(bills, ({ one }) => ({
  appointment: one(appointments, { fields: [bills.appointmentId], references: [appointments.id] }),
}));

export const patientReportsRelations = relations(patientReports, ({ one }) => ({
  patient: one(patients, { fields: [patientReports.patientId], references: [patients.id] }),
  doctor: one(doctors, { fields: [patientReports.doctorId], references: [doctors.id] }),
  uploadedBy: one(users, { fields: [patientReports.uploadedById], references: [users.id] }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, { fields: [activityLogs.userId], references: [users.id] }),
}));
