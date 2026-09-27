import { z } from "zod";
import type { InfraiClient } from "./infrai_client.js";

export const exportRequestSchema = z.object({
  requestedBy: z.string().min(1),
  workOrders: z.array(z.object({
    id: z.string().min(1),
    customerName: z.string().min(1),
    dispatchStatus: z.enum(["unassigned", "dispatched", "en_route", "completed", "cancelled"]),
    photoUrls: z.array(z.string().url()),
    technicianFollowUp: z.string().trim().nullable(),
  })).min(1),
});

export type ExportRequest = z.infer<typeof exportRequestSchema>;

const csvCell = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;

export function completedWorkOrdersCsv(request: ExportRequest): string {
  const rows = request.workOrders
    .filter((order) => order.dispatchStatus === "completed")
    .map((order) => [
      order.id,
      order.customerName,
      order.dispatchStatus,
      order.photoUrls.length,
      order.technicianFollowUp ?? "",
    ]);
  return [
    ["work_order_id", "customer_name", "dispatch_status", "photo_count", "technician_follow_up"],
    ...rows,
  ].map((row) => row.map(csvCell).join(",")).join("\n") + "\n";
}

export async function exportCompletedWorkOrders(
  request: ExportRequest,
  infrai: InfraiClient,
  bucket: string,
) {
  const csv = completedWorkOrdersCsv(request);
  const exportId = crypto.randomUUID();
  const key = `work-order-exports/${exportId}.csv`;
  const upload = await infrai.storage.object.presign(bucket, key, {
    op: "put",
    expires_seconds: 600,
    content_type: "text/csv; charset=utf-8",
    idempotency_key: exportId,
  });
  const uploadResponse = await fetch(upload.url, {
    method: "PUT",
    headers: { "Content-Type": "text/csv; charset=utf-8" },
    body: csv,
  });
  if (!uploadResponse.ok) throw new Error(`CSV upload rejected with ${uploadResponse.status}`);

  const download = await infrai.storage.object.presign(bucket, key, {
    op: "get",
    expires_seconds: 900,
    response_disposition: `attachment; filename="completed-work-orders-${exportId}.csv"`,
  });
  const renderedDocument = await infrai.pdf.generate({
    markdown: `# Completed work-order export\n\nRequested by ${request.requestedBy}.\n\n${csv}`,
    page_size: "A4",
    orientation: "landscape",
  });

  return {
    exportId,
    exportedCount: request.workOrders.filter((order) => order.dispatchStatus === "completed").length,
    downloadUrl: download.url,
    renderedDocument,
  };
}
