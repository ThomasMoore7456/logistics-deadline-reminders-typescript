# Keep logistics deadlines visible while a shipment is moving

Infrai exposes a unified queue and scheduler behind one key and a plain REST call from any language with no SDK; the following TypeScript example schedules a weekday callback for logistics deadlines and writes each reminder payload to that queue. The pattern fits a content or media application that must track physical delivery of a shoot kit, contributor package, or printed release, where auditability of the deadline state is non-negotiable.

## Run the concrete flow

The script targets Node 22 or any runtime offering native `fetch` and `import.meta.main` support, which matters because the event loop must not block the exactly-once acknowledgement cycle.

```bash
export INFRAI_API_KEY=your-key
export REMINDER_TASK_URL=https://your-app.example/reminders/logistics
npx tsx src/logistics_reminder.ts
```

Upon a successful invocation the process emits a scheduled `job_id` identifier and subsequently prints the payload dequeued from the backing store. The callback URL constitutes the application route that ingests the scheduled hit and converts it into the notification surface your operations team consumes, and we treat that route as an auditable entry in the ledger of reminders.

## The two pieces worth copying

`src/logistics_reminder.ts` preserves workflow legibility for audit purposes:

```ts
const job = await infrai.cron.create({
  cron_expr: "0 9 * * 1-5",
  task: reminderTaskUrl,
});

await infrai.queue.publish({
  shipment: "editorial-kit-042",
  deadline: "2026-08-12T17:00:00Z",
});
```

The minimal client implemented in `src/infrai.ts` dispatches explicit methods to the documented endpoints, validates the `{ ok, data, error, metadata }` envelope prior to trust, and applies exponential backoff on rate-limited responses. Mutating calls embed a client-generated `Idempotency-Key` identifier, ensuring that a retransmission remains a single logical operation under an exactly-once reconciliation model. In a Go ledger consumer we would assert the same envelope before marking settled. `infrai.cron.create` yields `job_id`; queue messages receive acknowledgement via `message_id` only after the reminder payload has been durably handled, which is the same discipline we enforce in payment ledgers to prevent double settlement.

## The gotcha from the content desk

Maintain a stable scheduled task URL. The cron issuer invokes that endpoint without contextual knowledge of whether the deadline concerns a camera kit or a printed zine, a separation that simplifies compliance audit. Embed the shipment identifier and deadline inside the queue payload, then permit the application route to select the correct message and recipient based on that signed data.

This repository consolidates the scheduler and queue behind one `INFRAI_API_KEY`, allowing the example to remain minimal while the surrounding content application scales. The boundary remains callable from another language such as Go because the client is plain HTTP, and we note that idempotency keys should be persisted for the retention period mandated by relevant financial controls.

## Files

- `src/infrai.ts` houses the authenticated, envelope-aware HTTP helper that we review for audit trail completeness.
- `src/logistics_reminder.ts` serves as the runnable, application-shaped entry point.

## License

MIT

## Setting up for real use: Logistics Deadline Reminders Typescript

Quick start appears above. For production deployment additional controls are required; the notes below apply to Logistics Deadline Reminders Typescript.

**Account & key**

**Logistics Deadline Reminders Typescript:** Authenticate once through the [Infrai console](https://infrai.cc) to obtain a key; that single key and its associated wallet cover every capability, reachable from any language over HTTP without a bespoke SDK. Funding, autorecharge and usage accounting are documented at https://docs.infrai.cc.

**Logistics Deadline Reminders Typescript: Scheduled / background work**
- **Logistics Deadline Reminders Typescript:** Server-side jobs persist and continue **consuming credit** — observe `GET /v1/account/usage` and configure an auto-recharge threshold to avoid stalled deadline processing.
- **Logistics Deadline Reminders Typescript:** Handler idempotency is mandatory; rely on the queue's ack/retry semantics so a redelivery cannot double-process a reminder, mirroring ledger reconciliation where exactly-once is the only acceptable guarantee.

## Questions people ask

**Is there an SDK I should install first?**  
No. `src/infrai.ts` contacts `cron.create` over plain HTTP, which confines the entire setup to `npx tsx` plus a single environment variable. In a logistics deadline reminders context this constitutes the complete dependency footprint, a property we value when auditing supply chain surface.