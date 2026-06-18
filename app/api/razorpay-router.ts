import crypto from "crypto";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { appointments } from "@db/schema";
import { getServicePrice } from "@contracts/services";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { env } from "./lib/env";
import { eq } from "drizzle-orm";

type RazorpayOrder = {
  id: string;
  amount: number;
  currency: string;
  receipt?: string;
  status?: string;
};

type RazorpayErrorResponse = {
  error?: {
    description?: string;
  };
};

const currency = "INR";

function requireRazorpayConfig() {
  if (!env.razorpayKeyId || !env.razorpayKeySecret) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Razorpay test keys are not configured.",
    });
  }

  return {
    keyId: env.razorpayKeyId,
    keySecret: env.razorpayKeySecret,
  };
}

function authHeader(keyId: string, keySecret: string) {
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
}

async function razorpayRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const { keyId, keySecret } = requireRazorpayConfig();
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: authHeader(keyId, keySecret),
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const error = (await response
      .json()
      .catch(() => null)) as RazorpayErrorResponse | null;
    const description =
      typeof error?.error?.description === "string"
        ? error.error.description
        : `Razorpay request failed with ${response.status}`;
    throw new TRPCError({ code: "BAD_REQUEST", message: description });
  }

  return (await response.json()) as T;
}

function verifySignature({
  orderId,
  paymentId,
  signature,
}: {
  orderId: string;
  paymentId: string;
  signature: string;
}) {
  const { keySecret } = requireRazorpayConfig();
  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  const expectedBuffer = Buffer.from(expected, "hex");
  const signatureBuffer = Buffer.from(signature, "hex");

  return (
    expectedBuffer.length === signatureBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, signatureBuffer)
  );
}

export const razorpayRouter = createRouter({
  createOrder: publicQuery
    .input(z.object({ appointmentId: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [appointment] = await db
        .select()
        .from(appointments)
        .where(eq(appointments.id, input.appointmentId));

      if (!appointment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Appointment not found.",
        });
      }

      const price = getServicePrice(appointment.service);
      if (!price) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Unable to determine payment amount for this service.",
        });
      }

      const order = await razorpayRequest<RazorpayOrder>("/orders", {
        method: "POST",
        body: JSON.stringify({
          amount: price * 100,
          currency,
          receipt: `appointment_${appointment.id}`,
          notes: {
            appointmentId: String(appointment.id),
            service: appointment.service,
          },
        }),
      });

      return {
        keyId: env.razorpayKeyId,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
      };
    }),

  verifyPayment: publicQuery
    .input(
      z.object({
        appointmentId: z.number(),
        razorpayOrderId: z.string().min(1),
        razorpayPaymentId: z.string().min(1),
        razorpaySignature: z.string().min(1),
      }),
    )
    .mutation(async ({ input }) => {
      if (
        !verifySignature({
          orderId: input.razorpayOrderId,
          paymentId: input.razorpayPaymentId,
          signature: input.razorpaySignature,
        })
      ) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Payment signature verification failed.",
        });
      }

      const db = getDb();
      const [appointment] = await db
        .select()
        .from(appointments)
        .where(eq(appointments.id, input.appointmentId));

      if (!appointment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Appointment not found.",
        });
      }

      const price = getServicePrice(appointment.service);
      const order = await razorpayRequest<RazorpayOrder>(
        `/orders/${input.razorpayOrderId}`,
      );

      if (
        !price ||
        order.amount !== price * 100 ||
        order.currency !== currency ||
        order.receipt !== `appointment_${appointment.id}`
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Payment order does not match this appointment.",
        });
      }

      await db
        .update(appointments)
        .set({ paymentStatus: "paid", updatedAt: new Date() })
        .where(eq(appointments.id, appointment.id));

      return { success: true };
    }),
});
