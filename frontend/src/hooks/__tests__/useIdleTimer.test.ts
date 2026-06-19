import { renderHook, act } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { useIdleTimer } from '../useIdleTimer';

const EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'] as const;

// window is not available in the node test environment — provide a mock for the
// full test file lifetime so React's deferred cleanup can always reference it.
const mockAddEvent = jest.fn();
const mockRemoveEvent = jest.fn();

beforeAll(() => {
  (global as Record<string, unknown>).window = {
    addEventListener: mockAddEvent,
    removeEventListener: mockRemoveEvent,
  };
});

afterAll(() => {
  delete (global as Record<string, unknown>).window;
});

describe('useIdleTimer', () => {
  const originalOS = Platform.OS;

  beforeEach(() => {
    jest.useFakeTimers();
    mockAddEvent.mockReset();
    mockRemoveEvent.mockReset();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    Object.defineProperty(Platform, 'OS', { value: originalOS, configurable: true });
  });

  describe('on native (Platform.OS !== "web")', () => {
    beforeEach(() => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
    });

    it('does not register event listeners', () => {
      const onIdle = jest.fn();
      renderHook(() => useIdleTimer({ onIdle, timeoutMs: 1000, enabled: true }));
      expect(mockAddEvent).not.toHaveBeenCalled();
    });

    it('does not fire onIdle after timeoutMs', () => {
      const onIdle = jest.fn();
      renderHook(() => useIdleTimer({ onIdle, timeoutMs: 1000, enabled: true }));
      act(() => { jest.advanceTimersByTime(1000); });
      expect(onIdle).not.toHaveBeenCalled();
    });
  });

  describe('on web with enabled = false', () => {
    beforeEach(() => {
      Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    });

    it('does not register event listeners', () => {
      const onIdle = jest.fn();
      renderHook(() => useIdleTimer({ onIdle, timeoutMs: 1000, enabled: false }));
      expect(mockAddEvent).not.toHaveBeenCalled();
    });

    it('does not fire onIdle after timeoutMs', () => {
      const onIdle = jest.fn();
      renderHook(() => useIdleTimer({ onIdle, timeoutMs: 1000, enabled: false }));
      act(() => { jest.advanceTimersByTime(1000); });
      expect(onIdle).not.toHaveBeenCalled();
    });
  });

  describe('on web with enabled = true', () => {
    beforeEach(() => {
      Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    });

    it('registers all 5 event listeners with passive flag', () => {
      const onIdle = jest.fn();
      renderHook(() => useIdleTimer({ onIdle, timeoutMs: 5000, enabled: true }));
      expect(mockAddEvent).toHaveBeenCalledTimes(5);
      const registeredEvents = mockAddEvent.mock.calls.map((call: unknown[]) => call[0]);
      EVENTS.forEach((e) => expect(registeredEvents).toContain(e));
      mockAddEvent.mock.calls.forEach((call: unknown[]) => {
        expect(call[2]).toEqual({ passive: true });
      });
    });

    it('fires onIdle after timeoutMs with no activity', () => {
      const onIdle = jest.fn();
      renderHook(() => useIdleTimer({ onIdle, timeoutMs: 5000, enabled: true }));
      expect(onIdle).not.toHaveBeenCalled();
      act(() => { jest.advanceTimersByTime(5000); });
      expect(onIdle).toHaveBeenCalledTimes(1);
    });

    it('reset() defers the timer when called before expiry', () => {
      const onIdle = jest.fn();
      const { result } = renderHook(() =>
        useIdleTimer({ onIdle, timeoutMs: 5000, enabled: true }),
      );
      act(() => { jest.advanceTimersByTime(4000); });
      expect(onIdle).not.toHaveBeenCalled();
      act(() => { result.current.reset(); });
      act(() => { jest.advanceTimersByTime(4000); });
      expect(onIdle).not.toHaveBeenCalled();
      act(() => { jest.advanceTimersByTime(1001); });
      expect(onIdle).toHaveBeenCalledTimes(1);
    });

    it('removes all event listeners and cancels timer on unmount', () => {
      const onIdle = jest.fn();
      const { unmount } = renderHook(() =>
        useIdleTimer({ onIdle, timeoutMs: 5000, enabled: true }),
      );
      unmount();
      expect(mockRemoveEvent).toHaveBeenCalledTimes(5);
      const removedEvents = mockRemoveEvent.mock.calls.map((call: unknown[]) => call[0]);
      EVENTS.forEach((e) => expect(removedEvents).toContain(e));
      act(() => { jest.advanceTimersByTime(5000); });
      expect(onIdle).not.toHaveBeenCalled();
    });

    it('removes listeners and cancels timer when enabled switches to false', () => {
      const onIdle = jest.fn();
      const { rerender } = renderHook(
        ({ enabled }: { enabled: boolean }) =>
          useIdleTimer({ onIdle, timeoutMs: 5000, enabled }),
        { initialProps: { enabled: true } },
      );
      expect(mockAddEvent).toHaveBeenCalledTimes(5);
      rerender({ enabled: false });
      expect(mockRemoveEvent).toHaveBeenCalledTimes(5);
      act(() => { jest.advanceTimersByTime(5000); });
      expect(onIdle).not.toHaveBeenCalled();
    });
  });
});
