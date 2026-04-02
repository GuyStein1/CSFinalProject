import { NotificationType } from '@prisma/client';

/**
 * Stub implementation — no-op until Zilber implements the real notification service (B2).
 * Signature matches what Zilber's implementation will use — do not change the signature.
 * Replace the body of this function with the real implementation when B2 is merged.
 */
export async function sendNotification(
  _userId: string,
  _title: string,
  _body: string,
  _type: NotificationType,
  _relatedEntityId: string,
  _relatedEntityType: string,
): Promise<void> {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('[notificationService] STUB — notification not sent');
  }
}
