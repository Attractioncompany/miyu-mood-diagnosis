#!/usr/bin/env python3
"""Create distinct card files from the existing AI triptychs and portrait references."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
REFERENCE = ROOT / 'assets' / 'diagnosis' / 'reference'
GROUPS = ('a', 'b', 'c', 'd')
TYPES = ('a-1', 'a-2', 'a-3', 'b-1', 'b-2', 'b-3', 'c-1', 'c-2', 'c-3', 'd-1', 'd-2', 'd-3')


def write_jpg(image: Image.Image, destination: Path):
    destination.parent.mkdir(parents=True, exist_ok=True)
    image.thumbnail((420, 560), Image.Resampling.LANCZOS)
    image.save(destination, 'JPEG', quality=78, optimize=True, progressive=True)


def split_vertical(source: Path, destination: Path):
    with Image.open(source) as opened:
        image = ImageOps.exif_transpose(opened).convert('RGB')
    width, height = image.size
    for index in range(3):
        top = round(height * index / 3)
        bottom = round(height * (index + 1) / 3)
        write_jpg(image.crop((0, top, width, bottom)), destination / f'{index + 1}.jpg')


def focused_portrait(source: Path, destination: Path):
    with Image.open(source) as opened:
        image = ImageOps.exif_transpose(opened).convert('RGB')
    width, height = image.size
    # Three deliberately different focal zones: eye/brow, balanced face,
    # and lip/jaw. They match the three concise grooming captions.
    zones = ((0.00, 0.00, 0.58), (0.12, 0.20, 0.80), (0.34, 0.42, 1.00))
    for index, (top_ratio, _center_ratio, bottom_ratio) in enumerate(zones, start=1):
        top = round(height * top_ratio)
        bottom = round(height * bottom_ratio)
        write_jpg(image.crop((0, top, width, bottom)), destination / f'{index}.jpg')


def main():
    for gender in ('female', 'male'):
        for group in GROUPS:
            split_vertical(
                REFERENCE / gender / 'daily' / f'{group}.jpg',
                REFERENCE / gender / 'daily' / group
            )

    for group in GROUPS:
        female_hair_avoid = REFERENCE / 'female' / 'hair' / 'avoid' / group
        if not (female_hair_avoid / '1.jpg').is_file():
            split_vertical(
                REFERENCE / 'female' / 'hair' / 'avoid' / f'{group}.jpg',
                female_hair_avoid
            )
        split_vertical(
            REFERENCE / 'male' / 'grooming' / 'avoid' / f'{group}.jpg',
            REFERENCE / 'male' / 'grooming' / 'avoid' / group
        )

    for type_code in TYPES:
        focused_portrait(
            REFERENCE / 'male' / 'grooming-detail' / f'{type_code}.jpg',
            REFERENCE / 'male' / 'grooming-detail' / type_code
        )


if __name__ == '__main__':
    main()
