import {
  sqliteTable,
  integer,
  text,
  index,
  uniqueIndex,
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
  address: text("address"),
  prescriptionFile: text("prescription_file"),
  prescriptionFileName: text("prescription_file_name"),
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
  amountPaid: integer("amountPaid"),
  amountDue: integer("amountDue"),
}, (table) => [
  index("appointments_deleted_at_created_at_idx").on(table.deletedAt, table.createdAt),
  index("appointments_doctor_id_idx").on(table.doctorId),
]);

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
}, (table) => [
  index("contacts_deleted_at_created_at_idx").on(table.deletedAt, table.createdAt),
]);

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
  prescriptionUrl: text("prescriptionUrl"),
  awbNo: text("awbNo"),
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
}, (table) => [
  index("patients_deleted_at_idx").on(table.deletedAt),
  index("patients_phone_idx").on(table.phone),
  index("patients_name_idx").on(table.name),
]);

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

// --- OCC Tables ---

export const tenants = sqliteTable("tenants", {
  id: text("id").primaryKey(), // e.g. "apollo-aranghata"
  name: text("name").notNull(),
  subdomain: text("subdomain").unique(),
  status: text("status", { enum: ["active", "suspended", "maintenance"] }).default("active").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull().$onUpdateFn(() => new Date()),
});

export const tenantSettings = sqliteTable("tenant_settings", {
  id: text("id").primaryKey(),
  tenantId: text("tenantId").references(() => tenants.id, { onDelete: "cascade" }),
  key: text("key").notNull(),
  value: text("value"),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull().$onUpdateFn(() => new Date()),
});

export const featureFlags = sqliteTable("feature_flags", {
  id: text("id").primaryKey(),
  tenantId: text("tenantId").references(() => tenants.id, { onDelete: "cascade" }),
  key: text("key").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  description: text("description"),
  enabled: integer("enabled", { mode: "boolean" }).default(false).notNull(),
  rolloutPercentage: integer("rolloutPercentage").default(100).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull().$onUpdateFn(() => new Date()),
});

export const opsSecrets = sqliteTable("ops_secrets", {
  id: text("id").primaryKey(),
  tenantId: text("tenantId").references(() => tenants.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  referenceKey: text("referenceKey").notNull(),
  status: text("status").default("active").notNull(),
  lastUpdated: integer("lastUpdated", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});

export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey(),
  channel: text("channel").notNull(),
  status: text("status").notNull(),
  recipient: text("recipient"),
  payload: text("payload"),
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});

export const founderSessions = sqliteTable("founder_sessions", {
  id: text("id").primaryKey(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  startedAt: integer("startedAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  endedAt: integer("endedAt", { mode: "timestamp" }),
});

export const webhookLogs = sqliteTable("webhook_logs", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull(),
  status: text("status").notNull(),
  requestId: text("requestId").notNull(),
  response: text("response"),
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});

export const backgroundJobs = sqliteTable("background_jobs", {
  id: text("id").primaryKey(),
  jobType: text("jobType").notNull(),
  status: text("status").notNull(),
  attempts: integer("attempts").default(0).notNull(),
  lastRun: integer("lastRun", { mode: "timestamp" }),
});

export const entityActivity = sqliteTable("entity_activity", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  entityType: text("entityType").notNull(),
  entityId: text("entityId").notNull(),
  action: text("action").notNull(),
  metadata: text("metadata"),
  timestamp: integer("timestamp", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});

export const systemAlerts = sqliteTable("system_alerts", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  type: text("type").notNull(),
  severity: text("severity", { enum: ["info", "warning", "critical"] }).notNull(),
  message: text("message").notNull(),
  timestamp: integer("timestamp", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});

export const releases = sqliteTable("releases", {
  id: text("id").primaryKey(),
  version: text("version").notNull(),
  gitCommit: text("gitCommit"),
  notes: text("notes"),
  deployedAt: integer("deployedAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  deployedBy: text("deployedBy"),
});

export const emergencyKillswitches = sqliteTable("emergency_killswitches", {
  key: text("key").primaryKey(),
  name: text("name").notNull(),
  active: integer("active", { mode: "boolean" }).default(false).notNull(),
  triggeredBy: text("triggeredBy").notNull(),
  triggeredAt: integer("triggeredAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});

export const integrationRegistry = sqliteTable("integration_registry", {
  id: text("id").primaryKey(),
  tenantId: text("tenantId").references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).default(false).notNull(),
  healthStatus: text("healthStatus").default("unknown").notNull(),
  lastSyncAt: integer("lastSyncAt", { mode: "timestamp" }),
});

export const backups = sqliteTable("backups", {
  id: text("id").primaryKey(),
  filename: text("filename").notNull(),
  sizeBytes: integer("sizeBytes").notNull(),
  status: text("status").notNull(),
  storageProvider: text("storageProvider").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  verifiedAt: integer("verifiedAt", { mode: "timestamp" }),
});

export const errorLogs = sqliteTable("error_logs", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  severity: text("severity", { enum: ["low", "medium", "high", "critical"] }).notNull(),
  message: text("message").notNull(),
  stackTrace: text("stackTrace"),
  module: text("module").notNull(),
  status: text("status", { enum: ["unresolved", "resolved", "ignored"] }).default("unresolved").notNull(),
  timestamp: integer("timestamp", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});

export const auditLogs = sqliteTable("audit_logs", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  tenantId: text("tenantId").references(() => tenants.id, { onDelete: "cascade" }),
  username: text("username").notNull(),
  action: text("action").notNull(),
  module: text("module").notNull(),
  metadata: text("metadata"),
  timestamp: integer("timestamp", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});

// Phase 2 Tables
export const patientPreferences = sqliteTable("patient_preferences", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: text("tenant_id").default("default").notNull(),
  patientId: integer("patient_id")
    .references(() => patients.id, { onDelete: "cascade" })
    .notNull(),
  whatsappOptIn: integer("whatsapp_opt_in").default(1).notNull(),
  marketingOptIn: integer("marketing_opt_in").default(1).notNull(),
  communicationPreference: text("communication_preference").default("whatsapp").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
}, (table) => ({
  patientPrefUnique: uniqueIndex("patient_preferences_patient_unique").on(table.patientId),
}));

export const whatsappSettings = sqliteTable("whatsapp_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: text("tenant_id").default("default").notNull(),
  metaAccessTokenEncrypted: text("meta_access_token_encrypted"),
  phoneNumberId: text("phone_number_id"),
  businessAccountId: text("business_account_id"),
  webhookStatus: text("webhook_status").default("inactive").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
}, (table) => ({
  tenantSettingsUnique: uniqueIndex("whatsapp_settings_tenant_unique").on(table.tenantId),
}));

export const whatsappTemplates = sqliteTable("whatsapp_templates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: text("tenant_id").default("default").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull(), // utility, marketing, authentication
  language: text("language").default("en").notNull(),
  templateKey: text("template_key").notNull(),
  status: text("status").default("pending").notNull(), // pending, approved, rejected, disabled
  version: integer("version").default(1).notNull(),
  isActive: integer("is_active").default(1).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
}, (table) => ({
  templateVersionUnique: uniqueIndex("template_version_unique").on(table.tenantId, table.templateKey, table.version),
}));

export const whatsappMessages = sqliteTable("whatsapp_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: text("tenant_id").default("default").notNull(),
  patientId: integer("patient_id")
    .references(() => patients.id, { onDelete: "cascade" })
    .notNull(),
  templateId: integer("template_id").references(() => whatsappTemplates.id),
  messageType: text("message_type").notNull(), // transactional, marketing
  status: text("status").default("queued").notNull(), // queued, sent, delivered, read, failed
  conversationCategory: text("conversation_category"), // utility, marketing, authentication, service
  providerMessageId: text("provider_message_id"),
  errorMessage: text("error_message"),
  rawWebhookPayload: text("raw_webhook_payload"),
  sentAt: integer("sent_at", { mode: "timestamp" }),
  deliveredAt: integer("delivered_at", { mode: "timestamp" }),
  readAt: integer("read_at", { mode: "timestamp" }),
}, (table) => ({
  wmPatientIdx: index("wm_patient_idx").on(table.patientId),
  wmStatusIdx: index("wm_status_idx").on(table.status),
  wmProviderIdx: index("wm_provider_idx").on(table.providerMessageId),
  wmTenantIdx: index("wm_tenant_idx").on(table.tenantId),
}));

export const whatsappCampaigns = sqliteTable("whatsapp_campaigns", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: text("tenant_id").default("default").notNull(),
  name: text("name").notNull(),
  templateId: integer("template_id").notNull(),
  segmentType: text("segment_type").notNull(),
  status: text("status").default("draft").notNull(), // draft, scheduled, active, paused, completed, cancelled
  scheduledAt: integer("scheduled_at", { mode: "timestamp" }),
  startedAt: integer("started_at", { mode: "timestamp" }),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  totalRecipients: integer("total_recipients").default(0).notNull(),
  deliveredCount: integer("delivered_count").default(0).notNull(),
  readCount: integer("read_count").default(0).notNull(),
  failedCount: integer("failed_count").default(0).notNull(),
  estimatedCost: integer("estimated_cost").default(0).notNull(),
  actualCost: integer("actual_cost").default(0).notNull(),
  createdBy: integer("created_by").references(() => users.id),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
}, (table) => ({
  campaignStatusIdx: index("campaign_status_idx").on(table.status),
  campaignScheduleIdx: index("campaign_schedule_idx").on(table.scheduledAt),
  campaignTenantIdx: index("campaign_tenant_idx").on(table.tenantId),
}));

export const whatsappCampaignRecipients = sqliteTable("whatsapp_campaign_recipients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: text("tenant_id").default("default").notNull(),
  campaignId: integer("campaign_id").references(() => whatsappCampaigns.id, { onDelete: "cascade" }),
  patientId: integer("patient_id")
    .references(() => patients.id, { onDelete: "cascade" })
    .notNull(),
  status: text("status").default("queued").notNull(), // queued, sent, failed
  sentAt: integer("sent_at", { mode: "timestamp" }),
}, (table) => ({
  campaignRecipientUnique: uniqueIndex("campaign_recipient_unique").on(table.campaignId, table.patientId),
}));

export const notificationJobs = sqliteTable("notification_jobs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: text("tenant_id").default("default").notNull(),
  jobType: text("job_type").notNull(), // whatsapp_send
  payload: text("payload").notNull(), // JSON string
  idempotencyKey: text("idempotency_key"),
  status: text("status").default("pending").notNull(), // pending, processing, completed, failed
  attempts: integer("attempts").default(0).notNull(),
  nextRetryAt: integer("next_retry_at", { mode: "timestamp" }),
  lockedAt: integer("locked_at", { mode: "timestamp" }),
  lockedBy: text("locked_by"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  processedAt: integer("processed_at", { mode: "timestamp" }),
}, (table) => ({
  njStatusIdx: index("nj_status_idx").on(table.status),
  njRetryIdx: index("nj_retry_idx").on(table.nextRetryAt),
  njTenantIdx: index("nj_tenant_idx").on(table.tenantId),
  njIdempotencyUnique: uniqueIndex("nj_idempotency_unique").on(table.idempotencyKey),
}));

export const deadNotificationJobs = sqliteTable("dead_notification_jobs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: text("tenant_id").default("default").notNull(),
  jobType: text("job_type").notNull(),
  payload: text("payload").notNull(),
  errorMessage: text("error_message"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const billingTransactions = sqliteTable("billing_transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: text("tenant_id").default("default").notNull(),
  patientId: integer("patient_id")
    .references(() => patients.id)
    .notNull(),
  appointmentId: integer("appointment_id"),
  medicineOrderId: integer("medicine_order_id"),
  transactionType: text("transaction_type").notNull(), // consultation, medicine, additional_services
  amount: integer("amount").notNull(),
  paymentMethod: text("payment_method").notNull(), // cash, upi, card, bank_transfer
  status: text("status").notNull(), // paid, pending, refunded, cancelled
  invoiceNumber: text("invoice_number").notNull(),
  paymentGateway: text("payment_gateway"), // razorpay
  externalPaymentId: text("external_payment_id"),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
}, (table) => ({
  billingPatientIdx: index("billing_patient_idx").on(table.patientId),
  billingCreatedIdx: index("billing_created_idx").on(table.createdAt),
  billingTenantIdx: index("billing_tenant_idx").on(table.tenantId),
  billingInvoiceUnique: uniqueIndex("billing_invoice_unique").on(table.invoiceNumber),
}));

export const whatsappAuditLogs = sqliteTable("whatsapp_audit_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: text("tenant_id").default("default").notNull(),
  userId: integer("user_id").notNull(),
  action: text("action").notNull(), // campaign_created, campaign_edited, campaign_deleted, campaign_sent, template_modified
  targetId: integer("target_id").notNull(),
  details: text("details"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});
