jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts ? `${key}(${JSON.stringify(opts)})` : key,
  }),
}));

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  default: () => ({ width: 1280, height: 800 }),
}));

import React from 'react';
import { render } from '@testing-library/react-native';
import FilterBar from '../FilterBar';
import { CATEGORY_LIST } from '../../constants/categories';

const baseProps = {
  viewMode: 'list' as const,
  onViewModeChange: jest.fn(),
  radius: 10,
  onRadiusChange: jest.fn(),
  selectedCategories: [] as never[],
  onToggleCategory: jest.fn(),
  priceMin: 0,
  priceMax: 5000,
  onPriceChange: jest.fn(),
  forceExpanded: true,
};

describe('FilterBar i18n', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders Map and List toggle labels from i18n keys', () => {
    const { getByText } = render(<FilterBar {...baseProps} />);
    expect(getByText('discovery.filterBar.map')).toBeTruthy();
    expect(getByText('discovery.filterBar.list')).toBeTruthy();
  });

  it('shows budgetAny key when prices are at defaults', () => {
    const { getByText } = render(<FilterBar {...baseProps} />);
    expect(getByText(/discovery\.filterBar\.budgetAny/)).toBeTruthy();
  });

  it('shows budgetRange key when prices deviate from defaults', () => {
    const { queryByText, getByText } = render(
      <FilterBar {...baseProps} priceMin={200} priceMax={1000} />,
    );
    expect(queryByText('discovery.filterBar.budgetAny')).toBeNull();
    expect(getByText(/discovery\.filterBar\.budgetRange/)).toBeTruthy();
  });

  it('renders each category chip with its getCategoryLabel key', () => {
    const { getByText } = render(<FilterBar {...baseProps} />);
    CATEGORY_LIST.forEach(({ value }) => {
      expect(getByText(`categories.${value.toLowerCase()}`)).toBeTruthy();
    });
  });

  it('shows clearFilters key when hasActiveFilters is true', () => {
    const { getByText } = render(
      <FilterBar {...baseProps} hasActiveFilters onClearFilters={jest.fn()} />,
    );
    expect(getByText('discovery.filterBar.clearFilters')).toBeTruthy();
  });
});
