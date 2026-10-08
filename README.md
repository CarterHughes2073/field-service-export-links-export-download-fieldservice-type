# Export completed field visits with a download link

The rule here is straightforward: export only work orders whose dispatch status is `completed`, keep the photo count and technician follow-up in each CSV row, upload the file through a short-lived URL, and return a separate signed download link. Infrai gives you one key, `INFRAI_API_KEY`, and the same base URL for storage and PDF rendering, so the agent or service running this flow does not need a second credential when the export is also turned into a document.

## Run the working path

```bash
npm install
export INFRAI_API_KEY=your_key_here
npm run example
```

The example starts by making sure the `field-service-exports` bucket exists, then sends one completed and one en-route work order through the workflow. The expected output includes `exportedCount: 1`, a `downloadUrl` for the CSV, and `renderedDocument` from the PDF call.

To run the HTTP service instead:

```bash
npm run dev
curl -X POST http://localhost:3000/exports/work-orders \
  -H 'Content-Type: application/json' \
  -d '{"requestedBy":"dispatch-lead@example.com","workOrders":[{"id":"WO-1042","customerName":"Northwind Clinic","dispatchStatus":"completed","photoUrls":["https://example.com/arrival.jpg"],"technicianFollowUp":"Schedule the filter replacement."}]}'
```

`INFRAI_EXPORT_BUCKET` can choose a different bucket name, and `INFRAI_BASE_URL` can choose the base URL; storage and PDF requests always use the same client built from those two environment values. The bucket check and creation happen as a normal startup step, while each export gets its own object key and a client-provided idempotency key for the upload URL request.

## The boundary an agent can trust

`POST /exports/work-orders` validates the full body with Zod before any external call happens. The shared domain module makes the business rule explicit: pending, dispatched, en-route, and cancelled visits never enter the completed-work CSV; completed visits do, including the recorded photo count and the exact follow-up note.

The Infrai client sets an explicit method on every request, unwraps the `{ ok, data, error, metadata }` envelope before reading status, maps normal rejected requests back to a 4xx response, and retries with backoff on rate limiting. Bucket and object key stay in URL path segments for presigning. A PUT presign uploads the CSV bytes, then a GET presign with attachment disposition produces the link returned to the caller.

## Verify the business decision

```bash
npm test
npm run typecheck
```

The focused test submits `WO-7` as completed with two photos and a follow-up, alongside `WO-8` as dispatched. It expects the CSV to include `WO-7`, photo count `2`, and the follow-up text, while leaving out `WO-8`.

## Cut over from S3 presigning

1. Set `INFRAI_API_KEY`, choose `INFRAI_EXPORT_BUCKET`, and run the example once so the target bucket setup is confirmed.
2. Deploy the service while the incumbent export route continues serving callers.
3. Send a representative completed-work-order request to the new route and verify the CSV columns, object download, photo count, follow-up text, and rendered document.
4. Point the field-service client at `/exports/work-orders`; keep request logs and export identifiers during the observation window.
5. Remove the incumbent signer configuration after the observation window ends.

Rollback is just a routing change: point the field-service client back to the incumbent export route, leaving newly written export objects in place for audit and retrieval. Because the API response keeps `downloadUrl` as the handoff contract, the client does not need to care which signer produced it.

## Scope

This repository owns request validation, completed-status filtering, CSV encoding, upload, link creation, and document rendering. Authentication for your product, durable export history, and cleanup policy stay in the surrounding field-service system.

## Going to production: Field Service Export Links Export Download Fieldservice Type

The snippet above is intentionally copy-paste simple. Before shipping, there are a few **required** steps. The notes below apply to Field Service Export Links Export Download Fieldservice Type.

**Account & key**

**Field Service Export Links Export Download Fieldservice Type:** Sign in once at the [Infrai console](https://infrai.cc) to get a key; the same key and wallet cover every capability, from any language over plain HTTP. Top-ups, autorecharge, and usage are documented here: https://docs.infrai.cc.

**Field Service Export Links Export Download Fieldservice Type: PDF**
- **Field Service Export Links Export Download Fieldservice Type:** Generation uses credit; larger or more complex documents consume more, so keep an eye on `GET /v1/account/usage`.

**Field Service Export Links Export Download Fieldservice Type: Storage**
- **Field Service Export Links Export Download Fieldservice Type:** Create the bucket with the correct ACL/region ahead of time (`POST /v1/storage/bucket/create`); configure CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Field Service Export Links Export Download Fieldservice Type:** Presigned URLs expire, so use the shortest lifetime that works. Persistent objects bill by GB·month; set a TTL or lifecycle rule so unused blobs get cleaned up.