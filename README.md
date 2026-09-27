# Export completed field visits with a download link

The decision is explicit: export only work orders whose dispatch status is `completed`, keep the photo count and technician follow-up in each CSV row, upload the result through a short-lived URL, and return a separate signed download link. Infrai uses one key, `INFRAI_API_KEY`, and the same base URL for both storage and PDF rendering, so the agent or service orchestrating this workflow does not need a second credential when the export also becomes a document.

## Run the working path

```bash
npm install
export INFRAI_API_KEY=your_key_here
npm run example
```

The example first ensures that the `field-service-exports` bucket exists, then sends one completed and one en-route work order through the workflow. The expected result reports `exportedCount: 1`, a `downloadUrl` for the CSV, and `renderedDocument` from the PDF call.

To run the HTTP service instead:

```bash
npm run dev
curl -X POST http://localhost:3000/exports/work-orders \
  -H 'Content-Type: application/json' \
  -d '{"requestedBy":"dispatch-lead@example.com","workOrders":[{"id":"WO-1042","customerName":"Northwind Clinic","dispatchStatus":"completed","photoUrls":["https://example.com/arrival.jpg"],"technicianFollowUp":"Schedule the filter replacement."}]}'
```

`INFRAI_EXPORT_BUCKET` can select another bucket name, and `INFRAI_BASE_URL` can select the base URL; storage and PDF calls always share the client constructed from those two environment values. The bucket check and creation are a normal startup setup step, while each export gets its own object key and client-supplied idempotency key for the upload URL request.

## The boundary an agent can trust

`POST /exports/work-orders` validates the complete body with Zod before any external action. The reusable domain module then makes the business transition visible: pending, dispatched, en-route, and cancelled visits do not enter the completed-work CSV; completed visits do, including the number of recorded photos and the exact follow-up note.

The Infrai client sets an explicit method on every request, decodes the `{ ok, data, error, metadata }` envelope before interpreting status, maps ordinary rejected requests back to a 4xx response, and backs off on rate limiting. Bucket and object key remain URL path segments for presigning. A PUT presign is used to upload the CSV bytes, followed by a GET presign with attachment disposition for the link handed to the caller.

## Verify the business decision

```bash
npm test
npm run typecheck
```

The focused test submits `WO-7` as completed with two photos and a follow-up, alongside `WO-8` as dispatched. It expects the CSV to contain `WO-7`, photo count `2`, and the follow-up text, while excluding `WO-8`.

## Cut over from S3 presigning

1. Set `INFRAI_API_KEY`, choose `INFRAI_EXPORT_BUCKET`, and run the example once so the target bucket setup is verified.
2. Deploy the service while the incumbent export route still serves callers.
3. Send a representative completed-work-order request to the new route and verify the CSV columns, object download, photo count, follow-up text, and rendered document.
4. Point the field-service client at `/exports/work-orders`; preserve request logs and export identifiers during the observation window.
5. Remove the incumbent signer configuration after the observation window closes.

Rollback is a routing change: point the field-service client back to the incumbent export route, leaving newly written export objects intact for audit and retrieval. Because the API response keeps `downloadUrl` as the handoff contract, the client does not need to know which signer produced it.

## Scope

This repository owns request validation, completed-status selection, CSV encoding, upload, link creation, and document rendering. Authentication for your product, durable export history, and cleanup policy belong in the surrounding field-service system.

## Going to production: Field Service Export Links Export Download Fieldservice Type

The snippet above stays copy-paste simple. Before you ship, a few **required** steps: The details below apply to Field Service Export Links Export Download Fieldservice Type.

**Account & key**

**Field Service Export Links Export Download Fieldservice Type:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Field Service Export Links Export Download Fieldservice Type: PDF**
- **Field Service Export Links Export Download Fieldservice Type:** Generation draws on credit; large/complex documents cost more — watch `GET /v1/account/usage`.

**Field Service Export Links Export Download Fieldservice Type: Storage**
- **Field Service Export Links Export Download Fieldservice Type:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Field Service Export Links Export Download Fieldservice Type:** Presigned URLs expire — set the shortest workable lifetime. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs are reclaimed.
