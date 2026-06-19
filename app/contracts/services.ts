export const services = [
  { name: "Dr. Vignesh Thanikgaivasan - Cardiology", price: 1200 },
  { name: "Dr. Nithya Narayanan - ENT / Covid Consult", price: 1200 },
  { name: "Dr. Anusha D - Consultant Neurologist", price: 1200 },
  { name: "Dr. Jothi Parthasarathy S - Neonatology", price: 1200 },
  { name: "Dr. Vishnu Abishek Raju - Gastroenterology", price: 1200 },
  { name: "Dr. Gautham Krishnamurthy - Surgical Gastroenterology & GI Oncology", price: 1200 },
  { name: "Dr. Jatin Soni - Urology", price: 1200 },
  { name: "Dr. Rakesh Shetty - Orthopedics-Sports Medicine", price: 1200 },
] as const;

export function getServicePrice(serviceName: string): number | null {
  return services.find((service) => service.name === serviceName)?.price ?? null;
}
