import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { NotificationType } from '@prisma/client';
import { prisma } from '../config/prisma';

const expo = new Expo();

/**
 * Creates a notification record in the DB and sends an Expo push notification
 * if the user has a valid push token registered.
 *
 * Errors are caught and logged — notification failure never breaks the calling operation.
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
    // 1. Always persist to DB
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

    // 2. Send push if a valid Expo token is registered
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { push_token: true },
    });

    if (!user?.push_token || !Expo.isExpoPushToken(user.push_token)) return;

    const message: ExpoPushMessage = {
      to: user.push_token,
      title,
      body,
      data: { type, relatedEntityId, relatedEntityType },
    };

    await expo.sendPushNotificationsAsync([message]);
  } catch (err) {
    // Log but don't throw — notification failure shouldn't break the main operation
    console.error('[notificationService] Failed to send notification:', err);
  }
}
