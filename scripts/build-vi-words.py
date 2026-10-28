"""Builds src/data/vi-words.txt: the Vietnamese multi-syllable words (từ ghép) used on the site.

The site keeps each such word on one line (scripts/keep-words.mjs joins its syllables with a
non-breaking space after the build), so a justified line never ends in "tham" with "gia" on the next.
The list comes from segmenting all site text — page content, news articles and the page templates —
with underthesea (pip install underthesea). Re-run after adding a lot of new content:
    python3 scripts/build-vi-words.py
"""
import glob, json, re, collections
from underthesea import word_tokenize

texts = []
def walk(v):
    if isinstance(v, str): texts.append(v)
    elif isinstance(v, list): [walk(x) for x in v]
    elif isinstance(v, dict): [walk(x) for x in v.values()]
for f in glob.glob('src/content/**/*.json', recursive=True):
    walk(json.load(open(f, encoding='utf8')))
for f in glob.glob('src/content/news/**/*.md', recursive=True):
    t = open(f, encoding='utf8').read()
    t = re.sub(r'!\[[^\]]*\]\([^)]*\)|\]\([^)]*\)|<[^>]+>|[*#>|_`]', ' ', t)
    texts.append(t)
for f in glob.glob('src/**/*.astro', recursive=True):
    t = open(f, encoding='utf8').read()
    texts += re.findall(r'[>\'"]([^<>\'"{}]*[À-ỹ][^<>\'"{}]*)[<\'"]', t)

VI = re.compile(r'^[a-zà-ỹđ]+$')
count = collections.Counter()
for t in texts:
    for line in re.split(r'[\n.!?;:()\[\]“”"]+', t):
        line = line.strip()
        if len(line) < 3: continue
        for w in word_tokenize(line):
            parts = w.lower().split()
            if len(parts) == 2 and all(VI.match(p) for p in parts):
                count[' '.join(parts)] += 1
# Two-syllable words only: three-syllable ones are often a word glued to its neighbour, and a
# left-to-right pass over pairs already keeps "công nghệ" + "tiến nông" together.
words = sorted(w for w in count if w.count(' ') == 1)
open('src/data/vi-words.txt', 'w', encoding='utf8').write('\n'.join(words) + '\n')
print(len(words), 'từ ghép')
