import React from 'react';
import { Animated } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import RequesterTutorialScreen from '../AppTutorialScreen';

// Disable animations so they complete synchronously
const syncTiming = (value: Animated.Value, config: Animated.TimingAnimationConfig) => ({
  start: (cb?: (result: { finished: boolean }) => void) => {
    value.setValue(config.toValue as number);
    cb?.({ finished: true });
  },
  stop: jest.fn(),
  reset: jest.fn(),
});

const syncSpring = (value: Animated.Value | Animated.ValueXY, config: Animated.SpringAnimationConfig) => ({
  start: (cb?: (result: { finished: boolean }) => void) => {
    if (value instanceof Animated.Value) {
      value.setValue(config.toValue as number);
    }
    cb?.({ finished: true });
  },
  stop: jest.fn(),
  reset: jest.fn(),
});

const syncStagger = (_delay: number, animations: Animated.CompositeAnimation[]) => ({
  start: (cb?: (result: { finished: boolean }) => void) => {
    animations.forEach((a) => a.start());
    cb?.({ finished: true });
  },
  stop: jest.fn(),
  reset: jest.fn(),
});

Object.defineProperty(Animated, 'timing', { value: syncTiming, writable: true });
Object.defineProperty(Animated, 'spring', { value: syncSpring, writable: true });
Object.defineProperty(Animated, 'stagger', { value: syncStagger, writable: true });

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
  initReactI18next: { type: '3rdParty', init: jest.fn() },
}));

jest.mock('../../context/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', isRTL: false, changeLanguage: jest.fn() }),
}));

jest.mock('expo-linear-gradient', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { View } = require('react-native');
  return { LinearGradient: View };
});

describe('RequesterTutorialScreen', () => {
  const onComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the tutorial title', () => {
    const { getByText } = render(<RequesterTutorialScreen onComplete={onComplete} />);
    expect(getByText('tutorial.requester.title')).toBeTruthy();
  });

  it('renders all 3 step labels', () => {
    const { getByText } = render(<RequesterTutorialScreen onComplete={onComplete} />);
    expect(getByText('tutorial.requester.step1.label')).toBeTruthy();
    expect(getByText('tutorial.requester.step2.label')).toBeTruthy();
    expect(getByText('tutorial.requester.step3.label')).toBeTruthy();
  });

  it('renders the Get Started button', () => {
    const { getByText } = render(<RequesterTutorialScreen onComplete={onComplete} />);
    expect(getByText('tutorial.getStarted')).toBeTruthy();
  });

  it('calls onComplete when Get Started is pressed', () => {
    const { getByText } = render(<RequesterTutorialScreen onComplete={onComplete} />);
    fireEvent.press(getByText('tutorial.getStarted'));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('renders the kicker text', () => {
    const { getByText } = render(<RequesterTutorialScreen onComplete={onComplete} />);
    expect(getByText('tutorial.requester.kicker')).toBeTruthy();
  });
});
