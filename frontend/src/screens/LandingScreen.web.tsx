import React, { useEffect, useState } from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { CATEGORY_METADATA, type Category } from '../constants/categories';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const imgLogo     = require('../../assets/logo-without-text.png') as { uri?: string } | number;

interface Props {
  isSignedIn?: boolean;
  onLogin?: () => void;
  onPostTask: () => void;
}

// ── Full landing CSS ───────────────────────────────────────────────────────
const LANDING_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap');

:root {
  --primary: #1C3C56; --primary-light: #2A5478; --primary-dark: #0F2438; --primary-muted: #496B84;
  --secondary: #F1B545; --secondary-light: #F7CF7A; --secondary-dark: #D49A2A;
  --background: #F5F1E8; --surface: #FFFCF6; --surface-alt: #E9E2D5;
  --outline: #C9BEAF; --outline-light: #DDD6CB;
  --text-primary: #243746; --text-secondary: #3D5467; --text-muted: #66727B;
  --text-on-dark: #FFFCF6; --text-on-dark-muted: rgba(255,252,246,0.65);
  --success: #517A58; --success-soft: #E5EFE6;
  --cat-plumbing: #2E86C1; --cat-plumbing-soft: #E4F2FB;
  --cat-mounting: #0D7C6E; --cat-mounting-soft: #E0F5F3;
  --cat-assembly: #7B61FF; --cat-assembly-soft: #EFECFF;
  --shadow-sm: 0 2px 8px rgba(17,35,54,0.07);
  --shadow-md: 1px 5px 16px rgba(17,35,54,0.11);
  --font-display: 'Manrope', 'Inter', system-ui, sans-serif;
  --font-body: 'Inter', system-ui, sans-serif;
}

* { box-sizing: border-box; }
#fixit-landing { overflow-x: hidden; background: var(--background); color: var(--text-primary); font-family: var(--font-body); -webkit-font-smoothing: antialiased; scroll-behavior: smooth; }
#fixit-landing ::selection { background: var(--secondary); color: var(--primary-dark); }
.fi-icon { display: inline-flex; align-items: center; justify-content: center; line-height: 1; flex: none; }
.fi-inline-icon { display: inline-flex; align-items: center; justify-content: center; line-height: 1; }

/* ── Keyframes ─────────────────────────────────────── */
@keyframes ping { 75%,100% { transform: scale(2); opacity: 0; } }
@keyframes lineUp { to { opacity: 1; transform: translateY(0); } }
@keyframes rise { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
@keyframes shimmer { 0%,100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
@keyframes drawLine { to { stroke-dashoffset: 0; } }
@keyframes float1 { 0%,100% { transform: rotate(3deg) translateY(0); } 50% { transform: rotate(3deg) translateY(-12px); } }
@keyframes float2 { 0%,100% { transform: rotate(-4deg) translateY(0); } 50% { transform: rotate(-4deg) translateY(-16px); } }
@keyframes float3 { 0%,100% { transform: rotate(2deg) translateY(0); } 50% { transform: rotate(2deg) translateY(-10px); } }

/* ── Nav ────────────────────────────────────────────── */
.fi-nav {
  position: fixed; top: 0; left: 0; right: 0; z-index: 100;
  display: flex; align-items: center; gap: 32px; padding: 18px 48px;
  background: rgba(245,241,232,0.82);
  backdrop-filter: blur(20px) saturate(140%); -webkit-backdrop-filter: blur(20px) saturate(140%);
  border-bottom: 1px solid rgba(201,190,175,0.4);
  transition: padding 200ms ease;
}
.fi-nav.scrolled { padding-top: 12px; padding-bottom: 12px; }
.fi-nav .logo { display: flex; align-items: center; gap: 10px; text-decoration: none; font-family: var(--font-display); font-weight: 800; font-size: 22px; letter-spacing: -0.5px; color: var(--primary); }
.fi-nav .logo img { width: 32px; height: 32px; object-fit: contain; }
.fi-nav .logo .l { color: var(--secondary-dark); }
.fi-nav .links { display: flex; gap: 28px; margin-left: 32px; }
.fi-nav .links a { color: var(--text-secondary); text-decoration: none; font-size: 14px; font-weight: 600; letter-spacing: 0.2px; position: relative; padding: 4px 0; transition: color 200ms; }
.fi-nav .links a::after { content: ''; position: absolute; left: 0; right: 0; bottom: -2px; height: 2px; background: var(--secondary); transform: scaleX(0); transform-origin: left; transition: transform 280ms cubic-bezier(0.65,0,0.35,1); }
.fi-nav .links a:hover { color: var(--primary); }
.fi-nav .links a:hover::after { transform: scaleX(1); }
.fi-nav .actions { margin-left: auto; display: flex; gap: 12px; align-items: center; }
.fi-nav .login { font-size: 14px; font-weight: 700; color: var(--primary); text-decoration: none; padding: 9px 16px; border-radius: 999px; transition: background 200ms; }
.fi-nav .login:hover { background: rgba(28,60,86,0.08); }
.fi-nav .cta { display: inline-flex; align-items: center; gap: 8px; background: var(--primary); color: var(--text-on-dark); font-family: var(--font-display); font-weight: 700; font-size: 14px; padding: 10px 20px; border-radius: 999px; border: none; cursor: pointer; box-shadow: var(--shadow-sm); transition: transform 200ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 200ms; }
.fi-nav .cta:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
.fi-nav .cta .arr { transition: transform 200ms; display: inline-block; }
.fi-nav .cta:hover .arr { transform: translateX(3px); }
@media (max-width: 960px) { .fi-nav { padding: 14px 20px; } .fi-nav .links { display: none; } .fi-nav .login { display: none; } }

/* ── Hero ────────────────────────────────────────────── */
.fi-hero {
  position: relative; min-height: 100vh; padding: 140px 48px 80px;
  display: grid; grid-template-columns: 1.15fr 1fr; gap: 56px; align-items: center; overflow: hidden;
}
.fi-hero-bg {
  position: absolute; inset: 0; z-index: 0; pointer-events: none;
  background: radial-gradient(ellipse 800px 600px at 80% 30%, rgba(241,181,69,0.18) 0%, transparent 50%), radial-gradient(ellipse 700px 500px at 10% 90%, rgba(28,60,86,0.08) 0%, transparent 50%);
}
.fi-hero-grid {
  position: absolute; inset: 0; z-index: 0; pointer-events: none;
  background-image: linear-gradient(rgba(28,60,86,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(28,60,86,0.04) 1px, transparent 1px);
  background-size: 64px 64px;
  -webkit-mask-image: radial-gradient(ellipse 70% 60% at 50% 40%, black 30%, transparent 80%);
  mask-image: radial-gradient(ellipse 70% 60% at 50% 40%, black 30%, transparent 80%);
}
.fi-hero-content { position: relative; z-index: 2; }
.fi-hero-eyebrow {
  display: inline-flex; align-items: center; gap: 10px; padding: 8px 16px 8px 10px; border-radius: 999px;
  background: rgba(241,181,69,0.18); border: 1px solid rgba(241,181,69,0.4);
  font-family: var(--font-display); font-size: 12px; font-weight: 700; color: var(--secondary-dark); letter-spacing: 0.6px; text-transform: uppercase; margin-bottom: 28px;
  opacity: 0; animation: rise 700ms cubic-bezier(0.16,1,0.3,1) 100ms forwards;
}
.fi-hero-eyebrow .pulse { width: 8px; height: 8px; border-radius: 4px; background: var(--secondary-dark); position: relative; }
.fi-hero-eyebrow .pulse::after { content: ''; position: absolute; inset: -3px; border-radius: 50%; background: var(--secondary-dark); opacity: 0.4; animation: ping 2s cubic-bezier(0,0,0.2,1) infinite; }
.fi-hero-title {
  font-family: var(--font-display); font-size: clamp(44px, 6.6vw, 96px); font-weight: 800; letter-spacing: -2.5px; line-height: 0.95; color: var(--primary); margin: 0 0 32px;
}
.fi-hero-title .line { display: block; }
.fi-hero-title .line > span { display: inline-block; opacity: 0; transform: translateY(40px); animation: lineUp 900ms cubic-bezier(0.16,1,0.3,1) forwards; }
.fi-hero-title .line:nth-child(1) > span { animation-delay: 200ms; }
.fi-hero-title .line:nth-child(2) > span { animation-delay: 360ms; }
.fi-hero-title .accent { background: linear-gradient(105deg, var(--secondary-dark) 0%, var(--secondary) 50%, var(--secondary-dark) 100%); background-size: 200% 100%; -webkit-background-clip: text; background-clip: text; color: transparent; }
.fi-hero-title .accent.shimmer { animation: shimmer 4s ease-in-out infinite; }
.fi-hero-title .scribble { display: inline-block; position: relative; }
.fi-hero-title .scribble svg { position: absolute; left: -2%; right: -2%; bottom: -8%; width: 104%; height: 24%; stroke: var(--secondary-dark); stroke-width: 6; fill: none; stroke-linecap: round; stroke-dasharray: 600; stroke-dashoffset: 600; animation: drawLine 1200ms cubic-bezier(0.65,0,0.35,1) 1100ms forwards; }
.fi-hero-sub { font-size: 19px; color: var(--text-secondary); max-width: 520px; line-height: 1.55; margin: 0 0 40px; opacity: 0; animation: rise 800ms cubic-bezier(0.16,1,0.3,1) 700ms forwards; }
.fi-hero-actions { display: flex; gap: 14px; align-items: center; flex-wrap: wrap; opacity: 0; animation: rise 800ms cubic-bezier(0.16,1,0.3,1) 850ms forwards; }
.btn-hero { display: inline-flex; align-items: center; gap: 10px; padding: 18px 32px; border-radius: 999px; font-family: var(--font-display); font-weight: 700; font-size: 16px; border: none; cursor: pointer; text-decoration: none; position: relative; overflow: hidden; transition: transform 250ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 250ms; }
.btn-hero.primary { background: var(--primary); color: var(--text-on-dark); box-shadow: 0 8px 24px -8px rgba(28,60,86,0.5), inset 0 1px 0 rgba(255,255,255,0.1); }
.btn-hero.primary::before { content: ''; position: absolute; top: 0; left: -100%; width: 100%; height: 100%; background: linear-gradient(90deg, transparent, rgba(241,181,69,0.4), transparent); transition: left 700ms cubic-bezier(0.65,0,0.35,1); }
.btn-hero.primary:hover::before { left: 100%; }
.btn-hero.primary:hover { transform: translateY(-3px); box-shadow: 0 14px 32px -8px rgba(28,60,86,0.6), inset 0 1px 0 rgba(255,255,255,0.15); }
.btn-hero.ghost { background: transparent; color: var(--primary); border: 1.5px solid rgba(28,60,86,0.25); }
.btn-hero.ghost:hover { background: var(--primary); color: var(--text-on-dark); transform: translateY(-3px); border-color: var(--primary); }
.btn-hero .arr { transition: transform 250ms cubic-bezier(0.34,1.56,0.64,1); }
.btn-hero:hover .arr { transform: translateX(5px); }
.fi-hero-trust { display: flex; align-items: center; gap: 20px; margin-top: 56px; opacity: 0; animation: rise 800ms cubic-bezier(0.16,1,0.3,1) 1000ms forwards; }
.fi-hero-trust .avatars { display: flex; }
.fi-hero-trust .avatars div { width: 38px; height: 38px; border-radius: 50%; border: 2.5px solid var(--background); margin-left: -10px; font-family: var(--font-display); font-size: 13px; font-weight: 700; color: var(--text-on-dark); display: flex; align-items: center; justify-content: center; transition: transform 200ms; }
.fi-hero-trust .avatars div:first-child { margin-left: 0; }
.fi-hero-trust .avatars div:hover { transform: translateY(-4px) scale(1.1); z-index: 2; }
.fi-hero-trust .stars { color: var(--secondary-dark); font-size: 14px; letter-spacing: 1px; }
.fi-hero-trust .meta { font-size: 13px; color: var(--text-muted); }
.fi-hero-trust .meta strong { color: var(--text-primary); font-weight: 700; }

/* ── Hero stage (floating cards) ───────────────────── */
.fi-hero-stage { position: relative; height: 600px; z-index: 1; }
.fi-card { position: absolute; background: var(--surface); border-radius: 20px; padding: 16px; box-shadow: var(--shadow-md); transition: transform 500ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 400ms; cursor: pointer; }
.fi-card:hover { transform: translateY(-8px) rotate(0deg) scale(1.03) !important; box-shadow: 0 24px 48px -12px rgba(28,60,86,0.25); z-index: 10; }
.fi-card.t1 { top: 20px; right: 0; width: 320px; transform: rotate(3deg); animation: float1 8s ease-in-out infinite; }
.fi-card.t2 { top: 200px; right: 280px; width: 280px; transform: rotate(-4deg); animation: float2 10s ease-in-out infinite; }
.fi-card.t3 { top: 380px; right: 60px; width: 300px; transform: rotate(2deg); animation: float3 9s ease-in-out infinite; }
.fi-card .card-row { display: flex; gap: 12px; align-items: center; }
.fi-card .cat-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px; flex: none; }
.fi-card .card-title { font-family: var(--font-display); font-weight: 700; font-size: 15px; color: var(--text-primary); }
.fi-card .card-meta { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
.fi-card .card-foot { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--outline-light); }
.fi-card .card-price { font-family: var(--font-display); font-size: 18px; font-weight: 800; color: var(--primary); }
.fi-card .card-bid { font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 999px; background: var(--secondary); color: var(--primary-dark); }
.fi-pill { position: absolute; background: var(--surface); border-radius: 999px; padding: 10px 16px; display: flex; align-items: center; gap: 8px; white-space: nowrap; box-shadow: var(--shadow-md); font-family: var(--font-display); font-size: 13px; font-weight: 700; color: var(--text-primary); }
.fi-pill .dot { width: 8px; height: 8px; border-radius: 4px; background: var(--success); position: relative; flex: none; }
.fi-pill .dot::after { content: ''; position: absolute; inset: -3px; border-radius: 50%; background: var(--success); opacity: 0.4; animation: ping 2s cubic-bezier(0,0,0.2,1) infinite; }
.fi-pill.p1 { top: 0; right: 200px; animation: float1 7s ease-in-out infinite; }
.fi-pill.p2 { bottom: 80px; right: 300px; animation: float2 8s ease-in-out infinite; }
@media (max-width: 960px) { .fi-hero { grid-template-columns: 1fr; padding: 110px 20px 60px; gap: 40px; } .fi-hero-stage { display: none; } }

/* ── Stats ───────────────────────────────────────────── */
.fi-proof { padding: 60px 48px; border-top: 1px solid var(--outline-light); border-bottom: 1px solid var(--outline-light); background: var(--surface); }
.fi-proof-inner { max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: repeat(4, 1fr); gap: 32px; }
.fi-stat { text-align: center; padding: 8px 16px; border-right: 1px solid var(--outline-light); }
.fi-stat:last-child { border-right: none; }
.fi-stat .num { font-family: var(--font-display); font-size: 56px; font-weight: 800; letter-spacing: -2px; color: var(--primary); line-height: 1; }
.fi-stat .num .unit { color: var(--secondary-dark); }
.fi-stat .lbl { font-size: 13px; font-weight: 600; color: var(--text-muted); letter-spacing: 0.4px; text-transform: uppercase; margin-top: 8px; }
@media (max-width: 960px) { .fi-proof { padding: 40px 20px; } .fi-proof-inner { grid-template-columns: repeat(2,1fr); gap: 16px; } .fi-stat { border-right: none; } .fi-stat .num { font-size: 40px; } }

/* ── How it works ────────────────────────────────────── */
.fi-how { padding: 140px 48px; }
.fi-how-inner { max-width: 1200px; margin: 0 auto; }
.sec-eyebrow { display: inline-block; font-family: var(--font-display); font-size: 12px; font-weight: 800; color: var(--secondary-dark); letter-spacing: 1.2px; text-transform: uppercase; margin-bottom: 16px; }
.sec-title { font-family: var(--font-display); font-size: clamp(36px,5vw,64px); font-weight: 800; letter-spacing: -1.5px; line-height: 1.05; color: var(--primary); margin: 0 0 24px; max-width: 800px; }
.sec-sub { font-size: 18px; color: var(--text-secondary); max-width: 600px; line-height: 1.5; margin: 0 0 64px; }
.fi-steps { display: grid; grid-template-columns: repeat(3,1fr); gap: 24px; }
.fi-step { position: relative; background: var(--surface); border-radius: 24px; padding: 36px 32px; border: 1px solid var(--outline-light); overflow: hidden; transition: transform 350ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 350ms, border-color 350ms; cursor: pointer; }
.fi-step:hover { transform: translateY(-8px); box-shadow: 0 28px 60px -16px rgba(28,60,86,0.18); border-color: var(--secondary); }
.fi-step::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px; background: var(--secondary); transform: scaleX(0); transform-origin: left; transition: transform 500ms cubic-bezier(0.65,0,0.35,1); }
.fi-step:hover::before { transform: scaleX(1); }
.fi-step-num { font-family: var(--font-display); font-size: 96px; font-weight: 800; letter-spacing: -4px; color: transparent; -webkit-text-stroke: 2px var(--outline); line-height: 1; margin-bottom: 12px; transition: -webkit-text-stroke 350ms, color 350ms; }
.fi-step:hover .fi-step-num { color: var(--secondary); -webkit-text-stroke: 2px var(--secondary); }
.fi-step-icon { height: 80px; margin-bottom: 16px; display: flex; align-items: center; }
.fi-step-tile { width: 56px; height: 56px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 26px; transition: transform 350ms cubic-bezier(0.34,1.56,0.64,1); }
.fi-step:hover .fi-step-tile { transform: rotate(-6deg) scale(1.08); }
.fi-step h3 { font-family: var(--font-display); font-size: 24px; font-weight: 700; letter-spacing: -0.5px; color: var(--primary); margin: 0 0 12px; }
.fi-step p { color: var(--text-secondary); line-height: 1.55; margin: 0; font-size: 15px; }
@media (max-width: 960px) { .fi-how { padding: 80px 20px; } .fi-steps { grid-template-columns: 1fr; } }

/* ── Categories ──────────────────────────────────────── */
.fi-cats { padding: 80px 48px 140px; }
.fi-cats-inner { max-width: 1200px; margin: 0 auto; }
.fi-cats-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 32px; flex-wrap: wrap; margin-bottom: 48px; }
.fi-cats-head a { font-family: var(--font-display); font-weight: 700; font-size: 14px; color: var(--primary); text-decoration: none; display: inline-flex; align-items: center; gap: 8px; }
.fi-cats-head a:hover .arr { transform: translateX(4px); }
.fi-cats-grid { display: grid; grid-template-columns: repeat(4,1fr); grid-auto-rows: 220px; gap: 14px; }
.fi-cat { position: relative; border-radius: 20px; overflow: hidden; cursor: pointer; transition: transform 400ms cubic-bezier(0.34,1.56,0.64,1); text-decoration: none; }
.fi-cat:hover { transform: translateY(-6px); }
.fi-cat .img { position: absolute; inset: 0; background-size: cover; background-position: center; transition: transform 700ms cubic-bezier(0.65,0,0.35,1); }
.fi-cat:hover .img { transform: scale(1.08); }
.fi-cat .overlay { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(15,36,56,0) 35%, rgba(15,36,56,0.85) 100%); transition: background 400ms; }
.fi-cat:hover .overlay { background: linear-gradient(180deg, rgba(15,36,56,0.1) 0%, rgba(15,36,56,0.92) 100%); }
.fi-cat .body { position: absolute; bottom: 0; left: 0; right: 0; padding: 18px 20px; color: #fff; }
.fi-cat .name { font-family: var(--font-display); font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
.fi-cat .examples { font-size: 12px; color: rgba(255,252,246,0.75); margin-top: 4px; max-height: 0; overflow: hidden; transition: max-height 400ms cubic-bezier(0.65,0,0.35,1); }
.fi-cat:hover .examples { max-height: 60px; }
.fi-cat .glyph { position: absolute; top: 16px; left: 16px; width: 44px; height: 44px; border-radius: 12px; background: rgba(255,252,246,0.92); display: flex; align-items: center; justify-content: center; font-size: 22px; transition: transform 400ms cubic-bezier(0.34,1.56,0.64,1); }
.fi-cat:hover .glyph { transform: rotate(-8deg) scale(1.1); }
.fi-cat .arrow { position: absolute; top: 16px; right: 16px; width: 36px; height: 36px; border-radius: 50%; background: var(--secondary); display: flex; align-items: center; justify-content: center; color: var(--primary-dark); font-size: 16px; font-weight: 800; opacity: 0; transform: scale(0.6) rotate(-45deg); transition: opacity 300ms, transform 300ms cubic-bezier(0.34,1.56,0.64,1); }
.fi-cat:hover .arrow { opacity: 1; transform: scale(1) rotate(0); }
@media (max-width: 960px) { .fi-cats { padding: 60px 20px 80px; } .fi-cats-grid { grid-template-columns: repeat(2,1fr); grid-auto-rows: 180px; } }

/* ── Dual CTA (Fixers) ───────────────────────────────── */
.fi-dual { padding: 0 48px 140px; }
.fi-dual-inner { max-width: 1200px; margin: 0 auto; background: var(--primary); border-radius: 32px; padding: 80px; display: grid; grid-template-columns: 1.2fr 1fr; gap: 64px; align-items: center; position: relative; overflow: hidden; }
.fi-dual-inner::before { content: ''; position: absolute; top: -100px; right: -100px; width: 400px; height: 400px; border-radius: 50%; background: radial-gradient(circle, var(--secondary) 0%, transparent 70%); opacity: 0.3; }
.fi-dual-inner::after { content: ''; position: absolute; bottom: -200px; left: -100px; width: 500px; height: 500px; border-radius: 50%; background: radial-gradient(circle, var(--primary-light) 0%, transparent 70%); opacity: 0.5; }
.fi-dual-text { position: relative; z-index: 2; color: var(--text-on-dark); }
.fi-dual-text h2 { font-family: var(--font-display); font-size: clamp(36px,4.5vw,56px); font-weight: 800; letter-spacing: -1.5px; line-height: 1.05; margin: 0 0 20px; color: var(--text-on-dark); }
.fi-dual-text h2 em { font-style: normal; color: var(--secondary-light); position: relative; white-space: nowrap; padding: 0 4px; }
.fi-dual-text h2 em::before { content: ''; position: absolute; inset: 0; background: rgba(241,181,69,0.18); border-radius: 6px; z-index: -1; }
.fi-dual-text h2 em::after { content: ''; position: absolute; left: 4px; right: 4px; bottom: -4px; height: 4px; background: var(--secondary); border-radius: 2px; }
.fi-dual-text p { color: rgba(255,252,246,0.88); font-size: 17px; line-height: 1.55; max-width: 480px; margin: 0 0 36px; }
.fi-dual-actions { display: flex; gap: 14px; flex-wrap: wrap; }
.btn-dual { display: inline-flex; align-items: center; gap: 10px; padding: 16px 28px; border-radius: 999px; font-family: var(--font-display); font-weight: 700; font-size: 15px; border: none; cursor: pointer; text-decoration: none; transition: transform 250ms cubic-bezier(0.34,1.56,0.64,1); }
.btn-dual.amber { background: var(--secondary); color: var(--primary-dark); }
.btn-dual.outline { background: transparent; color: var(--text-on-dark); border: 1.5px solid rgba(255,252,246,0.35); }
.btn-dual.outline:hover { background: rgba(255,252,246,0.1); border-color: rgba(255,252,246,0.6); }
.btn-dual:hover { transform: translateY(-3px); }
.fi-dual-visual { position: relative; z-index: 2; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.fi-tile { background: rgba(255,252,246,0.06); border: 1px solid rgba(255,252,246,0.1); border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 10px; transition: background 300ms, transform 300ms; }
.fi-tile:hover { background: rgba(255,252,246,0.12); transform: translateY(-4px); }
.fi-tile .glyph { width: 40px; height: 40px; border-radius: 10px; background: var(--secondary); color: var(--primary-dark); display: flex; align-items: center; justify-content: center; font-size: 20px; }
.fi-tile h4 { font-family: var(--font-display); font-size: 16px; font-weight: 700; color: var(--text-on-dark); margin: 0; }
.fi-tile p { font-size: 13px; color: rgba(255,252,246,0.7); margin: 0; line-height: 1.5; }
@media (max-width: 960px) { .fi-dual { padding: 0 20px 80px; } .fi-dual-inner { padding: 40px; grid-template-columns: 1fr; gap: 40px; } }

/* ── Footer ──────────────────────────────────────────── */
.fi-footer { padding: 60px 48px 32px; border-top: 1px solid var(--outline-light); background: var(--surface); }
.fi-footer-inner { max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: 1.5fr 1fr 1fr 1fr; gap: 48px; }
.fi-footer .logo { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; font-family: var(--font-display); font-weight: 800; font-size: 24px; color: var(--primary); letter-spacing: -0.5px; }
.fi-footer .logo img { width: 36px; height: 36px; object-fit: contain; }
.fi-footer .tag { font-size: 14px; color: var(--text-muted); max-width: 280px; line-height: 1.5; }
.fi-footer h5 { font-family: var(--font-display); font-size: 13px; font-weight: 800; letter-spacing: 0.6px; text-transform: uppercase; color: var(--primary); margin: 0 0 16px; }
.fi-footer ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; }
.fi-footer ul a { font-size: 14px; color: var(--text-secondary); text-decoration: none; transition: color 200ms; }
.fi-footer ul a:hover { color: var(--primary); }
.fi-footer-bottom { max-width: 1200px; margin: 48px auto 0; padding-top: 24px; border-top: 1px solid var(--outline-light); display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--text-muted); }
@media (max-width: 960px) { .fi-footer { padding: 40px 20px 24px; } .fi-footer-inner { grid-template-columns: 1fr 1fr; gap: 32px; } }
@media (max-width: 520px) {
  .fi-hero-title { font-size: clamp(42px, 18vw, 64px); letter-spacing: -1.5px; }
  .fi-hero-actions, .fi-dual-actions { align-items: stretch; }
  .btn-hero, .btn-dual { width: 100%; justify-content: center; }
  .fi-proof-inner { grid-template-columns: 1fr; }
  .fi-cats-grid { grid-template-columns: 1fr; grid-auto-rows: 190px; }
  .fi-dual-inner { padding: 32px 22px; border-radius: 24px; }
  .fi-dual-visual { grid-template-columns: 1fr; }
  .fi-footer-inner { grid-template-columns: 1fr; }
  .fi-footer-bottom { flex-direction: column; align-items: flex-start; gap: 8px; }
}
@media (prefers-reduced-motion: reduce) {
  #fixit-landing *, #fixit-landing *::before, #fixit-landing *::after {
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 1ms !important;
  }
}
`;

function LandingIcon({ name, size = 22 }: { name: string; size?: number }) {
  return (
    <span className="fi-icon" aria-hidden="true">
      <MaterialCommunityIcons name={name as never} size={size} color="currentColor" />
    </span>
  );
}

function assetSrc(asset: { uri?: string } | number) {
  return typeof asset === 'object' && asset.uri ? asset.uri : asset as unknown as string;
}

const LANDING_CATEGORY_ORDER: Category[] = [
  'MOVING',
  'PLUMBING',
  'ELECTRICITY',
  'ASSEMBLY',
  'MOUNTING',
  'PAINTING',
  'CLEANING',
  'OUTDOORS',
];

const CATEGORY_CARDS = LANDING_CATEGORY_ORDER.map((value) => CATEGORY_METADATA[value]);

const FIXER_TILES = [
  { icon: 'cash-multiple', title: 'Set your rate', desc: 'Bid your price on each job. No race-to-the-bottom.' },
  { icon: 'map-marker-radius-outline', title: 'Work nearby', desc: 'Filter by distance — keep your commute short.' },
  { icon: 'star-circle-outline', title: 'Build trust', desc: 'Reviews stack up. Top-rated Fixers earn a badge.' },
  { icon: 'bank-transfer', title: 'Get paid fast', desc: 'Bit or Paybox direct. No 30-day waits.' },
] as const;

// ── Component ─────────────────────────────────────────────────────────────
export default function LandingScreen({ isSignedIn = false, onLogin, onPostTask }: Props) {
  const [scrolled, setScrolled] = useState(false);
  const handleLogin = onLogin ?? onPostTask;

  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'fixit-landing-css';
    style.textContent = LANDING_CSS;
    if (!document.getElementById('fixit-landing-css')) {
      document.head.appendChild(style);
    }
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      const el = document.getElementById('fixit-landing-css');
      if (el) el.remove();
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMouseMove = (e: MouseEvent) => {
      if (reduceMotion.matches) return;
      const stage = document.querySelector<HTMLElement>('.fi-hero-stage');
      if (!stage) return;
      const rect = stage.getBoundingClientRect();
      const dx = (e.clientX - (rect.left + rect.width / 2)) / rect.width;
      const dy = (e.clientY - (rect.top + rect.height / 2)) / rect.height;
      document.querySelectorAll<HTMLElement>('.fi-card').forEach((card, i) => {
        const factor = (i + 1) * 5;
        card.style.setProperty('translate', `${dx * factor}px ${dy * factor}px`);
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.querySelectorAll<HTMLElement>('.fi-card').forEach((card) => {
        card.style.removeProperty('translate');
      });
    };
  }, []);

  const logoSrc = assetSrc(imgLogo);

  return (
    <div id="fixit-landing">
      {/* ── Nav ─────────────────────────────────────────── */}
      <nav className={`fi-nav${scrolled ? ' scrolled' : ''}`}>
        <a href="#top" className="logo">
          {logoSrc ? <img src={logoSrc} alt="" /> : null}
          <span>Fix<span className="l">I</span>t</span>
        </a>
        <div className="links">
          <a href="#how">How it works</a>
          <a href="#categories">Categories</a>
          <a href="#fixers">For Fixers</a>
          <a href="#help">Help</a>
        </div>
        <div className="actions">
          {!isSignedIn && (
            <a href="#" className="login" onClick={(e) => { e.preventDefault(); handleLogin(); }}>Log in</a>
          )}
          <button className="cta" onClick={onPostTask}>
            Post a Task <span className="arr">→</span>
          </button>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────── */}
      <section className="fi-hero" id="top">
        <div className="fi-hero-bg" />
        <div className="fi-hero-grid" />

        <div className="fi-hero-content">
          <div className="fi-hero-eyebrow">
            <span className="pulse" />
            Trusted by 12,000+ neighbors in Israel
          </div>

          <h1 className="fi-hero-title">
            <span className="line">
              <span>Let&rsquo;s&nbsp;
                <span className="scribble">Fix
                  <svg viewBox="0 0 200 30" preserveAspectRatio="none">
                    <path d="M5 22 Q 50 4, 100 18 T 195 14" />
                  </svg>
                </span>
              </span>
            </span>
            <span className="line">
              <span>Your&nbsp;<span className="accent shimmer">Problems.</span></span>
            </span>
          </h1>

          <p className="fi-hero-sub">
            Post any task — from a leaky tap to a wardrobe assembly — and get bids from vetted local Fixers in minutes. You pick. You pay only when it's done right.
          </p>

          <div className="fi-hero-actions">
            <button className="btn-hero primary" onClick={onPostTask}>
              Post a Task — it&apos;s free <span className="arr">→</span>
            </button>
            <a href="#how" className="btn-hero ghost">See how it works</a>
          </div>

          <div className="fi-hero-trust">
            <div className="avatars">
              <div style={{ background: 'linear-gradient(135deg,#1C3C56,#2A5478)' }}>YK</div>
              <div style={{ background: 'linear-gradient(135deg,#F1B545,#D49A2A)', color: '#243746' }}>DM</div>
              <div style={{ background: 'linear-gradient(135deg,#0D7C6E,#27AE60)' }}>AS</div>
              <div style={{ background: 'linear-gradient(135deg,#C0392B,#8E44AD)' }}>RB</div>
              <div style={{ background: 'linear-gradient(135deg,#2E86C1,#496B84)' }}>TM</div>
            </div>
            <div>
              <div className="stars">★★★★★</div>
              <div className="meta"><strong>4.9 / 5</strong> from 8,400+ jobs completed</div>
            </div>
          </div>
        </div>

        {/* Right: floating cards */}
        <div className="fi-hero-stage">
          <div className="fi-pill p1">
            <span className="dot" />3 new bids
          </div>

          <div className="fi-card t1" onClick={onPostTask}>
            <div className="card-row">
              <div className="cat-icon" style={{ background: '#E4F2FB', color: '#2E86C1' }}>
                <LandingIcon name="water-pump" />
              </div>
              <div>
                <div className="card-title">Fix leaking kitchen sink</div>
                <div className="card-meta"><LandingIcon name="map-marker-outline" size={13} /> Florentin · posted 2h ago</div>
              </div>
            </div>
            <div className="card-foot">
              <span className="card-price">₪320</span>
              <span className="card-bid">3 new offers</span>
            </div>
          </div>

          <div className="fi-card t2" onClick={onPostTask}>
            <div className="card-row">
              <div className="cat-icon" style={{ background: '#EFECFF', color: '#7B61FF' }}>
                <LandingIcon name="hammer-screwdriver" />
              </div>
              <div>
                <div className="card-title">Assemble IKEA wardrobe</div>
                <div className="card-meta"><LandingIcon name="map-marker-outline" size={13} /> Hadar, Haifa</div>
              </div>
            </div>
            <div className="card-foot">
              <span className="card-price">₪450</span>
              <span className="card-bid" style={{ background: '#E5EFE6', color: '#517A58' }}><LandingIcon name="check" size={12} /> Hired Yossi</span>
            </div>
          </div>

          <div className="fi-card t3" onClick={onPostTask}>
            <div className="card-row">
              <div className="cat-icon" style={{ background: '#FEF3D7', color: '#D4900A' }}>
                <LandingIcon name="lightning-bolt" />
              </div>
              <div>
                <div className="card-title">Install 3 ceiling lights</div>
                <div className="card-meta"><LandingIcon name="map-marker-outline" size={13} /> Ramat Gan · posted 30m ago</div>
              </div>
            </div>
            <div className="card-foot">
              <span className="card-price">₪680</span>
              <span className="card-bid">5 new offers</span>
            </div>
          </div>

          <div className="fi-pill p2">
            <LandingIcon name="lightning-bolt" size={16} /> Avg. response in <strong style={{ color: '#1C3C56' }}>12 min</strong>
          </div>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────── */}
      <section className="fi-proof">
        <div className="fi-proof-inner">
          <div className="fi-stat"><div className="num">12<span className="unit">k</span>+</div><div className="lbl">Active Requesters</div></div>
          <div className="fi-stat"><div className="num">8.4<span className="unit">k</span></div><div className="lbl">Jobs Completed</div></div>
          <div className="fi-stat"><div className="num">12<span className="unit">min</span></div><div className="lbl">Avg. First Bid</div></div>
          <div className="fi-stat"><div className="num">4.9<span className="unit">★</span></div><div className="lbl">Average Rating</div></div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────── */}
      <section className="fi-how" id="how">
        <div className="fi-how-inner">
          <div className="sec-eyebrow">How it works</div>
          <h2 className="sec-title">Three steps. <em style={{ fontStyle: 'normal', color: '#D49A2A' }}>No phone tag.</em></h2>
          <p className="sec-sub">Skip the WhatsApp groups and the "I'll call you back tomorrow." Post your task, compare offers, hire the best one.</p>
          <div className="fi-steps">
            <div className="fi-step">
              <div className="fi-step-num">01</div>
              <div className="fi-step-icon">
                <div className="fi-step-tile" style={{ background: '#E4F2FB', color: '#2E86C1' }}>
                  <LandingIcon name="clipboard-edit-outline" size={28} />
                </div>
              </div>
              <h3>Describe your task</h3>
              <p>Snap a photo, set your budget, pick a category. Takes 90 seconds — no account needed to start.</p>
            </div>
            <div className="fi-step">
              <div className="fi-step-num">02</div>
              <div className="fi-step-icon">
                <div className="fi-step-tile" style={{ background: '#F1B545', color: '#0F2438' }}>
                  <LandingIcon name="message-text-outline" size={28} />
                </div>
              </div>
              <h3>Compare bids</h3>
              <p>Local Fixers send you their price, ETA, and a short pitch. Read profiles, check ratings, message anyone.</p>
            </div>
            <div className="fi-step">
              <div className="fi-step-num">03</div>
              <div className="fi-step-icon">
                <div className="fi-step-tile" style={{ background: '#E0F5F3', color: '#0D7C6E' }}>
                  <LandingIcon name="check-circle-outline" size={28} />
                </div>
              </div>
              <h3>Hire &amp; pay when done</h3>
              <p>Pick your Fixer, get the job done, then pay through Bit or Paybox. Rate your experience to help the next neighbor.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Categories ───────────────────────────────────── */}
      <section className="fi-cats" id="categories">
        <div className="fi-cats-inner">
          <div className="fi-cats-head">
            <div>
              <div className="sec-eyebrow">Categories</div>
              <h2 className="sec-title" style={{ fontSize: 'clamp(32px,4vw,52px)', margin: 0 }}>Whatever you need fixed.</h2>
            </div>
            <a href="#" onClick={(e) => { e.preventDefault(); onPostTask(); }}>
              Browse all 8 categories <span className="arr" style={{ display: 'inline-block', transition: 'transform 250ms' }}>→</span>
            </a>
          </div>
          <div className="fi-cats-grid">
            {CATEGORY_CARDS.map((cat) => {
              const src = assetSrc(cat.image as { uri?: string } | number);
              return (
                <a key={cat.value} className="fi-cat" href="#" onClick={(e) => { e.preventDefault(); onPostTask(); }}>
                  <div className="img" style={{ backgroundImage: `url(${src})` }} />
                  <div className="overlay" />
                  <div className="glyph" style={{ color: cat.color }}>
                    <LandingIcon name={cat.icon} />
                  </div>
                  <div className="arrow">→</div>
                  <div className="body">
                    <div className="name">{cat.label}</div>
                    <div className="examples">{cat.examples.join(' · ')}</div>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Fixer CTA ────────────────────────────────────── */}
      <section className="fi-dual" id="fixers">
        <div className="fi-dual-inner">
          <div className="fi-dual-text">
            <div className="sec-eyebrow" style={{ color: '#F1B545' }}>For Fixers</div>
            <h2>Are you the one who <em>fixes things</em>?</h2>
            <p>Build a steady book of local jobs. Set your own rates, work where you want, get paid in cash, Bit, or Paybox. No subscription, no lead fees — we take a small cut only when you're hired.</p>
            <div className="fi-dual-actions">
              <button className="btn-dual amber" onClick={isSignedIn ? onPostTask : handleLogin}>Become a Fixer <span className="arr">→</span></button>
              <a href="#how" className="btn-dual outline">Learn more</a>
            </div>
          </div>
          <div className="fi-dual-visual">
            {FIXER_TILES.map((t) => (
              <div key={t.title} className="fi-tile">
                <div className="glyph">
                  <LandingIcon name={t.icon} size={22} />
                </div>
                <h4>{t.title}</h4>
                <p>{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────── */}
      <footer className="fi-footer" id="help">
        <div className="fi-footer-inner">
          <div>
            <div className="logo">
              {logoSrc ? <img src={logoSrc} alt="" style={{ filter: 'none' }} /> : null}
              <span>Fix<span style={{ color: '#D49A2A' }}>I</span>t</span>
            </div>
            <p className="tag">Your neighborhood. Fixed. A task marketplace built for the people who actually fix things — and the people who need them.</p>
          </div>
          <div>
            <h5>Product</h5>
            <ul>
              <li><a href="#how">How it works</a></li>
              <li><a href="#categories">Categories</a></li>
              <li><a href="#fixers">For Fixers</a></li>
              <li><a href="#">Pricing</a></li>
            </ul>
          </div>
          <div>
            <h5>Company</h5>
            <ul>
              <li><a href="#">About</a></li>
              <li><a href="#">Careers</a></li>
              <li><a href="#">Press</a></li>
              <li><a href="#">Contact</a></li>
            </ul>
          </div>
          <div>
            <h5>Help</h5>
            <ul>
              <li><a href="#">FAQ</a></li>
              <li><a href="#">Trust &amp; Safety</a></li>
              <li><a href="#">Privacy</a></li>
              <li><a href="#">Terms</a></li>
            </ul>
          </div>
        </div>
        <div className="fi-footer-bottom">
          <span>© 2026 FixIt · Tel Aviv, Israel</span>
          <span>Made for neighbors who get things done.</span>
        </div>
      </footer>
    </div>
  );
}
