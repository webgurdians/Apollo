import { z } from "zod";
import { createRouter, publicQuery, staffQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { doctors } from "@db/schema";
import { eq, desc } from "drizzle-orm";

export const defaultDoctors = [
  {
    name: "Dr. Vignesh Thanikgaivasan",
    specialty: "Cardiology",
    serviceName: "Dr. Vignesh Thanikgaivasan - Cardiology",
    qualifications: "MBBS, MD (Gen Med), DM (Cardiology) AFAPSIC, FIMSA",
    branch: "Apollo Hospitals Greams Road, Chennai",
    image: "/images/vignesh.jpg",
    fees: 1200,
    availability: "Monday & Saturday (11:00 AM – 3:00 PM)",
    status: "Available" as const,
  },
  {
    name: "Dr. Nithya Narayanan",
    specialty: "ENT / Covid Consult",
    serviceName: "Dr. Nithya Narayanan - ENT / Covid Consult",
    qualifications: "MBBS, DLO, DNB (ENT), MNAMS",
    branch: "Apollo Hospitals Greams Road, Chennai",
    image: "/images/nithya.jpg",
    fees: 1200,
    availability: "Tuesday (10:00 AM – 2:00 PM)",
    status: "Available" as const,
  },
  {
    name: "Dr. Anusha D",
    specialty: "Consultant Neurologist",
    serviceName: "Dr. Anusha D - Consultant Neurologist",
    qualifications: "MBBS, MD, DM",
    branch: "Apollo Hospitals OMR, Chennai",
    image: "/images/anusha.jpg",
    fees: 1200,
    availability: "Wednesday (9:00 AM – 1:00 PM)",
    status: "Available" as const,
  },
  {
    name: "Dr. Jothi Parthasarathy S",
    specialty: "Neonatology / Pediatrics",
    serviceName: "Dr. Jothi Parthasarathy S - Neonatology",
    qualifications: "MBBS, MD (Paediatrics)",
    branch: "Apollo Children Hospitals Greams Road, Chennai",
    image: "/images/jothi.jpg",
    fees: 1200,
    availability: "Thursday (10:00 AM – 2:00 PM)",
    status: "Available" as const,
  },
  {
    name: "Dr. Gautham Krishnamurthy",
    specialty: "Surgical Gastroenterology & GI Oncology",
    serviceName: "Dr. Gautham Krishnamurthy - Surgical Gastroenterology & GI Oncology",
    qualifications: "MBBS, MS (Gen Surg), MCh (Surgical Gastroenterology)",
    branch: "Apollo Hospitals Greams Road, Chennai",
    image: "/images/gautham.jpg",
    fees: 1200,
    availability: "Friday (11:00 AM – 3:00 PM)",
    status: "Available" as const,
  },
  {
    name: "Dr. Vishnu Abishek Raju",
    specialty: "Gastroenterology / GI Medicine",
    serviceName: "Dr. Vishnu Abishek Raju - Gastroenterology",
    qualifications: "MBBS, MD (Internal Medicine), DM (Gastroenterology)",
    branch: "Apollo Hospitals Greams Road, Chennai",
    image: "/images/vishnu.jpg",
    fees: 1200,
    availability: "Friday (11:00 AM – 3:00 PM)",
    status: "Available" as const,
  },
  {
    name: "Dr. Jatin Soni",
    specialty: "Urology",
    serviceName: "Dr. Jatin Soni - Urology",
    qualifications: "MBBS, MS (General Surgery), MCh (Urology)",
    branch: "Apollo Hospitals Chennai",
    image: "/images/jatin.jpg",
    fees: 1200,
    availability: "Saturday (9:30 AM – 2:30 PM)",
    status: "Available" as const,
  },
  {
    name: "Dr. Rakesh Shetty",
    specialty: "Orthopedics-Sports Medicine",
    serviceName: "Dr. Rakesh Shetty - Orthopedics-Sports Medicine",
    qualifications: "MBBS, DNB (Orthopaedic) Certified in spine and joint Replacement Surgeon (Languages: English, Telugu, Tamil, Kannada, Bengali, Tulu, Marathi, Hindi)",
    branch: "Apollo Hospitals Chennai",
    image: "/images/rakesh.jpg",
    fees: 1200,
    availability: "Monday & Wednesday (2:00 PM – 5:00 PM)",
    status: "Available" as const,
  },
];

export const createDoctorInput = z.object({
  name: z.string().min(1, "Name is required"),
  specialty: z.string().min(1, "Specialty is required"),
  serviceName: z.string().min(1, "Service name is required"),
  qualifications: z.string().min(1, "Qualifications are required"),
  branch: z.string().min(1, "Branch is required"),
  image: z.string().min(1, "Image is required"),
  fees: z.number().min(0),
  availability: z.string().min(1, "Availability is required"),
  status: z.enum(["Available", "Limited", "Not Available"]).default("Available"),
}).strict();

export const updateDoctorInput = z.object({
  id: z.number(),
  name: z.string().min(1, "Name is required"),
  specialty: z.string().min(1, "Specialty is required"),
  serviceName: z.string().min(1, "Service name is required"),
  qualifications: z.string().min(1, "Qualifications are required"),
  branch: z.string().min(1, "Branch is required"),
  image: z.string().min(1, "Image is required"),
  fees: z.number().min(0),
  availability: z.string().min(1, "Availability is required"),
  status: z.enum(["Available", "Limited", "Not Available"]),
}).strict();

export const doctorRouter = createRouter({
  list: publicQuery.query(async () => {
    const db = getDb();
    let results = await db.select().from(doctors).orderBy(desc(doctors.createdAt));
    if (results.length === 0) {
      await db.insert(doctors).values(defaultDoctors);
      results = await db.select().from(doctors).orderBy(desc(doctors.createdAt));
    }
    return results;
  }),

  create: staffQuery
    .input(createDoctorInput)
    .mutation(async ({ input }) => {
      const db = getDb();
      const [doctor] = await db.insert(doctors).values({
        name: input.name,
        specialty: input.specialty,
        serviceName: input.serviceName,
        qualifications: input.qualifications,
        branch: input.branch,
        image: input.image,
        fees: input.fees,
        availability: input.availability,
        status: input.status,
      }).returning({ id: doctors.id });
      return { success: true, doctorId: doctor.id };
    }),

  update: staffQuery
    .input(updateDoctorInput)
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .update(doctors)
        .set({
          name: input.name,
          specialty: input.specialty,
          serviceName: input.serviceName,
          qualifications: input.qualifications,
          branch: input.branch,
          image: input.image,
          fees: input.fees,
          availability: input.availability,
          status: input.status,
        })
        .where(eq(doctors.id, input.id));
      return { success: true };
    }),

  delete: staffQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(doctors).where(eq(doctors.id, input.id));
      return { success: true };
    }),
});
