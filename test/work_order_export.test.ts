import assert from "node:assert/strict";
import test from "node:test";
import { completedWorkOrdersCsv, exportRequestSchema } from "../src/work_order_export.js";

test("exports completed visits and carries photo count plus technician follow-up", () => {
  const request = exportRequestSchema.parse({
    requestedBy: "dispatcher@example.com",
    workOrders: [
      {
        id: "WO-7",
        customerName: "Apex Heating",
        dispatchStatus: "completed",
        photoUrls: ["https://example.com/a.jpg", "https://example.com/b.jpg"],
        technicianFollowUp: "Confirm thermostat calibration.",
      },
      {
        id: "WO-8",
        customerName: "Beacon Dental",
        dispatchStatus: "dispatched",
        photoUrls: [],
        technicianFollowUp: null,
      },
    ],
  });

  const csv = completedWorkOrdersCsv(request);
  assert.match(csv, /"WO-7","Apex Heating","completed","2","Confirm thermostat calibration\."/);
  assert.doesNotMatch(csv, /WO-8/);
});
