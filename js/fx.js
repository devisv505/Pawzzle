// Short-lived particle effects drawn in a fixed layer above the game.
import { PALETTE } from './piece.js';

export const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const STAR = 'assets/img/icons/star.webp';

function layer() {
  return document.getElementById('fx-layer');
}

function particle(className, x, y, size, html = '') {
  const el = document.createElement('div');
  el.className = `particle ${className}`;
  el.style.cssText = `left:${x - size / 2}px;top:${y - size / 2}px;width:${size}px;height:${size}px`;
  el.innerHTML = html;
  layer().append(el);
  return el;
}

function fly(el, keyframes, options) {
  const anim = el.animate(keyframes, { fill: 'forwards', ...options });
  anim.onfinish = () => el.remove();
}

// Jelly droplets popping out of a placed piece.
export function burst(x, y, color, count = 10) {
  if (reducedMotion) return;
  const fill = PALETTE[color]?.fill ?? '#fff';
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
    const dist = 40 + Math.random() * 40;
    const size = 7 + Math.random() * 8;
    const el = particle('dot', x, y, size);
    el.style.background = i % 3 ? fill : '#fff';
    fly(
      el,
      [
        { transform: 'translate(0,0) scale(1)', opacity: 1 },
        { transform: `translate(${Math.cos(angle) * dist}px,${Math.sin(angle) * dist}px) scale(.2)`, opacity: 0 },
      ],
      { duration: 480 + Math.random() * 200, easing: 'cubic-bezier(.15,.7,.3,1)' }
    );
  }
}

// A few twinkling stars, e.g. where a hint lands.
export function sparkles(x, y, count = 4, spread = 60) {
  if (reducedMotion) return;
  for (let i = 0; i < count; i++) {
    const size = 18 + Math.random() * 14;
    const el = particle('star', x + (Math.random() - 0.5) * spread, y + (Math.random() - 0.5) * spread, size, `<img src="${STAR}" alt="">`);
    fly(
      el,
      [
        { transform: 'scale(0) rotate(0deg)', opacity: 0 },
        { transform: 'scale(1.1) rotate(40deg)', opacity: 1, offset: 0.4 },
        { transform: 'scale(0) rotate(90deg)', opacity: 0 },
      ],
      { duration: 700, delay: i * 90, easing: 'ease-out' }
    );
  }
}

// Confetti and stars raining over the whole screen.
export function confetti(count = 70) {
  if (reducedMotion) return;
  const colors = Object.values(PALETTE).map((p) => p.fill);
  const W = innerWidth;
  const H = innerHeight;
  for (let i = 0; i < count; i++) {
    const isStar = i % 7 === 0;
    const size = isStar ? 22 : 9 + Math.random() * 7;
    const el = particle(isStar ? 'star' : 'confetti', Math.random() * W, -30, size, isStar ? `<img src="${STAR}" alt="">` : '');
    if (!isStar) {
      el.style.background = colors[i % colors.length];
      el.style.height = `${size * 0.55}px`;
    }
    const drift = (Math.random() - 0.5) * 160;
    const spin = (Math.random() - 0.5) * 900;
    fly(
      el,
      [
        { transform: 'translate(0,0) rotate(0deg)' },
        { transform: `translate(${drift * 0.6}px,${H * 0.5}px) rotate(${spin * 0.5}deg)`, offset: 0.5 },
        { transform: `translate(${drift}px,${H + 60}px) rotate(${spin}deg)` },
      ],
      { duration: 2200 + Math.random() * 1600, delay: Math.random() * 600, easing: 'cubic-bezier(.3,.2,.6,1)' }
    );
  }
}
