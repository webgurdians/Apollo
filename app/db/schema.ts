import {
  sqliteTable,
  integer,
  text,
  index,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  passwordHash: text("passwordHash").notNull(),
  name: text("name"),
  email: text("email"),
  avatar: text("avatar"),
  role: text("role", { enum: ["user", "staff", "admin", "front_desk", "doctor", "pharmacy", "diagnostics", "founder"] }).default("user").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull()
    .$onUpdateFn(() => new Date()),
  lastSignInAt: integer("lastSignInAt", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  deletedAt: integer("deletedAt", { mode: "timestamp" }),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const appointments = sqliteTable("appointments", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  service: text("service").notNull(),
  preferredDate: integer("preferredDate", { mode: "timestamp" }).notNull(),
  startTime: integer("startTime", { mode: "timestamp" }),
  endTime: integer("endTime", { mode: "timestamp" }),
  doctorId: integer("doctorId").references(() => doctors.id, { onDelete: "set null" }),
  age: integer("age"),
  message: text("message"),
  status: text("status", { enum: ["pending", "confirmed", "completed", "cancelled"] })
    .default("pending")
    .notNull(),
  paymentStatus: text("paymentStatus", { enum: ["pending", "paid", "failed"] })
    .default("pending")
    .notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull()
    .$onUpdateFn(() => new Date()),
  deletedAt: integer("deletedAt", { mode: "timestamp" }),
  appointmentNumber: integer("appointmentNumber"),
});

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = typeof appointments.$inferInsert;

export const contacts = sqliteTable("contacts", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  message: text("message").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  deletedAt: integer("deletedAt", { mode: "timestamp" }),
});

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = typeof contacts.$inferInsert;

export const medicineOrders = sqliteTable("medicine_orders", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  patientId: integer("patientId").notNull().references(() => patients.id, { onDelete: "cascade" }),
  items: text("items").notNull(), // JSON string: { name: string, quantity: number, price: number }[]
  totalAmount: integer("totalAmount").notNull(),
  paymentStatus: text("paymentStatus", { enum: ["pending", "paid"] }).default("pending").notNull(),
  deliveryStatus: text("deliveryStatus", { enum: ["placed", "out_for_delivery", "delivered", "cancelled"] }).default("placed").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull()
    .$onUpdateFn(() => new Date()),
  deletedAt: integer("deletedAt", { mode: "timestamp" }),
});

export type MedicineOrder = typeof medicineOrders.$inferSelect;
export type InsertMedicineOrder = typeof medicineOrders.$inferInsert;

export const bills = sqliteTable("bills", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  appointmentId: integer("appointmentId").references(() => appointments.id, { onDelete: "cascade" }),
  medicineOrderId: integer("medicineOrderId").references(() => medicineOrders.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  tax: integer("tax").default(0).notNull(),
  discount: integer("discount").default(0).notNull(),
  total: integer("total").notNull(),
  status: text("status", { enum: ["unpaid", "paid", "refunded"] }).default("unpaid").notNull(),
  paymentMethod: text("paymentMethod", { enum: ["online", "cash", "upi"] }),
  correctionNote: text("correctionNote"),
  lockedAt: integer("lockedAt", { mode: "timestamp" }),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull()
    .$onUpdateFn(() => new Date()),
  deletedAt: integer("deletedAt", { mode: "timestamp" }),
});

export type Bill = typeof bills.$inferSelect;
export type InsertBill = typeof bills.$inferInsert;

export const doctors = sqliteTable("doctors", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  credentials: text("credentials").notNull(),
  specialty: text("specialty").notNull(),
  registrationNumber: text("registrationNumber").notNull(),
  signatureImageUrl: text("signatureImageUrl"),
  userId: integer("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  deletedAt: integer("deletedAt", { mode: "timestamp" }),
  
  // Custom profile fields for Homepage/Slideshow & Scheduling
  serviceName: text("serviceName"),
  branch: text("branch"),
  image: text("image"),
  fees: integer("fees").default(1200),
  availability: text("availability"),
  status: text("status", { enum: ["Available", "Limited", "Not Available"] }).default("Available").notNull(),
  availableDates: text("availableDates"),
});

export type Doctor = typeof doctors.$inferSelect;
export type InsertDoctor = typeof doctors.$inferInsert;

export const patients = sqliteTable("patients", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  age: integer("age").notNull(),
  gender: text("gender").notNull(),
  phone: text("phone").notNull(),
  concern: text("concern").notNull(),
  status: text("status", { enum: ["waiting", "with_doctor", "completed", "inactive"] })
    .default("waiting")
    .notNull(),
  assignedDoctorId: integer("assignedDoctorId").references(() => doctors.id, { onDelete: "set null" }),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull()
    .$onUpdateFn(() => new Date()),
  deletedAt: integer("deletedAt", { mode: "timestamp" }),
});

export type Patient = typeof patients.$inferSelect;
export type InsertPatient = typeof patients.$inferInsert;

export const prescriptions = sqliteTable("prescriptions", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  patientId: integer("patientId").notNull().references(() => patients.id, { onDelete: "cascade" }),
  doctorId: integer("doctorId").notNull().references(() => doctors.id, { onDelete: "cascade" }),
  diagnosisNotes: text("diagnosisNotes").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  status: text("status", { enum: ["draft", "sent", "dispensed"] }).default("draft").notNull(),
  pharmacyBillingAmount: integer("pharmacyBillingAmount").default(0).notNull(),
  deletedAt: integer("deletedAt", { mode: "timestamp" }),
}, (table) => ({
  patientIdIdx: index("prescriptions_patient_id_idx").on(table.patientId),
  patientIdCreatedAtIdx: index("prescriptions_patient_id_created_at_idx").on(table.patientId, table.createdAt),
}));

export type Prescription = typeof prescriptions.$inferSelect;
export type InsertPrescription = typeof prescriptions.$inferInsert;

export const prescriptionMedicines = sqliteTable("prescription_medicines", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  prescriptionId: integer("prescriptionId").notNull().references(() => prescriptions.id, { onDelete: "cascade" }),
  medicineName: text("medicineName").notNull(),
  dosage: text("dosage").notNull(),
  frequency: text("frequency").notNull(),
  duration: text("duration").notNull(),
  instructions: text("instructions"),
  status: text("status", { enum: ["pending", "purchased"] }).default("pending").notNull(),
  deletedAt: integer("deletedAt", { mode: "timestamp" }),
}, (table) => ({
  prescriptionIdIdx: index("prescription_medicines_prescription_id_idx").on(table.prescriptionId),
}));

export type PrescriptionMedicine = typeof prescriptionMedicines.$inferSelect;
export type InsertPrescriptionMedicine = typeof prescriptionMedicines.$inferInsert;

export const prescriptionTests = sqliteTable("prescription_tests", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  prescriptionId: integer("prescriptionId").notNull().references(() => prescriptions.id, { onDelete: "cascade" }),
  testName: text("testName").notNull(),
  notes: text("notes"),
  status: text("status", { enum: ["pending", "completed"] }).default("pending").notNull(),
  deletedAt: integer("deletedAt", { mode: "timestamp" }),
}, (table) => ({
  prescriptionIdIdx: index("prescription_tests_prescription_id_idx").on(table.prescriptionId),
}));

export type PrescriptionTest = typeof prescriptionTests.$inferSelect;
export type InsertPrescriptionTest = typeof prescriptionTests.$inferInsert;

export const activityLogs = sqliteTable("activity_logs", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  userName: text("userName").notNull(),
  userRole: text("userRole").notNull(),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: integer("entityId"),
  details: text("details"),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
});

export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = typeof activityLogs.$inferInsert;

export const settings = sqliteTable("settings", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull()
    .$onUpdateFn(() => new Date()),
});

export const patientReports = sqliteTable("patient_reports", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  patientId: integer("patientId").notNull().references(() => patients.id, { onDelete: "cascade" }),
  doctorId: integer("doctorId").notNull().references(() => doctors.id, { onDelete: "cascade" }),
  uploadedById: integer("uploadedById").notNull().references(() => users.id),
  reportType: text("reportType").notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileName: text("fileName").notNull(),
  fileType: text("fileType").notNull(),
  status: text("status", { enum: ["pending", "to_be_sent", "sent", "viewed"] }).default("pending").notNull(),
  whatsappSentAt: integer("whatsappSentAt", { mode: "timestamp" }),
  sentAt: integer("sentAt", { mode: "timestamp" }),
  viewedAt: integer("viewedAt", { mode: "timestamp" }),
  notes: text("notes"),
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull().$onUpdateFn(() => new Date()),
  deletedAt: integer("deletedAt", { mode: "timestamp" }),
});

export type PatientReport = typeof patientReports.$inferSelect;
export type InsertPatientReport = typeof patientReports.$inferInsert;

export type Setting = typeof settings.$inferSelect;
export type InsertSetting = typeof settings.$inferInsert;
