import { describe, expect, it } from "vitest";
import { createAppointmentInput } from "./appointment-router";

describe("createAppointmentInput", () => {
  it("accepts the public appointment fields", () => {
    const result = createAppointmentInput.safeParse({
      name: "Test Patient",
      phone: "9876543210",
      service: "OPD Consultation - General Physician",
      preferredDate: "2026-05-10",
      message: "Morning slot preferred",
    });

    expect(result.success).toBe(true);
  });

  it("rejects client-controlled payment status", () => {
    const result = createAppointmentInput.safeParse({
      name: "Test Patient",
      phone: "9876543210",
      service: "OPD Consultation - General Physician",
      preferredDate: "2026-05-10",
      paymentStatus: "paid",
    });

    expect(result.success).toBe(false);
  });
});
