from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public" / "brand"
SOURCE_LOGO = PUBLIC / "strategy-financial-logo.png"
SOURCE_ICON = PUBLIC / "strategy-financial-icon.png"

OUT_ICON_512 = PUBLIC / "icon-512.png"
OUT_ICON_256 = PUBLIC / "icon.png"
OUT_TRANSPARENT = PUBLIC / "icon-transparent.png"
OUT_FAVICON = PUBLIC / "favicon.ico"


def _luma(rgb: tuple[int, int, int]) -> float:
  r, g, b = rgb
  return 0.2126 * r + 0.7152 * g + 0.0722 * b


def _bg_luma(img: Image.Image) -> float:
  w, h = img.size
  pts = [
    (3, 3),
    (w - 4, 3),
    (3, h - 4),
    (w - 4, h - 4),
    (w // 2, 3),
    (w // 2, h - 4),
  ]
  values = []
  for x, y in pts:
    px = img.getpixel((int(x), int(y)))
    values.append(_luma(px[:3] if isinstance(px, tuple) else px))
  values.sort()
  return values[len(values) // 2]


def _median_edge_color(img: Image.Image) -> tuple[int, int, int]:
  img = img.convert("RGB")
  w, h = img.size
  samples: list[tuple[int, int, int]] = []
  for x in range(0, w, max(1, w // 48)):
    samples.append(img.getpixel((x, 0)))
    samples.append(img.getpixel((x, h - 1)))
  for y in range(0, h, max(1, h // 48)):
    samples.append(img.getpixel((0, y)))
    samples.append(img.getpixel((w - 1, y)))
  samples.sort(key=_luma)
  return samples[len(samples) // 2]


def _find_icon_bbox(img: Image.Image) -> tuple[int, int, int, int]:
  rgb = img.convert("RGB")
  w, h = rgb.size

  bg = _bg_luma(rgb)
  ymax = int(h * 0.56)

  mask = Image.new("L", (w, h), 0)
  px = rgb.load()
  mpx = mask.load()

  for y in range(0, ymax):
    for x in range(0, w):
      r, g, b = px[x, y]
      l = 0.2126 * r + 0.7152 * g + 0.0722 * b
      if l > bg + 16:
        mpx[x, y] = 255

  bbox = mask.getbbox()
  if not bbox:
    raise RuntimeError("Não foi possível detectar o ícone no topo do logo.")
  return bbox


def _square_crop(img: Image.Image, bbox: tuple[int, int, int, int], pad: int) -> Image.Image:
  w, h = img.size
  x0, y0, x1, y1 = bbox
  x0 = max(0, x0 - pad)
  y0 = max(0, y0 - pad)
  x1 = min(w, x1 + pad)
  y1 = min(h, y1 + pad)

  bw = x1 - x0
  bh = y1 - y0
  side = max(bw, bh)
  cx = (x0 + x1) // 2
  cy = (y0 + y1) // 2

  sx0 = max(0, cx - side // 2)
  sy0 = max(0, cy - side // 2)
  sx1 = min(w, sx0 + side)
  sy1 = min(h, sy0 + side)

  sx0 = max(0, sx1 - side)
  sy0 = max(0, sy1 - side)

  return img.crop((sx0, sy0, sx1, sy1))


def _extract_symbol_transparent(crop: Image.Image) -> Image.Image:
  crop = crop.convert("RGBA")
  w, h = crop.size
  bg = _median_edge_color(crop)
  bg_l = _luma(bg)

  out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
  src = crop.load()
  dst = out.load()

  for y in range(h):
    for x in range(w):
      r, g, b, a = src[x, y]
      if a == 0:
        continue
      l = 0.2126 * r + 0.7152 * g + 0.0722 * b
      dr = r - bg[0]
      dg = g - bg[1]
      db = b - bg[2]
      dist = (dr * dr + dg * dg + db * db) ** 0.5
      keep = dist > 26 or l > bg_l + 14
      if keep:
        dst[x, y] = (r, g, b, 255)

  alpha = out.split()[-1]
  alpha = alpha.filter(ImageFilter.GaussianBlur(radius=0.6))
  out.putalpha(alpha)
  return out


def _make_bg(size: int) -> Image.Image:
  base = Image.new("RGB", (size, size), "#05071a")
  overlay = Image.new("RGBA", (size, size), (0, 0, 0, 0))
  draw = ImageDraw.Draw(overlay)

  r1 = int(size * 0.62)
  for i in range(r1, 0, -1):
    t = i / r1
    a = int(140 * (t**2))
    draw.ellipse(
      (int(size * 0.10 - i), int(size * 0.12 - i), int(size * 0.10 + i), int(size * 0.12 + i)),
      fill=(37, 99, 235, a),
    )

  r2 = int(size * 0.70)
  for i in range(r2, 0, -1):
    t = i / r2
    a = int(90 * (t**2))
    draw.ellipse(
      (int(size * 0.90 - i), int(size * 0.08 - i), int(size * 0.90 + i), int(size * 0.08 + i)),
      fill=(139, 92, 246, a),
    )

  overlay = overlay.filter(ImageFilter.GaussianBlur(radius=18))
  base_rgba = base.convert("RGBA")
  return Image.alpha_composite(base_rgba, overlay)


def main() -> int:
  if SOURCE_ICON.exists():
    src = Image.open(SOURCE_ICON).convert("RGBA")
  else:
    if not SOURCE_LOGO.exists():
      print(f"Arquivo não encontrado: {SOURCE_LOGO}")
      print("Coloque o PNG oficial do logo neste caminho e rode novamente.")
      return 1
    src = Image.open(SOURCE_LOGO).convert("RGBA")

  PUBLIC.mkdir(parents=True, exist_ok=True)

  w, h = src.size
  if w < 200 or h < 200:
    raise RuntimeError("Imagem muito pequena para extração do ícone.")

  if SOURCE_ICON.exists():
    icon_crop = src
  else:
    bbox = _find_icon_bbox(src)
    pad = max(16, int(min(w, h) * 0.04))
    icon_crop = _square_crop(src, bbox, pad=pad)
  symbol = _extract_symbol_transparent(icon_crop)

  symbol_512 = symbol.resize((512, 512), Image.Resampling.LANCZOS)
  symbol_512.save(OUT_TRANSPARENT, format="PNG", optimize=True)

  bg = _make_bg(512)
  composed = bg.copy()
  composed.alpha_composite(symbol_512)
  composed.save(OUT_ICON_512, format="PNG", optimize=True)

  icon_256 = composed.resize((256, 256), Image.Resampling.LANCZOS)
  icon_256.save(OUT_ICON_256, format="PNG", optimize=True)

  ico_64 = composed.resize((64, 64), Image.Resampling.LANCZOS)
  ico_32 = composed.resize((32, 32), Image.Resampling.LANCZOS)
  ico_32.save(OUT_FAVICON, format="ICO", sizes=[(32, 32), (64, 64)], append_images=[ico_64])

  print("Gerado:")
  print(f"- {OUT_ICON_512}")
  print(f"- {OUT_ICON_256}")
  print(f"- {OUT_TRANSPARENT}")
  print(f"- {OUT_FAVICON}")
  return 0


if __name__ == "__main__":
  raise SystemExit(main())
