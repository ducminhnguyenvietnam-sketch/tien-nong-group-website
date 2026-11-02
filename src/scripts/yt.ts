/** YouTube facade: <button data-yt="ID"> shows a poster; clicking swaps in the player (nothing loads from YouTube before). */
document.querySelectorAll<HTMLButtonElement>('button[data-yt]').forEach((b) => b.addEventListener('click', () => {
  const f = document.createElement('iframe');
  f.src = `https://www.youtube-nocookie.com/embed/${b.dataset.yt}?autoplay=1&rel=0`;
  f.title = b.getAttribute('aria-label') || 'Video';
  f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
  f.allowFullscreen = true;
  const box = document.createElement('div');
  box.className = b.className; box.append(f); b.replaceWith(box); f.focus();
}, { once: true }));
