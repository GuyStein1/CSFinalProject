import React, { useEffect, useState } from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { CATEGORY_METADATA, type Category } from '../constants/categories';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const imgLogo = require('../../assets/fixit-logo-mark-transparent.png') as { uri?: string } | number;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const imgWorker = require('../../assets/landing-worker-cut.png') as { uri?: string } | number;

interface Props {
  isSignedIn?: boolean;
  onLogin?: () => void;
  onCreateAccount?: () => void;
  onPostTask: (category?: Category) => void;
  onCategoryPress?: (category: Category) => void;
  onCategorySelect?: (category: Category) => void;
  onDashboard?: () => void;
  onRequesterHome?: () => void;
  onRequesterTasks?: () => void;
  onMyTasks?: () => void;
  onNotifications?: () => void;
  onProfile?: () => void;
  onSettings?: () => void;
  onBecomeFixer?: () => void;
  onFixerHome?: () => void;
  onFixerBids?: () => void;
  onFixerProfile?: () => void;
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
@keyframes float1 { 0%,100% { transform: rotate(3deg) translateY(0); } 50% { transform: rotate(3deg) translateY(-12px); } }
@keyframes float2 { 0%,100% { transform: rotate(-4deg) translateY(0); } 50% { transform: rotate(-4deg) translateY(-16px); } }
@keyframes float3 { 0%,100% { transform: rotate(2deg) translateY(0); } 50% { transform: rotate(2deg) translateY(-10px); } }
@keyframes workerBob { from { transform: translateY(0) rotate(-1.2deg); } to { transform: translateY(-14px) rotate(1.4deg); } }
@keyframes workerShadow { from { transform: translateX(-50%) scale(1); opacity: 0.52; } to { transform: translateX(-50%) scale(0.72); opacity: 0.28; } }
@keyframes workerLine { 0% { opacity: 0; transform: translateX(120px) scaleX(0.45); } 20% { opacity: 0.9; } 100% { opacity: 0; transform: translateX(-360px) scaleX(1.25); } }
@keyframes workerTick { from { transform: translateX(440px); opacity: 0; } 10%,90% { opacity: 0.58; } to { transform: translateX(-560px); opacity: 0; } }
@keyframes workerSpark { from { transform: translate(0,0) scale(1); opacity: 0.95; } to { transform: translate(-80px,-30px) scale(0); opacity: 0; } }
@keyframes workerPow { 0% { opacity: 0; transform: scale(0.45) rotate(-18deg); } 30% { opacity: 1; transform: scale(1.12) rotate(-8deg); } 100% { opacity: 0; transform: scale(1.32) rotate(0deg); } }

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
.fi-nav .logo { display: flex; align-items: center; gap: 10px; text-decoration: none; font-family: var(--font-display); font-weight: 800; font-size: 22px; letter-spacing: 0; color: var(--primary); }
.fi-nav .logo img { width: 32px; height: 32px; object-fit: contain; }
.fi-nav .logo .l { color: var(--secondary-dark); }
.fi-nav .links { display: flex; gap: 28px; margin-left: 32px; }
.fi-nav .links a,
.fi-nav .links button {
  color: var(--text-secondary); text-decoration: none; font-size: 14px; font-weight: 600; letter-spacing: 0.2px; position: relative; padding: 4px 0; transition: color 200ms;
  border: none; background: transparent; cursor: pointer; font-family: var(--font-body);
}
.fi-nav .links a::after,
.fi-nav .links button::after { content: ''; position: absolute; left: 0; right: 0; bottom: -2px; height: 2px; background: var(--secondary); transform: scaleX(0); transform-origin: left; transition: transform 280ms cubic-bezier(0.65,0,0.35,1); }
.fi-nav .links a:hover,
.fi-nav .links button:hover { color: var(--primary); }
.fi-nav .links a:hover::after,
.fi-nav .links button:hover::after { transform: scaleX(1); }
.fi-nav .actions { margin-left: auto; display: flex; gap: 12px; align-items: center; }
.fi-nav .login { font-size: 14px; font-weight: 700; color: var(--primary); text-decoration: none; padding: 9px 16px; border-radius: 999px; transition: background 200ms; border: none; background: transparent; cursor: pointer; font-family: var(--font-body); }
.fi-nav .login:hover { background: rgba(28,60,86,0.08); }
.fi-nav .dashboard-link {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  font-size: 14px; font-weight: 800; color: var(--primary); text-decoration: none; padding: 10px 16px; border-radius: 999px;
  border: 1px solid rgba(28,60,86,0.16); background: rgba(255,252,246,0.78); cursor: pointer; font-family: var(--font-display);
  transition: background 200ms, transform 200ms, border-color 200ms;
}
.fi-nav .dashboard-link:hover { background: rgba(255,252,246,0.96); border-color: rgba(28,60,86,0.3); transform: translateY(-1px); }
.fi-nav .cta { display: inline-flex; align-items: center; gap: 8px; background: var(--primary); color: var(--text-on-dark); font-family: var(--font-display); font-weight: 700; font-size: 14px; padding: 10px 20px; border-radius: 999px; border: none; cursor: pointer; box-shadow: var(--shadow-sm); transition: transform 200ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 200ms; }
.fi-nav .cta:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
.fi-nav .cta .arr { transition: transform 200ms; display: inline-block; }
.fi-nav .cta:hover .arr { transform: translateX(3px); }
.fi-nav .menu-toggle {
  display: none; width: 40px; height: 40px; border-radius: 12px; border: 1px solid rgba(28,60,86,0.14);
  background: rgba(255,252,246,0.72); color: var(--primary); align-items: center; justify-content: center; cursor: pointer;
}
.fi-mobile-menu {
  position: absolute; top: calc(100% + 8px); left: 20px; right: 20px; display: none; flex-direction: column; gap: 6px;
  padding: 10px; background: rgba(255,252,246,0.98); border: 1px solid rgba(201,190,175,0.6); border-radius: 18px; box-shadow: var(--shadow-md);
}
.fi-mobile-menu.open { display: flex; }
.fi-mobile-menu a,
.fi-mobile-menu button {
  display: flex; align-items: center; gap: 10px; width: 100%; border: none; border-radius: 12px; background: transparent;
  color: var(--primary); font-family: var(--font-display); font-size: 14px; font-weight: 700; text-decoration: none; padding: 12px 14px; cursor: pointer;
}
.fi-mobile-menu a:hover,
.fi-mobile-menu button:hover { background: rgba(28,60,86,0.08); }
@media (max-width: 960px) {
  .fi-nav { padding: 14px 20px; }
  .fi-nav .links { display: none; }
  .fi-nav .login { display: none; }
  .fi-nav .dashboard-link { display: none; }
  .fi-nav .menu-toggle { display: inline-flex; }
}

/* ── Hero ────────────────────────────────────────────── */
.fi-hero {
  position: relative; min-height: 100vh; padding: 140px 48px 80px;
  display: grid; grid-template-columns: 1.15fr 1fr; gap: 56px; align-items: center; overflow: hidden;
}
.fi-hero-mark { position: absolute; right: min(8vw, 120px); bottom: 40px; width: min(42vw, 520px); height: min(42vw, 520px); object-fit: contain; opacity: 0.055; pointer-events: none; z-index: 0; }
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
  font-family: var(--font-display); font-size: clamp(44px, 6.6vw, 96px); font-weight: 800; letter-spacing: 0; line-height: 0.95; color: var(--primary); margin: 0 0 32px;
}
.fi-hero-title .line { display: block; }
.fi-hero-title .line > span { display: inline-block; opacity: 0; transform: translateY(40px); animation: lineUp 900ms cubic-bezier(0.16,1,0.3,1) forwards; }
.fi-hero-title .line:nth-child(1) > span { animation-delay: 200ms; }
.fi-hero-title .line:nth-child(2) > span { animation-delay: 360ms; }
.fi-hero-title .accent { background: linear-gradient(105deg, var(--secondary-dark) 0%, var(--secondary) 50%, var(--secondary-dark) 100%); background-size: 200% 100%; -webkit-background-clip: text; background-clip: text; color: transparent; }
.fi-hero-title .accent.shimmer { animation: shimmer 4s ease-in-out infinite; }
.fi-hero-sub { font-size: 19px; color: var(--text-secondary); max-width: 520px; line-height: 1.55; margin: 0 0 40px; opacity: 0; animation: rise 800ms cubic-bezier(0.16,1,0.3,1) 700ms forwards; }
.fi-hero-actions { display: flex; gap: 14px; align-items: center; flex-wrap: wrap; opacity: 0; animation: rise 800ms cubic-bezier(0.16,1,0.3,1) 850ms forwards; }
.btn-hero { display: inline-flex; align-items: center; gap: 10px; padding: 18px 32px; border-radius: 999px; font-family: var(--font-display); font-weight: 700; font-size: 16px; border: none; cursor: pointer; text-decoration: none; position: relative; overflow: hidden; transition: transform 250ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 250ms; }
.btn-hero.primary { background: var(--primary); color: var(--text-on-dark); box-shadow: 0 8px 24px -8px rgba(28,60,86,0.5), inset 0 1px 0 rgba(255,255,255,0.1); }
.btn-hero.primary::before { content: ''; position: absolute; top: 0; left: -100%; width: 100%; height: 100%; background: linear-gradient(90deg, transparent, rgba(241,181,69,0.4), transparent); transition: left 700ms cubic-bezier(0.65,0,0.35,1); }
.btn-hero.primary:hover::before { left: 100%; }
.btn-hero.primary:hover { transform: translateY(-3px); box-shadow: 0 14px 32px -8px rgba(28,60,86,0.6), inset 0 1px 0 rgba(255,255,255,0.15); }
.btn-hero.ghost { background: transparent; color: var(--primary); border: 1.5px solid rgba(28,60,86,0.25); }
.btn-hero.ghost:hover { background: var(--primary); color: var(--text-on-dark); transform: translateY(-3px); border-color: var(--primary); }
.btn-hero.quiet { padding-left: 12px; padding-right: 12px; color: var(--primary); background: transparent; }
.btn-hero.quiet:hover { transform: translateY(-3px); color: var(--secondary-dark); }
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

/* ── Hero worker animation ─────────────────────────── */
.fi-hero-stage {
  position: relative; z-index: 1; min-height: 520px;
  display: flex; align-items: center; justify-content: center;
}
.fi-worker {
  position: relative; width: min(100%, 560px); aspect-ratio: 1.42;
  border-radius: 32px; overflow: hidden; cursor: pointer;
  background:
    radial-gradient(ellipse 80% 60% at 50% 100%, rgba(251,133,0,0.10), transparent 60%),
    radial-gradient(ellipse 90% 70% at 50% 0%, rgba(26,58,107,0.06), transparent 60%),
    linear-gradient(180deg, #faf3e2 0%, #f1e6c8 100%);
  border: 1px solid rgba(255,252,246,0.6);
  box-shadow: 0 28px 70px -24px rgba(15,36,56,0.45);
  transition: transform 260ms cubic-bezier(0.34,1.56,0.64,1), border-color 260ms, box-shadow 260ms;
}
.fi-worker::before {
  content: ""; position: absolute; inset: -2px;
  background-image:
    linear-gradient(to right, rgba(20,33,61,0.05) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(20,33,61,0.05) 1px, transparent 1px);
  background-size: 48px 48px;
  -webkit-mask-image: radial-gradient(ellipse 80% 70% at 50% 50%, #000 40%, transparent 80%);
  mask-image: radial-gradient(ellipse 80% 70% at 50% 50%, #000 40%, transparent 80%);
  pointer-events: none;
}
.fi-worker:hover {
  transform: translateY(-6px);
  border-color: rgba(241,181,69,0.76);
  box-shadow: 0 34px 80px -22px rgba(15,36,56,0.54);
}
.fi-worker:active .runner-wrap { transform: translateX(-30px) rotate(-3deg); }
.fi-worker-label {
  position: absolute; top: 26px; left: 0; right: 0; z-index: 5;
  display: flex; align-items: center; justify-content: center; gap: 12px;
  font-size: 10px; font-weight: 800; letter-spacing: 0.28em; text-transform: uppercase;
  color: rgba(20,33,61,0.54); pointer-events: none;
}
.fi-worker-label::before,
.fi-worker-label::after {
  content: ""; width: 6px; height: 6px; border-radius: 50%;
  background: #fb8500; box-shadow: 0 0 0 4px rgba(251,133,0,0.15);
}
.frame-corner {
  position: absolute; width: 18px; height: 18px; z-index: 5;
  border-color: rgba(20,33,61,0.34);
}
.frame-corner.tl { top: 18px; left: 18px; border-left: 1.5px solid; border-top: 1.5px solid; }
.frame-corner.tr { top: 18px; right: 18px; border-right: 1.5px solid; border-top: 1.5px solid; }
.frame-corner.bl { bottom: 18px; left: 18px; border-left: 1.5px solid; border-bottom: 1.5px solid; }
.frame-corner.br { bottom: 18px; right: 18px; border-right: 1.5px solid; border-bottom: 1.5px solid; }
.worker-scene { position: absolute; inset: 50px 0 48px; overflow: hidden; }
.worker-ground {
  position: absolute; left: 7%; right: 7%; bottom: 21%; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(20,33,61,0.20) 20%, rgba(20,33,61,0.20) 80%, transparent);
}
.worker-ground::after {
  content: ""; position: absolute; left: 10%; right: 10%; top: 6px; height: 14px;
  background: radial-gradient(ellipse 50% 100% at 50% 0%, rgba(20,33,61,0.15), transparent 70%);
}
.worker-ticks { position: absolute; left: 7%; right: 7%; bottom: 18%; height: 24px; overflow: hidden; }
.worker-ticks i {
  position: absolute; bottom: 0; width: 28px; height: 1px; background: rgba(20,33,61,0.22);
  animation: workerTick 1.35s linear infinite;
}
.fi-worker:hover .worker-ticks i { animation-duration: 0.52s; }
.worker-lines { position: absolute; inset: 0; pointer-events: none; }
.worker-lines i {
  position: absolute; height: 2px; border-radius: 2px;
  background: linear-gradient(90deg, transparent, #fb8500 20%, #ffb703 50%, transparent);
  animation: workerLine 1.45s linear infinite;
}
.fi-worker:hover .worker-lines i { animation-duration: 0.58s; }
.worker-shadow {
  position: absolute; bottom: 18%; left: 50%; width: 46%; height: 22px; z-index: 1;
  border-radius: 999px; background: radial-gradient(ellipse 50% 100% at 50% 50%, rgba(20,33,61,0.34), transparent 70%);
  filter: blur(2px); animation: workerShadow 0.56s cubic-bezier(.45,.05,.55,.95) infinite alternate;
}
.fi-worker:hover .worker-shadow { animation-duration: 0.28s; }
.runner-wrap {
  position: absolute; inset: 2% 5% 0; z-index: 3;
  transition: transform 0.4s cubic-bezier(.2,.8,.2,1);
  animation: workerBob 0.56s cubic-bezier(.45,.05,.55,.95) infinite alternate;
  transform-origin: 50% 80%;
}
.fi-worker:hover .runner-wrap {
  transform: translateX(20px) scale(1.02);
  animation-duration: 0.28s;
}
.runner-wrap img {
  width: 100%; height: 100%; object-fit: contain;
  filter: drop-shadow(0 18px 12px rgba(20,33,61,0.18)) drop-shadow(0 4px 0 rgba(20,33,61,0.05));
  transition: filter 0.3s;
}
.fi-worker:hover .runner-wrap img {
  filter: drop-shadow(0 14px 10px rgba(251,133,0,0.45)) drop-shadow(0 0 24px rgba(255,183,3,0.4));
}
.worker-sparks { position: absolute; inset: 0; opacity: 0; pointer-events: none; transition: opacity 240ms; }
.fi-worker:hover .worker-sparks { opacity: 1; }
.worker-sparks span {
  position: absolute; width: 6px; height: 6px; border-radius: 50%;
  background: radial-gradient(circle, #ffb703 0%, #fb8500 60%, transparent 70%);
  animation: workerSpark 0.7s ease-out infinite;
}
.worker-pow {
  position: absolute; top: 19%; right: 15%; z-index: 6; pointer-events: none;
  padding: 8px 14px; border-radius: 12px; background: var(--secondary);
  border: 2px solid var(--primary-dark); color: var(--primary-dark);
  font-family: var(--font-display); font-weight: 900; letter-spacing: 2px; font-size: 22px;
  opacity: 0; transform: scale(0.45) rotate(-18deg);
}
.fi-worker:active .worker-pow { animation: workerPow 0.7s cubic-bezier(.2,1.4,.4,1) forwards; }
.worker-speedo {
  position: absolute; bottom: 22px; left: 40px; right: 40px; z-index: 5;
  display: flex; align-items: center; gap: 12px;
  font-size: 10px; font-weight: 800; letter-spacing: 0.22em; text-transform: uppercase;
  color: rgba(20,33,61,0.48);
}
.worker-speedo .track { flex: 1; height: 3px; border-radius: 3px; background: rgba(20,33,61,0.12); overflow: hidden; }
.worker-speedo .fill { display: block; width: 20%; height: 100%; background: linear-gradient(90deg, #ffb703, #fb8500); transition: width 0.45s cubic-bezier(.2,.8,.2,1); }
.fi-worker:hover .worker-speedo .fill { width: 92%; }
.worker-speedo .slow { display: inline; }
.worker-speedo .fast { display: none; }
.fi-worker:hover .worker-speedo .slow { display: none; }
.fi-worker:hover .worker-speedo .fast { display: inline; }
@media (max-width: 960px) { .fi-hero { grid-template-columns: 1fr; padding: 110px 20px 60px; gap: 40px; } .fi-hero-stage { display: none; } }

/* ── Stats ───────────────────────────────────────────── */
.fi-proof { padding: 60px 48px; border-top: 1px solid var(--outline-light); border-bottom: 1px solid var(--outline-light); background: var(--surface); }
.fi-proof-inner { max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: repeat(4, 1fr); gap: 32px; }
.fi-stat { text-align: center; padding: 8px 16px; border-right: 1px solid var(--outline-light); }
.fi-stat:last-child { border-right: none; }
.fi-stat .num { font-family: var(--font-display); font-size: 56px; font-weight: 800; letter-spacing: 0; color: var(--primary); line-height: 1; }
.fi-stat .num .unit { color: var(--secondary-dark); }
.fi-stat .lbl { font-size: 13px; font-weight: 600; color: var(--text-muted); letter-spacing: 0.4px; text-transform: uppercase; margin-top: 8px; }
@media (max-width: 960px) { .fi-proof { padding: 40px 20px; } .fi-proof-inner { grid-template-columns: repeat(2,1fr); gap: 16px; } .fi-stat { border-right: none; } .fi-stat .num { font-size: 40px; } }

/* ── How it works ────────────────────────────────────── */
.fi-how { padding: 140px 48px; }
.fi-how-inner { max-width: 1200px; margin: 0 auto; }
.sec-eyebrow { display: inline-block; font-family: var(--font-display); font-size: 12px; font-weight: 800; color: var(--secondary-dark); letter-spacing: 1.2px; text-transform: uppercase; margin-bottom: 16px; }
.sec-title { font-family: var(--font-display); font-size: clamp(36px,5vw,64px); font-weight: 800; letter-spacing: 0; line-height: 1.05; color: var(--primary); margin: 0 0 24px; max-width: 800px; }
.sec-sub { font-size: 18px; color: var(--text-secondary); max-width: 600px; line-height: 1.5; margin: 0 0 64px; }
.fi-steps { display: grid; grid-template-columns: repeat(3,1fr); gap: 24px; }
.fi-step { position: relative; background: var(--surface); border-radius: 24px; padding: 36px 32px; border: 1px solid var(--outline-light); overflow: hidden; transition: transform 350ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 350ms, border-color 350ms; }
.fi-step:hover { transform: translateY(-8px); box-shadow: 0 28px 60px -16px rgba(28,60,86,0.18); border-color: var(--secondary); }
.fi-step::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px; background: var(--secondary); transform: scaleX(0); transform-origin: left; transition: transform 500ms cubic-bezier(0.65,0,0.35,1); }
.fi-step:hover::before { transform: scaleX(1); }
.fi-step-num { font-family: var(--font-display); font-size: 96px; font-weight: 800; letter-spacing: 0; color: transparent; -webkit-text-stroke: 2px var(--outline); line-height: 1; margin-bottom: 12px; transition: -webkit-text-stroke 350ms, color 350ms; }
.fi-step:hover .fi-step-num { color: var(--secondary); -webkit-text-stroke: 2px var(--secondary); }
.fi-step-icon { height: 80px; margin-bottom: 16px; display: flex; align-items: center; }
.fi-step-tile { width: 56px; height: 56px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 26px; transition: transform 350ms cubic-bezier(0.34,1.56,0.64,1); }
.fi-step:hover .fi-step-tile { transform: rotate(-6deg) scale(1.08); }
.fi-step h3 { font-family: var(--font-display); font-size: 24px; font-weight: 700; letter-spacing: 0; color: var(--primary); margin: 0 0 12px; }
.fi-step p { color: var(--text-secondary); line-height: 1.55; margin: 0; font-size: 15px; }
@media (max-width: 960px) { .fi-how { padding: 80px 20px; } .fi-steps { grid-template-columns: 1fr; } }

/* ── Categories ──────────────────────────────────────── */
.fi-cats { padding: 80px 48px 140px; }
.fi-cats-inner { max-width: 1200px; margin: 0 auto; }
.fi-cats-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 32px; flex-wrap: wrap; margin-bottom: 48px; }
.fi-cats-copy { max-width: 420px; margin: 0; color: var(--text-secondary); font-size: 16px; line-height: 1.5; }
.fi-cats-grid { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); grid-auto-rows: minmax(220px, auto); gap: 14px; align-items: stretch; }
.fi-cat { position: relative; min-height: 220px; border-radius: 20px; overflow: hidden; background: var(--primary-dark); box-shadow: var(--shadow-sm); transition: transform 400ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 300ms; isolation: isolate; }
.fi-cat:hover { transform: translateY(-6px); }
.fi-cat.active { grid-column: span 2; grid-row: span 2; min-height: 454px; box-shadow: 0 0 0 4px rgba(241,181,69,0.45), 0 28px 60px -16px rgba(28,60,86,0.28); transform: translateY(-4px); }
.fi-cat-select { position: absolute; inset: 0; z-index: 2; width: 100%; height: 100%; border: none; padding: 0; background: transparent; color: #fff; text-align: left; cursor: pointer; font-family: var(--font-body); }
.fi-cat-select:focus-visible { outline: 3px solid var(--secondary); outline-offset: -6px; border-radius: 20px; }
.fi-cat .img { position: absolute; inset: 0; background-size: cover; background-position: center; transition: transform 700ms cubic-bezier(0.65,0,0.35,1); }
.fi-cat:hover .img { transform: scale(1.08); }
.fi-cat .overlay { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(15,36,56,0) 35%, rgba(15,36,56,0.85) 100%); transition: background 400ms; }
.fi-cat:hover .overlay { background: linear-gradient(180deg, rgba(15,36,56,0.1) 0%, rgba(15,36,56,0.92) 100%); }
.fi-cat.active .overlay { background: linear-gradient(180deg, rgba(15,36,56,0.18) 0%, rgba(15,36,56,0.96) 100%); }
.fi-cat .body { position: absolute; z-index: 2; bottom: 0; left: 0; right: 0; padding: 18px 20px; color: #fff; transition: bottom 300ms, top 300ms; }
.fi-cat.active .body { top: 82px; bottom: auto; padding-right: 26px; }
.fi-cat .name { display: block; font-family: var(--font-display); font-size: 22px; font-weight: 800; letter-spacing: 0; }
.fi-cat.active .name { font-size: clamp(28px,3vw,38px); letter-spacing: 0; }
.fi-cat .desc { display: block; font-size: 12px; color: rgba(255,252,246,0.84); margin-top: 4px; line-height: 1.35; max-width: 92%; }
.fi-cat.active .desc { font-size: 14px; line-height: 1.45; max-width: 560px; margin-top: 8px; }
.fi-cat .examples { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; max-height: 0; overflow: hidden; transition: max-height 400ms cubic-bezier(0.65,0,0.35,1); }
.fi-cat .examples span { font-size: 11px; font-weight: 700; color: rgba(255,252,246,0.9); background: rgba(255,252,246,0.16); border-radius: 999px; padding: 4px 8px; }
.fi-cat:hover .examples, .fi-cat.active .examples { max-height: 80px; }
.fi-cat .glyph { position: absolute; top: 16px; left: 16px; width: 44px; height: 44px; border-radius: 12px; background: rgba(255,252,246,0.92); display: flex; align-items: center; justify-content: center; font-size: 22px; transition: transform 400ms cubic-bezier(0.34,1.56,0.64,1); }
.fi-cat:hover .glyph { transform: rotate(-8deg) scale(1.1); }
.fi-cat-expanded {
  position: absolute; z-index: 4; left: 20px; right: 20px; bottom: 20px;
  display: flex; flex-direction: column; gap: 14px; color: rgba(255,252,246,0.9);
  padding: 18px; border-radius: 18px; border: 1px solid rgba(255,252,246,0.18);
  background: rgba(15,36,56,0.72); box-shadow: 0 18px 40px -20px rgba(0,0,0,0.55);
  backdrop-filter: blur(14px) saturate(130%); -webkit-backdrop-filter: blur(14px) saturate(130%);
}
.fi-cat-expanded p { margin: 0; font-size: 14px; line-height: 1.5; max-width: 620px; }
.fi-cat-expanded .expanded-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.fi-cat-expanded .expanded-chips span { border-radius: 999px; padding: 7px 10px; font-size: 12px; font-weight: 800; color: var(--primary-dark); background: rgba(255,252,246,0.9); }
.fi-cat-expanded .expanded-note { display: flex; align-items: flex-start; gap: 9px; color: rgba(255,252,246,0.82); }
.fi-cat-expanded .expanded-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.cat-post {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px; border: none; border-radius: 999px; padding: 12px 18px;
  background: var(--secondary); color: var(--primary-dark); font-family: var(--font-display); font-size: 14px; font-weight: 800; cursor: pointer;
  transition: transform 220ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 220ms;
}
.cat-post:hover { transform: translateY(-2px); box-shadow: 0 12px 24px -14px rgba(0,0,0,0.5); }
.cat-post .arr { transition: transform 220ms; }
.cat-post:hover .arr { transform: translateX(4px); }
@media (max-width: 960px) {
  .fi-cats { padding: 60px 20px 80px; }
  .fi-cats-head { align-items: flex-start; margin-bottom: 32px; }
  .fi-cats-copy { max-width: 100%; }
  .fi-cats-grid { grid-template-columns: repeat(2,minmax(0,1fr)); grid-auto-rows: minmax(190px, auto); }
  .fi-cat { min-height: 190px; }
  .fi-cat.active { grid-column: span 2; min-height: 430px; }
  .fi-hero-mark { width: 360px; height: 360px; right: -120px; bottom: auto; top: 90px; opacity: 0.04; }
}

/* ── Dual CTA (Fixers) ───────────────────────────────── */
.fi-dual { padding: 0 48px 140px; }
.fi-dual-inner { max-width: 1200px; margin: 0 auto; background: var(--primary); border-radius: 32px; padding: 80px; display: grid; grid-template-columns: 1.2fr 1fr; gap: 64px; align-items: center; position: relative; overflow: hidden; }
.fi-dual-inner::before { content: ''; position: absolute; top: -100px; right: -100px; width: 400px; height: 400px; border-radius: 50%; background: radial-gradient(circle, var(--secondary) 0%, transparent 70%); opacity: 0.3; }
.fi-dual-inner::after { content: ''; position: absolute; bottom: -200px; left: -100px; width: 500px; height: 500px; border-radius: 50%; background: radial-gradient(circle, var(--primary-light) 0%, transparent 70%); opacity: 0.5; }
.fi-dual-text { position: relative; z-index: 2; color: var(--text-on-dark); }
.fi-dual-text h2 { font-family: var(--font-display); font-size: clamp(36px,4.5vw,56px); font-weight: 800; letter-spacing: 0; line-height: 1.05; margin: 0 0 20px; color: var(--text-on-dark); }
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
.fi-footer .logo { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; font-family: var(--font-display); font-weight: 800; font-size: 24px; color: var(--primary); letter-spacing: 0; }
.fi-footer .logo img { width: 36px; height: 36px; object-fit: contain; }
.fi-footer .tag { font-size: 14px; color: var(--text-muted); max-width: 280px; line-height: 1.5; }
.fi-footer h5 { font-family: var(--font-display); font-size: 13px; font-weight: 800; letter-spacing: 0.6px; text-transform: uppercase; color: var(--primary); margin: 0 0 16px; }
.fi-footer ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; }
.fi-footer ul a,
.fi-footer ul span { font-size: 14px; color: var(--text-secondary); text-decoration: none; transition: color 200ms; }
.fi-footer ul a:hover { color: var(--primary); }
.fi-footer-bottom { max-width: 1200px; margin: 48px auto 0; padding-top: 24px; border-top: 1px solid var(--outline-light); display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--text-muted); }
@media (max-width: 960px) { .fi-footer { padding: 40px 20px 24px; } .fi-footer-inner { grid-template-columns: 1fr 1fr; gap: 32px; } }
@media (max-width: 520px) {
  .fi-hero-title { font-size: clamp(42px, 18vw, 64px); letter-spacing: 0; }
  .fi-hero-actions, .fi-dual-actions { align-items: stretch; }
  .btn-hero, .btn-dual { width: 100%; justify-content: center; }
  .fi-proof-inner { grid-template-columns: 1fr; }
  .fi-cats-grid { grid-template-columns: 1fr; grid-auto-rows: minmax(190px, auto); }
  .fi-cat.active { grid-column: span 1; min-height: 500px; }
  .fi-cat.active .body { top: 76px; padding-right: 18px; }
  .fi-cat-expanded { left: 14px; right: 14px; bottom: 14px; padding: 14px; }
  .cat-post { width: 100%; }
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
export default function LandingScreen({
  isSignedIn = false,
  onLogin,
  onCreateAccount,
  onPostTask,
  onDashboard,
  onRequesterHome,
  onBecomeFixer,
  onFixerHome,
}: Props) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const closeMenus = () => {
    setMobileMenuOpen(false);
  };
  const runAndClose = (action?: () => void) => {
    action?.();
    closeMenus();
  };
  const handleLogin = () => runAndClose(onLogin ?? (() => onPostTask()));
  const handlePostTask = (category?: Category) => {
    onPostTask(category);
    closeMenus();
  };
  const handlePostTaskCta = (category?: Category) => {
    handlePostTask(category);
  };
  const handleRequesterHome = onRequesterHome ?? onDashboard ?? handleLogin;
  const hasDedicatedFixerOnboarding = !isSignedIn && Boolean(onBecomeFixer && !onFixerHome);
  const handleSignedInFixerHome = onFixerHome ?? onBecomeFixer ?? onDashboard ?? handleLogin;
  const handleFixerCta = () => {
    if (isSignedIn) {
      runAndClose(handleSignedInFixerHome);
      return;
    }
    if (hasDedicatedFixerOnboarding && onBecomeFixer) {
      runAndClose(onBecomeFixer);
      return;
    }
    runAndClose(onFixerHome ?? onBecomeFixer ?? onLogin ?? onCreateAccount ?? (() => onPostTask()));
  };
  const postTaskCtaLabel = isSignedIn ? 'Post Task' : 'Sign in to Post Task';
  const fixerCtaLabel = isSignedIn ? 'Open Fixer Workspace' : hasDedicatedFixerOnboarding ? 'Join as a Fixer' : 'Sign in to Find Jobs';

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
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenus();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const logoSrc = assetSrc(imgLogo);
  const workerSrc = assetSrc(imgWorker);

  return (
    <div id="fixit-landing">
      {/* ── Nav ─────────────────────────────────────────── */}
      <nav className={`fi-nav${scrolled ? ' scrolled' : ''}`} aria-label="Primary navigation">
        <a href="#top" className="logo" aria-label="FixIt home" onClick={closeMenus}>
          {logoSrc ? <img src={logoSrc} alt="" /> : null}
          <span>Fix<span className="l">I</span>t</span>
        </a>
        {!isSignedIn && (
          <div className="links">
            <a href="#how" onClick={closeMenus}>How it works</a>
            <a href="#categories" onClick={closeMenus}>Categories</a>
            <a href="#fixers" onClick={closeMenus}>For Fixers</a>
            <a href="#help" onClick={closeMenus}>Help</a>
          </div>
        )}
        <div className="actions">
          {isSignedIn ? (
            <>
              <button type="button" className="dashboard-link" onClick={() => runAndClose(handleRequesterHome)}>
                Requester Dashboard
              </button>
              {onFixerHome && (
                <button type="button" className="dashboard-link" onClick={() => runAndClose(onFixerHome)}>
                  Find Jobs
                </button>
              )}
            </>
          ) : (
            <button type="button" className="login" onClick={handleLogin}>Log in</button>
          )}
          <button type="button" className="cta" onClick={() => handlePostTaskCta()}>
            {postTaskCtaLabel} <span className="arr">→</span>
          </button>
          <button
            type="button"
            className="menu-toggle"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-controls="fixit-mobile-menu"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            <LandingIcon name={mobileMenuOpen ? 'close' : 'menu'} size={22} />
          </button>
        </div>
        <div id="fixit-mobile-menu" className={`fi-mobile-menu${mobileMenuOpen ? ' open' : ''}`}>
          {isSignedIn ? (
            <>
              <button type="button" onClick={() => runAndClose(handleRequesterHome)}><LandingIcon name="view-dashboard-outline" size={18} />Requester Dashboard</button>
              {onFixerHome && (
                <button type="button" onClick={() => runAndClose(onFixerHome)}><LandingIcon name="briefcase-outline" size={18} />Find Jobs</button>
              )}
              <button type="button" onClick={() => handlePostTaskCta()}><LandingIcon name={isSignedIn ? 'plus-circle-outline' : 'login'} size={18} />{postTaskCtaLabel}</button>
            </>
          ) : (
            <>
              <a href="#how" onClick={closeMenus}>How it works</a>
              <a href="#categories" onClick={closeMenus}>Categories</a>
              <a href="#fixers" onClick={closeMenus}>For Fixers</a>
              <a href="#help" onClick={closeMenus}>Help</a>
              <button type="button" onClick={handleLogin}><LandingIcon name="login" size={18} />Log in</button>
              {onCreateAccount && <button type="button" onClick={() => runAndClose(onCreateAccount)}><LandingIcon name="account-plus-outline" size={18} />Create account</button>}
              <button type="button" onClick={() => handlePostTaskCta()}><LandingIcon name={isSignedIn ? 'plus-circle-outline' : 'login'} size={18} />{postTaskCtaLabel}</button>
              <button type="button" onClick={handleFixerCta}><LandingIcon name="account-hard-hat-outline" size={18} />{fixerCtaLabel}</button>
            </>
          )}
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────── */}
      <section className="fi-hero" id="top">
        <div className="fi-hero-bg" />
        <div className="fi-hero-grid" />
        {logoSrc ? <img className="fi-hero-mark" src={logoSrc} alt="" aria-hidden="true" /> : null}

        <div className="fi-hero-content">
          <div className="fi-hero-eyebrow">
            <span className="pulse" />
            {isSignedIn ? 'Your requester workspace is ready' : 'Trusted by 12,000+ neighbors in Israel'}
          </div>

          <h1 className="fi-hero-title">
            <span className="line">
              <span>Let’s fix your</span>
            </span>
            <span className="line">
              <span><span className="accent shimmer">problems.</span></span>
            </span>
          </h1>

          <p className="fi-hero-sub">
            {isSignedIn
              ? 'Post the next thing your home needs, compare local Fixers, and head back to your dashboard when you are ready to manage the work.'
              : 'Post any home task, compare bids from vetted local Fixers, and choose who gets the job without chasing calls or favors.'}
          </p>

          <div className="fi-hero-actions">
            <button type="button" className="btn-hero primary" onClick={() => handlePostTaskCta()}>
              {postTaskCtaLabel} <span className="arr">→</span>
            </button>
            <button type="button" className="btn-hero ghost" onClick={handleFixerCta}>
              {fixerCtaLabel}
            </button>
            <a href="#how" className="btn-hero quiet">How it works</a>
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

        {/* Right: animated worker */}
        <div className="fi-hero-stage">
          <div className="fi-worker" role="img" aria-label="Animated FixIt worker running to a job">
            <span className="frame-corner tl" />
            <span className="frame-corner tr" />
            <span className="frame-corner bl" />
            <span className="frame-corner br" />
            <div className="fi-worker-label">Fixer on duty</div>
            <div className="worker-scene">
              <div className="worker-ground" />
              <div className="worker-ticks" aria-hidden="true">
                {Array.from({ length: 8 }, (_, index) => (
                  <i key={index} style={{ left: `${8 + index * 13}%`, animationDelay: `${-index * 0.15}s` }} />
                ))}
              </div>
              <div className="worker-lines" aria-hidden="true">
                {[
                  { top: '18%', left: '58%', width: 130 },
                  { top: '28%', left: '64%', width: 190 },
                  { top: '42%', left: '60%', width: 150 },
                  { top: '57%', left: '67%', width: 210 },
                  { top: '69%', left: '56%', width: 120 },
                  { top: '78%', left: '62%', width: 170 },
                ].map((line, index) => (
                  <i
                    key={`${line.top}-${line.left}`}
                    style={{
                      top: line.top,
                      left: line.left,
                      width: line.width,
                      animationDelay: `${-index * 0.22}s`,
                    }}
                  />
                ))}
              </div>
              <div className="worker-shadow" />
              <div className="runner-wrap">
                <img src={workerSrc} alt="" />
              </div>
              <div className="worker-sparks" aria-hidden="true">
                {[
                  { left: '45%', top: '68%' },
                  { left: '50%', top: '74%' },
                  { left: '55%', top: '70%' },
                  { left: '60%', top: '77%' },
                  { left: '52%', top: '82%' },
                ].map((spark, index) => (
                  <span
                    key={`${spark.left}-${spark.top}`}
                    style={{ left: spark.left, top: spark.top, animationDelay: `${-index * 0.12}s` }}
                  />
                ))}
              </div>
              <div className="worker-pow">GO!</div>
            </div>
            <div className="worker-speedo" aria-hidden="true">
              <span className="slow">02 mph</span>
              <span className="fast">48 mph</span>
              <span className="track"><span className="fill" /></span>
              <span>max</span>
            </div>
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
              <p>Snap a photo, set your budget, pick a category. Sign in once, then your task is ready for local Fixers.</p>
            </div>
            <div className="fi-step">
              <div className="fi-step-num">02</div>
              <div className="fi-step-icon">
                <div className="fi-step-tile" style={{ background: '#F1B545', color: '#0F2438' }}>
                  <LandingIcon name="account-search-outline" size={28} />
                </div>
              </div>
              <h3>Compare bids</h3>
              <p>Local Fixers send you their price, ETA, and a short pitch. Read profiles, check ratings, and pick the best fit.</p>
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
            <p className="fi-cats-copy">Pick a category to see what belongs there, then start the task with the right context already selected.</p>
          </div>
          <div className="fi-cats-grid">
            {CATEGORY_CARDS.map((cat) => {
              const src = assetSrc(cat.image as { uri?: string } | number);
              const selected = selectedCategory === cat.value;
              return (
                <article
                  key={cat.value}
                  className={`fi-cat${selected ? ' active' : ''}`}
                >
                  <button
                    type="button"
                    className="fi-cat-select"
                    aria-pressed={selected}
                    aria-label={selected ? `Collapse ${cat.label}` : `Expand ${cat.label}`}
                    onClick={() => setSelectedCategory((current) => current === cat.value ? null : cat.value)}
                  >
                    <span className="img" style={{ backgroundImage: `url(${src})` }} />
                    <span className="overlay" />
                    <span className="glyph" style={{ color: cat.color }}>
                      <LandingIcon name={cat.icon} />
                    </span>
                    <span className="body">
                      <span className="name">{cat.label}</span>
                      <span className="desc">{cat.description}</span>
                      <span className="examples">
                        {cat.examples.slice(0, selected ? 3 : 2).map((example) => (
                          <span key={example}>{example}</span>
                        ))}
                      </span>
                    </span>
                  </button>
                  {selected && (
                    <div className="fi-cat-expanded" id={`category-details-${cat.value}`} role="region" aria-label={`${cat.label} details`}>
                      <p>{cat.detailCopy}</p>
                      <div className="expanded-chips">
                        {cat.examples.map((task) => (
                          <span key={task} style={{ background: cat.soft }}>{task}</span>
                        ))}
                      </div>
                      <div className="expanded-note">
                        <LandingIcon name="lightbulb-on-outline" size={18} />
                        <span>We will start your task with {cat.label.toLowerCase()} selected.</span>
                      </div>
                      <div className="expanded-actions">
                        <button type="button" className="cat-post" onClick={() => handlePostTaskCta(cat.value)}>
                          {isSignedIn ? `Post ${cat.label} Task` : postTaskCtaLabel} <span className="arr">→</span>
                        </button>
                      </div>
                    </div>
                  )}
                </article>
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
            <h2>Turn your skills into local work.</h2>
            <p>Build a steady book of local jobs. Set your own rates, work where you want, get paid in cash, Bit, or Paybox. No subscription, no lead fees — we take a small cut only when you're hired.</p>
            <div className="fi-dual-actions">
              <button type="button" className="btn-dual amber" onClick={handleFixerCta}>{fixerCtaLabel} <span className="arr">→</span></button>
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
            <p className="tag">Your neighborhood. Fixed. A task marketplace for homeowners and skilled local pros.</p>
          </div>
          <div>
            <h5>Product</h5>
            <ul>
              <li><a href="#how">How it works</a></li>
              <li><a href="#categories">Categories</a></li>
              <li><a href="#fixers">For Fixers</a></li>
              <li><span>Pricing</span></li>
            </ul>
          </div>
          <div>
            <h5>Company</h5>
            <ul>
              <li><span>About</span></li>
              <li><span>Careers</span></li>
              <li><span>Press</span></li>
              <li><span>Contact</span></li>
            </ul>
          </div>
          <div>
            <h5>Help</h5>
            <ul>
              <li><span>FAQ</span></li>
              <li><span>Trust &amp; Safety</span></li>
              <li><span>Privacy</span></li>
              <li><span>Terms</span></li>
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
