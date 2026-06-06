import { prisma } from '../config/prisma';
import { sendNotification } from '../services/notificationService';

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

        await sendNotification(
          task.requester_id,
          'Task Auto-Completed',
          `Task "${task.title}" was automatically completed after 7 days without response.`,
          'TASK_COMPLETED',
          task.id,
          'Task',
        );
        if (task.assigned_fixer_id) {
          await sendNotification(
            task.assigned_fixer_id,
            'Task Completed',
            `Task "${task.title}" has been automatically completed.`,
            'TASK_COMPLETED',
            task.id,
            'Task',
          );
        }

        // Review nudge — only if no review exists yet
        const existingReview = await prisma.review.findUnique({
          where: { task_id_reviewer_id: { task_id: task.id, reviewer_id: task.requester_id } },
        });
        if (!existingReview) {
          await sendNotification(
            task.requester_id,
            'Leave a Review',
            `Task "${task.title}" is complete! Let ${task.fixer?.full_name || 'the fixer'} know how they did.`,
            'TASK_COMPLETED',
            task.id,
            'Task',
          );
        }

        console.log(`[completionChecker] Auto-completed task ${task.id}`);
      } else if (elapsedHours >= REMINDER_HOURS) {
        // Send reminder (check we haven't already sent one in the last 48h)
        const recentReminder = await prisma.notification.findFirst({
          where: {
            user_id: task.requester_id,
            related_entity_id: task.id,
            title: 'Confirm Completion',
            created_at: { gte: new Date(now - REMINDER_HOURS * 60 * 60 * 1000) },
          },
        });

        if (!recentReminder) {
          await sendNotification(
            task.requester_id,
            'Confirm Completion',
            `${task.fixer?.full_name || 'The fixer'} marked "${task.title}" as done ${Math.floor(elapsedHours)}h ago. Please confirm completion.`,
            'TASK_COMPLETED',
            task.id,
            'Task',
          );
          console.log(`[completionChecker] Sent reminder for task ${task.id}`);
        }
      }
    }
  } catch (err) {
    console.error('[completionChecker] Error:', err);
  }
}
