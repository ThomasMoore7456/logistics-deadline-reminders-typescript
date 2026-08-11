import { infrai } from "./infrai.ts";

const reminderTaskUrl = process.env.REMINDER_TASK_URL ?? "https://example.com/logistics/reminder";
const reminderQueue = "logistics-reminders";

export async function scheduleLogisticsReminder(): Promise<string> {
  const job = await infrai.cron.create({
    cron_expr: "0 9 * * 1-5",
    task: reminderTaskUrl,
  });
  return job.job_id;
}

export async function enqueueDeadlineReminder(payload: { shipment: string; deadline: string }): Promise<void> {
  await infrai.queue.publish(reminderQueue, payload);
}

export async function consumeDeadlineReminders(): Promise<void> {
  const result = await infrai.queue.consume(reminderQueue, 10, 60);
  const messages = (result as { messages?: Array<{ message_id: string; payload: unknown }> }).messages ?? [];
  for (const message of messages) {
    console.log(`Reminder payload: ${JSON.stringify(message.payload)}`);
    await infrai.queue.ack(reminderQueue, message.message_id);
  }
}

if (import.meta.main) {
  const jobId = await scheduleLogisticsReminder();
  await enqueueDeadlineReminder({ shipment: "editorial-kit-042", deadline: "2026-08-12T17:00:00Z" });
  console.log(`Scheduled logistics reminder job: ${jobId}`);
  await consumeDeadlineReminders();
}
