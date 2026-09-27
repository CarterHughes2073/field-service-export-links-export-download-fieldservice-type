import { createServer } from "node:http";
import { ZodError } from "zod";
import { createInfraiClient, InfraiError } from "./infrai_client.js";
import { exportCompletedWorkOrders, exportRequestSchema } from "./work_order_export.js";

const bucket = process.env.INFRAI_EXPORT_BUCKET ?? "field-service-exports";
const infrai = createInfraiClient();

async function ensureExportBucket(): Promise<void> {
  try {
    await infrai.storage.bucket.get(bucket);
  } catch (error) {
    if (error instanceof InfraiError && error.status === 404) {
      await infrai.storage.bucket.create(bucket);
      return;
    }
    throw error;
  }
}

const bucketReady = ensureExportBucket();

const server = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/exports/work-orders") {
    response.writeHead(404, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ error: "Route not found" }));
    return;
  }

  try {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const input = exportRequestSchema.parse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    await bucketReady;
    const result = await exportCompletedWorkOrders(input, infrai, bucket);
    response.writeHead(201, { "Content-Type": "application/json" });
    response.end(JSON.stringify(result));
  } catch (error) {
    if (error instanceof ZodError) {
      response.writeHead(400, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ error: "Invalid export request", issues: error.issues }));
      return;
    }
    if (error instanceof InfraiError && error.status >= 400 && error.status < 500) {
      response.writeHead(error.status, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ error: error.code, message: error.message }));
      return;
    }
    response.writeHead(502, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ error: "Export dependency error" }));
  }
});

const port = Number(process.env.PORT ?? 3000);
server.listen(port, () => console.log(`Field-service export service listening on http://localhost:${port}`));
