#!/usr/bin/env python3
"""Construit la version optimisée du Gambetta Game.

Source : un seul fichier HTML avec toutes les images intégrées (base64).
Sortie : index.html léger + dossier img/ (WebP), avec une miniature par carte membre.

Usage : python3 tools/build.py <source.html> <dossier_sortie>
"""
import base64, hashlib, io, json, os, re, sys
from PIL import Image

SRC, OUT = sys.argv[1], sys.argv[2]
MIN_SIZE = 12000          # les images plus petites restent intégrées
THUMB_W = 260             # largeur des miniatures (petites cartes)
BIG_W = 640               # largeur max des grandes images

html = open(SRC, encoding='utf-8').read()
os.makedirs(os.path.join(OUT, 'img', 'm'), exist_ok=True)
os.makedirs(os.path.join(OUT, 'img', 'x'), exist_ok=True)

def to_webp(raw, max_w, q=78):
    im = Image.open(io.BytesIO(raw))
    alpha = im.mode in ('RGBA', 'LA', 'P')
    im = im.convert('RGBA' if alpha else 'RGB')
    if im.size[0] > max_w:
        im = im.resize((max_w, round(im.size[1] * max_w / im.size[0])), Image.LANCZOS)
    b = io.BytesIO()
    im.save(b, 'WEBP', quality=q, method=6)
    return b.getvalue()

def write(rel, data):
    with open(os.path.join(OUT, rel), 'wb') as f:
        f.write(data)

URI = r'data:image/[a-z0-9+.-]+;base64,[A-Za-z0-9+/=]+'

# 1) Cartes membres : image + miniature, nommées d'après l'identifiant de la carte
n_members = 0
def member_entry(m):
    global n_members
    s = m.group(0)
    idm = re.search(r'''(?:"id": "|id:')([a-z0-9_]+)''', s)
    um = re.search(URI, s)
    if not idm or not um:
        return s
    cid = idm.group(1)
    raw = base64.b64decode(um.group(0).split(',', 1)[1])
    write(f'img/m/{cid}.webp', to_webp(raw, BIG_W))
    write(f'img/m/{cid}_s.webp', to_webp(raw, THUMB_W, 72))
    n_members += 1
    s = s.replace(um.group(0), f'img/m/{cid}.webp')
    # ajoute le champ miniature juste avant la fin de l'objet
    return s[:-1] + (f', "thumb": "img/m/{cid}_s.webp"' if s.lstrip().startswith('{"') else f",thumb:'img/m/{cid}_s.webp'") + '}'

start = html.index('const MEMBERS=[')
end = html.index('\n];', start)
block = html[start:end]
block = re.sub(r'\{(?:"id": "|id:\')[a-z0-9_]+.*?' + URI + r'.*?\}(?=,\n|\n|$)', member_entry, block, flags=re.S)
html = html[:start] + block + html[end:]

# 2) Autres grosses images (logo, paquet…) : fichiers WebP partagés
n_other = 0
def other(m):
    global n_other
    uri = m.group(0)
    if len(uri) < MIN_SIZE:
        return uri
    raw = base64.b64decode(uri.split(',', 1)[1])
    name = hashlib.sha1(raw).hexdigest()[:12] + '.webp'
    path = os.path.join(OUT, 'img', 'x', name)
    if not os.path.exists(path):
        write(f'img/x/{name}', to_webp(raw, 900, 84))
    n_other += 1
    return f'img/x/{name}'
html = re.sub(URI, other, html)

open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write(html)
total = sum(os.path.getsize(os.path.join(dp, f)) for dp, _, fs in os.walk(os.path.join(OUT, 'img')) for f in fs)
print(json.dumps({'index_kb': round(len(html.encode()) / 1024), 'members': n_members, 'other_images': n_other,
                  'img_total_kb': round(total / 1024)}))
