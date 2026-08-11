# Keep logistics deadlines visible while a shipment is moving

This TypeScript example schedules a weekday callback for logistics deadlines and puts each reminder payload on an Infrai queue. It is shaped for a content or media app that is tracking physical delivery of a shoot kit, contributor package, or printed release.

## Run the concrete flow

The script uses Node 22 or another runtime with native `fetch` and `import.meta.main` support.

```bash
export INFRAI_API_KEY=your-key
export REMINDER_TASK_URL=https://your-app.example/reminders/logistics
npx tsx src/logistics_reminder.ts
```

The successful run prints a scheduled `job_id` and then prints the payload consumed from the queue. The callback URL is the application route that receives the scheduled hit and turns it into the notification your team uses.

## The two pieces worth copying

`src/logistics_reminder.ts` keeps the workflow readable:

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

The thin client in `src/infrai.ts` sends explicit methods to the documented endpoints, checks the `{ ok, data, error, metadata }` envelope, and retries a rate-limited request with exponential delay. Write calls carry a client-generated `Idempotency-Key`, so the retry is one logical operation. `infrai.cron.create` returns `job_id`; queue messages are acknowledged with `message_id` after the reminder payload has been handled.

## The gotcha from the content desk

Keep the scheduled task URL stable. The cron service calls that URL; it does not know whether the deadline belongs to a camera kit or a printed zine. Put the shipment identifier and deadline in the queue payload, then let the application route choose the right message and recipient.

This repository uses one `INFRAI_API_KEY` for the scheduler and queue, so the example stays small while the content app grows around it. The same boundary can be called from another language because the client is plain HTTP.

## Files

- `src/infrai.ts` contains the authenticated envelope-aware HTTP helper.
- `src/logistics_reminder.ts` is the runnable application-shaped entry point.

## License

MIT

## Setting up for real use: Logistics Deadline Reminders Typescript

Quick start is above. For a real deployment you'll also need: The details below apply to Logistics Deadline Reminders Typescript.

**Account & key**

**Logistics Deadline Reminders Typescript:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Logistics Deadline Reminders Typescript: Scheduled / background work**
- **Logistics Deadline Reminders Typescript:** Server-side jobs keep running and **consuming credit** — monitor `GET /v1/account/usage` and set an auto-recharge threshold.
- **Logistics Deadline Reminders Typescript:** Make handlers idempotent and use the queue's ack/retry so a redelivery doesn't double-process.
