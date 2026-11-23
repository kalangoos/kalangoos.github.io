"""Open Graph image site/public/og.png (1200x630): the night-sky wallpaper, the KalangoOS badge, the tagline and the
desktop frame from the KalangoOS Design System (public/img/ds).
Needs Pillow, URW Gothic and JetBrains Mono installed (fonts-urw-base35, fonts-jetbrains-mono), and
prepare-images.py run first (it writes the badge and the capture this reads). Run: python3 site/scripts/make-og.py"""
import os
from PIL import Image, ImageDraw, ImageFont
WT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
ASSETS = WT + '/site/public/img/'
W, H = 1200, 630
img = Image.new('RGB', (W, H), (22, 23, 27))  # cor/bg: the full-colour logo only on a plain background (brand rule)
d = ImageDraw.Draw(img)
# right: the system's sky with the desktop frame from the Design System floating on it
wp = Image.open(WT + '/wallpapers/sdrustos-16x9-4k.png').convert('RGB').resize((1120, 630)).crop((420, 0, 1020, 630))
img.paste(wp, (600, 0))
fade = Image.new('L', (200, H))  # plain → sky, from the left
fade.putdata([255 - round(255 * x / 199) for _ in range(H) for x in range(200)])
img.paste(Image.new('RGB', (200, H), (22, 23, 27)), (600, 0), fade)
shot = Image.open(ASSETS + 'ds/desktop.webp').convert('RGB').resize((512, 288), Image.LANCZOS)
frame = Image.new('RGB', (514, 318), (38, 39, 47))
frame.paste(Image.new('RGB', (512, 28), (16, 17, 20)), (1, 1)); frame.paste(shot, (1, 29))
img.paste(frame, (W - 514 - 48, 156))
# left: the logo, big, with its clear space, then the tagline
logo = Image.open(ASSETS + 'brand/badge.webp').convert('RGBA')
lh = 280
logo = logo.resize((round(lh * logo.width / logo.height), lh), Image.LANCZOS)
img.paste(logo, (64, 48), logo)
display = ImageFont.truetype('/usr/share/fonts/opentype/urw-base35/URWGothic-Demi.otf', 36)
mono = ImageFont.truetype('/usr/share/fonts/truetype/jetbrains-mono/JetBrainsMono-Regular.ttf', 17)
y = 372
for line in ('O Linux em que agentes', 'de IA trabalham com você.'):
    d.text((64, y), line, font=display, fill=(226, 226, 230)); y += 46
d.text((64, y + 26), 'kalangoos.com  ·  prévia técnica 0.1', font=mono, fill=(165, 161, 226))
img.save(WT + '/site/public/og.png', optimize=True)
print('og.png', img.size)
