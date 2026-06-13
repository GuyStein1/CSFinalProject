import { prisma } from '../config/prisma';
import { sendNotification } from '../services/notificationService';
import { getNotificationText } from './notificationMessages';

const REMINDER_HOURS = 48;
const AUTO_COMPLETE_DAYS = 7;

/**
 * Checks tasks where fixer has marked completion but requester hasn't confirmed.
 * - After 48h: sends a reminder notification to the requester
 * - After 7 days: auto-completes the task
 */
export async function checkPendingCompletions(): Promise<void> {
  try {
    const tasks = await prisma.task.findMany({
      where: {
        status: 'IN_PROGRESS',
        fixer_completed: true,
        requester_completed: false,
        fixer_completed_at: { not: null },
      },
      include: {
        fixer: { select: { full_name: true } },
      },
    });

    const now = Date.now();

    for (const task of tasks) {
      if (!task.fixer_completed_at) continue;
      const elapsed = now - task.fixer_completed_at.getTime();
      const elapsedHours = elapsed / (1000 * 60 * 60);
      const elapsedDays = elapsedHours / 24;

      if (elapsedDays >= AUTO_COMPLETE_DAYS) {
        // Auto-complete
        await prisma.$transaction(async (tx) => {
          await tx.task.update({
            where: { id: task.id },
            data: {
              requester_completed: true,
              status: 'COMPLETED',
              completed_at: new Date(),
            },
          });
          if (task.assigned_fixer_id) {
            await tx.user.update({
              where: { id: task.assigned_fixer_id },
              data: { completed_tasks_as_fixer: { increment: 1 } },
            });
          }
        });

        const autoNt = await getNotificationText(task.requester_id, 'taskAutoCompleted', { taskTitle: task.title });
        await sendNotification(task.requester_id, autoNt.title, autoNt.body, 'TASK_COMPLETED', task.id, 'Task');
        if (task.assigned_fixer_id) {
          const fixNt = await getNotificationText(task.assigned_fixer_id, 'taskCompletedAuto', { taskTitle: task.title });
          await sendNotification(task.assigned_fixer_id, fixNt.title, fixNt.body, 'TASK_COMPLETED', task.id, 'Task');
        }

        // Review nudge — only if no review exists yet
        const existingReview = await prisma.review.findUnique({
          where: { task_id_reviewer_id: { task_id: task.id, reviewer_id: task.requester_id } },
        });
        if (!existingReview) {
          const revNt = await getNotificationText(task.requester_id, 'leaveReview', { taskTitle: task.title, fixerName: task.fixer?.full_name || 'the fixer' });
          await sendNotification(task.requester_id, revNt.title, revNt.body, 'TASK_COMPLETED', task.id, 'Task');
        }

        console.log(`[completionChecker] Auto-completed task ${task.id}`);
      } else if (elapsedHours >= REMINDER_HOURS) {
        // Send reminder (check we haven't already sent one in the last 48h)
        const recentReminder = await prisma.notification.findFirst({
          where: {
            user_id: task.requester_id,
            related_entity_id: task.id,
            title: { in: ['Confirm Completion', 'אשר השלמה'] },
            created_at: { gte: new Date(now - REMINDER_HOURS * 60 * 60 * 1000) },
          },
        });

        if (!recentReminder) {
          const confNt = await getNotificationText(task.requester_id, 'confirmCompletion', {
            taskTitle: task.title,
            fixerName: task.fixer?.full_name || 'The fixer',
            hours: String(Math.floor(elapsedHours)),
          });
          await sendNotification(task.requester_id, confNt.title, confNt.body, 'TASK_COMPLETED', task.id, 'Task');
          console.log(`[completionChecker] Sent reminder for task ${task.id}`);
        }
      }
    }
  } catch (err) {
    console.error('[completionChecker] Error:', err);
  }
}
