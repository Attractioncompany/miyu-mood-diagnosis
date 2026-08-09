#!/usr/bin/env python3
"""Import the shop-internal MIYU PPT photos into text-free consultation assets."""

from __future__ import annotations

import argparse
import io
from pathlib import Path

from PIL import Image, ImageOps
from pptx import Presentation


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_PPT = Path('/Users/oeuvre/Desktop/미유/무드진단/★무드 세부 분류. 20260805.pptx')
OUTPUT = ROOT / 'assets' / 'diagnosis' / 'reference'
GROUPS = ('a', 'b', 'c', 'd')
TYPE_SLIDES = {
    'a-1': 15, 'a-2': 22, 'a-3': 28,
    'b-1': 45, 'b-2': 51, 'b-3': 56,
    'c-1': 73, 'c-2': 79, 'c-3': 85,
    'd-1': 100, 'd-2': 106, 'd-3': 112,
}
FEMALE_HAIR_SLIDES = {'a': 7, 'b': 38, 'c': 67, 'd': 95}
MALE_HAIR_SLIDES = {'a': 13, 'b': 42, 'c': 70, 'd': 98}


def open_picture(shape):
    image = Image.open(io.BytesIO(shape.image.blob))
    return ImageOps.exif_transpose(image).convert('RGB')


def jpg(image: Image.Image, destination: Path, size=(720, 900)):
    destination.parent.mkdir(parents=True, exist_ok=True)
    image.thumbnail(size, Image.Resampling.LANCZOS)
    image.save(destination, 'JPEG', quality=78, optimize=True, progressive=True)


def picture_shapes(slide):
    return [shape for shape in slide.shapes if shape.shape_type == 13]


def intro_portrait(image: Image.Image):
    """Slide 2 stores each group card as one image; keep only its face reference."""
    width, height = image.size
    return image.crop((int(width * 0.64), int(height * 0.14), int(width * 0.98), int(height * 0.91)))


def collage(slide, destination: Path, columns: int):
    pictures = [open_picture(shape) for shape in picture_shapes(slide)]
    rows = (len(pictures) + columns - 1) // columns
    cell_width, cell_height, gap = 174, 230, 8
    canvas = Image.new(
        'RGB',
        (columns * cell_width + (columns + 1) * gap, rows * cell_height + (rows + 1) * gap),
        '#f5f3ef'
    )
    for index, image in enumerate(pictures):
        copy = ImageOps.contain(image, (cell_width, cell_height), Image.Resampling.LANCZOS)
        x = gap + (index % columns) * (cell_width + gap) + (cell_width - copy.width) // 2
        y = gap + (index // columns) * (cell_height + gap) + (cell_height - copy.height) // 2
        canvas.paste(copy, (x, y))
    jpg(canvas, destination, (720, 900))


def import_assets(ppt_path: Path):
    if not ppt_path.is_file():
        raise SystemExit(f'Missing MIYU reference PPT: {ppt_path}')
    presentation = Presentation(ppt_path)

    intro_pictures = picture_shapes(presentation.slides[1])
    if len(intro_pictures) != 4:
        raise SystemExit(f'Expected 4 intro faces on slide 2, found {len(intro_pictures)}')
    for group, shape in zip(GROUPS, intro_pictures):
        jpg(intro_portrait(open_picture(shape)), OUTPUT / 'intro' / f'{group}.jpg')

    for code, slide_number in TYPE_SLIDES.items():
        pictures = picture_shapes(presentation.slides[slide_number - 1])
        if len(pictures) < 2:
            raise SystemExit(f'Expected at least 2 type photos on slide {slide_number}: {code}')
        jpg(open_picture(pictures[0]), OUTPUT / 'female' / 'face' / f'{code}.jpg')
        jpg(open_picture(pictures[-1]), OUTPUT / 'female' / 'makeup' / f'{code}.jpg')

    for group, slide_number in FEMALE_HAIR_SLIDES.items():
        collage(presentation.slides[slide_number - 1], OUTPUT / 'female' / 'hair' / f'{group}.jpg', 4)
    for group, slide_number in MALE_HAIR_SLIDES.items():
        collage(presentation.slides[slide_number - 1], OUTPUT / 'male' / 'hair' / f'{group}.jpg', 5)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--ppt', type=Path, default=DEFAULT_PPT)
    args = parser.parse_args()
    import_assets(args.ppt)
