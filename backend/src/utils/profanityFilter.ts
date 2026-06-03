/**
 * Profanity filter for review comments.
 * Supports English and Hebrew.
 */

const ENGLISH_WORDS = [
  'fuck', 'fucking', 'fucker', 'fucked', 'fucks',
  'shit', 'shitty', 'bullshit',
  'ass', 'asshole', 'assholes',
  'bitch', 'bitches',
  'damn', 'damned',
  'dick', 'dicks',
  'cunt', 'cunts',
  'bastard', 'bastards',
  'whore', 'whores',
  'slut', 'sluts',
  'piss', 'pissed',
  'crap', 'crappy',
  'douche', 'douchebag',
  'motherfucker', 'motherfucking',
  'retard', 'retarded',
  'idiot', 'idiots',
  'stupid',
  'moron',
  'sucker',
  'stfu', 'wtf', 'lmfao',
];

const HEBREW_WORDS = [
  'זונה',
  'שרמוטה',
  'מניאק',
  'חרא',
  'כוס',
  'כוסאמק',
  'כוסאימק',
  'כוסאחתק',
  'כוסאמאשלך',
  'זין',
  'בןזונה',
  'בתזונה',
  'מזדיין',
  'מזדיינת',
  'תמות',
  'יאללעזאזל',
  'אידיוט',
  'מפגר',
  'מפגרת',
  'טמבל',
  'חמור',
  'בהמה',
  'מטומטם',
  'מטומטמת',
  'דביל',
  'דבילה',
  'חתיכתמטומטם',
  'לךתמות',
  'יבןכלב',
  'מתחנגל',
  'ימתחנגל',
  'מוצץ',
  'ימוצץ',
  'קוקסינל',
  'חתיכתקוקסינל',
  'חתיכתבןשרמוטה',
  'גנב',
  'גנבמזדיין',
  'יקוקסינל',
  'הומו',
  'יהומו',
  'בןאלפזונות',
  'מזדייןבתחת',
  'שימות',
  'חאפר',
  'חתיכתמתחנגל',
  'חתיכתמוצץ',
  'מוות',
];

/**
 * Checks whether the given text contains profanity.
 *
 * English: uses word-boundary regex so "class" won't match "ass".
 * Hebrew: removes spaces from text and checks for substring matches
 * against a normalized (space-stripped) word list, since Hebrew has
 * no reliable regex word-boundary support.
 */
export function containsProfanity(text: string): boolean {
  const lower = text.toLowerCase();

  // English: word-boundary check
  for (const word of ENGLISH_WORDS) {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    if (regex.test(lower)) return true;
  }

  // Hebrew: strip spaces and check substrings
  const stripped = lower.replace(/\s+/g, '');
  for (const word of HEBREW_WORDS) {
    if (stripped.includes(word)) return true;
  }

  return false;
}

export const PROFANITY_ERROR_MESSAGE =
  'Comment contains inappropriate language / התגובה מכילה שפה לא הולמת';
