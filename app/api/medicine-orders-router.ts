import { z } from "zod";
import { createRouter, staffQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { medicineOrders, bills, patients } from "@db/schema";
import { eq, desc, and, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { logActivity } from "./lib/activity";

const orderItemSchema = z.object({
  medicineName: z.string().min(1, "Medicine name is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  price: z.number().min(0, "Price cannot be negative"),
});

export const medicineOrdersRouter = createRouter({
  list: staffQuery.query(async () => {
    const db = getDb();
    const results = await db
      .select({
        id: medicineOrders.id,
        patientId: medicineOrders.patientId,
        items: medicineOrders.items,
        totalAmount: medicineOrders.totalAmount,
        paymentStatus: medicineOrders.paymentStatus,
        deliveryStatus: medicineOrders.deliveryStatus,
        prescriptionUrl: medicineOrders.prescriptionUrl,
        awbNo: medicineOrders.awbNo,
        createdAt: medicineOrders.createdAt,
        updatedAt: medicineOrders.updatedAt,
        patientName: patients.name,
        patientPhone: patients.phone,
      })
      .from(medicineOrders)
      .leftJoin(patients, eq(medicineOrders.patientId, patients.id))
      .where(isNull(medicineOrders.deletedAt))
      .orderBy(desc(medicineOrders.createdAt));
    
    return results;
  }),
 
  create: staffQuery
    .input(
      z.object({
        patientId: z.number(),
        items: z.array(orderItemSchema),
        totalAmount: z.number(),
        paymentStatus: z.enum(["pending", "paid"]).default("pending"),
        deliveryStatus: z.enum(["placed", "out_for_delivery", "delivered", "cancelled"]).default("placed"),
        paymentMethod: z.enum(["cash", "upi", "online"]).optional(),
        prescriptionUrl: z.string().optional(),
        awbNo: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
 
      // Verify patient exists
      const [patient] = await db
        .select()
        .from(patients)
        .where(and(eq(patients.id, input.patientId), isNull(patients.deletedAt)))
        .limit(1);
 
      if (!patient) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Patient not found" });
      }
 
      // 1. Create the medicine order
      const [newOrder] = await db
        .insert(medicineOrders)
        .values({
          patientId: input.patientId,
          items: JSON.stringify(input.items),
          totalAmount: input.totalAmount,
          paymentStatus: input.paymentStatus,
          deliveryStatus: input.deliveryStatus,
          prescriptionUrl: input.prescriptionUrl || null,
          awbNo: input.awbNo || null,
        })
        .returning();
 
      // 2. Create the associated bill
      await db.insert(bills).values({
        medicineOrderId: newOrder.id,
        amount: input.totalAmount,
        tax: 0,
        discount: 0,
        total: input.totalAmount,
        status: input.paymentStatus === "paid" ? ("paid" as const) : ("unpaid" as const),
        paymentMethod: input.paymentMethod || null,
        lockedAt: input.paymentStatus === "paid" ? new Date() : null,
      });
 
      await logActivity(
        ctx.user,
        "create",
        "medicine_order",
        newOrder.id,
        `Placed medicine order for patient ${patient.name}: ₹${input.totalAmount}`
      );
 
      return { success: true, orderId: newOrder.id };
    }),
 
  updateDeliveryStatus: staffQuery
    .input(
      z.object({
        id: z.number(),
        deliveryStatus: z.enum(["placed", "out_for_delivery", "delivered", "cancelled"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      
      const [order] = await db
        .update(medicineOrders)
        .set({ deliveryStatus: input.deliveryStatus })
        .where(eq(medicineOrders.id, input.id))
        .returning();
 
      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      }
 
      await logActivity(
        ctx.user,
        "update",
        "medicine_order",
        input.id,
        `Updated delivery status to ${input.deliveryStatus}`
      );
 
      return { success: true };
    }),
 
  updatePaymentStatus: staffQuery
    .input(
      z.object({
        id: z.number(),
        paymentStatus: z.enum(["pending", "paid"]),
        paymentMethod: z.enum(["cash", "upi", "online"]).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
 
      const [order] = await db
        .update(medicineOrders)
        .set({ paymentStatus: input.paymentStatus })
        .where(eq(medicineOrders.id, input.id))
        .returning();
 
      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      }
 
      // Sync the bill status
      await db
        .update(bills)
        .set({
          status: input.paymentStatus === "paid" ? ("paid" as const) : ("unpaid" as const),
          paymentMethod: input.paymentMethod || null,
          lockedAt: input.paymentStatus === "paid" ? new Date() : null,
        })
        .where(eq(bills.medicineOrderId, input.id));
 
      await logActivity(
        ctx.user,
        "update",
        "medicine_order",
        input.id,
        `Updated payment status to ${input.paymentStatus}`
      );
 
      return { success: true };
    }),

  updateAwbNo: staffQuery
    .input(
      z.object({
        id: z.number(),
        awbNo: z.string().nullable(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [order] = await db
        .update(medicineOrders)
        .set({ awbNo: input.awbNo })
        .where(eq(medicineOrders.id, input.id))
        .returning();

      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      }

      await logActivity(
        ctx.user,
        "update",
        "medicine_order",
        input.id,
        `Updated AWB/Tracking number to ${input.awbNo}`
      );

      return { success: true };
    }),
});
