from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(r"C:\Users\Admin\Documents\hoc-tieng-han\harutopik")
OUT = ROOT / "output/imagegen/harutopik-bang-nguyen-am-kep-sach.png"
W, H = 1055, 1491
NAVY, TEAL, GRID = (8, 43, 91), (4, 176, 151), (197, 218, 233)

img = Image.new("RGBA", (W, H), "white")
d = ImageDraw.Draw(img)
bold = r"C:\Windows\Fonts\arialbd.ttf"
regular = r"C:\Windows\Fonts\arial.ttf"
korean = r"C:\Windows\Fonts\malgun.ttf"
f_title = ImageFont.truetype(bold, 30)
f_sub = ImageFont.truetype(bold, 20)
f_head = ImageFont.truetype(bold, 17)
f_label = ImageFont.truetype(bold, 20)
f_glyph = ImageFont.truetype(korean, 53)
f_small = ImageFont.truetype(bold, 13)

# Header
d.rounded_rectangle((35, 28, 1020, 108), 18, fill=(248, 252, 252))
d.rounded_rectangle((35, 28, 52, 108), 8, fill=TEAL)
d.text((77, 43), "Một nét hôm nay – Một bước ngày mai", font=f_title, fill=NAVY)
d.text((77, 80), "Bảng nguyên âm kép", font=f_sub, fill=NAVY)
mascot_path = ROOT / "public/harutopik-mascot-transparent.png"
if mascot_path.exists():
    m = Image.open(mascot_path).convert("RGBA")
    m.thumbnail((72, 72), Image.Resampling.LANCZOS)
    img.alpha_composite(m, (755, 31))
d.text((830, 52), "Harutopik", font=ImageFont.truetype(bold, 31), fill=TEAL)
d.line((40, 132, 1015, 132), fill=NAVY, width=3)
for x in (40, 67, 94): d.ellipse((x-5,127,x+5,137), fill=TEAL)
d.polygon([(1009,132),(1015,126),(1021,132),(1015,138)], fill=TEAL)

# Table
top, head_h, row_h = 169, 40, 109
bottom = top + head_h + row_h * 11
d.rounded_rectangle((35, top, 1020, bottom), 13, fill="white", outline=GRID, width=1)
d.rounded_rectangle((35, top, 1020, top+head_h), 13, fill=TEAL)
d.rectangle((35, top+20, 1020, top+head_h), fill=TEAL)
d.line((143, top, 143, bottom), fill=GRID, width=1)
d.text((89, top+20), "Chữ cái", font=f_head, fill="white", anchor="mm")
d.text((581, top+20), "Luyện viết", font=f_head, fill="white", anchor="mm")

labels = ["AE","YAE","E","YE","WA","WAE","OE","WO","WE","WI","UI"]
glyphs = ["ㅐ","ㅒ","ㅔ","ㅖ","ㅘ","ㅙ","ㅚ","ㅝ","ㅞ","ㅟ","ㅢ"]
box_x0, box_gap, box_w = 156, 10, 112

# Watermark behind practice area
if mascot_path.exists():
    wm = Image.open(mascot_path).convert("RGBA")
    wm.thumbnail((430, 430), Image.Resampling.LANCZOS)
    wm.putalpha(wm.getchannel("A").point(lambda a: int(a * .09)))
    img.alpha_composite(wm, (390, 520))
overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
od = ImageDraw.Draw(overlay)
od.text((520, 1005), "Harutopik", font=ImageFont.truetype(bold, 72), fill=(4,176,151,28), anchor="mm")
img = Image.alpha_composite(img, overlay)
d = ImageDraw.Draw(img)

for i, (label, glyph) in enumerate(zip(labels, glyphs)):
    y0 = top + head_h + i * row_h
    cy = y0 + row_h / 2
    if i: d.line((35, y0, 1020, y0), fill=GRID, width=1)
    d.text((89, y0+28), label, font=f_label, fill=NAVY, anchor="mm")
    d.text((89, y0+72), glyph, font=f_glyph, fill=NAVY, anchor="mm")
    for j in range(7):
        x0 = box_x0 + j * (box_w + box_gap)
        yb0, yb1 = y0 + 12, y0 + row_h - 12
        d.rectangle((x0, yb0, x0+box_w, yb1), outline=GRID, width=1)
        d.line((x0+box_w/2, yb0, x0+box_w/2, yb1), fill=GRID, width=1)
        d.line((x0, (yb0+yb1)/2, x0+box_w, (yb0+yb1)/2), fill=GRID, width=1)
        if j == 0:
            d.text((x0+box_w/2, (yb0+yb1)/2), glyph, font=ImageFont.truetype(korean, 45), fill=(185,190,192), anchor="mm")

# Footer
d.line((38, 1450, 458, 1450), fill=NAVY, width=2)
d.line((598, 1450, 1017, 1450), fill=NAVY, width=2)
d.text((35, 1463), "Harutopik – Học tiếng Hàn mỗi ngày", font=f_small, fill=NAVY)
d.text((1020, 1463), "Bản quyền thuộc Harutopik", font=f_small, fill=TEAL, anchor="ra")

OUT.parent.mkdir(parents=True, exist_ok=True)
img.convert("RGB").save(OUT, quality=100)
print(OUT)
