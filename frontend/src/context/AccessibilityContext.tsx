import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';

export interface AccessibilityState {
  fontScale: number;          // 1 = normal, up to 1.5
  highContrast: boolean;
  monochrome: boolean;
  readableFont: boolean;
  highlightLinks: boolean;
  highlightHeadings: boolean;
  largeCursor: boolean;
  stopAnimations: boolean;
  keyboardNav: boolean;
  textSpacing: boolean;
}

interface AccessibilityContextValue {
  state: AccessibilityState;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
  toggle: (key: keyof Omit<AccessibilityState, 'fontScale'>) => void;
  resetAll: () => void;
}

const defaultState: AccessibilityState = {
  fontScale: 1,
  highContrast: false,
  monochrome: false,
  readableFont: false,
  highlightLinks: false,
  highlightHeadings: false,
  largeCursor: false,
  stopAnimations: false,
  keyboardNav: false,
  textSpacing: false,
};

const AccessibilityContext = createContext<AccessibilityContextValue>({
  state: defaultState,
  increaseFontSize: () => {},
  decreaseFontSize: () => {},
  toggle: () => {},
  resetAll: () => {},
});

export const useAccessibility = () => useContext(AccessibilityContext);

/* ------------------------------------------------------------------ */
/*  Web-only: inject a <style> block + toggle CSS classes on <html>   */
/*                                                                    */
/*  React Native Web renders <div> with inline styles + ARIA roles,   */
/*  NOT semantic HTML.  All selectors below account for that.         */
/* ------------------------------------------------------------------ */
const STYLE_ID = 'a11y-widget-styles';

function injectWebStyles() {
  if (Platform.OS !== 'web') return;
  if (document.getElementById(STYLE_ID)) return;

  const css = `
    /* ---------- High Contrast ---------- */
    html.a11y-high-contrast,
    html.a11y-high-contrast body,
    html.a11y-high-contrast #root {
      background-color: #000 !important;
    }
    html.a11y-high-contrast #root * {
      color: #fff !important;
      border-color: #555 !important;
      background-color: transparent !important;
    }
    html.a11y-high-contrast #root [role="banner"],
    html.a11y-high-contrast #root [role="navigation"],
    html.a11y-high-contrast #root [data-testid] {
      background-color: #111 !important;
    }
    html.a11y-high-contrast [role="link"],
    html.a11y-high-contrast [role="button"],
    html.a11y-high-contrast a,
    html.a11y-high-contrast button {
      color: #ff0 !important;
    }
    /* Keep the a11y widget itself visible */
    html.a11y-high-contrast [data-a11y-widget] *,
    html.a11y-high-contrast [data-a11y-widget] {
      all: revert;
    }

    /* ---------- Monochrome ---------- */
    html.a11y-monochrome #root {
      filter: grayscale(100%) !important;
    }

    /* ---------- Readable Font ---------- */
    html.a11y-readable-font #root * {
      font-family: Arial, Helvetica, sans-serif !important;
    }

    /* ---------- Highlight Links ---------- */
    html.a11y-highlight-links #root [role="link"],
    html.a11y-highlight-links #root a {
      outline: 3px solid #f7cf7a !important;
      outline-offset: 2px !important;
      text-decoration: underline !important;
    }

    /* ---------- Highlight Headings ---------- */
    html.a11y-highlight-headings #root [role="heading"],
    html.a11y-highlight-headings #root h1,
    html.a11y-highlight-headings #root h2,
    html.a11y-highlight-headings #root h3,
    html.a11y-highlight-headings #root h4,
    html.a11y-highlight-headings #root h5,
    html.a11y-highlight-headings #root h6,
    html.a11y-highlight-headings #root [data-a11y-heading="true"] {
      outline: 3px solid #1C3C56 !important;
      outline-offset: 2px !important;
      background-color: rgba(28, 60, 86, 0.12) !important;
    }

    /* ---------- Large Cursor ---------- */
    html.a11y-large-cursor,
    html.a11y-large-cursor * {
      cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48'%3E%3Cpath d='M4 4l16 40 6-16 16-6z' fill='%23000' stroke='%23fff' stroke-width='2'/%3E%3C/svg%3E") 4 4, auto !important;
    }

    /* ---------- Stop Animations ---------- */
    html.a11y-stop-animations *,
    html.a11y-stop-animations *::before,
    html.a11y-stop-animations *::after {
      animation-duration: 0s !important;
      animation-delay: 0s !important;
      transition-duration: 0s !important;
      transition-delay: 0s !important;
    }

    /* ---------- Keyboard Navigation ---------- */
    html.a11y-keyboard-nav *:focus {
      outline: 3px solid #F1B545 !important;
      outline-offset: 2px !important;
    }

    /* ---------- Text Spacing ---------- */
    html.a11y-text-spacing #root * {
      letter-spacing: 0.12em !important;
      word-spacing: 0.16em !important;
      line-height: 1.8 !important;
    }
  `;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = css;
  document.head.appendChild(style);
}

const classMap: Record<string, string> = {
  highContrast: 'a11y-high-contrast',
  monochrome: 'a11y-monochrome',
  readableFont: 'a11y-readable-font',
  highlightLinks: 'a11y-highlight-links',
  highlightHeadings: 'a11y-highlight-headings',
  largeCursor: 'a11y-large-cursor',
  stopAnimations: 'a11y-stop-animations',
  keyboardNav: 'a11y-keyboard-nav',
  textSpacing: 'a11y-text-spacing',
};

/**
 * Scan the DOM for elements that visually look like headings
 * (large font-size + bold weight) and tag them so CSS can target them.
 * React Native Web renders everything as <div> with inline styles,
 * so semantic selectors (h1-h6, [role="heading"]) don't work.
 */
function tagVisualHeadings(enabled: boolean) {
  if (Platform.OS !== 'web') return;
  const root = document.getElementById('root');
  if (!root) return;

  // Remove old tags first
  root.querySelectorAll('[data-a11y-heading]').forEach(el => {
    el.removeAttribute('data-a11y-heading');
  });

  if (!enabled) return;

  // Walk all elements inside #root and check computed styles
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  let node: Node | null = walker.nextNode();
  while (node) {
    const el = node as HTMLElement;
    // Skip the a11y widget itself
    if (el.closest('[data-a11y-widget]')) {
      node = walker.nextNode();
      continue;
    }
    const cs = window.getComputedStyle(el);
    const fontSize = parseFloat(cs.fontSize);
    const fontWeight = parseInt(cs.fontWeight, 10) || 400;
    // Heading heuristic: font >= 17px AND weight >= 600
    if (fontSize >= 17 && fontWeight >= 600 && el.textContent?.trim()) {
      // Only tag leaf-level text containers (no children that are also tagged)
      const hasText = Array.from(el.childNodes).some(
        c => c.nodeType === Node.TEXT_NODE && c.textContent?.trim()
      );
      if (hasText) {
        el.setAttribute('data-a11y-heading', 'true');
      }
    }
    node = walker.nextNode();
  }
}

function syncWebClasses(state: AccessibilityState) {
  if (Platform.OS !== 'web') return;
  const html = document.documentElement;
  for (const [key, cls] of Object.entries(classMap)) {
    const val = state[key as keyof AccessibilityState];
    if (val) html.classList.add(cls);
    else html.classList.remove(cls);
  }

  // Font scale — use CSS zoom on #root (works with RNW's px-based styles)
  const root = document.getElementById('root');
  if (root) {
    if (state.fontScale !== 1) {
      root.style.zoom = `${state.fontScale}`;
    } else {
      root.style.zoom = '';
    }
  }

  // Tag visual headings via DOM scan
  tagVisualHeadings(state.highlightHeadings);
}

/* ------------------------------------------------------------------ */
/*  Provider                                                          */
/* ------------------------------------------------------------------ */
export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AccessibilityState>(defaultState);

  useEffect(() => {
    injectWebStyles();
  }, []);

  useEffect(() => {
    syncWebClasses(state);
  }, [state]);

  const increaseFontSize = useCallback(() => {
    setState(prev => ({
      ...prev,
      fontScale: Math.min(prev.fontScale + 0.1, 1.5),
    }));
  }, []);

  const decreaseFontSize = useCallback(() => {
    setState(prev => ({
      ...prev,
      fontScale: Math.max(prev.fontScale - 0.1, 0.8),
    }));
  }, []);

  const toggle = useCallback((key: keyof Omit<AccessibilityState, 'fontScale'>) => {
    setState(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const resetAll = useCallback(() => {
    setState(defaultState);
  }, []);

  return (
    <AccessibilityContext.Provider value={{ state, increaseFontSize, decreaseFontSize, toggle, resetAll }}>
      {children}
    </AccessibilityContext.Provider>
  );
}
