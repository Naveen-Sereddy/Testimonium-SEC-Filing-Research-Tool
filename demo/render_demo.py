"""Render the fallback demo storyboard from real Testimonium UI captures."""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parent
PORTFOLIO = ROOT.parents[2] / 'Portfolio'
SOURCE = PORTFOLIO / 'src/assets/case/testimonium'
FRAMES = ROOT / 'frames'
W, H = 1920, 1080
GOLD = '#d8a84c'
WHITE = '#f7f4ed'
MUTED = '#d4d7dd'
FONT = '/System/Library/Fonts/Supplemental/Arial.ttf'
BOLD = '/System/Library/Fonts/Supplemental/Arial Bold.ttf'

SHOTS = [
    ('01-empty-upload.png', 8, 'Most AI chatbots guess.\nTestimonium refuses to.', 'Evidence-grade answers start with the filing — not a prediction.'),
    ('02-upload-progress.png', 10, 'Drop in any 10-K.', 'Indexing complete — 304 / 304 chunks · 112 pages indexed.'),
    ('04-citation-expanded.png', 16, 'Ask anything.\nEvery number is cited.', 'Jump to the exact page. Verify it yourself.'),
    ('08-low-confidence.png', 12, "And when it doesn't know,\nit says so.", 'No hallucinations. No guessing.'),
    ('03-conversation-answer.png', 14, 'It remembers the conversation.', 'And in 2024? $144,285 thousand ($144.3M). Export the evidence.'),
]

# The screenshot must never intrude into this copy area. Keep the guide in the
# motion template, not only in a compositor's judgment, so clearance can be
# checked before every export.
HEADLINE_SAFE_AREA = (88, 188, 820, 478)
CARD_ORIGIN = (870, 350)
CARD_SIZE = (960, 610)
MIN_CLEARANCE = 24

def font(path: str, size: int):
    return ImageFont.truetype(path, size)

def centered_card(image: Image.Image) -> Image.Image:
    shot = ImageOps.contain(image.convert('RGB'), (930, 581), Image.Resampling.LANCZOS)
    card = Image.new('RGB', CARD_SIZE, '#121820')
    card.paste(shot, ((CARD_SIZE[0] - shot.width) // 2, (CARD_SIZE[1] - shot.height) // 2))
    border = ImageDraw.Draw(card)
    border.rectangle((0, 0, CARD_SIZE[0] - 1, CARD_SIZE[1] - 1), outline=GOLD, width=3)
    return card

def draw_text(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, style: ImageFont.FreeTypeFont, fill: str, spacing: int = 12):
    draw.multiline_text(xy, text, font=style, fill=fill, spacing=spacing)

def draw_pill(draw: ImageDraw.ImageDraw, index: int):
    draw.rounded_rectangle((112, 680, 430, 730), radius=25, fill=(216, 168, 76, 38), outline=(216, 168, 76, 150), width=1)
    draw_text(draw, (136, 695), f'0{index}  /  06', font(BOLD, 18), '#0d1015')

def assert_safe_area():
    safe_left, safe_top, safe_right, safe_bottom = HEADLINE_SAFE_AREA
    card_left, card_top = CARD_ORIGIN
    card_right = card_left + CARD_SIZE[0]
    card_bottom = card_top + CARD_SIZE[1]
    horizontal_clearance = card_left - safe_right
    if horizontal_clearance < MIN_CLEARANCE or card_right <= safe_left or card_bottom <= safe_top or card_top >= safe_bottom:
        raise ValueError('Screenshot frame violates the headline safe-area guide')

def correct_excerpt_boundary(card: Image.Image):
    # The source capture began a visible line with “od of time”. Mask that
    # clipped fragment and replace it with an explicit ellipsis at a word edge.
    draw = ImageDraw.Draw(card)
    draw.rectangle((665, 116, 922, 154), fill='#14161d')
    draw_text(draw, (676, 126), '… of time and cannot afford…', font(FONT, 12), '#d4d7dd')

def make_frame(filename: str, headline: str, supporting: str, index: int) -> Image.Image:
    assert_safe_area()
    background = Image.open(ROOT / 'poster-background.png').convert('RGB')
    background = ImageOps.fit(background, (W, H), Image.Resampling.LANCZOS)
    dim = Image.new('RGBA', (W, H), '#05070bA8')
    canvas = Image.alpha_composite(background.convert('RGBA'), dim)
    shot = centered_card(Image.open(SOURCE / filename))
    if filename == '04-citation-expanded.png':
        correct_excerpt_boundary(shot)
    shadow = Image.new('RGBA', (CARD_SIZE[0] + 40, CARD_SIZE[1] + 40), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle((20, 20, CARD_SIZE[0] + 20, CARD_SIZE[1] + 20), radius=18, fill=(0, 0, 0, 170))
    canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(16)), (CARD_ORIGIN[0] - 20, CARD_ORIGIN[1] - 20))
    canvas.alpha_composite(shot.convert('RGBA'), CARD_ORIGIN)
    draw = ImageDraw.Draw(canvas)
    draw_text(draw, (112, 132), 'TESTIMONIUM  /  EVIDENCE-GRADE DEMO', font(BOLD, 24), GOLD)
    draw_text(draw, (108, 225), headline, font(BOLD, 62), WHITE, 14)
    draw_text(draw, (112, 440), supporting, font(FONT, 27), MUTED, 11)
    if index == 1:
        draw.rounded_rectangle((112, 570, 630, 620), radius=12, fill=(16, 24, 32, 230), outline=(216, 168, 76, 130), width=1)
        draw.rectangle((130, 603, 596, 608), fill='#29313b')
        draw.rectangle((130, 603, 596, 608), fill=GOLD)
    draw_pill(draw, index + 1)
    draw_text(draw, (112, 825), 'testimonium.vercel.app', font(FONT, 23), MUTED)
    return canvas.convert('RGB')

def end_frame() -> Image.Image:
    background = Image.open(ROOT / 'poster-background.png').convert('RGB')
    canvas = ImageOps.fit(background, (W, H), Image.Resampling.LANCZOS).convert('RGBA')
    canvas = Image.alpha_composite(canvas, Image.new('RGBA', (W, H), '#05070bA8'))
    draw = ImageDraw.Draw(canvas)
    draw_text(draw, (122, 190), 'TESTIMONIUM', font(BOLD, 30), GOLD)
    draw_text(draw, (120, 295), 'Evidence-grade answers\nfrom your filings.', font(BOLD, 82), WHITE, 16)
    draw_text(draw, (124, 545), 'Cited to the exact page. Correct units.\nSays “I don’t know” instead of guessing.', font(FONT, 31), MUTED, 14)
    draw_text(draw, (122, 800), 'testimonium.vercel.app', font(BOLD, 28), GOLD)
    draw_pill(draw, 6)
    return canvas.convert('RGB')

def main():
    FRAMES.mkdir(exist_ok=True)
    entries: list[tuple[Path, int]] = []
    for index, (filename, duration, headline, supporting) in enumerate(SHOTS):
        target = FRAMES / f'{index + 1:02d}.png'
        make_frame(filename, headline, supporting, index).save(target, quality=96)
        entries.append((target, duration))
    final = FRAMES / '06.png'
    end_frame().save(final, quality=96)
    entries.append((final, 8))
    with (FRAMES / 'concat.txt').open('w') as output:
        for path, duration in entries:
            output.write(f"file '{path}'\n")
            output.write(f'duration {duration}\n')
        output.write(f"file '{entries[-1][0]}'\n")
    poster = make_frame('03-conversation-answer.png', 'Most AI chatbots guess.\nTestimonium refuses to.', 'Evidence-grade answers from SEC filings.\nEvery number can be checked.', 0)
    poster.save(ROOT / 'poster.jpg', quality=94, subsampling=0)

if __name__ == '__main__':
    main()
