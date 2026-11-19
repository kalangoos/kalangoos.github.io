"""Crop and optimise the chosen test-session captures, the wallpapers, the brand and the app icons.

Writes WebP/PNG for the site (site/public/) and PNGs under target/site-design/assets/ for the FigCraft page
"Site · Landing page". Needs Pillow and the captures in target/captura/ (made by the session tests; not in git).
Before adding a capture to SHOTS, look at every text in it: no real names, Wi-Fi names, e-mails, /home paths
or notifications from real apps. Run from anywhere: python3 site/scripts/prepare-images.py
"""
import os
from PIL import Image

WT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
CAP = os.path.join(WT, 'target', 'captura') + '/'
if not os.path.isdir(CAP):  # a git worktree has no target/: use the main checkout's
    CAP = os.environ.get('KALANGO_CAPTURES', CAP)
FC_OUT = os.path.join(os.path.dirname(os.path.dirname(CAP.rstrip('/'))), 'site-design', 'assets') + '/'
WEB = WT + '/site/public/img/'
for d in (FC_OUT, WEB + 'shots', WEB + 'brand', WEB + 'apps', WEB + 'wallpaper'):
    os.makedirs(d, exist_ok=True)

FULL = (0, 0, 1280, 800)  # the nested session's output inside the 1600x900 Xvfb grabs
SHOTS = {
    'desktop': ('sessao-area.png', FULL),
    'files-agent': ('sessao-arquivos-agente.png', FULL),
    'documents': ('sessao-documentos.png', FULL),
    'command-ui': ('sessao-comando-interface.png', FULL),
    'new-agent': ('sessao-novo-agente.png', FULL),
    'chat-changes': ('sessao-chat-alteracoes.png', FULL),
    'privacy-panel': ('sessao-privacidade.png', (812, 40, 1272, 630)),
    'monitor-agents': ('sessao-monitor-agentes.png', FULL),
    'install-agent': ('sessao-instalar-agente.png', FULL),
    'today': ('sessao-hoje.png', FULL),
    'spaces': ('sessao-espacos-habito.png', FULL),
    'lock': ('sessao-bloqueio.png', FULL),
    'light': ('sessao-aparencia-clara.png', FULL),
    'editor': ('sessao-editor-sugestoes.png', FULL),
    'music': ('sessao-musica.png', FULL),
    'help': ('sessao-ajuda.png', FULL),
    'chat-data': ('sessao-chat-dados.png', FULL),
    'calculator': ('sessao-calculadora.png', FULL),
    'first-use': ('sessao-primeiro-uso.png', (461, 52, 1160, 372)),
}

def webp(im, path, w=None, q=84):
    im = im.convert('RGB')
    if w and im.width > w:
        im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    im.save(path, 'WEBP', quality=q, method=6)
    return im.size

sizes = {}
for name, (src, box) in SHOTS.items():
    im = Image.open(CAP + src).convert('RGB').crop(box)
    im.save(FC_OUT + f'shot-{name}.png', optimize=True)
    sizes[name] = webp(im, WEB + f'shots/{name}.webp')
    if im.width > 700:
        webp(im, WEB + f'shots/{name}-640.webp', 640)

# wallpapers: dark and light 16:9
for name, src in (('dark', 'sdrustos-16x9-4k.png'), ('light', 'sdrustos-16x9-4k-claro.png')):
    im = Image.open(WT + '/wallpapers/' + src).convert('RGB')
    im.resize((1920, 1080), Image.LANCZOS).save(FC_OUT + f'wallpaper-{name}.png', optimize=True)
    webp(im, WEB + f'wallpaper/{name}.webp', 2400, 80)
    webp(im, WEB + f'wallpaper/{name}-1200.webp', 1200, 80)

# brand
B = WT + '/assets/brand/'
def brand(src, out, h=None, w=None):
    im = Image.open(B + src).convert('RGBA')
    bbox = im.getbbox(); im = im.crop(bbox)
    if h: im = im.resize((round(im.width * h / im.height), h), Image.LANCZOS)
    if w: im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    im.save(FC_OUT + out + '.png', optimize=True)
    im.save(WEB + 'brand/' + out + '.webp', 'WEBP', quality=88, method=6)
    return im.size
sizes['symbol'] = brand('kalango-simbolo.png', 'symbol', h=128)
sizes['badge'] = brand('kalango-logo-primario.png', 'badge', w=640)
sizes['badge-light'] = brand('kalango-tema-claro.png', 'badge-light', w=640)

# app icons (the 14 first-party apps that exist as .desktop files)
APPS = ['arquivos', 'configuracoes', 'agentes', 'terminal', 'editor-de-texto', 'calculadora', 'calendario',
        'documentos', 'imagens', 'musica', 'video', 'monitor', 'discos', 'ajuda']
for a in APPS:
    im = Image.open(WT + f'/assets/icons/kalango/{a}.png').convert('RGBA')
    im128 = im.resize((128, 128), Image.LANCZOS)
    im128.save(FC_OUT + f'app-{a}.png', optimize=True)
    im128.save(WEB + f'apps/{a}.webp', 'WEBP', quality=90, method=6)

# favicons from the symbol
sym = Image.open(B + 'kalango-simbolo.png').convert('RGBA'); sym = sym.crop(sym.getbbox())
side = max(sym.size); sq = Image.new('RGBA', (side, side), (0, 0, 0, 0)); sq.paste(sym, ((side - sym.width) // 2, (side - sym.height) // 2), sym)
os.makedirs(WT + '/site/public', exist_ok=True)
sq.resize((32, 32), Image.LANCZOS).save(WT + '/site/public/favicon-32.png', optimize=True)
sq.save(WT + '/site/public/favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)])
bg = Image.new('RGBA', (180, 180), (22, 23, 27, 255)); s = sq.resize((150, 150), Image.LANCZOS); bg.paste(s, (15, 15), s)
bg.convert('RGB').save(WT + '/site/public/apple-touch-icon.png', optimize=True)
sq.resize((32, 32), Image.LANCZOS).save(FC_OUT + 'favicon-32.png')

for k, v in sizes.items():
    print(k, v)
