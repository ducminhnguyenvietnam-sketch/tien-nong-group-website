"""Turns the product catalogue saved from the old site (migration/products/, made by products.mjs on
GitHub Actions) into the product collection of the new site: src/content/products/<slug>.md.

Each product keeps what the old product page said, which follows the conformity certificate (chứng nhận
hợp quy) and the bag print: fertiliser type, code (mã số phân bón), TCCS, the composition table with test
methods, uses, directions, safety and storage. The front photo is the bag picture with its white
background removed (or the transparent bag render already uploaded to the new site, when there is one);
back of the bag, granules and field photos are left as empty slots to fill in from the site (?sua-anh).
Run from the repository root:  python3 scripts/wp-import/products-convert.py
"""
import collections, html, json, os, re, unicodedata
from bs4 import BeautifulSoup
from PIL import Image, ImageFilter
import numpy as np
import yaml

SRC = 'migration/products'
OUT = 'src/content/products'
IMG = 'public/uploads'
os.makedirs(OUT, exist_ok=True)

products = json.load(open(f'{SRC}/products.json', encoding='utf8'))
cats = {c['id']: html.unescape(c['name']) for c in json.load(open(f'{SRC}/categories.json', encoding='utf8'))}

def slugify(s, n=70):
    s = unicodedata.normalize('NFD', s.replace('đ', 'd').replace('Đ', 'D'))
    s = ''.join(ch for ch in s if unicodedata.category(ch) != 'Mn').lower()
    s = s.replace('₂', '2').replace('ₕ', 'h')
    s = re.sub(r'[^a-z0-9]+', '-', s).strip('-')
    return s[:n].rsplit('-', 1)[0] if len(s) > n else s

def clean_name(t):
    t = html.unescape(t).replace('ₕₕ', 'hh').replace('ₕ', 'h')
    t = re.sub(r'\s+', ' ', t).strip()
    t = re.sub(r'TIẾN NÔNG|TIến Nông|Tiến nông', 'Tiến Nông', t)
    t = t.replace(' + MNC', '+MNC').replace('&amp;', '&')
    return t

# Old category → product line on the new site. "Phân bón hàm lượng cao" and the former trung/vi lượng
# products (Lân PA, Điều hòa pH đất) belong to "Phân bón công nghệ cao".
LINE = {'Sản phẩm Chuyên dụng': 'cd', 'Sản phẩm Đa dụng': 'dd', 'Phân bón Hữu cơ': 'hc', 'Phân bón hàm lượng cao': 'cnc'}
TO_CNC = ('phan-trung-luong-lan-pa', 'dieu-hoa-ph-dat')

# Transparent bag renders already uploaded to the new site, by old product slug.
NEW_FRONT = {
    'lua-2-chuyen-thuc': '/uploads/lua 2.png', 'lua-1-chuyen-lot': '/uploads/lua 1.png',
    'npk-15-15-151-sio2hh-tien-nong': '/uploads/15 15 15.png', 'con-rong-do-nk-15-185s-tien-nong': '/uploads/con rong do.png',
    'npk-16-16-8-tien-nong': '/uploads/prod-4-mvc1ibv3.png', 'cay-che': '/uploads/prod-5-mvc1jwz0.png',
    'npk-8-10-325-sio2hh-tien-nong': '/uploads/prod-6-mvc1lbde.png', 'npk-20-10-10mnc-tien-nong': '/uploads/prod-7-mvc2fdf6.png',
    'dam-hat-vang-tien-nong-dam-trung-luong-tien-nong': '/uploads/prod-8-mvc2grtd.png',
    'phan-bon-huu-co-sinh-hoc-huu-co-humic-tien-nong': '/uploads/prod-9-mvc2hx4o.png',
    'phan-trung-luong-lan-pa-tien-nong': '/uploads/prod-11-mvc2mm2y.png', 'dieu-hoa-ph-dat-1-tien-nong': '/uploads/prod-12-mvc2op8x.png',
}

CROPS = [('Lúa', r'\blúa\b'), ('Ngô', r'\bngô\b'), ('Cà phê', r'cà phê'), ('Chè', r'\bchè\b'), ('Mía', r'\bmía\b'),
         ('Sắn', r'\bsắn\b|khoai mì'), ('Lạc', r'\blạc\b|đậu phộng'), ('Rau màu', r'\brau\b|rau màu|củ, quả|rau củ'),
         ('Cây ăn quả', r'cây ăn quả|cây ăn trái|bưởi|nhãn|vải|cam\b|xoài|sầu riêng|dứa|thanh long'),
         ('Cây công nghiệp', r'cao su|hồ tiêu|ca cao|hạt điều|cây điều|cây công nghiệp'), ('Cây lâm nghiệp', r'lâm nghiệp|keo\b|bạch đàn')]

def remove_white_bg(src, dest, max_h=1400):
    """Bag photo on a white background → transparent WebP (white connected to the edges becomes clear)."""
    im = Image.open(src).convert('RGBA')
    if im.height > max_h: im = im.resize((round(im.width * max_h / im.height), max_h), Image.LANCZOS)
    a = np.asarray(im).astype(np.int16)
    white = (a[..., :3].min(axis=2) >= 236) & (a[..., :3].max(axis=2) - a[..., :3].min(axis=2) <= 14)
    h, w = white.shape
    seen = np.zeros_like(white)
    stack = [(y, x) for x in range(w) for y in (0, h - 1) if white[y, x]] + [(y, x) for y in range(h) for x in (0, w - 1) if white[y, x]]
    for y, x in stack: seen[y, x] = True
    while stack:
        y, x = stack.pop()
        for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
            if 0 <= ny < h and 0 <= nx < w and white[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True; stack.append((ny, nx))
    alpha = Image.fromarray(np.where(seen, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))
    im.putalpha(alpha)
    bbox = im.getbbox()
    if bbox: im = im.crop(bbox)
    im.save(dest, 'WEBP', quality=86, method=5)

def lines_of(soup):
    """Block-level text in reading order; tables come back as ('table', rows)."""
    out = []
    for br in soup.find_all('br'): br.replace_with('\n')
    for el in soup.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'p', 'li', 'table']):
        if el.find_parent('table') and el.name != 'table': continue
        if el.name in ('p', 'li') and el.find_parent('li') and el.name == 'p': pass
        if el.name == 'table':
            rows = [[re.sub(r'\s+', ' ', td.get_text(' ')).strip() for td in tr.find_all(['td', 'th'])] for tr in el.find_all('tr')]
            out.append(('table', [r for r in rows if any(r)]))
            continue
        if el.name == 'li' and el.find('p'): continue  # the <p> inside is taken on its own
        for part in el.get_text(' ').split('\n'):
            t = re.sub(r'\s+', ' ', part).replace(' :', ':').strip()
            if t: out.append(('text', t))
    return out

def section_of(t):
    u = t.upper().rstrip(':').strip()
    if u.startswith('THÀNH PHẦN') or u == 'CHỈ TIÊU CHẤT LƯỢNG': return 'comp'
    if u in ('TÁC DỤNG', 'CÔNG DỤNG'): return 'benefits'
    if u.startswith('HƯỚNG DẪN SỬ DỤNG') or u.startswith('QUY TRÌNH THÂM CANH') or u == 'SỬ DỤNG BÓN LÓT, BÓN THÚC': return 'usage'
    if u.startswith('CẢNH BÁO') or u == 'BẢO QUẢN': return 'safety'
    if u in ('HỒ SƠ PHÁP LÝ', 'CHỨNG NHẬN CHẤT LƯỢNG', 'THÔNG TIN SẢN PHẨM'): return 'legal'
    return None

LEGAL = [('code', r'^Mã số phân bón'), ('type', r'^Loại phân bón'), ('method', r'^Phương thức sử dụng'), ('tccs', r'^(Số )?TCCS'),
         ('production', r'^Ngày sản xuất'), ('shelf_life', r'^Hạn sử dụng'), ('pack', r'^(Khối lượng|Quy cách)')]

def value_of(t):
    return t.split(':', 1)[1].strip() if ':' in t else ''

def npk_chips(name, comp):
    m = re.search(r'(NPK|NK|NP|PK)\s*(?:[A-Z]+\s*)?(\d+(?:,\d+)?)-(\d+(?:,\d+)?)(?:-(\d+(?:,\d+)?))?(?:-(\d+(?:,\d+)?))?((?:\s*\+\s*[\w,₂]+)*)', name)
    chips = []
    if m:
        kind, nums = m.group(1), [n for n in m.group(2, 3, 4) if n]
        units = {'NPK': ['N', 'P₂O₅', 'K₂O'], 'NK': ['N', 'K₂O'], 'NP': ['N', 'P₂O₅'], 'PK': ['P₂O₅', 'K₂O']}[kind]
        chips = [{'value': v, 'unit': u} for v, u in zip(nums, units)]
        for extra in re.findall(r'\+\s*([\w,₂]+)', m.group(6) or ''):
            mm = re.match(r'(\d+(?:,\d+)?)(.*)', extra)
            if mm: chips.append({'value': mm.group(1), 'unit': mm.group(2).replace('2', '₂').replace('hh', '') or extra})
            else: chips.append({'value': '+', 'unit': extra})
    if not chips:  # organic / special products: the first few lines of the composition table
        for row in comp[:3]:
            v = re.match(r'[\d,.]+\s*%', row['value'] or '')
            if v: chips.append({'value': v.group(0).strip(), 'unit': re.sub(r'^Hàm lượng\s+|\(.*?\)|tổng số|hữu hiệu', '', row['name']).strip()[:14]})
    return chips

report = []
used = set()
for order, p in enumerate(products):
    name = clean_name(p['title'])
    old_slug = p['slug']
    slug = slugify(name)
    while slug in used: slug += '-2'
    used.add(slug)
    soup = BeautifulSoup(p.get('content') or '', 'html.parser')
    blocks = lines_of(soup)
    sec, intro, comp, benefits, usage, safety, legal, standards = 'intro', [], [], [], [], [], {}, []
    group = None
    for kind, val in blocks:
        if kind == 'table':
            rows = val
            hdr = [h.upper() for h in rows[0]] if rows else []
            start = 1 if any('CHỈ TIÊU' in h or 'STT' in h for h in hdr) else 0
            pct = any('%' in h for h in hdr)
            for r in rows[start:]:
                r = [c for c in r]
                if len(r) >= 4 and re.match(r'^\d+$', r[0]): r = r[1:]
                if len(r) < 2: continue
                v = r[1] + ('%' if pct and re.match(r'^[\d,.]+$', r[1]) else '')
                comp.append({'name': r[0], 'value': v, 'method': r[2] if len(r) > 2 else ''})
            continue
        t = val.replace('\xa0', ' ').strip()
        s = section_of(t)
        if s: sec = s; group = None; continue
        if re.match(r'^ISO', t): standards.append(t); continue
        hit = next((k for k, rx in LEGAL if re.match(rx, t, re.I)), None)
        if hit: legal[hit] = value_of(t); continue
        if sec == 'intro': intro.append(t)
        elif sec == 'comp':
            if ':' in t: comp.append({'name': t.split(':', 1)[0].strip(), 'value': value_of(t), 'method': ''})
        elif sec == 'benefits': benefits.append(t)
        elif sec == 'usage':
            m = re.match(r'^(Liều lượng|Lượng bón|Lượng dùng)\s*:?(.*)', t, re.I)
            m2 = re.match(r'^(Thời kỳ bón|Thời điểm bón|Thời kỳ)\s*:?(.*)', t, re.I)
            m3 = re.match(r'^(Cách bón|Phương pháp bón)\s*:?(.*)', t, re.I)
            if m or m2 or m3:
                if group is None: group = {'title': '', 'rate': '', 'timing': '', 'method': '', 'note': ''}; usage.append(group)
                key = 'rate' if m else 'timing' if m2 else 'method'
                group[key] = ((m or m2 or m3).group(2)).strip()
            else:
                title = re.sub(r':$', '', t).strip()
                if (re.match(r'^\d+[.)]', t) or t.endswith(':') or t.upper() == t) and len(t) < 120:
                    group = {'title': re.sub(r'^\d+[.)]\s*', '', title), 'rate': '', 'timing': '', 'method': '', 'note': ''}; usage.append(group)
                else:
                    if group is None: group = {'title': '', 'rate': '', 'timing': '', 'method': '', 'note': ''}; usage.append(group)
                    group['note'] = (group['note'] + ' ' + t).strip()
        elif sec == 'safety': safety.append(t)
    # Summary: the short description, else the tagline under the name, else the first benefit.
    short = BeautifulSoup((p.get('store') or {}).get('short_description', '') or '', 'html.parser').get_text('\n').strip().split('\n')[0].strip()
    tagline = next((t for t in intro if t.upper() == t and not t.upper().startswith(('NPK', 'NK', 'PHÂN BÓN')) and len(t) > 12), '')
    summary = short or (tagline.capitalize() if tagline else '') or (benefits[0] if benefits else '')
    if summary.endswith(':') and len(benefits) > 1:  # "…cho cây lúa giúp:" + first point
        nxt = benefits[1] if benefits[0].rstrip(':') == summary.rstrip(':') else benefits[0]
        summary = summary.rstrip(':').rstrip() + ' ' + nxt[:1].lower() + nxt[1:]
    summary = summary.rstrip(':')
    ftype = legal.get('type') or next((t.capitalize() for t in intro if t.upper().startswith('PHÂN BÓN') and len(t) < 40), '')
    text_all = (name + ' ' + ' '.join(benefits) + ' ' + ' '.join((g['title'] + ' ' + g['note']) for g in usage)).lower()
    crops = [c for c, rx in CROPS if re.search(rx, text_all)]
    cat_names = [cats.get(c, '') for c in p.get('product_cat') or []]
    line = next((LINE[c] for c in cat_names if c in LINE), 'dd')
    if old_slug.startswith(TO_CNC): line = 'cnc'
    # Front photo
    front = NEW_FRONT.get(old_slug, '')
    if not front and p.get('photos'):
        dest = f'{IMG}/sp-{slug}.webp'
        try:
            if not os.path.exists(dest): remove_white_bg(p['photos'][0]['file'], dest)
            front = '/' + dest.replace('public/', '')
        except Exception as e: report.append(f'{name}: ảnh lỗi {e}')
    std = 'ISO 9001:2015 · ISO 14001:2015' if standards or any('ISO' in t for t in intro) else ''
    photo = lambda src, alt: {'src': src, 'focus': 'center', 'zoom': '100', 'alt': alt}
    fm = {
        'name': name, 'line': line, 'order': order + 1, 'crops': crops, 'summary': summary,
        'type': ftype, 'code': legal.get('code', ''), 'tccs': legal.get('tccs', ''), 'method': legal.get('method', ''),
        'pack': legal.get('pack', '') or (re.search(r'Bao (\d+)\s?[Kk]g', name).group(1) + ' kg' if re.search(r'Bao (\d+)\s?[Kk]g', name) else ''),
        'shelf_life': legal.get('shelf_life', ''), 'production': legal.get('production', ''), 'standards': std,
        'npk': npk_chips(name, comp), 'composition': comp, 'benefits': benefits, 'usage': usage, 'safety': safety,
        'front': photo(front, f'Bao bì {name} – mặt trước'), 'back': photo('', f'Bao bì {name} – mặt sau'),
        'granule': photo('', f'Hạt phân {name}'), 'field': photo('', f'{name} – ứng dụng thực tế'),
        'certificate': '', 'featured': False, 'old_url': '/product/' + old_slug + '/',
    }
    for k, need in (('code', 'mã số'), ('composition', 'thành phần'), ('usage', 'hướng dẫn sử dụng'), ('front', 'ảnh mặt trước')):
        if not (fm[k]['src'] if k == 'front' else fm[k]): report.append(f'{name}: thiếu {need}')
    with open(f'{OUT}/{slug}.md', 'w', encoding='utf8') as f:
        f.write('---\n' + yaml.safe_dump(fm, allow_unicode=True, sort_keys=False, width=1000) + '---\n')
print(len(products), 'sản phẩm')
print('\n'.join(report))
