/**
 * On-site photo editor ("chế độ sửa ảnh").
 *
 * Open any page with ?sua-anh to turn it on (it stays on while browsing, "Thoát" turns
 * it off). Every photo slot gets an edit button: pick a photo, drag it inside the real
 * frame on the real page, zoom, then "Lưu". Saving commits straight to GitHub (one
 * commit: the resized upload in public/uploads/ plus the slot's {src, focus, zoom} in its
 * content file), which triggers the normal deploy. Authentication is a fine-grained
 * GitHub token with Contents read/write on this repository, kept in this browser only.
 *
 * Framing model (same CSS as ImageSlot renders): object-fit: cover; object-position X% Y%;
 * transform: scale(zoom) with transform-origin X% Y%. Re-framing later only changes
 * focus/zoom, the uploaded photo is never cropped.
 */
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

const REPO = import.meta.env.PUBLIC_GITHUB_REPO || 'ducminhnguyenvietnam-sketch/tien-nong-group-website';
const BRANCH = 'main';
const TOKEN_KEY = 'tn-gh-token';
const MODE_KEY = 'tn-edit-photos';
const MAX_EDGE = 2400; // longest side of uploaded photos, in px
const API = 'https://api.github.com';

type Slot = HTMLElement;
interface State {
  slot: Slot;
  img: HTMLImageElement;
  file: File | null;
  url: string | null;
  x: number; y: number; z: number; // focus 0..1 and zoom (1 = 100%)
  start: { src: string | null; x: number; y: number; z: number; empty: boolean };
}

let active: State | null = null;
const store = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string | null) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* private mode */ } },
};

// ---------------------------------------------------------------- styles + chrome
const css = `
.pe-on .img-slot{cursor:pointer}
.pe-on .img-slot::after{content:'';position:absolute;inset:0;border-radius:inherit;outline:2px dashed rgba(0,149,79,.55);outline-offset:-2px;pointer-events:none;z-index:5}
.pe-badge{position:absolute;left:8px;top:8px;z-index:6;display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border:0;border-radius:999px;background:#00954f;color:#fff;font:600 13px 'Be Vietnam Pro',system-ui,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.25);cursor:pointer}
.pe-active{z-index:20;touch-action:none;cursor:grab !important}
.pe-active::after{outline:3px solid #00954f !important}
.pe-active .pe-badge{display:none}
.pe-bar{position:fixed;left:12px;bottom:12px;z-index:70;display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;max-width:calc(100vw - 24px);padding:10px 14px;border-radius:14px;background:#1c201c;color:#fff;font:500 14px 'Be Vietnam Pro',system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.3)}
.pe-bar button,.pe-panel button{font:600 14px 'Be Vietnam Pro',system-ui,sans-serif;border-radius:10px;padding:8px 14px;cursor:pointer;border:1px solid transparent}
.pe-ghost{background:transparent;color:inherit;border-color:rgba(255,255,255,.35) !important}
.pe-panel{position:fixed;left:50%;bottom:12px;transform:translateX(-50%);z-index:80;width:min(560px,calc(100vw - 24px));display:flex;flex-direction:column;gap:10px;padding:14px 16px;border-radius:16px;background:#fff;color:#1c201c;font:14px/1.45 'Be Vietnam Pro',system-ui,sans-serif;box-shadow:0 12px 40px rgba(0,0,0,.3)}
.pe-panel strong{font-size:15px}
.pe-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.pe-primary{background:#00954f;color:#fff}
.pe-primary:disabled{opacity:.5;cursor:default}
.pe-secondary{background:#fff;color:#005e31;border-color:#c2c8c1 !important}
.pe-muted{color:#565f56;font-size:13px}
.pe-panel input[type=range]{flex:1;min-width:140px;accent-color:#00954f}
.pe-dialog{position:fixed;inset:0;z-index:90;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,.45)}
.pe-dialog>div{width:min(520px,100%);max-height:90vh;overflow:auto;display:flex;flex-direction:column;gap:12px;padding:20px;border-radius:16px;background:#fff;color:#1c201c;font:14px/1.55 'Be Vietnam Pro',system-ui,sans-serif}
.pe-dialog input[type=password]{padding:10px 12px;border:1px solid #c2c8c1;border-radius:10px;font:14px monospace}
.pe-dialog ol{margin:0;padding-left:20px}
`;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Record<string, unknown> = {}, ...kids: (Node | string)[]) {
  const e = Object.assign(document.createElement(tag), props);
  e.append(...kids);
  return e;
}

let bar: HTMLElement;
let panel: HTMLElement | null = null;
/** The edit panel and the toolbar share the bottom of the screen: show one at a time. */
function setPanel(p: HTMLElement | null) {
  panel?.remove();
  panel = p;
  if (p) document.body.append(p);
  bar.style.display = p ? 'none' : '';
}

function start() {
  document.head.append(el('style', { textContent: css }));
  document.documentElement.classList.add('pe-on');
  bar = el('div', { className: 'pe-bar' });
  renderBar();
  document.body.append(bar, picker);
  document.querySelectorAll<Slot>('.img-slot[data-cms]').forEach(addBadge);
  // Slots live inside links/cards: in edit mode a click on a photo edits it instead of navigating.
  document.addEventListener('click', (e) => {
    const slot = (e.target as HTMLElement).closest<Slot>('.img-slot[data-cms]');
    if (!slot) return;
    e.preventDefault(); e.stopPropagation();
    if (active?.slot !== slot) edit(slot);
  }, true);
}

function renderBar() {
  const token = store.get(TOKEN_KEY);
  bar.replaceChildren(
    el('span', {}, '✎ Chế độ sửa ảnh — bấm vào ảnh để thay hoặc căn lại'),
    el('button', { className: 'pe-ghost', onclick: () => login() }, token ? 'Đã kết nối GitHub ✓' : 'Kết nối GitHub'),
    el('button', { className: 'pe-ghost', onclick: () => { store.set(MODE_KEY, null); location.href = location.pathname; } }, 'Thoát'),
  );
}

function addBadge(slot: Slot) {
  slot.append(el('button', { type: 'button', className: 'pe-badge', textContent: slot.querySelector('.img-slot__img') ? '✎ Thay / căn ảnh' : '＋ Thêm ảnh' }));
}

// ---------------------------------------------------------------- framing
const KEYWORDS: Record<string, number> = { left: 0, top: 0, center: 50, right: 100, bottom: 100 };
function parseFocus(v: string): [number, number] {
  const parts = v.trim().split(/\s+/);
  const val = (p: string | undefined) => (p === undefined ? 50 : p.endsWith('%') ? parseFloat(p) : KEYWORDS[p] ?? 50);
  if (parts.length === 1) {
    const p = parts[0];
    if (p === 'top' || p === 'bottom') return [0.5, val(p) / 100];
    return [val(p) / 100, 0.5];
  }
  let [a, b] = parts;
  if (a === 'top' || a === 'bottom') [a, b] = [b, a]; // "top left" → x=left, y=top
  return [val(a) / 100, val(b) / 100];
}
const pct = (v: number) => `${Math.round(v * 1000) / 10}%`;

function apply(s: State) {
  const pos = `${pct(s.x)} ${pct(s.y)}`;
  s.img.style.objectPosition = pos;
  s.img.style.transformOrigin = pos;
  s.img.style.transform = s.z > 1 ? `scale(${s.z})` : '';
}

function edit(slot: Slot) {
  if (active) cancel();
  const frame = slot.querySelector<HTMLElement>('.img-slot__frame')!;
  let img = slot.querySelector<HTMLImageElement>('.img-slot__img');
  const empty = !img;
  if (!img) {
    img = el('img', { className: 'img-slot__img', alt: slot.dataset.ph ?? '' });
    img.style.cssText = `position:absolute;inset:0;width:100%;height:100%;object-fit:${slot.dataset.fit};display:none`;
    frame.append(img);
  }
  img.loading = 'eager';
  // The page may serve a responsive srcset; drop it while editing so the picked file shows.
  if (img.hasAttribute('srcset')) { img.dataset.srcset = img.getAttribute('srcset')!; img.removeAttribute('srcset'); }
  const [x, y] = parseFocus(slot.dataset.focus || 'center');
  const z = (Number(slot.dataset.zoom) || 100) / 100;
  active = { slot, img, file: null, url: null, x, y, z, start: { src: empty ? null : img.getAttribute('src'), x, y, z, empty } };
  slot.classList.add('pe-active');
  slot.scrollIntoView({ block: 'center', behavior: 'smooth' });
  showPanel();
  if (empty) pickFile();
}

function showPanel() {
  const s = active!;
  const contain = s.slot.dataset.fit === 'contain';
  const zoom = el('input', { type: 'range', min: '100', max: '300', value: String(Math.round(s.z * 100)) });
  const zoomVal = el('span', { className: 'pe-muted', textContent: `${zoom.value}%` });
  zoom.oninput = () => { s.z = Number(zoom.value) / 100; zoomVal.textContent = `${zoom.value}%`; apply(s); };
  const save = el('button', { className: 'pe-primary', textContent: 'Lưu' });
  save.onclick = () => saveActive(save, status);
  const status = el('span', { className: 'pe-muted' });
  setPanel(el('div', { className: 'pe-panel' },
    el('strong', {}, s.slot.dataset.ph || 'Ảnh'),
    el('span', { className: 'pe-muted' }, contain ? 'Ảnh hiển thị trọn vẹn trong khung (không cắt).' : 'Kéo ảnh ngay trong khung để chọn phần hiển thị, kéo thanh để phóng to.'),
    el('div', { className: 'pe-row' }, el('button', { className: 'pe-secondary', onclick: pickFile }, 'Chọn ảnh khác…'),
      ...(contain ? [] : [el('button', { className: 'pe-secondary', onclick: () => { s.x = 0.5; s.y = 0.5; s.z = 1; zoom.value = '100'; zoomVal.textContent = '100%'; apply(s); } }, 'Về giữa')])),
    ...(contain ? [] : [el('div', { className: 'pe-row' }, el('span', {}, 'Phóng to'), zoom, zoomVal)]),
    el('div', { className: 'pe-row' }, save, el('button', { className: 'pe-secondary', onclick: cancel }, 'Huỷ'), status),
  ));
}

// One hidden file input attached to the page (detached inputs don't open a picker everywhere, e.g. iOS Safari).
const picker = el('input', { type: 'file', accept: 'image/*' });
picker.style.cssText = 'position:fixed;left:-9999px;width:1px;height:1px;opacity:0';
function pickFile() {
  const input = picker;
  input.value = '';
  input.onchange = () => {
    const f = input.files?.[0];
    if (!f || !active) return;
    const s = active;
    if (s.url) URL.revokeObjectURL(s.url);
    s.file = f; s.url = URL.createObjectURL(f);
    s.img.src = s.url; s.img.style.display = '';
    s.slot.querySelectorAll<HTMLElement>('.img-slot__empty').forEach((e) => { e.style.display = 'none'; });
    s.x = 0.5; s.y = 0.5; s.z = 1; apply(s); showPanel();
  };
  input.click();
}

function cancel() {
  const s = active;
  if (!s) return;
  if (s.url) URL.revokeObjectURL(s.url);
  if (s.start.empty) {
    s.img.remove();
    s.slot.querySelectorAll<HTMLElement>('.img-slot__empty').forEach((e) => { e.style.display = ''; });
  } else {
    if (s.start.src) s.img.src = s.start.src;
    if (s.img.dataset.srcset) s.img.setAttribute('srcset', s.img.dataset.srcset);
    Object.assign(s, { x: s.start.x, y: s.start.y, z: s.start.z }); apply(s);
  }
  s.slot.classList.remove('pe-active');
  active = null; setPanel(null);
}

// Dragging inside the active slot. With cover fit the image overflows the frame by
// ox/oy px; zooming around the focus adds (frame*(z-1)). Moving the focus by Δ shifts the
// visible image by Δ * (frame*(z-1) + overflow*z), which we invert here.
let drag: { px: number; py: number; x: number; y: number } | null = null;
document.addEventListener('pointerdown', (e) => {
  const s = active;
  if (!s || !s.slot.contains(e.target as Node) || s.slot.dataset.fit === 'contain' || !s.img.naturalWidth) return;
  e.preventDefault();
  s.slot.setPointerCapture(e.pointerId);
  drag = { px: e.clientX, py: e.clientY, x: s.x, y: s.y };
});
document.addEventListener('pointermove', (e) => {
  const s = active;
  if (!s || !drag) return;
  const fw = s.slot.clientWidth, fh = s.slot.clientHeight;
  const k = Math.max(fw / s.img.naturalWidth, fh / s.img.naturalHeight);
  const ox = s.img.naturalWidth * k - fw, oy = s.img.naturalHeight * k - fh;
  const dx = fw * (s.z - 1) + ox * s.z, dy = fh * (s.z - 1) + oy * s.z;
  if (dx > 0.5) s.x = Math.min(1, Math.max(0, drag.x - (e.clientX - drag.px) / dx));
  if (dy > 0.5) s.y = Math.min(1, Math.max(0, drag.y - (e.clientY - drag.py) / dy));
  apply(s);
});
const endDrag = () => { drag = null; };
document.addEventListener('pointerup', endDrag);
document.addEventListener('pointercancel', endDrag);

// ---------------------------------------------------------------- GitHub
async function gh<T = any>(path: string, init: RequestInit = {}): Promise<T> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const token = store.get(TOKEN_KEY);
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28', ...(init.body ? { 'Content-Type': 'application/json' } : {}) },
  });
  if (!res.ok) {
    const err = new Error(`${res.status}`) as Error & { status: number };
    err.status = res.status; throw err;
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

function login(): Promise<boolean> {
  return new Promise((resolve) => {
    const input = el('input', { type: 'password', placeholder: 'github_pat_…', autocomplete: 'off' });
    const msg = el('span', { className: 'pe-muted' });
    const close = (ok: boolean) => { dlg.remove(); renderBar(); resolve(ok); };
    const ok = el('button', { className: 'pe-primary', textContent: 'Kết nối' });
    ok.onclick = async () => {
      const t = input.value.trim();
      if (!t) return;
      store.set(TOKEN_KEY, t); msg.textContent = 'Đang kiểm tra…'; ok.disabled = true;
      try {
        const repo = await gh<{ permissions?: { push?: boolean } }>(`/repos/${REPO}`);
        if (!repo.permissions?.push) throw Object.assign(new Error(), { status: 403 });
        close(true);
      } catch (e) {
        store.set(TOKEN_KEY, null); ok.disabled = false;
        msg.textContent = (e as { status?: number }).status === 401 ? 'Mã không đúng hoặc đã hết hạn.' : 'Mã chưa có quyền ghi vào kho website (Contents: Read and write).';
      }
    };
    const dlg = el('div', { className: 'pe-dialog' }, el('div', {},
      el('strong', { style: 'font-size:18px' }, 'Kết nối GitHub (làm một lần trên mỗi máy)'),
      el('span', {}, 'Để lưu ảnh lên website, trình duyệt cần một mã truy cập GitHub. Mã chỉ lưu trên máy này.'),
      el('ol', {},
        el('li', {}, 'Mở ', el('a', { href: 'https://github.com/settings/personal-access-tokens/new', target: '_blank', rel: 'noopener', textContent: 'trang tạo mã của GitHub' }), ' (đăng nhập GitHub nếu được hỏi).'),
        el('li', {}, 'Token name: "Sửa ảnh website". Expiration: chọn thời hạn (ví dụ 1 năm).'),
        el('li', {}, `Repository access: Only select repositories → ${REPO.split('/')[1]}.`),
        el('li', {}, 'Permissions → Repository permissions: Contents = Read and write; Actions = Read-only.'),
        el('li', {}, 'Bấm Generate token, sao chép mã và dán vào ô dưới đây.')),
      input, msg,
      el('div', { className: 'pe-row' }, ok, el('button', { className: 'pe-secondary', onclick: () => close(!!store.get(TOKEN_KEY)) }, 'Để sau'),
        ...(store.get(TOKEN_KEY) ? [el('button', { className: 'pe-secondary', onclick: () => { store.set(TOKEN_KEY, null); close(false); } }, 'Ngắt kết nối')] : [])),
    ));
    document.body.append(dlg);
    input.focus();
  });
}

const b64 = (bytes: Uint8Array) => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s); };
const fromB64 = (s: string) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\n/g, '')), (c) => c.charCodeAt(0)));

/** Resize to at most MAX_EDGE px and compress (JPEG; PNG kept for "contain" packaging shots). */
async function prepare(file: File, contain: boolean): Promise<{ bytes: Uint8Array; ext: string }> {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height));
  const c = el('canvas', { width: Math.round(bmp.width * k), height: Math.round(bmp.height * k) });
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  const png = contain && file.type === 'image/png';
  const blob = await new Promise<Blob>((r) => c.toBlob((b) => r(b!), png ? 'image/png' : 'image/jpeg', 0.85));
  return { bytes: new Uint8Array(await blob.arrayBuffer()), ext: png ? 'png' : 'jpg' };
}

function setPath(obj: any, path: string, value: Record<string, string>) { // eslint-disable-line @typescript-eslint/no-explicit-any
  const keys = path.split('.');
  let o = obj;
  keys.slice(0, -1).forEach((k, i) => {
    if (o[k] == null || typeof o[k] !== 'object') o[k] = /^\d+$/.test(keys[i + 1]) ? [] : {};
    o = o[k];
  });
  const last = keys[keys.length - 1];
  o[last] = { ...(o[last] ?? {}), ...value };
}

function updateContent(file: string, text: string, path: string, value: Record<string, string>): string {
  if (file.endsWith('.json')) {
    const data = JSON.parse(text);
    setPath(data, path, value);
    return JSON.stringify(data, null, 2) + '\n';
  }
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) throw new Error('frontmatter');
  const data = parseYaml(m[1]) ?? {};
  setPath(data, path, value);
  return `---\n${stringifyYaml(data, { lineWidth: 0 })}---\n${m[2]}`;
}

async function saveActive(button: HTMLButtonElement, status: HTMLElement) {
  const s = active!;
  if (!store.get(TOKEN_KEY) && !(await login())) return;
  const [file, path] = s.slot.dataset.cms!.split('#');
  button.disabled = true; status.textContent = 'Đang lưu…';
  try {
    let upload: { name: string; bytes: Uint8Array } | null = null;
    if (s.file) {
      const { bytes, ext } = await prepare(s.file, s.slot.dataset.fit === 'contain');
      const base = (s.slot.dataset.slot || 'anh').replace(/[^a-z0-9-]+/gi, '-').slice(0, 40);
      upload = { name: `${base}-${Date.now().toString(36)}.${ext}`, bytes };
    }
    const value: Record<string, string> = { focus: `${pct(s.x)} ${pct(s.y)}`, zoom: String(Math.round(s.z * 100)) };
    if (upload) value.src = `/uploads/${upload.name}`;
    if (!s.slot.dataset.alt) value.alt = s.slot.dataset.ph || '';
    const label = s.slot.dataset.ph || s.slot.dataset.slot || 'ảnh';
    let sha = '';
    for (let attempt = 0; attempt < 3; attempt++) {
      const ref = await gh<{ object: { sha: string } }>(`/repos/${REPO}/git/ref/heads/${BRANCH}`);
      const head = ref.object.sha;
      const commit = await gh<{ tree: { sha: string } }>(`/repos/${REPO}/git/commits/${head}`);
      const current = await gh<{ content: string }>(`/repos/${REPO}/contents/${file.split('/').map(encodeURIComponent).join('/')}?ref=${head}`);
      const next = updateContent(file, fromB64(current.content), path, value);
      const tree: { path: string; mode: string; type: string; sha: string }[] = [];
      const blob = async (content: string, encoding: string) => (await gh<{ sha: string }>(`/repos/${REPO}/git/blobs`, { method: 'POST', body: JSON.stringify({ content, encoding }) })).sha;
      tree.push({ path: file, mode: '100644', type: 'blob', sha: await blob(next, 'utf-8') });
      if (upload) tree.push({ path: `public/uploads/${upload.name}`, mode: '100644', type: 'blob', sha: await blob(b64(upload.bytes), 'base64') });
      const t = await gh<{ sha: string }>(`/repos/${REPO}/git/trees`, { method: 'POST', body: JSON.stringify({ base_tree: commit.tree.sha, tree }) });
      const c = await gh<{ sha: string }>(`/repos/${REPO}/git/commits`, { method: 'POST', body: JSON.stringify({ message: `${upload ? 'Thay' : 'Căn lại'} ảnh: ${label} (sửa trên website)`, tree: t.sha, parents: [head] }) });
      try {
        await gh(`/repos/${REPO}/git/refs/heads/${BRANCH}`, { method: 'PATCH', body: JSON.stringify({ sha: c.sha }) });
        sha = c.sha; break;
      } catch (e) {
        if ((e as { status?: number }).status !== 422 || attempt === 2) throw e; // someone saved meanwhile: redo on top
      }
    }
    // Keep the new state on this page.
    s.slot.dataset.focus = value.focus; s.slot.dataset.zoom = value.zoom;
    s.slot.classList.remove('pe-active');
    const badge = s.slot.querySelector('.pe-badge'); if (badge) badge.textContent = '✎ Thay / căn ảnh';
    active = null;
    status.textContent = 'Đã lưu. Website đang cập nhật (khoảng 2 phút)…';
    button.textContent = 'Xong'; button.disabled = false; button.onclick = () => setPanel(null);
    watchDeploy(sha, status);
  } catch (e) {
    button.disabled = false;
    const st = (e as { status?: number }).status;
    status.textContent = st === 401 ? 'Mã GitHub hết hạn — bấm "Kết nối GitHub" để nhập mã mới.' : st === 403 || st === 404 ? 'Mã GitHub chưa có quyền ghi vào kho website.' : 'Lưu không thành công, vui lòng thử lại.';
    if (st === 401) store.set(TOKEN_KEY, null), renderBar();
  }
}

async function watchDeploy(sha: string, status: HTMLElement) {
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 15000));
    try {
      const runs = await gh<{ workflow_runs: { status: string; conclusion: string | null }[] }>(`/repos/${REPO}/actions/runs?head_sha=${sha}`);
      const run = runs.workflow_runs[0];
      if (run?.status === 'completed') {
        status.textContent = run.conclusion === 'success' ? 'Website đã cập nhật ✓' : 'Cập nhật website bị lỗi — báo cho người phụ trách kỹ thuật.';
        return;
      }
    } catch { return; /* token without Actions permission: keep the generic message */ }
  }
}

store.set(MODE_KEY, '1');
start();
