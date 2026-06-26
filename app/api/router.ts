import { authRouter } from "./auth-router";
import { appointmentRouter, contactRouter } from "./appointment-router";
import { billingRouter } from "./billing-router";
import { patientsRouter } from "./patients-router";
import { prescriptionsRouter } from "./prescriptions-router";
import { backupRouter } from "./backup-router";
import { searchRouter } from "./search-router";
import { activityRouter } from "./activity-router";
import { medicineOrdersRouter } from "./medicine-orders-router";
import { reportsRouter } from "./reports-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  appointment: appointmentRouter,
  contact: contactRouter,
  billing: billingRouter,
  patients: patientsRouter,
  prescriptions: prescriptionsRouter,
  backup: backupRouter,
  search: searchRouter,
  activity: activityRouter,
  medicineOrders: medicineOrdersRouter,
  reports: reportsRouter,
});

export type AppRouter = typeof appRouter;
