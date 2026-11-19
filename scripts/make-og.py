"""Open Graph image site/public/og.png (1200x630): the night-sky wallpaper, the KalangoOS badge, the tagline and the
real desktop capture.
Needs Pillow, URW Gothic and JetBrains Mono installed (fonts-urw-base35, fonts-jetbrains-mono), and
prepare-images.py run first (it writes the badge and the capture this reads). Run: python3 site/scripts/make-og.py"""
import os
from PIL import Image, ImageDraw, ImageFont
WT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
ASSETS = WT + '/site/public/img/'
W, H = 1200, 630
wp = Image.open(WT + '/wallpapers/sdrustos-16x9-4k.png').convert('RGB')
wp = wp.resize((1600, 900)).crop((340, 270, 1540, 900))  # leaves the moon out, keeps the hills and the house
img = Image.new('RGB', (W, H), (22, 23, 27)); img.paste(wp, (0, 0))
d = ImageDraw.Draw(img)
badge = Image.open(ASSETS + 'brand/badge.webp').convert('RGBA')
badge = badge.resize((150, round(150 * badge.height / badge.width)))
img.paste(badge, (64, 64), badge)
display = ImageFont.truetype('/usr/share/fonts/opentype/urw-base35/URWGothic-Demi.otf', 44)
mono = ImageFont.truetype('/usr/share/fonts/truetype/jetbrains-mono/JetBrainsMono-Regular.ttf', 18)
y = 262
for line in ('O Linux em que', 'agentes de IA', 'trabalham com você.'):
    d.text((64, y), line, font=display, fill=(226, 226, 230)); y += 54
d.text((64, y + 22), 'kalangoos.com  ·  em desenvolvimento', font=mono, fill=(165, 161, 226))
shot = Image.open(ASSETS + 'shots/desktop.webp').convert('RGB').resize((512, 320), Image.LANCZOS)
frame = Image.new('RGB', (514, 322 + 28), (38, 39, 47))
bar = Image.new('RGB', (512, 28), (16, 17, 20)); frame.paste(bar, (1, 1)); frame.paste(shot, (1, 29))
img.paste(frame, (W - 514 - 56, 150))
img.save(WT + '/site/public/og.png', optimize=True)
print('og.png', img.size)
