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
    ('02-upload-progress.png', 12, 'Drop in any 10-K.', 'Staged indexing makes the work visible.'),
    ('04-citation-expanded.png', 18, 'Ask anything.\nEvery number is cited.', 'Jump to the exact page. Verify it yourself.'),
    ('08-low-confidence.png', 14, "And when it doesn't know,\nit says so.", 'No hallucinations. No guessing.'),
    ('03-conversation-answer.png', 13, 'It remembers the conversation.', 'And in 2022? $701.4M. Export the evidence.'),
]

def font(path: str, size: int):
    return ImageFont.truetype(path, size)

def centered_card(image: Image.Image) -> Image.Image:
    shot = ImageOps.contain(image.convert('RGB'), (1080, 675), Image.Resampling.LANCZOS)
    card = Image.new('RGB', (1110, 705), '#121820')
    card.paste(shot, ((1110 - shot.width) // 2, (705 - shot.height) // 2))
    border = ImageDraw.Draw(card)
    border.rectangle((0, 0, 1109, 704), outline=GOLD, width=3)
    return card

def draw_text(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, style: ImageFont.FreeTypeFont, fill: str, spacing: int = 12):
    draw.multiline_text(xy, text, font=style, fill=fill, spacing=spacing)

def make_frame(filename: str, headline: str, supporting: str, index: int) -> Image.Image:
    background = Image.open(ROOT / 'poster-background.png').convert('RGB')
    background = ImageOps.fit(background, (W, H), Image.Resampling.LANCZOS)
    dim = Image.new('RGBA', (W, H), '#05070bA8')
    canvas = Image.alpha_composite(background.convert('RGBA'), dim)
    shot = centered_card(Image.open(SOURCE / filename))
    shadow = Image.new('RGBA', (1150, 745), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle((20, 20, 1130, 725), radius=18, fill=(0, 0, 0, 170))
    canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(16)), (770, 238))
    canvas.alpha_composite(shot.convert('RGBA'), (790, 258))
    draw = ImageDraw.Draw(canvas)
    draw_text(draw, (112, 132), 'TESTIMONIUM  /  90-SECOND DEMO', font(BOLD, 24), GOLD)
    draw_text(draw, (108, 225), headline, font(BOLD, 62), WHITE, 14)
    draw_text(draw, (112, 440), supporting, font(FONT, 27), MUTED, 11)
    draw.rounded_rectangle((112, 680, 430, 730), radius=25, fill=(216, 168, 76, 38), outline=(216, 168, 76, 150), width=1)
    draw_text(draw, (136, 695), f'0{index + 1}  /  06', font(BOLD, 18), '#0d1015')
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
    entries.append((final, 10))
    with (FRAMES / 'concat.txt').open('w') as output:
        for path, duration in entries:
            output.write(f"file '{path}'\n")
            output.write(f'duration {duration}\n')
        output.write(f"file '{entries[-1][0]}'\n")
    poster = make_frame('03-conversation-answer.png', 'An AI that\nrefuses to lie to you', 'Evidence-grade answers from SEC filings.\nEvery number can be checked.', 0)
    poster.save(ROOT / 'poster.jpg', quality=94, subsampling=0)

if __name__ == '__main__':
    main()
