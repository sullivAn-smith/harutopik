from pathlib import Path
from PIL import Image, ImageFilter, ImageDraw, ImageFont

BASE = Path(r"C:\Users\Admin\.codex\generated_images\019fa7df-dcea-7a33-a3df-de1ebc2762c5\exec-b7fc90ff-28c1-4f8e-b73d-16ad6f99187e.png")
SOURCE = Path(r"C:\Users\Admin\AppData\Local\Temp\codex-clipboard-b9673a2c-3cd6-40dd-a725-4431c51d2630.png")
OUT = Path(r"C:\Users\Admin\Documents\hoc-tieng-han\harutopik\output\imagegen\harutopik-bang-nguyen-am-kep-chinh-xac.png")

# Exact boxes around the glyph artwork in the supplied source strip.
SOURCE_ROWS = {
    "AE":  (16, 32, 53, 72),
    "YAE": (16, 85, 53, 125),
    "E":   (16, 138, 53, 179),
    "YE":  (16, 192, 53, 233),
    "WA":  (16, 246, 53, 287),
    "WAE": (16, 300, 53, 341),
    "OE":  (16, 354, 53, 395),
    "WO":  (16, 408, 53, 449),
    "WE":  (16, 462, 53, 503),
    "WI":  (16, 516, 53, 557),
    "UI":  (16, 591, 53, 631),
}


def extract_mask(src, box):
    crop = src.crop(box).convert("RGB")
    mask = Image.new("L", crop.size, 0)
    cp, mp = crop.load(), mask.load()
    for y in range(crop.height):
        for x in range(crop.width):
            r, g, b = cp[x, y]
            # Keep only neutral/dark ink. This removes the red stroke annotations
            # and the pale box/grid from the photographed source.
            darkness = 255 - max(r, g, b)
            neutral = max(r, g, b) - min(r, g, b) < 42
            if neutral and darkness > 70:
                mp[x, y] = min(255, int((darkness - 55) * 2.1))
    mask = mask.filter(ImageFilter.MedianFilter(3))
    bbox = mask.getbbox()
    if not bbox:
        raise RuntimeError(f"No glyph found in {box}")
    return mask.crop(bbox)


def fit(mask, max_w, max_h):
    ratio = min(max_w / mask.width, max_h / mask.height)
    return mask.resize((max(1, round(mask.width * ratio)), max(1, round(mask.height * ratio))), Image.Resampling.LANCZOS)


def clear_dark_glyph(img, box):
    px = img.load()
    x0, y0, x1, y1 = box
    bg = (252, 253, 253)
    for y in range(y0, y1):
        for x in range(x0, x1):
            r, g, b = px[x, y][:3]
            if b < 150 and r < 100 and g < 130:
                px[x, y] = bg


def clear_faint_glyph(img, box):
    px = img.load()
    x0, y0, x1, y1 = box
    for y in range(y0, y1):
        for x in range(x0, x1):
            r, g, b = px[x, y][:3]
            # Faint glyph is nearly neutral gray; guide lines are pale blue.
            if max(r, g, b) - min(r, g, b) < 13 and 145 < r < 235:
                px[x, y] = (253, 254, 254)


def paste_mask(img, mask, center, color):
    x = round(center[0] - mask.width / 2)
    y = round(center[1] - mask.height / 2)
    layer = Image.new("RGB", mask.size, color)
    img.paste(layer, (x, y), mask)


def main():
    img = Image.open(BASE).convert("RGB")
    if img.size != (1055, 1491):
        raise RuntimeError(f"Unexpected base size: {img.size}")

    # Use the exact Unicode jamo represented by the supplied reference. This
    # removes every red annotation while preventing any invented extra stroke.
    glyphs = ["ㅐ", "ㅒ", "ㅔ", "ㅖ", "ㅘ", "ㅙ", "ㅚ", "ㅝ", "ㅞ", "ㅟ", "ㅢ"]
    row_centers = [288, 407, 526, 645, 764, 883, 1002, 1121, 1240, 1319, 1385]
    font = ImageFont.truetype(r"C:\Windows\Fonts\malgun.ttf", 55)
    faint_font = ImageFont.truetype(r"C:\Windows\Fonts\malgun.ttf", 49)
    draw = ImageDraw.Draw(img)
    for glyph, cy in zip(glyphs, row_centers):
        # Clear only the old glyph, leaving the Latin row label untouched.
        draw.rectangle((58, cy - 34, 121, cy + 34), fill=(252, 253, 253))
        draw.text((89, cy), glyph, font=font, fill=(10, 42, 91), anchor="mm")

        # Clear the previous faint example but retain/rebuild the cell guides.
        draw.rectangle((175, cy - 37, 246, cy + 37), fill=(253, 254, 254))
        draw.line((210, cy - 37, 210, cy + 37), fill=(211, 226, 238), width=1)
        draw.line((175, cy, 246, cy), fill=(211, 226, 238), width=1)
        draw.text((210, cy), glyph, font=faint_font, fill=(185, 190, 192), anchor="mm")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    img.save(OUT, quality=100)
    print(OUT)


if __name__ == "__main__":
    main()
