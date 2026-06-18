export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  handler: (response: { razorpay_payment_id: string }) => void;
  prefill: { name: string; contact: string };
  theme: { color: string };
}

export interface RazorpayInstance {
  open: () => void;
}

export interface RazorpayWindow {
  Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
}

export interface BillRow {
  id: number;
  appointmentId: number;
  amount: number;
  tax: number;
  discount: number;
  total: number;
  status: string;
  paymentMethod: string | null;
  createdAt: Date;
  updatedAt?: Date;
  patientName: string;
  patientPhone: string;
  service: string;
}

export function loadRazorpayScript(): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    if ((window as unknown as RazorpayWindow).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}
