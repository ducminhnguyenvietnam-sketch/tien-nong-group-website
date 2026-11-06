/** YouTube facade: <button data-yt="ID"> shows a poster; clicking swaps in the player (nothing loads from YouTube before). */
document.querySelectorAll<HTMLButtonElement>('button[data-yt]').forEach((b) => b.addEventListener('click', () => {
  const f = document.createElement('iframe');
  f.src = `https://www.youtube-nocookie.com/embed/${b.dataset.yt}?autoplay=1&rel=0`;
  f.title = b.getAttribute('aria-label') || 'Video';
  f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
  f.allowFullscreen = true;
  // Keep every attribute of the poster button (class and the page's scoped-style attribute that gives
  // the box its size), so the player takes exactly the poster's place.
  const box = document.createElement('div');
  for (const a of [...b.attributes]) if (!['type', 'data-yt', 'aria-label', 'onclick'].includes(a.name)) box.setAttribute(a.name, a.value);
  box.classList.remove('rv'); // already on screen: no fade-in for the player
  box.append(f); b.replaceWith(box); f.focus();
}, { once: true }));
