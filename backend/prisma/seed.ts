import { PrismaClient, Category, BidStatus } from '@prisma/client';
import { randomUUID } from 'crypto';

if (process.env.NODE_ENV === 'production') {
  throw new Error('Seed script cannot run in production');
}

const prisma = new PrismaClient();

// Test users — Firebase accounts created with password: guyguyguy
const users = [
  // Requesters (indices 0–2)
  {
    firebase_uid: 'KHrDwz3JbtYKa8G1xOg0PasvAnM2',
    full_name: 'Neta Bivas',
    email: 'neta@example.com',
    phone_number: '0501111111',
    specializations: [] as Category[],
  },
  {
    firebase_uid: 'kPGmjrkSPeh1AOFm6w1zGjnTtph1',
    full_name: 'Guy Stein',
    email: 'stein@example.com',
    phone_number: '0502222222',
    specializations: [] as Category[],
  },
  {
    firebase_uid: '9zZC1yHuOwOHhe1HmkcY87FzcRy2',
    full_name: 'Guy Zilberstein',
    email: 'zilber@example.com',
    phone_number: '0503333333',
    specializations: [] as Category[],
  },
  // Fixers (indices 3–5)
  {
    firebase_uid: 'IOc5riuFpOYEx0vJXljsPy8SdTP2',
    full_name: 'Guy Shick',
    email: 'shick@example.com',
    phone_number: '0504444444',
    specializations: [Category.ELECTRICITY, Category.PLUMBING],
  },
  {
    firebase_uid: 'sUegu2QaPlVsiYlUdvcK0LuJWOf1',
    full_name: 'Guy Toledo',
    email: 'guy@example.com',
    phone_number: '0505555555',
    specializations: [Category.ASSEMBLY, Category.PAINTING],
  },
  {
    firebase_uid: 'N2g4806EevaLyi3qkEtExowPgck2',
    full_name: 'Avi Ron',
    email: 'avi@example.com',
    phone_number: '0506666666',
    specializations: [Category.MOVING, Category.CLEANING],
  },
];

// 16 tasks with real Haifa-area coordinates (lon, lat)
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
    lon: 35.0061, lat: 32.8165,
  },
  {
    title: 'החלפת לוח חשמל ביתי',
    description: 'לוח החשמל ישן ומחזיק 3 פיוזים שנשרפו. צריך החלפה מלאה ועדכון לתקנים הנוכחיים.',
    category: Category.ELECTRICITY,
    suggested_price: 1500,
    general_location_name: 'כרמל מרכז, חיפה',
    exact_address: 'שדרות הנשיא 12, כרמל מרכז',
    lon: 35.0000, lat: 32.7940,
  },
  // PLUMBING x2
  {
    title: 'תיקון ברז מטפטף במטבח',
    description: 'ברז המטבח מטפטף כל הלילה. כבר החלפתי את האטם אבל לא עזר. צריך אינסטלטור שיבדוק.',
    category: Category.PLUMBING,
    suggested_price: 150,
    general_location_name: 'נווה שאנן, חיפה',
    exact_address: 'רחוב חסן שוקרי 8, נווה שאנן',
    lon: 35.0100, lat: 32.8010,
  },
  {
    title: 'פתיחת סתימה בכיור האמבטיה',
    description: 'הכיור מתנקז לאט מאוד כבר שבוע. ניסיתי סודה לשתייה וחומץ — לא עזר. צריך פתיחה מקצועית.',
    category: Category.PLUMBING,
    suggested_price: 120,
    general_location_name: 'מרכז העיר, חיפה',
    exact_address: 'רחוב נתניהו 3, מרכז העיר',
    lon: 35.0010, lat: 32.8175,
  },
  // ASSEMBLY x2
  {
    title: 'הרכבת ארון בגדים PAX מאיקאה',
    description: 'ארון PAX בן 3 דלתות, כולל מראות. כל החלקים קיימים. צריך הרכבה מקצועית וקיבוע לקיר.',
    category: Category.ASSEMBLY,
    suggested_price: 350,
    general_location_name: 'המושבה הגרמנית, חיפה',
    exact_address: 'רחוב בן גוריון 22, המושבה הגרמנית',
    lon: 34.9890, lat: 32.8140,
  },
  {
    title: 'הרכבת שולחן עבודה וכיסא משרדי',
    description: 'שולחן עבודה מאיקאה BEKANT וכיסא MARKUS — שניהם בקופסאות. צריך הרכבה מסודרת.',
    category: Category.ASSEMBLY,
    suggested_price: 180,
    general_location_name: "ואדי ניסנס, חיפה",
    exact_address: "רחוב חאלצה 5, ואדי ניסנס",
    lon: 34.9970, lat: 32.8155,
  },
  // PAINTING x2
  {
    title: 'צביעת חדר שינה (3 קירות)',
    description: 'חדר שינה כ-15 מ"ר. צבע לבן על גבי צבע ישן שקולף במקצת. נדרש סיוד, שפכטל קל וצביעה.',
    category: Category.PAINTING,
    suggested_price: 800,
    general_location_name: 'בת גלים, חיפה',
    exact_address: 'רחוב יפו 18, בת גלים',
    lon: 34.9780, lat: 32.8280,
  },
  {
    title: 'צביעת גדר בטון בחצר',
    description: 'גדר בטון באורך כ-20 מטר סביב החצר האחורית. צבע קיים קולף. צריך ניקוי, הכנה וצביעה בצבע חוץ.',
    category: Category.PAINTING,
    suggested_price: 600,
    general_location_name: 'קריית חיים, חיפה',
    exact_address: 'רחוב ביאליק 40, קריית חיים',
    lon: 35.0780, lat: 32.8330,
  },
  // MOVING x2
  {
    title: 'עזרה בהובלת דירה 3 חדרים',
    description: 'מעבר דירה בתוך חיפה. כ-30 קופסאות + ריהוט (ספות, מיטות, ארונות). צריך 2-3 פועלים ומשאית.',
    category: Category.MOVING,
    suggested_price: 1800,
    general_location_name: 'כרמל צרפתי, חיפה',
    exact_address: 'רחוב מוריה 55, כרמל צרפתי',
    lon: 34.9890, lat: 32.7870,
  },
  {
    title: 'העברת ספה ומקרר לקומה שנייה',
    description: 'ספה תלת-מושבית ומקרר גדול צריכים לעלות לקומה שנייה ללא מעלית. צריך 2 אנשים חזקים.',
    category: Category.MOVING,
    suggested_price: 400,
    general_location_name: 'רומימה, חיפה',
    exact_address: 'רחוב יגאל אלון 9, רומימה',
    lon: 35.0190, lat: 32.8120,
  },
  // CLEANING x2
  {
    title: 'ניקיון מעמיק אחרי שיפוץ',
    description: 'דירת 4 חדרים לאחר שיפוץ — אבק בנייה, שאריות גבס, כתמי צבע. צריך ניקיון מקצועי מלא.',
    category: Category.CLEANING,
    suggested_price: 700,
    general_location_name: 'קריית אתא, חיפה',
    exact_address: 'רחוב ויצמן 14, קריית אתא',
    lon: 35.1060, lat: 32.8100,
  },
  {
    title: 'ניקיון שוטף לדירת 3 חדרים',
    description: 'צריך ניקיון שבועי קבוע לדירת 3 חדרים, כולל מטבח ושני חדרי שירותים.',
    category: Category.CLEANING,
    suggested_price: 250,
    general_location_name: 'קריית אליעזר, חיפה',
    exact_address: 'רחוב שמחה גולן 7, קריית אליעזר',
    lon: 34.9820, lat: 32.8050,
  },
  // MOUNTING x2
  {
    title: 'תלייה של טלוויזיה 65 אינץ על הקיר',
    description: 'טלוויזיה Samsung 65" צריכה להיות מוצמדת לקיר בסלון. יש לי את הברגים, צריך מישהו עם כלים.',
    category: Category.MOUNTING,
    suggested_price: 200,
    general_location_name: 'הדר הכרמל, חיפה',
    exact_address: 'רחוב ביאליק 12, הדר הכרמל',
    lon: 35.0040, lat: 32.8180,
  },
  {
    title: 'התקנת מוטות וילון בחדר שינה',
    description: 'שני חלונות בחדר שינה צריכים מוטות וילון. יש לי את כל החומרים, צריך מישהו שיתקין.',
    category: Category.MOUNTING,
    suggested_price: 120,
    general_location_name: 'נווה שאנן, חיפה',
    exact_address: 'רחוב חסן שוקרי 22, נווה שאנן',
    lon: 35.0120, lat: 32.8020,
  },
  // OUTDOORS x2
  {
    title: 'גיזום וסידור גינה קטנה',
    description: 'גינה קטנה בחזית הבית — עשבייה, שיחים שגדלו חסר שליטה, ופינת קומפוסט להסרה.',
    category: Category.OUTDOORS,
    suggested_price: 300,
    general_location_name: 'קריית חיים, חיפה',
    exact_address: 'רחוב רוטשילד 5, קריית חיים',
    lon: 35.0800, lat: 32.8350,
  },
  {
    title: 'שטיפת רחבה וכניסה בלחץ מים',
    description: 'רחבת הכניסה לבית ומדרגות חיצוניות מלוכלכות. צריך שטיפה בלחץ גבוה.',
    category: Category.OUTDOORS,
    suggested_price: 200,
    general_location_name: 'כרמל צרפתי, חיפה',
    exact_address: 'רחוב מוריה 30, כרמל צרפתי',
    lon: 34.9910, lat: 32.7890,
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

  // Distribute tasks across requesters
  const requesterIds = [
    requester1.id, requester1.id, requester1.id, requester1.id,
    requester2.id, requester2.id, requester2.id, requester2.id,
    requester3.id, requester3.id, requester3.id, requester3.id,
    requester1.id, requester1.id, requester2.id, requester3.id,
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
        id, requester_id, title, description, media_urls, category,
        suggested_price, status, general_location_name, exact_address,
        coordinates, created_at, updated_at
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
        NOW(), NOW()
      )
    `;
  }

  console.log('Seeding bids...');
  const fixerIds = [fixer1.id, fixer2.id, fixer3.id];
  const bidPriceOffsets = [-50, 0, 100];

  for (let t = 0; t < taskIds.length; t++) {
    const task = taskSeedData[t];
    const basePrice = task.suggested_price ?? 300;
    const numBids = t % 3 === 0 ? 3 : 2;

    for (let b = 0; b < numBids; b++) {
      const fixerIndex = (t + b) % 3;
      const requesterId = requesterIds[t];
      if (fixerIds[fixerIndex] === requesterId) continue;

      await prisma.bid.create({
        data: {
          task_id: taskIds[t],
          fixer_id: fixerIds[fixerIndex],
          offered_price: basePrice + bidPriceOffsets[b],
          description: `אני בעל מקצוע מנוסה עם ${5 + fixerIndex * 3} שנות ניסיון. אוכל להגיע תוך יומיים ולסיים את העבודה ביום אחד.`,
          status: BidStatus.PENDING,
        },
      });
    }
  }

  console.log('✓ Seed complete — 6 users, 16 tasks, bids created');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
