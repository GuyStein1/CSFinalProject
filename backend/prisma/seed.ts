import { PrismaClient, Category, BidStatus } from '@prisma/client';
import { randomUUID } from 'crypto';

if (process.env.NODE_ENV === 'production') {
  throw new Error('Seed script cannot run in production');
}

const prisma = new PrismaClient();

// Placeholder users — replace firebase_uid with real UIDs in Phase 2
const users = [
  // Requesters (indices 0–2)
  {
    firebase_uid: 'PLACEHOLDER_1',
    full_name: 'Avi Cohen',
    email: 'avi@example.com',
    phone_number: '0501111111',
    specializations: [] as Category[],
  },
  {
    firebase_uid: 'PLACEHOLDER_2',
    full_name: 'Dana Levi',
    email: 'dana@example.com',
    phone_number: '0502222222',
    specializations: [] as Category[],
  },
  {
    firebase_uid: 'PLACEHOLDER_3',
    full_name: 'Yossi Mizrahi',
    email: 'yossi@example.com',
    phone_number: '0503333333',
    specializations: [] as Category[],
  },
  // Fixers (indices 3–5)
  {
    firebase_uid: 'PLACEHOLDER_4',
    full_name: 'Noa Peretz',
    email: 'noa@example.com',
    phone_number: '0504444444',
    specializations: [Category.ELECTRICITY, Category.PLUMBING],
  },
  {
    firebase_uid: 'PLACEHOLDER_5',
    full_name: 'Rami Ben-David',
    email: 'rami@example.com',
    phone_number: '0505555555',
    specializations: [Category.CARPENTRY, Category.PAINTING],
  },
  {
    firebase_uid: 'PLACEHOLDER_6',
    full_name: 'Shira Katz',
    email: 'shira@example.com',
    phone_number: '0506666666',
    specializations: [Category.MOVING, Category.GENERAL],
  },
];

// 12 tasks with real Haifa-area coordinates (lon, lat)
// ST_MakePoint expects (longitude, latitude)
const taskSeedData = [
  // ELECTRICITY x2
  {
    title: 'תיקון נורות פלואורסצנט בסלון',
    description: 'שלוש נורות פלואורסצנט בסלון כבו ולא מגיבות להחלפת נורה. ייתכן שבעיה בבלסט. מחפש חשמלאי מוסמך.',
    category: Category.ELECTRICITY,
    suggested_price: 200,
    general_location_name: 'הדר הכרמל, חיפה',
    exact_address: 'רחוב הרצל 45, הדר הכרמל',
    lon: 35.0061,
    lat: 32.8165,
  },
  {
    title: 'החלפת לוח חשמל ביתי',
    description: 'לוח החשמל ישן ומחזיק 3 פיוזים שנשרפו. צריך החלפה מלאה ועדכון לתקנים הנוכחיים.',
    category: Category.ELECTRICITY,
    suggested_price: 1500,
    general_location_name: 'כרמל מרכז, חיפה',
    exact_address: 'שדרות הנשיא 12, כרמל מרכז',
    lon: 35.0000,
    lat: 32.7940,
  },
  // PLUMBING x2
  {
    title: 'תיקון ברז מטפטף במטבח',
    description: 'ברז המטבח מטפטף כל הלילה. כבר החלפתי את האטם אבל לא עזר. צריך אינסטלטור שיבדוק.',
    category: Category.PLUMBING,
    suggested_price: 150,
    general_location_name: 'נווה שאנן, חיפה',
    exact_address: 'רחוב חסן שוקרי 8, נווה שאנן',
    lon: 35.0100,
    lat: 32.8010,
  },
  {
    title: 'פתיחת סתימה בכיור האמבטיה',
    description: 'הכיור מתנקז לאט מאוד כבר שבוע. ניסיתי סודה לשתייה וחומץ — לא עזר. צריך פתיחה מקצועית.',
    category: Category.PLUMBING,
    suggested_price: 120,
    general_location_name: 'מרכז העיר, חיפה',
    exact_address: 'רחוב נתניהו 3, מרכז העיר',
    lon: 35.0010,
    lat: 32.8175,
  },
  // CARPENTRY x2
  {
    title: 'הרכבת ארון בגדים PAX מאיקאה',
    description: 'ארון PAX בן 3 דלתות, כולל מראות. כל החלקים קיימים. צריך הרכבה מקצועית וקיבוע לקיר.',
    category: Category.CARPENTRY,
    suggested_price: 350,
    general_location_name: 'המושבה הגרמנית, חיפה',
    exact_address: 'רחוב בן גוריון 22, המושבה הגרמנית',
    lon: 34.9890,
    lat: 32.8140,
  },
  {
    title: 'תיקון דלת עץ שאינה נסגרת',
    description: 'דלת כניסה לחדר ילדים נתקעת במסגרת. ייתכן שהמסגרת עקמה בגלל לחות. צריך כוונון או קיצוץ.',
    category: Category.CARPENTRY,
    suggested_price: 180,
    general_location_name: "ואדי ניסנס, חיפה",
    exact_address: "רחוב חאלצה 5, ואדי ניסנס",
    lon: 34.9970,
    lat: 32.8155,
  },
  // PAINTING x2
  {
    title: 'צביעת חדר שינה (3 קירות)',
    description: 'חדר שינה כ-15 מ"ר. צבע לבן על גבי צבע ישן שקולף במקצת. נדרש סיוד, שפכטל קל וצביעה.',
    category: Category.PAINTING,
    suggested_price: 800,
    general_location_name: 'בת גלים, חיפה',
    exact_address: 'רחוב יפו 18, בת גלים',
    lon: 34.9780,
    lat: 32.8280,
  },
  {
    title: 'צביעת גדר בטון בחצר',
    description: 'גדר בטון באורך כ-20 מטר סביב החצר האחורית. צבע קיים קולף. צריך ניקוי, הכנה וצביעה בצבע חוץ.',
    category: Category.PAINTING,
    suggested_price: 600,
    general_location_name: 'קריית חיים, חיפה',
    exact_address: 'רחוב ביאליק 40, קריית חיים',
    lon: 35.0780,
    lat: 32.8330,
  },
  // MOVING x2
  {
    title: 'עזרה בהובלת דירה 3 חדרים',
    description: 'מעבר דירה בתוך חיפה. כ-30 קופסאות + ריהוט (ספות, מיטות, ארונות). צריך 2-3 פועלים ומשאית.',
    category: Category.MOVING,
    suggested_price: 1800,
    general_location_name: 'כרמל צרפתי, חיפה',
    exact_address: 'רחוב מוריה 55, כרמל צרפתי',
    lon: 34.9890,
    lat: 32.7870,
  },
  {
    title: 'העברת ספה ומקרר לקומה שנייה',
    description: 'ספה תלת-מושבית ומקרר גדול צריכים לעלות לקומה שנייה ללא מעלית. צריך 2 אנשים חזקים.',
    category: Category.MOVING,
    suggested_price: 400,
    general_location_name: 'רומימה, חיפה',
    exact_address: 'רחוב יגאל אלון 9, רומימה',
    lon: 35.0190,
    lat: 32.8120,
  },
  // GENERAL x2
  {
    title: 'ניקיון מעמיק אחרי שיפוץ',
    description: 'דירת 4 חדרים לאחר שיפוץ — אבק בנייה, שאריות גבס, כתמי צבע. צריך ניקיון מקצועי מלא.',
    category: Category.GENERAL,
    suggested_price: 700,
    general_location_name: 'קריית אתא, חיפה',
    exact_address: 'רחוב ויצמן 14, קריית אתא',
    lon: 35.1060,
    lat: 32.8100,
  },
  {
    title: 'הרכבת מוצרי בית שונים',
    description: 'צריך להרכיב: מדף קיר, מנורת עמידה, ומסגרת מיטה. כל הציוד קיים. עבודה של כמה שעות.',
    category: Category.GENERAL,
    suggested_price: 250,
    general_location_name: 'קריית אליעזר, חיפה',
    exact_address: 'רחוב שמחה גולן 7, קריית אליעזר',
    lon: 34.9820,
    lat: 32.8050,
  },
];

async function main() {
  console.log('Seeding users...');
  const createdUsers: { id: string }[] = [];
  for (const user of users) {
    const created = await prisma.user.upsert({
      where: { firebase_uid: user.firebase_uid },
      update: {},
      create: user,
      select: { id: true },
    });
    createdUsers.push(created);
  }

  const [requester1, requester2, requester3, fixer1, fixer2, fixer3] = createdUsers;

  // Requester assignment: tasks 0-3 → requester1, 4-7 → requester2, 8-11 → requester3
  const requesterIds = [
    requester1.id, requester1.id, requester1.id, requester1.id,
    requester2.id, requester2.id, requester2.id, requester2.id,
    requester3.id, requester3.id, requester3.id, requester3.id,
  ];

  console.log('Clearing existing tasks and bids...');
  await prisma.bid.deleteMany();
  await prisma.task.deleteMany();

  console.log('Seeding tasks...');
  const taskIds: string[] = [];

  for (let i = 0; i < taskSeedData.length; i++) {
    const task = taskSeedData[i];
    const id = randomUUID();
    taskIds.push(id);

    await prisma.$executeRaw`
      INSERT INTO "Task" (
        id,
        requester_id,
        title,
        description,
        media_urls,
        category,
        suggested_price,
        status,
        general_location_name,
        exact_address,
        coordinates,
        created_at,
        updated_at
      ) VALUES (
        ${id}::uuid,
        ${requesterIds[i]}::uuid,
        ${task.title},
        ${task.description},
        ARRAY[]::text[],
        ${task.category}::"Category",
        ${task.suggested_price},
        'OPEN'::"TaskStatus",
        ${task.general_location_name},
        ${task.exact_address},
        ST_SetSRID(ST_MakePoint(${task.lon}::float8, ${task.lat}::float8), 4326),
        NOW(),
        NOW()
      )
    `;
  }

  console.log('Seeding bids...');
  // 2-3 bids per task, rotating through the 3 fixers
  const fixerIds = [fixer1.id, fixer2.id, fixer3.id];
  const bidPriceOffsets = [-50, 0, 100]; // variety in offered prices

  for (let t = 0; t < taskIds.length; t++) {
    const task = taskSeedData[t];
    const basePrice = task.suggested_price ?? 300;
    const numBids = t % 3 === 0 ? 3 : 2; // alternate between 2 and 3 bids

    for (let b = 0; b < numBids; b++) {
      const fixerIndex = (t + b) % 3;

      // Skip if fixer is the requester (can't bid on own task)
      const requesterId = requesterIds[t];
      if (fixerIds[fixerIndex] === requesterId) continue;

      await prisma.bid.create({
        data: {
          task_id: taskIds[t],
          fixer_id: fixerIds[fixerIndex],
          offered_price: basePrice + bidPriceOffsets[b],
          description: `אני ${['חשמלאי', 'אינסטלטור', 'נגר', 'צבעי', 'פועל הובלה', 'איש כללי'][fixerIndex % 6]} מנוסה עם ${5 + fixerIndex * 3} שנות ניסיון. אוכל להגיע תוך יומיים.`,
          status: BidStatus.PENDING,
        },
      });
    }
  }

  console.log('Seed complete');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
