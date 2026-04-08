import { NotificationType } from '@prisma/client';
import { prisma } from '../config/prisma';

/**
 * Create a notification record in the database.
 */
export async function sendNotification(
  userId: string,
  title: string,
  body: string,
  type: NotificationType,
  relatedEntityId: string,
  relatedEntityType: string,
): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        user_id: userId,
        title,
        body,
        type,
        related_entity_id: relatedEntityId,
        related_entity_type: relatedEntityType,
      },
    });
  } catch (err) {
    // Log but don't throw — notification failure shouldn't break the main operation
    console.error('[notificationService] Failed to create notification:', err);
  }
}
