/**
 * Justified text: running text in <main> is justified on every page and screen size (v2.css), with the
 * last line of a paragraph left-aligned. Vietnamese words stay whole on a line (scripts/keep-words.mjs
 * joins their syllables at build time). Only blocks that cannot be justified cleanly fall back to left
 * alignment via .jx-left: short captions (under ~80 characters), very narrow columns (under ~30 characters a line, where the spaces would
 * stretch too far), display-size text (≥ 22px) and uppercase labels. Re-checked on resize and when fonts
 * finish loading.
 */
const MIN_CHARS = 30;
/** Short captions (one or two lines in a card) read better left-aligned than stretched across. */
const MIN_TEXT = 80;

/** The block boxes that lay out running text: the nearest non-inline ancestor of each sizeable text node. */
function textBlocks() {
  const blocks = new Set<HTMLElement>();
  const walk = document.createTreeWalker(document.querySelector('main') || document.body, NodeFilter.SHOW_TEXT);
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    if ((n.textContent || '').trim().length < 12) continue;
    let el = n.parentElement;
    while (el && el.tagName !== 'MAIN' && getComputedStyle(el).display.startsWith('inline')) el = el.parentElement;
    if (el) blocks.add(el);
  }
  return blocks;
}

function run() {
  for (const el of textBlocks()) {
    el.classList.remove('jx-left');
    if (el.closest('.jx-justify, .jx-start')) continue; // asked to stay justified (card titles) or left-aligned (short card texts)
    const cs = getComputedStyle(el);
    if (cs.textAlign !== 'justify') continue;
    const fs = parseFloat(cs.fontSize) || 16;
    const perLine = el.clientWidth / (fs * 0.5);
    const short = (el.textContent || '').trim().length < MIN_TEXT;
    if (short || fs >= 22 || perLine < MIN_CHARS || /uppercase/.test(cs.textTransform)) el.classList.add('jx-left');
  }
}
/** A block whose kept-together words (non-breaking spaces) no longer fit its box on a narrow screen gets
 *  ordinary spaces back, so the line can wrap instead of running past the edge. */
function unglue() {
  for (const el of textBlocks()) {
    if (el.scrollWidth <= el.clientWidth + 1) continue;
    const cs = getComputedStyle(el);
    if (cs.whiteSpace === 'nowrap' || cs.overflowX !== 'visible') continue;
    el.setAttribute('data-unglued', '');
    const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      if (n.textContent && n.textContent.includes('\u00A0')) n.textContent = n.textContent.replace(/\u00A0/g, ' ');
    }
  }
}
/** Blocks marked data-unglued in the markup (news card titles) are justified with ordinary spaces from
 *  the start: kept-together word pairs would leave wide gaps in such short lines. */
function ungluedFromMarkup() {
  for (const el of document.querySelectorAll<HTMLElement>('main [data-unglued]')) {
    const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      if (n.textContent && n.textContent.includes('\u00A0')) n.textContent = n.textContent.replace(/\u00A0/g, ' ');
    }
  }
}
let t = 0;
const later = () => { clearTimeout(t); t = window.setTimeout(() => { unglue(); run(); }, 120); };
ungluedFromMarkup();
unglue();
run();
addEventListener('resize', later);
document.fonts?.ready.then(later);
