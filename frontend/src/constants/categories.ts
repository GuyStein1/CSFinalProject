/* eslint-disable @typescript-eslint/no-var-requires */
import type { ImageSourcePropType } from 'react-native';
import type { ComponentProps } from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

export const CATEGORY_VALUES = [
  'ASSEMBLY',
  'MOUNTING',
  'MOVING',
  'PAINTING',
  'PLUMBING',
  'ELECTRICITY',
  'OUTDOORS',
  'CLEANING',
  'OTHER',
] as const;

export type Category = (typeof CATEGORY_VALUES)[number];
export type MaterialCommunityIconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export interface CategoryMetadata {
  readonly value: Category;
  readonly label: string;
  readonly icon: MaterialCommunityIconName;
  readonly color: string;
  readonly soft: string;
  readonly bg: string;
  readonly image: ImageSourcePropType;
  readonly description: string;
  readonly examples: readonly string[];
  readonly detailCopy: string;
  readonly commonTasks: readonly string[];
  readonly starterPrompt: string;
}

export interface CategoryFallbackMetadata extends Omit<CategoryMetadata, 'value' | 'image'> {
  readonly value: 'OTHER';
}

export const CATEGORY_METADATA = {
  ASSEMBLY: {
    value: 'ASSEMBLY',
    label: 'Assembly',
    icon: 'hammer-screwdriver',
    color: '#7B61FF',
    soft: '#EFECFF',
    bg: '#EFECFF',
    image: require('../../assets/Assembly.jpg'),
    description: 'Flat-pack furniture, shelving, and home items.',
    examples: ['IKEA wardrobes', 'bed frames', 'shelving units'],
    detailCopy: 'Get help turning boxed furniture and loose parts into something sturdy, level, and ready to use.',
    commonTasks: ['IKEA wardrobes', 'bed frames', 'desks', 'shelving units'],
    starterPrompt: 'Tell us what needs assembling, how many items there are, and whether the boxes are already in the room.',
  },
  MOUNTING: {
    value: 'MOUNTING',
    label: 'Mounting',
    icon: 'television',
    color: '#0D7C6E',
    soft: '#E0F5F3',
    bg: '#E0F5F3',
    image: require('../../assets/Mounting.jpg'),
    description: 'TVs, shelves, mirrors, and wall fixtures.',
    examples: ['TV brackets', 'floating shelves', 'mirrors'],
    detailCopy: 'Find a fixer who can hang heavy or precise items cleanly, safely, and at the right height.',
    commonTasks: ['TV brackets', 'floating shelves', 'mirrors', 'curtain rods'],
    starterPrompt: 'Share what you want mounted, the wall type if you know it, and whether you already have the hardware.',
  },
  MOVING: {
    value: 'MOVING',
    label: 'Moving',
    icon: 'truck-delivery',
    color: '#1E8449',
    soft: '#E6F4EC',
    bg: '#E6F4EC',
    image: require('../../assets/Moving.jpg'),
    description: 'Apartment, office, or single-piece moving help.',
    examples: ['small apartments', 'office moves', 'heavy items'],
    detailCopy: 'Book local muscle for small moves, awkward items, and short-distance transport without calling a full moving company.',
    commonTasks: ['small apartment moves', 'single heavy item', 'office moves', 'furniture transport'],
    starterPrompt: 'List the pickup and drop-off areas, stairs or elevator details, and the largest items.',
  },
  PAINTING: {
    value: 'PAINTING',
    label: 'Painting',
    icon: 'brush',
    color: '#C0392B',
    soft: '#FCECEA',
    bg: '#FCECEA',
    image: require('../../assets/Painting.jpg'),
    description: 'Room touch-ups, small walls, and paint repairs.',
    examples: ['accent walls', 'touch-ups', 'door frames'],
    detailCopy: 'Refresh a room, repair scuffs, or finish small paint jobs with clean edges and less mess.',
    commonTasks: ['room refresh', 'touch-ups', 'doors and trim', 'accent walls'],
    starterPrompt: 'Describe the surface, approximate size, paint condition, and whether you already have paint.',
  },
  PLUMBING: {
    value: 'PLUMBING',
    label: 'Plumbing',
    icon: 'water-pump',
    color: '#2E86C1',
    soft: '#E4F2FB',
    bg: '#E4F2FB',
    image: require('../../assets/Plumbing.jpg'),
    description: 'Leaks, clogs, faucets, and basic pipe fixes.',
    examples: ['leaky taps', 'sink clogs', 'shower heads'],
    detailCopy: 'Handle everyday plumbing issues before they become expensive problems, from dripping taps to clogged sinks.',
    commonTasks: ['leaky tap', 'clogged sink', 'shower head', 'toilet issue'],
    starterPrompt: 'Explain the leak or blockage, when it started, and add a photo of the fixture or pipe area.',
  },
  ELECTRICITY: {
    value: 'ELECTRICITY',
    label: 'Electricity',
    icon: 'lightning-bolt',
    color: '#D4900A',
    soft: '#FEF3D7',
    bg: '#FEF3D7',
    image: require('../../assets/Electricity.jpg'),
    description: 'Light fixtures, outlets, and small electrical repairs.',
    examples: ['light fixtures', 'outlets', 'switches'],
    detailCopy: 'Get small electrical jobs handled by someone comfortable with fixtures, switches, and safe installation basics.',
    commonTasks: ['light fixture', 'outlet', 'switch', 'ceiling fan'],
    starterPrompt: 'Share what needs installing or replacing, the current fixture state, and any photos of wiring or wall plates.',
  },
  OUTDOORS: {
    value: 'OUTDOORS',
    label: 'Outdoors',
    icon: 'tree-outline',
    color: '#27AE60',
    soft: '#E8F8EF',
    bg: '#E8F8EF',
    image: require('../../assets/Outdoors.jpg'),
    description: 'Gardens, yards, patios, and exterior fixes.',
    examples: ['yard cleanup', 'patio repairs', 'garden tasks'],
    detailCopy: 'Tidy, repair, or improve outdoor spaces so balconies, yards, and patios are easier to use.',
    commonTasks: ['yard cleanup', 'patio repair', 'garden task', 'balcony setup'],
    starterPrompt: 'Tell us the outdoor area size, what needs clearing or fixing, and whether tools are available on site.',
  },
  CLEANING: {
    value: 'CLEANING',
    label: 'Cleaning',
    icon: 'broom',
    color: '#8E44AD',
    soft: '#F4ECF7',
    bg: '#F4ECF7',
    image: require('../../assets/Cleaning.jpg'),
    description: 'Deep cleans, move-out cleans, and post-renovation cleanup.',
    examples: ['deep cleaning', 'move-out cleaning', 'after renovation'],
    detailCopy: 'Bring in help for serious cleaning jobs that need more than a quick tidy-up.',
    commonTasks: ['deep clean', 'move-out clean', 'post-renovation cleanup', 'appliance cleaning'],
    starterPrompt: 'Describe the space, number of rooms, key problem areas, and whether supplies are provided.',
  },
  OTHER: {
    value: 'OTHER',
    label: 'Other',
    icon: 'wrench',
    color: '#7A8B96',
    soft: '#E9E2D5',
    bg: '#E9E2D5',
    image: require('../../assets/fixit-logo.png'),
    description: 'General home tasks that don\'t fit other categories.',
    examples: ['odd jobs', 'minor repairs', 'custom requests'],
    detailCopy: 'Use this for home tasks that do not fit one of the main categories.',
    commonTasks: ['odd jobs', 'minor repairs', 'custom requests'],
    starterPrompt: 'Describe the task clearly and add photos so fixers can understand the job.',
  },
} as const satisfies Record<Category, CategoryMetadata>;

export const CATEGORY_LIST: readonly CategoryMetadata[] = CATEGORY_VALUES.map((value) => CATEGORY_METADATA[value]);

export const CATEGORY_COLORS = {
  ASSEMBLY: CATEGORY_METADATA.ASSEMBLY.color,
  MOUNTING: CATEGORY_METADATA.MOUNTING.color,
  MOVING: CATEGORY_METADATA.MOVING.color,
  PAINTING: CATEGORY_METADATA.PAINTING.color,
  PLUMBING: CATEGORY_METADATA.PLUMBING.color,
  ELECTRICITY: CATEGORY_METADATA.ELECTRICITY.color,
  OUTDOORS: CATEGORY_METADATA.OUTDOORS.color,
  CLEANING: CATEGORY_METADATA.CLEANING.color,
  OTHER: CATEGORY_METADATA.OTHER.color,
} satisfies Record<Category, string>;

export const DEFAULT_CATEGORY_METADATA = {
  value: 'OTHER',
  label: 'Other',
  icon: 'wrench',
  color: '#7A8B96',
  soft: '#E9E2D5',
  bg: '#E9E2D5',
  description: 'General home task.',
  examples: [],
  detailCopy: 'Use this for home tasks that do not fit one of the main categories.',
  commonTasks: [],
  starterPrompt: 'Describe the task clearly and add photos so fixers can understand the job.',
} as const satisfies CategoryFallbackMetadata;

export function isCategory(value: unknown): value is Category {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(CATEGORY_METADATA, value);
}

export function getCategoryMetadata(value: unknown): CategoryMetadata | CategoryFallbackMetadata {
  return isCategory(value) ? CATEGORY_METADATA[value] : DEFAULT_CATEGORY_METADATA;
}
