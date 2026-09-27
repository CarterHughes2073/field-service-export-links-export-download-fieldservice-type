import { createInfraiClient, InfraiError } from "./infrai_client.js";
import { exportCompletedWorkOrders, exportRequestSchema } from "./work_order_export.js";

const bucket = process.env.INFRAI_EXPORT_BUCKET ?? "field-service-exports";
const infrai = createInfraiClient();

try {
  await infrai.storage.bucket.get(bucket);
} catch (error) {
  if (error instanceof InfraiError && error.status === 404) await infrai.storage.bucket.create(bucket);
  else throw error;
}

const input = exportRequestSchema.parse({
  requestedBy: "dispatch-lead@example.com",
  workOrders: [
    {
      id: "WO-1042",
      customerName: "Northwind Clinic",
      dispatchStatus: "completed",
      photoUrls: ["https://example.com/photos/arrival.jpg", "https://example.com/photos/repair.jpg"],
      technicianFollowUp: "Replace filter during the next quarterly visit.",
    },
    {
      id: "WO-1043",
      customerName: "Contoso Market",
      dispatchStatus: "en_route",
      photoUrls: [],
      technicianFollowUp: null,
    },
  ],
});

console.log(await exportCompletedWorkOrders(input, infrai, bucket));
