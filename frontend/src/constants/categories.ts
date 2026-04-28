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
} as const satisfies CategoryFallbackMetadata;

export function isCategory(value: unknown): value is Category {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(CATEGORY_METADATA, value);
}

export function getCategoryMetadata(value: unknown): CategoryMetadata | CategoryFallbackMetadata {
  return isCategory(value) ? CATEGORY_METADATA[value] : DEFAULT_CATEGORY_METADATA;
}
