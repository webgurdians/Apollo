import crypto from "crypto";
import { z } from "zod";
import { createRouter, publicQuery, authedQuery, frontDeskQuery, staffQuery, adminQuery, clinicStaffQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { patients, doctors, users, prescriptions, prescriptionMedicines, prescriptionTests, settings, appointments, bills } from "@db/schema";
import { eq, and, desc, isNull, inArray, type SQL } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { logActivity } from "./lib/activity";

export const patientsRouter = createRouter({
  create: frontDeskQuery
    .input(
      z.object({
        name: z.string().min(1, "Name is required"),
        age: z.number().int().min(0, "Age must be positive"),
        gender: z.string().min(1, "Gender is required"),
        phone: z.string().min(10, "Valid phone number is required"),
        concern: z.string().min(1, "Concern is required"),
        assignedDoctorId: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      // Duplicate check: if phone already exists, warn but don't block
      const existing = await db
        .select()
        .from(patients)
        .where(and(eq(patients.phone, input.phone), isNull(patients.deletedAt)))
        .limit(1);

      if (existing.length > 0) {
        const existingPatient = existing[0];
        throw new TRPCError({
          code: "CONFLICT",
          message: JSON.stringify({
            type: "DUPLICATE_PATIENT",
            existingPatient: {
              id: existingPatient.id,
              name: existingPatient.name,
              age: existingPatient.age,
              gender: existingPatient.gender,
              phone: existingPatient.phone,
              concern: existingPatient.concern,
              createdAt: existingPatient.createdAt,
            },
          }),
        });
      }

      const [newPatient] = await db.insert(patients).values({
        name: input.name,
        age: input.age,
        gender: input.gender,
        phone: input.phone,
        concern: input.concern,
        status: "waiting",
        assignedDoctorId: input.assignedDoctorId || null,
      }).returning();

      await logActivity(ctx.user, "create", "patient", newPatient.id,
        `Created patient ${input.name}, phone: ${input.phone}`);

      return { success: true, patient: newPatient };
    }),

  list: clinicStaffQuery
    .input(
      z.object({
        status: z.enum(["waiting", "with_doctor", "completed", "inactive"]).optional(),
        assignedDoctorId: z.number().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = getDb();
      const conditions: SQL[] = [isNull(patients.deletedAt)];
      if (input?.status) {
        conditions.push(eq(patients.status, input.status));
      }
      if (input?.assignedDoctorId) {
        conditions.push(eq(patients.assignedDoctorId, input.assignedDoctorId));
      }

      const list = await db
        .select({
          id: patients.id,
          name: patients.name,
          age: patients.age,
          gender: patients.gender,
          phone: patients.phone,
          concern: patients.concern,
          status: patients.status,
          assignedDoctorId: patients.assignedDoctorId,
          createdAt: patients.createdAt,
          doctorName: doctors.name,
          doctorSpecialty: doctors.specialty,
        })
        .from(patients)
        .leftJoin(doctors, eq(patients.assignedDoctorId, doctors.id))
        .where(and(...conditions))
        .orderBy(desc(patients.createdAt));

      const enriched = await Promise.all(
        list.map(async (p) => {
          const [prescription] = await db
            .select()
            .from(prescriptions)
            .where(and(eq(prescriptions.patientId, p.id), isNull(prescriptions.deletedAt)))
            .orderBy(desc(prescriptions.createdAt))
            .limit(1);

          if (!prescription) {
            return { ...p, prescription: null };
          }

          const medicines = await db
            .select()
            .from(prescriptionMedicines)
            .where(eq(prescriptionMedicines.prescriptionId, prescription.id));

          return {
            ...p,
            prescription: { ...prescription, medicines },
          };
        })
      );

      return enriched;
    }),

  assignDoctor: frontDeskQuery
    .input(
      z.object({
        patientId: z.number(),
        assignedDoctorId: z.number(),
        force: z.boolean().default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      const [patient] = await db
        .select()
        .from(patients)
        .where(eq(patients.id, input.patientId))
        .limit(1);

      if (!patient) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Patient not found" });
      }

      if ((patient.status === "with_doctor" || patient.status === "completed") && !input.force) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Patient is currently in status "${patient.status}". Reassigning might interrupt their consultation.`,
        });
      }

      await db
        .update(patients)
        .set({
          assignedDoctorId: input.assignedDoctorId,
          status: "waiting",
        })
        .where(eq(patients.id, input.patientId));

      await logActivity(ctx.user, "update", "patient", input.patientId,
        `Assigned to doctor #${input.assignedDoctorId}`);

      return { success: true };
    }),

  updateStatus: clinicStaffQuery
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["waiting", "with_doctor", "completed", "inactive"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await db
        .update(patients)
        .set({ status: input.status })
        .where(eq(patients.id, input.id));
      await logActivity(ctx.user, "update", "patient", input.id,
        `Updated status to ${input.status}`);
      return { success: true };
    }),

  listDoctors: publicQuery.query(async () => {
    const db = getDb();
    let results = await db
      .select()
      .from(doctors)
      .where(isNull(doctors.deletedAt));

    if (results.length === 0) {
      const defaultDoctorsData = [
        {
          name: "Dr. Vignesh Thanikgaivasan",
          specialty: "Cardiology",
          serviceName: "Dr. Vignesh Thanikgaivasan - Cardiology",
          credentials: "MBBS, MD (Gen Med), DM (Cardiology) AFAPSIC, FIMSA",
          branch: "Apollo Hospitals Greams Road, Chennai",
          image: "/images/vignesh.jpg",
          fees: 1200,
          availability: "Monday & Saturday (11:00 AM – 3:00 PM)",
          registrationNumber: "REG-001",
          status: "Available" as const,
        },
        {
          name: "Dr. Nithya Narayanan",
          specialty: "ENT / Covid Consult",
          serviceName: "Dr. Nithya Narayanan - ENT / Covid Consult",
          credentials: "MBBS, DLO, DNB (ENT), MNAMS",
          branch: "Apollo Hospitals Greams Road, Chennai",
          image: "/images/nithya.jpg",
          fees: 1200,
          availability: "Tuesday (10:00 AM – 2:00 PM)",
          registrationNumber: "REG-002",
          status: "Available" as const,
        },
        {
          name: "Dr. Anusha D",
          specialty: "Consultant Neurologist",
          serviceName: "Dr. Anusha D - Consultant Neurologist",
          credentials: "MBBS, MD, DM",
          branch: "Apollo Hospitals OMR, Chennai",
          image: "/images/anusha.jpg",
          fees: 1200,
          availability: "Wednesday (9:00 AM – 1:00 PM)",
          registrationNumber: "REG-003",
          status: "Available" as const,
        },
        {
          name: "Dr. Jothi Parthasarathy S",
          specialty: "Neonatology / Pediatrics",
          serviceName: "Dr. Jothi Parthasarathy S - Neonatology",
          credentials: "MBBS, MD (Paediatrics)",
          branch: "Apollo Children Hospitals Greams Road, Chennai",
          image: "/images/jothi.jpg",
          fees: 1200,
          availability: "Thursday (10:00 AM – 2:00 PM)",
          registrationNumber: "REG-004",
          status: "Available" as const,
        },
        {
          name: "Dr. Gautham Krishnamurthy",
          specialty: "Surgical Gastroenterology & GI Oncology",
          serviceName: "Dr. Gautham Krishnamurthy - Surgical Gastroenterology & GI Oncology",
          credentials: "MBBS, MS (Gen Surg), MCh (Surgical Gastroenterology)",
          branch: "Apollo Hospitals Greams Road, Chennai",
          image: "/images/gautham.jpg",
          fees: 1200,
          availability: "Friday (11:00 AM – 3:00 PM)",
          registrationNumber: "REG-005",
          status: "Available" as const,
        },
        {
          name: "Dr. Vishnu Abishek Raju",
          specialty: "Gastroenterology / GI Medicine",
          serviceName: "Dr. Vishnu Abishek Raju - Gastroenterology",
          credentials: "MBBS, MD (Internal Medicine), DM (Gastroenterology)",
          branch: "Apollo Hospitals Greams Road, Chennai",
          image: "/images/vishnu.jpg",
          fees: 1200,
          availability: "Friday (11:00 AM – 3:00 PM)",
          registrationNumber: "REG-007", // Assign a unique registration number
          status: "Available" as const,
        },
        {
          name: "Dr. Jatin Soni",
          specialty: "Urology",
          serviceName: "Dr. Jatin Soni - Urology",
          credentials: "MBBS, MS (General Surgery), MCh (Urology)",
          branch: "Apollo Hospitals Chennai",
          image: "/images/jatin.jpg",
          fees: 1200,
          availability: "Saturday (9:30 AM – 2:30 PM)",
          registrationNumber: "REG-006",
          status: "Available" as const,
        },
        {
          name: "Dr. Rakesh Shetty",
          specialty: "Orthopedics-Sports Medicine",
          serviceName: "Dr. Rakesh Shetty - Orthopedics-Sports Medicine",
          credentials: "MBBS, DNB (Orthopaedic) Certified in spine and joint Replacement Surgeon (Languages: English, Telugu, Tamil, Kannada, Bengali, Tulu, Marathi, Hindi)",
          branch: "Apollo Hospitals Chennai",
          image: "/images/rakesh.jpg",
          fees: 1200,
          availability: "Monday & Wednesday (2:00 PM – 5:00 PM)",
          registrationNumber: "REG-008", // Unique registration number
          status: "Available" as const,
        }
      ];

      for (const doc of defaultDoctorsData) {
        const username = doc.name.toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 15);
        const salt = crypto.randomBytes(16).toString("hex");
        const hash = crypto.scryptSync("apollo123", salt, 64).toString("hex");
        const passwordHash = `${salt}:${hash}`;

        const [userRecord] = await db.insert(users).values({
          username,
          passwordHash,
          name: doc.name,
          role: "doctor",
        }).returning();

        await db.insert(doctors).values({
          name: doc.name,
          specialty: doc.specialty,
          serviceName: doc.serviceName,
          credentials: doc.credentials,
          branch: doc.branch,
          image: doc.image,
          fees: doc.fees,
          availability: doc.availability,
          registrationNumber: doc.registrationNumber,
          status: doc.status,
          userId: userRecord.id,
        });
      }

      results = await db
        .select()
        .from(doctors)
        .where(isNull(doctors.deletedAt));
    }
    return results;
  }),

  getById: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const [result] = await db
        .select({
          id: patients.id,
          name: patients.name,
          age: patients.age,
          gender: patients.gender,
          phone: patients.phone,
          concern: patients.concern,
          status: patients.status,
          assignedDoctorId: patients.assignedDoctorId,
          createdAt: patients.createdAt,
          doctorName: doctors.name,
          doctorCredentials: doctors.credentials,
          doctorSpecialty: doctors.specialty,
          doctorRegNumber: doctors.registrationNumber,
        })
        .from(patients)
        .leftJoin(doctors, eq(patients.assignedDoctorId, doctors.id))
        .where(and(eq(patients.id, input.id), isNull(patients.deletedAt)))
        .limit(1);

      if (!result) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Patient not found" });
      }

      return result;
    }),

  findByPhone: staffQuery
    .input(z.object({ phone: z.string().min(10) }))
    .query(async ({ input }) => {
      const db = getDb();
      const rows = await db
        .select()
        .from(patients)
        .where(and(eq(patients.phone, input.phone), isNull(patients.deletedAt)))
        .orderBy(desc(patients.createdAt));
      return rows;
    }),

  getHistory: clinicStaffQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();

      const [patient] = await db
        .select({
          id: patients.id,
          name: patients.name,
          age: patients.age,
          gender: patients.gender,
          phone: patients.phone,
          concern: patients.concern,
          status: patients.status,
          assignedDoctorId: patients.assignedDoctorId,
          createdAt: patients.createdAt,
          updatedAt: patients.updatedAt,
          doctorName: doctors.name,
          doctorSpecialty: doctors.specialty,
        })
        .from(patients)
        .leftJoin(doctors, eq(patients.assignedDoctorId, doctors.id))
        .where(and(eq(patients.id, input.id), isNull(patients.deletedAt)))
        .limit(1);

      if (!patient) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Patient not found" });
      }

      const allPrescriptions = await db
        .select()
        .from(prescriptions)
        .where(and(eq(prescriptions.patientId, input.id), isNull(prescriptions.deletedAt)))
        .orderBy(desc(prescriptions.createdAt));

      const enriched = await Promise.all(
        allPrescriptions.map(async (rx) => {
          const [rxDoctor] = await db
            .select()
            .from(doctors)
            .where(eq(doctors.id, rx.doctorId))
            .limit(1);

          const medicines = await db
            .select()
            .from(prescriptionMedicines)
            .where(eq(prescriptionMedicines.prescriptionId, rx.id));

          const tests = await db
            .select()
            .from(prescriptionTests)
            .where(eq(prescriptionTests.prescriptionId, rx.id));

          return { ...rx, doctor: rxDoctor || null, medicines, tests };
        })
      );

      const patientAppointments = await db
        .select({
          id: appointments.id,
          service: appointments.service,
          preferredDate: appointments.preferredDate,
          startTime: appointments.startTime,
          endTime: appointments.endTime,
          doctorId: appointments.doctorId,
          status: appointments.status,
          paymentStatus: appointments.paymentStatus,
          message: appointments.message,
          createdAt: appointments.createdAt,
          doctorName: doctors.name,
        })
        .from(appointments)
        .leftJoin(doctors, eq(appointments.doctorId, doctors.id))
        .where(and(eq(appointments.phone, patient.phone), isNull(appointments.deletedAt)))
        .orderBy(desc(appointments.createdAt));

      const appointmentIds = patientAppointments.map((a) => a.id);
      let patientBills: any[] = [];
      if (appointmentIds.length > 0) {
        patientBills = await db
          .select()
          .from(bills)
          .where(and(inArray(bills.appointmentId, appointmentIds), isNull(bills.deletedAt)))
          .orderBy(desc(bills.createdAt));
      }

      return {
        ...patient,
        prescriptions: enriched,
        appointments: patientAppointments,
        bills: patientBills,
      };
    }),

  createDoctor: adminQuery
    .input(
      z.object({
        username: z.string().min(3),
        password: z.string().min(6),
        name: z.string().min(1),
        credentials: z.string().min(1),
        specialty: z.string().min(1),
        registrationNumber: z.string().min(1),
        serviceName: z.string().optional(),
        branch: z.string().optional(),
        image: z.string().optional(),
        fees: z.number().optional(),
        availability: z.string().optional(),
        status: z.enum(["Available", "Limited", "Not Available"]).optional(),
        availableDates: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.username, input.username))
        .limit(1);

      if (existingUser.length > 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Username already exists" });
      }

      const salt = crypto.randomBytes(16).toString("hex");
      const hash = crypto.scryptSync(input.password, salt, 64).toString("hex");
      const passwordHash = `${salt}:${hash}`;

      const [newUser] = await db
        .insert(users)
        .values({
          username: input.username,
          passwordHash,
          name: input.name,
          role: "doctor",
        })
        .returning();

      await db.insert(doctors).values({
        name: input.name,
        credentials: input.credentials,
        specialty: input.specialty,
        registrationNumber: input.registrationNumber,
        serviceName: input.serviceName || `${input.name} - ${input.specialty}`,
        branch: input.branch || "Apollo Hospitals Chennai",
        image: input.image || "/images/jatin.jpg",
        fees: input.fees ?? 1200,
        availability: input.availability || "Monday to Saturday (10:00 AM - 2:00 PM)",
        status: input.status || "Available",
        availableDates: input.availableDates || null,
        userId: newUser.id,
      });

      await logActivity(ctx.user, "create", "doctor", newUser.id,
        `Created doctor ${input.name}`);

      return { success: true };
    }),

  updateDoctor: staffQuery
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1),
        credentials: z.string().min(1),
        specialty: z.string().min(1),
        registrationNumber: z.string().min(1),
        serviceName: z.string().optional(),
        branch: z.string().optional(),
        image: z.string().optional(),
        fees: z.number().optional(),
        availability: z.string().optional(),
        status: z.enum(["Available", "Limited", "Not Available"]).optional(),
        availableDates: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await db
        .update(doctors)
        .set({
          name: input.name,
          credentials: input.credentials,
          specialty: input.specialty,
          registrationNumber: input.registrationNumber,
          serviceName: input.serviceName || `${input.name} - ${input.specialty}`,
          branch: input.branch || null,
          image: input.image || null,
          fees: input.fees ?? 1200,
          availability: input.availability || null,
          status: input.status || "Available",
          availableDates: input.availableDates || null,
        })
        .where(eq(doctors.id, input.id));

      await logActivity(ctx.user, "update", "doctor", input.id,
        `Updated doctor profile for ${input.name}`);

      return { success: true };
    }),

  deleteDoctor: staffQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await db
        .update(doctors)
        .set({ deletedAt: new Date() })
        .where(eq(doctors.id, input.id));

      await logActivity(ctx.user, "delete", "doctor", input.id,
        `Soft-deleted doctor profile #${input.id}`);

      return { success: true };
    }),

  softDelete: staffQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await db
        .update(patients)
        .set({ deletedAt: new Date(), status: "inactive" })
        .where(eq(patients.id, input.id));
      await logActivity(ctx.user, "delete", "patient", input.id, `Soft-deleted patient #${input.id}`);
      return { success: true };
    }),

  restore: staffQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await db
        .update(patients)
        .set({ deletedAt: null, status: "waiting" })
        .where(eq(patients.id, input.id));
      await logActivity(ctx.user, "restore", "patient", input.id);
      return { success: true };
    }),

  getPopupSetting: publicQuery.query(async () => {
    const db = getDb();
    const records = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "doctor_popup"))
      .limit(1);

    if (records.length === 0) {
      return { isActive: false, doctorId: null, availableDate: "", doctor: null };
    }

    try {
      const config = JSON.parse(records[0].value);
      if (!config.isActive || !config.doctorId) {
        return { isActive: false, doctorId: config.doctorId || null, availableDate: config.availableDate || "", doctor: null };
      }

      const [doc] = await db
        .select()
        .from(doctors)
        .where(eq(doctors.id, config.doctorId))
        .limit(1);

      return {
        isActive: true,
        doctorId: config.doctorId,
        availableDate: config.availableDate || "",
        doctor: doc || null,
      };
    } catch (err) {
      console.error("Failed to parse popup setting", err);
      return { isActive: false, doctorId: null, availableDate: "", doctor: null };
    }
  }),

  updatePopupSetting: frontDeskQuery
    .input(
      z.object({
        isActive: z.boolean(),
        doctorId: z.number().nullable(),
        availableDate: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const valueStr = JSON.stringify({
        isActive: input.isActive,
        doctorId: input.doctorId,
        availableDate: input.availableDate,
      });

      const existing = await db
        .select()
        .from(settings)
        .where(eq(settings.key, "doctor_popup"))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(settings)
          .set({ value: valueStr })
          .where(eq(settings.key, "doctor_popup"));
      } else {
        await db.insert(settings).values({
          key: "doctor_popup",
          value: valueStr,
        });
      }

      await logActivity(
        ctx.user,
        "update",
        "setting",
        undefined,
        `Updated doctor popup setting: active=${input.isActive}, doctorId=${input.doctorId}, date=${input.availableDate}`
      );

      return { success: true };
    }),
});
