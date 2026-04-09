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

// ─── Task status distribution ───
// status is assigned in main() based on index:
//   0-34  → OPEN (35 tasks)
//   35-42 → IN_PROGRESS (8 tasks, bid accepted)
//   43-47 → COMPLETED (5 tasks, with reviews)
//   48-49 → CANCELED (2 tasks)

const taskSeedData = [
  // ══════════ OPEN — TEL AVIV (12) ══════════
  { title: 'תיקון נזילה בצנרת המקלחת', description: 'מים נוזלים מהקיר ליד המקלחת. כנראה צינור סדוק. צריך אינסטלטור דחוף.', category: Category.PLUMBING, suggested_price: 250, general_location_name: 'נווה צדק, תל אביב', exact_address: 'רחוב שבזי 15, נווה צדק', lon: 34.7670, lat: 32.0610 },
  { title: 'הרכבת ארון KALLAX מאיקאה', description: 'ארון KALLAX 4x4 קוביות. צריך הרכבה וקיבוע לקיר. כל החלקים קיימים.', category: Category.ASSEMBLY, suggested_price: 200, general_location_name: 'פלורנטין, תל אביב', exact_address: 'רחוב פלורנטין 30, תל אביב', lon: 34.7720, lat: 32.0565 },
  { title: 'צביעת סלון ומסדרון', description: 'סלון כ-25 מ"ר ומסדרון. צבע קיים מתקלף. צריך שפכטל, יסוד וצביעה בלבן.', category: Category.PAINTING, suggested_price: 1200, general_location_name: 'לב העיר, תל אביב', exact_address: 'רחוב דיזנגוף 120, תל אביב', lon: 34.7745, lat: 32.0780 },
  { title: 'תליית טלוויזיה 55 אינץ', description: 'טלוויזיה LG 55" צריכה תלייה על קיר גבס. יש תושבת, צריך מישהו עם ניסיון.', category: Category.MOUNTING, suggested_price: 180, general_location_name: 'הצפון הישן, תל אביב', exact_address: 'רחוב ארלוזורוב 60, תל אביב', lon: 34.7810, lat: 32.0850 },
  { title: 'החלפת שקעי חשמל ישנים', description: '8 שקעים ישנים בדירה שצריך להחליף לשקעים בטיחותיים חדשים. חשמלאי מוסמך בלבד.', category: Category.ELECTRICITY, suggested_price: 400, general_location_name: 'רוטשילד, תל אביב', exact_address: 'שדרות רוטשילד 45, תל אביב', lon: 34.7740, lat: 32.0645 },
  { title: 'הובלת דירת סטודיו', description: 'מעבר מרחוב אלנבי לרמת אביב. מיטה, שולחן, 15 קופסאות. צריך רכב ו-2 אנשים.', category: Category.MOVING, suggested_price: 800, general_location_name: 'רמת אביב, תל אביב', exact_address: 'רחוב אינשטיין 10, רמת אביב', lon: 34.7925, lat: 32.1130 },
  { title: 'ניקוי דירה לפני כניסה', description: 'דירת 3 חדרים ריקה. צריך שטיפה מלאה, ניקוי חלונות ומטבח לפני כניסת דיירים.', category: Category.CLEANING, suggested_price: 450, general_location_name: 'יפו, תל אביב', exact_address: 'רחוב ירושלים 20, יפו', lon: 34.7560, lat: 32.0490 },
  { title: 'גיזום עצים במרפסת גג', description: 'שני עצי לימון ושיחי יסמין במרפסת גג שצריכים גיזום וטיפול.', category: Category.OUTDOORS, suggested_price: 300, general_location_name: 'כרם התימנים, תל אביב', exact_address: 'רחוב נחלת בנימין 50, תל אביב', lon: 34.7700, lat: 32.0660 },
  { title: 'הרכבת מטבח IKEA מלא', description: 'מטבח KNOXHULT מלא — ארונות עליונים ותחתונים, משטח, כיור. צריך הרכבה מקצועית.', category: Category.ASSEMBLY, suggested_price: 2500, general_location_name: 'שכונת מונטיפיורי, תל אביב', exact_address: 'רחוב מונטיפיורי 25, תל אביב', lon: 34.7710, lat: 32.0625 },
  { title: 'תיקון דוד שמש', description: 'הדוד לא מחמם. כנראה בעיה בגוף החימום או בטרמוסטט. צריך טכנאי מנוסה.', category: Category.PLUMBING, suggested_price: 350, general_location_name: 'רמת החייל, תל אביב', exact_address: 'רחוב הברזל 22, רמת החייל', lon: 34.8100, lat: 32.1060 },
  { title: 'צביעת חדר ילדים בצבעים', description: 'חדר ילדים 12 מ"ר. רוצה קיר אחד כחול ושלושה לבנים. צבע אקרילי.', category: Category.PAINTING, suggested_price: 600, general_location_name: 'בבלי, תל אביב', exact_address: 'רחוב לה גארדיה 40, בבלי', lon: 34.7870, lat: 32.0930 },
  { title: 'תליית 3 מדפים ומראה', description: 'שלושה מדפי עץ ומראה גדולה לתלייה על קיר בטון בסלון.', category: Category.MOUNTING, suggested_price: 220, general_location_name: 'שינקין, תל אביב', exact_address: 'רחוב שינקין 35, תל אביב', lon: 34.7735, lat: 32.0720 },

  // ══════════ OPEN — JERUSALEM (6) ══════════
  { title: 'תיקון שיש שבור במטבח', description: 'פינת השיש במטבח נשברה. צריך תיקון או החלפה חלקית של משטח השיש.', category: Category.ASSEMBLY, suggested_price: 500, general_location_name: 'רחביה, ירושלים', exact_address: 'רחוב עזה 18, רחביה', lon: 35.2130, lat: 31.7720 },
  { title: 'צביעת חדר מדרגות (3 קומות)', description: 'חדר מדרגות בבניין 3 קומות. קירות מלוכלכים וצבע מתקלף. צריך הכנה וצביעה.', category: Category.PAINTING, suggested_price: 2000, general_location_name: 'קטמון, ירושלים', exact_address: 'רחוב רחל אמנו 15, קטמון', lon: 35.2050, lat: 31.7600 },
  { title: 'התקנת מזגן עילי', description: 'מזגן Electra 1.5 כ"ס חדש. צריך התקנה כולל חיבור חשמל וניקוז.', category: Category.ELECTRICITY, suggested_price: 800, general_location_name: 'בית הכרם, ירושלים', exact_address: 'רחוב הרב הרצוג 30, בית הכרם', lon: 35.1940, lat: 31.7710 },
  { title: 'פתיחת סתימה בקו הראשי', description: 'כל הניקוזים בדירה איטיים. כנראה סתימה בקו הראשי. צריך ניקוי בלחץ.', category: Category.PLUMBING, suggested_price: 300, general_location_name: 'תלפיות, ירושלים', exact_address: 'רחוב יד חרוצים 8, תלפיות', lon: 35.2230, lat: 31.7520 },
  { title: 'הובלת פסנתר לקומה 4', description: 'פסנתר זקוף צריך לעלות לקומה רביעית ללא מעלית. צריך צוות מנוסה עם ציוד.', category: Category.MOVING, suggested_price: 1500, general_location_name: 'נחלאות, ירושלים', exact_address: 'רחוב בצלאל 14, נחלאות', lon: 35.2100, lat: 31.7800 },
  { title: 'ניקוי אחרי שיפוץ חמור', description: 'דירה עברה שיפוץ מלא — שאריות בטון, אבק, כתמי צבע בכל מקום. 5 חדרים.', category: Category.CLEANING, suggested_price: 900, general_location_name: 'גילה, ירושלים', exact_address: 'רחוב הלל 42, גילה', lon: 35.1870, lat: 31.7380 },

  // ══════════ OPEN — HAIFA (5) ══════════
  { title: 'תיקון נורות פלואורסצנט בסלון', description: 'שלוש נורות פלואורסצנט בסלון כבו ולא מגיבות להחלפת נורה. ייתכן שבעיה בבלסט.', category: Category.ELECTRICITY, suggested_price: 200, general_location_name: 'הדר הכרמל, חיפה', exact_address: 'רחוב הרצל 45, הדר הכרמל', lon: 35.0061, lat: 32.8165 },
  { title: 'הרכבת ארון בגדים PAX מאיקאה', description: 'ארון PAX בן 3 דלתות, כולל מראות. כל החלקים קיימים. צריך הרכבה מקצועית וקיבוע לקיר.', category: Category.ASSEMBLY, suggested_price: 350, general_location_name: 'המושבה הגרמנית, חיפה', exact_address: 'רחוב בן גוריון 22, המושבה הגרמנית', lon: 34.9890, lat: 32.8140 },
  { title: 'צביעת חדר שינה (3 קירות)', description: 'חדר שינה כ-15 מ"ר. צבע לבן על גבי צבע ישן שקולף. נדרש סיוד, שפכטל קל וצביעה.', category: Category.PAINTING, suggested_price: 800, general_location_name: 'בת גלים, חיפה', exact_address: 'רחוב יפו 18, בת גלים', lon: 34.9780, lat: 32.8280 },
  { title: 'עזרה בהובלת דירה 3 חדרים', description: 'מעבר דירה בתוך חיפה. כ-30 קופסאות + ריהוט. צריך 2-3 פועלים ומשאית.', category: Category.MOVING, suggested_price: 1800, general_location_name: 'כרמל צרפתי, חיפה', exact_address: 'רחוב מוריה 55, כרמל צרפתי', lon: 34.9890, lat: 32.7870 },
  { title: 'ניקיון מעמיק אחרי שיפוץ', description: 'דירת 4 חדרים לאחר שיפוץ — אבק בנייה, שאריות גבס, כתמי צבע.', category: Category.CLEANING, suggested_price: 700, general_location_name: 'קריית אתא', exact_address: 'רחוב ויצמן 14, קריית אתא', lon: 35.1060, lat: 32.8100 },

  // ══════════ OPEN — BEER SHEVA (4) ══════════
  { title: 'החלפת ברזים באמבטיה', description: 'שני ברזים ישנים באמבטיה צריכים החלפה. כולל ברז כיור וברז מקלחת.', category: Category.PLUMBING, suggested_price: 400, general_location_name: 'מרכז העיר, באר שבע', exact_address: 'רחוב העצמאות 30, באר שבע', lon: 34.7913, lat: 31.2518 },
  { title: 'הרכבת 2 מזגנים', description: 'שני מזגנים חדשים לחדרי שינה. צריך התקנה כולל צנרת וחשמל.', category: Category.ELECTRICITY, suggested_price: 1200, general_location_name: 'שכונה ד, באר שבע', exact_address: 'שדרות רגר 50, באר שבע', lon: 34.7870, lat: 31.2450 },
  { title: 'צביעת דירה 4 חדרים', description: 'דירה שלמה צריכה צביעה מחדש. כ-80 מ"ר. צבע לבן סטנדרטי.', category: Category.PAINTING, suggested_price: 3000, general_location_name: 'רמות, באר שבע', exact_address: 'רחוב יהודה הלוי 12, רמות', lon: 34.7750, lat: 31.2650 },
  { title: 'הרכבת ארונות מטבח', description: '6 ארונות עליונים ו-4 תחתונים. כל החלקים קיימים. צריך הרכבה מקצועית.', category: Category.ASSEMBLY, suggested_price: 1500, general_location_name: 'נווה זאב, באר שבע', exact_address: 'רחוב בן צבי 8, נווה זאב', lon: 34.8100, lat: 31.2350 },

  // ══════════ OPEN — NETANYA / SHARON (4) ══════════
  { title: 'תליית מנורות בכניסה', description: 'שתי מנורות קיר לתלייה בכניסה לבית. חיבור חשמלי קיים.', category: Category.MOUNTING, suggested_price: 150, general_location_name: 'מרכז, נתניה', exact_address: 'רחוב הרצל 80, נתניה', lon: 34.8570, lat: 32.3215 },
  { title: 'שטיפת חצר ומדרגות בלחץ', description: 'חצר ומדרגות חיצוניות מלוכלכות. צריך שטיפה בלחץ מים גבוה.', category: Category.OUTDOORS, suggested_price: 250, general_location_name: 'הרצליה פיתוח', exact_address: 'רחוב המדע 5, הרצליה פיתוח', lon: 34.8050, lat: 32.1620 },
  { title: 'הרכבת מיטת קומותיים לילדים', description: 'מיטת קומותיים מאיקאה MYDAL. כל החלקים קיימים. צריך הרכבה בטוחה.', category: Category.ASSEMBLY, suggested_price: 250, general_location_name: 'כפר סבא', exact_address: 'רחוב ויצמן 30, כפר סבא', lon: 34.9060, lat: 32.1780 },
  { title: 'תיקון נזילה מהתקרה', description: 'כתם רטוב בתקרה של חדר האמבטיה. כנראה צנרת מהשכן למעלה.', category: Category.PLUMBING, suggested_price: 300, general_location_name: 'רעננה', exact_address: 'רחוב אחוזה 50, רעננה', lon: 34.8700, lat: 32.1840 },

  // ══════════ OPEN — SOUTH & NORTH (4) ══════════
  { title: 'תיקון מזגן מרכזי', description: 'המזגן המרכזי לא מקרר כמו פעם. צריך בדיקה, ניקוי ואולי מילוי גז.', category: Category.ELECTRICITY, suggested_price: 500, general_location_name: 'אילת', exact_address: 'שדרות התמרים 20, אילת', lon: 34.9510, lat: 29.5577 },
  { title: 'הרכבת גדר עץ לגינה', description: 'גדר עץ באורך 15 מטר סביב הגינה. כולל עמודים והתקנה.', category: Category.OUTDOORS, suggested_price: 2000, general_location_name: 'נהריה', exact_address: 'רחוב הגעתון 30, נהריה', lon: 35.0930, lat: 33.0060 },
  { title: 'החלפת צנרת ישנה', description: 'צנרת מים ישנה מברזל שצריך להחליף לפלסטיק. כ-20 מטר.', category: Category.PLUMBING, suggested_price: 2500, general_location_name: 'עכו', exact_address: 'רחוב הדייגים 12, עכו העתיקה', lon: 35.0740, lat: 32.9280 },
  { title: 'התקנת תאורת גן סולארית', description: '12 פנסי גן סולאריים לאורך שביל הכניסה. כולל חפירה קלה.', category: Category.ELECTRICITY, suggested_price: 350, general_location_name: 'צפת', exact_address: 'רחוב ירושלים 15, צפת', lon: 35.4960, lat: 32.9650 },

  // ══════════ IN_PROGRESS (8 tasks — indices 35-42) ══════════
  { title: 'החלפת דלת כניסה לדירה', description: 'דלת כניסה ישנה לדירה. צריך הסרה והתקנת דלת חדשה כולל מנעול.', category: Category.ASSEMBLY, suggested_price: 800, general_location_name: 'רמת השרון', exact_address: 'רחוב סוקולוב 20, רמת השרון', lon: 34.8390, lat: 32.1460 },
  { title: 'צביעת מרפסת שמש', description: 'מרפסת שמש כ-8 מ"ר. רצפה ותקרה. צבע חוץ עמיד.', category: Category.PAINTING, suggested_price: 500, general_location_name: 'הוד השרון', exact_address: 'רחוב הבנים 15, הוד השרון', lon: 34.8900, lat: 32.1570 },
  { title: 'ניקוי בית אחרי חופשה', description: 'בית נופש 4 חדרים שצריך ניקוי מלא אחרי אורחים. כולל מטבח ובריכה.', category: Category.CLEANING, suggested_price: 600, general_location_name: 'אילת', exact_address: 'רחוב האלמוגים 8, אילת', lon: 34.9480, lat: 29.5540 },
  { title: 'הובלת ריהוט מאשדוד', description: 'ספה, שולחן אוכל ו-6 כיסאות. הובלה מאשדוד לבאר שבע.', category: Category.MOVING, suggested_price: 700, general_location_name: 'אשדוד', exact_address: 'שדרות הנשיאים 12, אשדוד', lon: 34.6500, lat: 31.8010 },
  { title: 'תלייה של ארון צף בסלון', description: 'ארון צף 180 ס"מ לתלייה על קיר גבס מחוזק. כבד — צריך עיגון מקצועי.', category: Category.MOUNTING, suggested_price: 300, general_location_name: 'אשקלון', exact_address: 'רחוב הנשיא 40, אשקלון', lon: 34.5715, lat: 31.6690 },
  { title: 'גיזום דקלים בחצר', description: 'שלושה דקלים גבוהים בחצר שצריכים גיזום עליות יבשות. צריך סולם גבוה.', category: Category.OUTDOORS, suggested_price: 450, general_location_name: 'דימונה', exact_address: 'רחוב הרצל 25, דימונה', lon: 35.0330, lat: 31.0680 },
  { title: 'בניית פרגולה מעץ במרפסת', description: 'מרפסת 4x3 מטר. רוצה פרגולה מעץ אורן עם הצללה. כולל חומרים.', category: Category.OUTDOORS, suggested_price: 3500, general_location_name: 'עין כרם, ירושלים', exact_address: 'רחוב עין כרם 5, ירושלים', lon: 35.1610, lat: 31.7650 },
  { title: 'תליית ארון אמבטיה צף', description: 'ארון אמבטיה צף 80 ס"מ. צריך תלייה על קיר בטון מחוזק. כולל חיבור אינסטלציה.', category: Category.MOUNTING, suggested_price: 350, general_location_name: 'מאה שערים, ירושלים', exact_address: 'רחוב מאה שערים 60, ירושלים', lon: 35.2240, lat: 31.7860 },

  // ══════════ COMPLETED (5 tasks — indices 43-47) ══════════
  { title: 'תלייה של טלוויזיה 65 אינץ', description: 'טלוויזיה Samsung 65" צריכה תלייה. יש ברגים, צריך מישהו עם כלים.', category: Category.MOUNTING, suggested_price: 200, general_location_name: 'הדר הכרמל, חיפה', exact_address: 'רחוב ביאליק 12, הדר הכרמל', lon: 35.0040, lat: 32.8180 },
  { title: 'גיזום וסידור גינה קטנה', description: 'גינה קטנה בחזית הבית — עשבייה, שיחים שגדלו חסר שליטה.', category: Category.OUTDOORS, suggested_price: 300, general_location_name: 'קריית חיים, חיפה', exact_address: 'רחוב רוטשילד 5, קריית חיים', lon: 35.0800, lat: 32.8350 },
  { title: 'תיקון ברז מטפטף במטבח', description: 'ברז המטבח מטפטף. כבר החלפתי את האטם אבל לא עזר.', category: Category.PLUMBING, suggested_price: 150, general_location_name: 'נווה שאנן, חיפה', exact_address: 'רחוב חסן שוקרי 8, נווה שאנן', lon: 35.0100, lat: 32.8010 },
  { title: 'ניקוי שטיחים ב-3 חדרים', description: 'שלושה שטיחים גדולים בחדרי שינה. ניקוי מקצועי עם מכונה.', category: Category.CLEANING, suggested_price: 350, general_location_name: 'עיר העתיקה, באר שבע', exact_address: 'רחוב שמשון 18, באר שבע', lon: 34.7950, lat: 31.2480 },
  { title: 'צביעת בית כפרי (חוץ)', description: 'בית קטן בכפר. צביעת חוץ של 4 קירות. צבע אקרילי לחוץ.', category: Category.PAINTING, suggested_price: 4000, general_location_name: 'כפר ורדים', exact_address: 'רחוב הכלנית 8, כפר ורדים', lon: 35.2630, lat: 32.9900 },

  // ══════════ CANCELED (2 tasks — indices 48-49) ══════════
  { title: 'העברת תכולת חדר', description: 'העברה של רהיטים מחדר אחד לשני באותו בניין. ארון, מיטה, שולחן.', category: Category.MOVING, suggested_price: 200, general_location_name: 'שכונה ג, באר שבע', exact_address: "רחוב ז'בוטינסקי 5, באר שבע", lon: 34.7990, lat: 31.2540 },
  { title: 'ניקוי בית אחרי שיפוץ', description: 'בית 5 חדרים אחרי שיפוץ מלא. אבק בנייה בכל מקום.', category: Category.CLEANING, suggested_price: 800, general_location_name: 'טבריה', exact_address: 'רחוב הגליל 20, טבריה', lon: 35.5310, lat: 32.7940 },
];

// Reviews for completed tasks
const reviewTexts = [
  { rating: 5, comment: 'עבודה מצוינת! הגיע בזמן, מקצועי מאוד ומחיר הוגן. ממליץ בחום.' },
  { rating: 5, comment: 'שירות מעולה מההתחלה ועד הסוף. הגינה נראית מדהים עכשיו.' },
  { rating: 4, comment: 'עשה עבודה טובה. קצת איחר אבל התוצאה מצוינת.' },
  { rating: 5, comment: 'מקצוען אמיתי. תיקן את הבעיה תוך חצי שעה. תודה רבה!' },
  { rating: 4, comment: 'עבודה יפה ומסודרת. הצבע נראה נהדר. קצת יותר יקר מהצפוי אבל שווה.' },
];

const bidDescriptions = [
  'אני בעל מקצוע מנוסה עם 8 שנות ניסיון. אוכל להגיע תוך יומיים ולסיים ביום אחד.',
  'מתמחה בתחום הזה כבר 5 שנים. יש לי את כל הכלים הנדרשים. אשמח לעזור!',
  'עבדתי על עבודות דומות רבות. אני יכול להתחיל השבוע. מחיר סופי כולל חומרים.',
  'בעל ניסיון רב. ביצעתי מעל 200 עבודות דומות. אגיע עם כל הציוד.',
  'מוסמך ומבוטח. אשמח לתת הצעה ולתאם ביקור ראשוני ללא עלות.',
];

function getTaskStatus(index: number): 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED' {
  if (index >= 48) return 'CANCELED';
  if (index >= 43) return 'COMPLETED';
  if (index >= 35) return 'IN_PROGRESS';
  return 'OPEN';
}

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
  const reqPool = [requester1.id, requester2.id, requester3.id];
  const fixerIds = [fixer1.id, fixer2.id, fixer3.id];

  console.log('Clearing existing data...');
  await prisma.review.deleteMany();
  await prisma.message.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.bid.deleteMany();
  await prisma.task.deleteMany();

  console.log('Seeding tasks...');
  const taskIds: string[] = [];
  const requesterIds: string[] = [];

  for (let i = 0; i < taskSeedData.length; i++) {
    const task = taskSeedData[i];
    const id = randomUUID();
    const requesterId = reqPool[i % 3];
    taskIds.push(id);
    requesterIds.push(requesterId);
    const status = getTaskStatus(i);

    await prisma.$executeRaw`
      INSERT INTO "Task" (
        id, requester_id, title, description, media_urls, category,
        suggested_price, status, general_location_name, exact_address,
        coordinates, created_at, updated_at
      ) VALUES (
        ${id}::uuid,
        ${requesterId}::uuid,
        ${task.title},
        ${task.description},
        ARRAY[]::text[],
        ${task.category}::"Category",
        ${task.suggested_price},
        ${status}::"TaskStatus",
        ${task.general_location_name},
        ${task.exact_address},
        ST_SetSRID(ST_MakePoint(${task.lon}::float8, ${task.lat}::float8), 4326),
        NOW() - (${Math.floor(Math.random() * 14) + 1} * interval '1 day'),
        NOW()
      )
    `;
  }

  console.log('Seeding bids...');
  let totalBids = 0;
  let totalReviews = 0;

  for (let t = 0; t < taskIds.length; t++) {
    const task = taskSeedData[t];
    const basePrice = task.suggested_price ?? 300;
    const requesterId = requesterIds[t];
    const status = getTaskStatus(t);

    // Determine how many bids and which one is accepted
    const numBids = (t % 3 === 0) ? 3 : 2;
    // For IN_PROGRESS and COMPLETED tasks, first valid bid is accepted
    const needsAccepted = status === 'IN_PROGRESS' || status === 'COMPLETED';
    let acceptedOne = false;

    for (let b = 0; b < numBids; b++) {
      const fixerIndex = (t + b) % 3;
      if (fixerIds[fixerIndex] === requesterId) continue;

      const priceOffset = [-50, 0, 80, -30, 50][b % 5];
      let bidStatus: BidStatus = BidStatus.PENDING;

      if (needsAccepted && !acceptedOne) {
        bidStatus = BidStatus.ACCEPTED;
        acceptedOne = true;
      } else if (needsAccepted && acceptedOne) {
        bidStatus = BidStatus.REJECTED;
      }

      await prisma.bid.create({
        data: {
          task_id: taskIds[t],
          fixer_id: fixerIds[fixerIndex],
          offered_price: Math.max(50, basePrice + priceOffset),
          description: bidDescriptions[b % bidDescriptions.length],
          status: bidStatus,
        },
      });
      totalBids++;

      // Create review for completed tasks (requester reviews the accepted fixer)
      if (status === 'COMPLETED' && bidStatus === BidStatus.ACCEPTED) {
        const reviewData = reviewTexts[t % reviewTexts.length];
        await prisma.review.create({
          data: {
            task_id: taskIds[t],
            reviewer_id: requesterId,
            reviewee_id: fixerIds[fixerIndex],
            rating: reviewData.rating,
            comment: reviewData.comment,
          },
        });
        totalReviews++;
      }
    }
  }

  const openCount = taskSeedData.filter((_, i) => getTaskStatus(i) === 'OPEN').length;
  const inProgressCount = taskSeedData.filter((_, i) => getTaskStatus(i) === 'IN_PROGRESS').length;
  const completedCount = taskSeedData.filter((_, i) => getTaskStatus(i) === 'COMPLETED').length;
  const canceledCount = taskSeedData.filter((_, i) => getTaskStatus(i) === 'CANCELED').length;

  console.log(`✓ Seed complete — 6 users, ${taskIds.length} tasks (${openCount} open, ${inProgressCount} in-progress, ${completedCount} completed, ${canceledCount} canceled), ${totalBids} bids, ${totalReviews} reviews`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
