/**
 * Justified text (v3): running text in <main> is justified (v2.css), but justification only reads
 * well on lines long enough to absorb the extra space. Text blocks narrower than ~38 characters
 * per line (card captions, small columns on phones) and display-size text (≥ 20px) fall back to
 * left alignment via .jx-left, as do short blocks (under ~120 characters: a two-line caption
 * justified opens wide gaps on its first line), so no line gets the wide gaps of a justified short column.
 * Re-checked on resize and when fonts finish loading.
 */
const MIN_CHARS = 38;
const MIN_TEXT = 120;
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
    const cs = getComputedStyle(el);
    if (cs.textAlign !== 'justify') continue;
    const fs = parseFloat(cs.fontSize) || 16;
    const perLine = el.clientWidth / (fs * 0.5);
    const short = (el.textContent || '').trim().length < MIN_TEXT;
    if (short || fs >= 20 || perLine < MIN_CHARS || /uppercase/.test(cs.textTransform)) el.classList.add('jx-left');
  }
}
let t = 0;
const later = () => { clearTimeout(t); t = window.setTimeout(run, 120); };
run();
addEventListener('resize', later);
document.fonts?.ready.then(later);
