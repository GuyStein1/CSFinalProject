"""Generate a round favicon from logo-round.png by cropping tightly to the
badge circle and making everything outside it transparent."""
from PIL import Image, ImageDraw, ImageChops

SRC = 'assets/logo-round.png'
OUT = 'assets/favicon.png'
OUT_SIZE = 512

im = Image.open(SRC).convert('RGBA')
W, H = im.size
px = im.load()

# Find the bounding box of the navy ring/runner (the outermost navy is the ring).
minx, miny, maxx, maxy = W, H, 0, 0
step = 2
for y in range(0, H, step):
    for x in range(0, W, step):
        r, g, b, a = px[x, y]
        if a > 128 and r < 100 and g < 120 and b < 150:
            if x < minx: minx = x
            if x > maxx: maxx = x
            if y < miny: miny = y
            if y > maxy: maxy = y

cx = (minx + maxx) / 2
cy = (miny + maxy) / 2
# Radius from the ring bbox, with a hair of margin so the ring edge isn't clipped.
R = max(maxx - minx, maxy - miny) / 2 * 1.015
size = int(round(R * 2))
left = int(round(cx - R))
top = int(round(cy - R))

crop = im.crop((left, top, left + size, top + size))

# Circular alpha mask, supersampled for clean anti-aliased edges.
ss = 4
mask = Image.new('L', (size * ss, size * ss), 0)
ImageDraw.Draw(mask).ellipse((0, 0, size * ss - 1, size * ss - 1), fill=255)
mask = mask.resize((size, size), Image.LANCZOS)

r, g, b, a = crop.split()
a = ImageChops.multiply(a, mask)
out = Image.merge('RGBA', (r, g, b, a)).resize((OUT_SIZE, OUT_SIZE), Image.LANCZOS)
out.save(OUT)
print(f'wrote {OUT} ({OUT_SIZE}x{OUT_SIZE}) from circle center=({cx:.0f},{cy:.0f}) R={R:.0f}')
