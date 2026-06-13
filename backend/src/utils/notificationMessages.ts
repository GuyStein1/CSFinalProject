/**
 * Notification i18n — returns translated title + body for each notification type.
 * Language is looked up from the recipient user's `language` field.
 */

import { prisma } from '../config/prisma';

type Lang = 'en' | 'he';

interface NotificationText {
  title: string;
  body: string;
}

async function getUserLanguage(userId: string): Promise<Lang> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { language: true },
    });
    return (user?.language === 'he' ? 'he' : 'en') as Lang;
  } catch {
    return 'en';
  }
}

// ── Translation map ──────────────────────────────────────────────────────────

const messages: Record<string, Record<Lang, (vars: Record<string, string>) => NotificationText>> = {
  bidAccepted: {
    en: (v) => ({
      title: 'Bid Accepted',
      body: `Your bid of ₪${v.price} on "${v.taskTitle}" has been accepted!`,
    }),
    he: (v) => ({
      title: 'ההצעה אושרה',
      body: `ההצעה שלך בסך ₪${v.price} על "${v.taskTitle}" אושרה!`,
    }),
  },
  bidRejectedChosen: {
    en: (v) => ({
      title: 'Bid Rejected',
      body: `Another fixer was chosen for "${v.taskTitle}".`,
    }),
    he: (v) => ({
      title: 'ההצעה נדחתה',
      body: `פיקסר אחר נבחר עבור "${v.taskTitle}".`,
    }),
  },
  bidRejected: {
    en: (v) => ({
      title: 'Bid Rejected',
      body: `Your bid of ₪${v.price} on "${v.taskTitle}" was not accepted.`,
    }),
    he: (v) => ({
      title: 'ההצעה נדחתה',
      body: `ההצעה שלך בסך ₪${v.price} על "${v.taskTitle}" לא אושרה.`,
    }),
  },
  bidWithdrawn: {
    en: (v) => ({
      title: 'Bid Withdrawn',
      body: `A fixer withdrew their bid of ₪${v.price} on "${v.taskTitle}".`,
    }),
    he: (v) => ({
      title: 'הצעה נמשכה',
      body: `פיקסר משך את הצעתו בסך ₪${v.price} על "${v.taskTitle}".`,
    }),
  },
  fixerCanceled: {
    en: (v) => ({
      title: 'Fixer Canceled',
      body: `The assigned fixer has canceled their bid on "${v.taskTitle}". Your task is now open for new bids.`,
    }),
    he: (v) => ({
      title: 'הפיקסר ביטל',
      body: `הפיקסר שנבחר ביטל את הצעתו על "${v.taskTitle}". המשימה שלך פתוחה מחדש להצעות.`,
    }),
  },
  taskCanceledBidder: {
    en: (v) => ({
      title: 'Task Canceled',
      body: `The task "${v.taskTitle}" you bid on has been canceled.`,
    }),
    he: (v) => ({
      title: 'המשימה בוטלה',
      body: `המשימה "${v.taskTitle}" שהגשת עליה הצעה בוטלה.`,
    }),
  },
  taskCanceledFixer: {
    en: (v) => ({
      title: 'Task Canceled',
      body: `The task "${v.taskTitle}" has been canceled by the requester.`,
    }),
    he: (v) => ({
      title: 'המשימה בוטלה',
      body: `המשימה "${v.taskTitle}" בוטלה על ידי המזמין.`,
    }),
  },
  paymentConfirmed: {
    en: (v) => ({
      title: 'Payment Confirmed',
      body: `The requester confirmed payment for "${v.taskTitle}". You can now mark the task as completed.`,
    }),
    he: (v) => ({
      title: 'התשלום אושר',
      body: `המזמין אישר תשלום עבור "${v.taskTitle}". כעת תוכל לסמן את המשימה כהושלמה.`,
    }),
  },
  taskCompleted: {
    en: (v) => ({
      title: 'Task Completed',
      body: `The task "${v.taskTitle}" has been marked as completed by both sides.`,
    }),
    he: (v) => ({
      title: 'המשימה הושלמה',
      body: `המשימה "${v.taskTitle}" סומנה כהושלמה על ידי שני הצדדים.`,
    }),
  },
  leaveReview: {
    en: (v) => ({
      title: 'Leave a Review',
      body: `Task "${v.taskTitle}" is complete! Let ${v.fixerName} know how they did.`,
    }),
    he: (v) => ({
      title: 'השאר ביקורת',
      body: `המשימה "${v.taskTitle}" הושלמה! ספר ל${v.fixerName} איך הוא עשה.`,
    }),
  },
  completionConfirmed: {
    en: (v) => ({
      title: 'Completion Confirmed',
      body: `One side has confirmed completion of "${v.taskTitle}". Please confirm on your end.`,
    }),
    he: (v) => ({
      title: 'ההשלמה אושרה',
      body: `צד אחד אישר את השלמת "${v.taskTitle}". אנא אשר גם מצדך.`,
    }),
  },
  newBid: {
    en: (v) => ({
      title: 'New Bid',
      body: `You received a new bid of ₪${v.price} on "${v.taskTitle}".`,
    }),
    he: (v) => ({
      title: 'הצעה חדשה',
      body: `קיבלת הצעה חדשה בסך ₪${v.price} על "${v.taskTitle}".`,
    }),
  },
  taskAutoCompleted: {
    en: (v) => ({
      title: 'Task Auto-Completed',
      body: `Task "${v.taskTitle}" was automatically completed after 7 days without response.`,
    }),
    he: (v) => ({
      title: 'המשימה הושלמה אוטומטית',
      body: `המשימה "${v.taskTitle}" הושלמה אוטומטית לאחר 7 ימים ללא תגובה.`,
    }),
  },
  taskCompletedAuto: {
    en: (v) => ({
      title: 'Task Completed',
      body: `Task "${v.taskTitle}" has been automatically completed.`,
    }),
    he: (v) => ({
      title: 'המשימה הושלמה',
      body: `המשימה "${v.taskTitle}" הושלמה באופן אוטומטי.`,
    }),
  },
  confirmCompletion: {
    en: (v) => ({
      title: 'Confirm Completion',
      body: `${v.fixerName} marked "${v.taskTitle}" as done ${v.hours}h ago. Please confirm completion.`,
    }),
    he: (v) => ({
      title: 'אשר השלמה',
      body: `${v.fixerName} סימן את "${v.taskTitle}" כהושלמה לפני ${v.hours} שעות. אנא אשר את ההשלמה.`,
    }),
  },
  newMessage: {
    en: () => ({
      title: 'New message',
      body: '',
    }),
    he: () => ({
      title: 'הודעה חדשה',
      body: '',
    }),
  },
  certificationApproved: {
    en: (v) => ({
      title: 'Certification Approved!',
      body: `Your ${v.category} certification has been approved. A badge will now appear on your profile.`,
    }),
    he: (v) => ({
      title: 'ההסמכה אושרה!',
      body: `ההסמכה שלך ב${v.category} אושרה. תג יופיע כעת בפרופיל שלך.`,
    }),
  },
  certificationRejected: {
    en: (v) => ({
      title: 'Certification Rejected',
      body: `Your ${v.category} certification was not approved.${v.reason ? ` Reason: ${v.reason}` : ''} You can re-upload a new document.`,
    }),
    he: (v) => ({
      title: 'ההסמכה נדחתה',
      body: `ההסמכה שלך ב${v.category} לא אושרה.${v.reason ? ` סיבה: ${v.reason}` : ''} תוכל להעלות מסמך חדש.`,
    }),
  },
};

// ── Public API ────────────────────────────────────────────────────────────────

export async function getNotificationText(
  userId: string,
  key: keyof typeof messages,
  vars: Record<string, string> = {},
): Promise<NotificationText> {
  const lang = await getUserLanguage(userId);
  const fn = messages[key]?.[lang];
  if (!fn) return { title: key, body: '' };
  return fn(vars);
}

export { getUserLanguage };
