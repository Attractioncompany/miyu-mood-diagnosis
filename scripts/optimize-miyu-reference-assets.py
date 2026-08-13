#!/usr/bin/env python3
"""Normalize MIYU reference assets and write the build manifest."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
REFERENCE = ROOT / 'assets' / 'diagnosis' / 'reference'
GROUPS = ('a', 'b', 'c', 'd')
TYPES = ('a-1', 'a-2', 'a-3', 'b-1', 'b-2', 'b-3', 'c-1', 'c-2', 'c-3', 'd-1', 'd-2', 'd-3')
TYPE_NAMES = ('fantasy', 'fruity', 'soda', 'romantic', 'soft', 'elegance', 'vintage', 'refined', 'deep-chic', 'clear', 'sharp', 'charisma')
SEMANTIC_HAIR_AVOID = (
    'female/semantic/hair-avoid/a/heavy-straight.jpg',
    'female/semantic/hair-avoid/a/slick-back.jpg',
    'female/semantic/hair-avoid/a/hime-cut.jpg',
    'female/semantic/hair-avoid/b/hime-cut.jpg',
    'female/semantic/hair-avoid/b/bleach.jpg',
    'female/semantic/hair-avoid/b/shag.jpg',
    'female/semantic/hair-avoid/c/twin-tail.jpg',
    'female/semantic/hair-avoid/c/harsh-layer.jpg',
    'female/semantic/hair-avoid/c/messy.jpg',
    'female/semantic/hair-avoid/d/tight-wave.jpg',
    'female/semantic/hair-avoid/d/cute-pony.jpg',
    'female/semantic/hair-avoid/d/baby-hair.jpg',
)


def card_assets(directory, keys, count=3):
    return [f'{directory}/{key}/{index}.jpg' for key in keys for index in range(1, count + 1)]


EXPECTED = (
    [f'intro/{group}.jpg' for group in GROUPS]
    + [f'average/female/{code}.jpg' for code in TYPES]
    + card_assets('female/makeup/recommended', TYPE_NAMES, count=6)
    + card_assets('female/makeup/avoid', TYPE_NAMES)
    + card_assets('female/hair/recommended', GROUPS)
    + card_assets('female/hair/avoid', GROUPS)
    + card_assets('female/fashion', TYPE_NAMES)
    + card_assets('female/daily', GROUPS)
    + [f'average/male/{code}.jpg' for code in TYPES]
    + card_assets('male/hair', GROUPS)
    + card_assets('male/grooming/avoid', GROUPS)
    + card_assets('male/grooming-detail', TYPES)
    + card_assets('male/hair/avoid-ppt', GROUPS)
    + card_assets('male/daily', GROUPS)
    + list(SEMANTIC_HAIR_AVOID)
)


def normalize(source: Path, destination: Path):
    with Image.open(source) as original:
        image = ImageOps.exif_transpose(original).convert('RGB')
    image.thumbnail((720, 900), Image.Resampling.LANCZOS)
    destination.parent.mkdir(parents=True, exist_ok=True)
    image.save(destination, 'JPEG', quality=78, optimize=True, progressive=True)
    with Image.open(destination) as saved:
        return saved.size


def main():
    for png in REFERENCE.rglob('*.png'):
        normalize(png, png.with_suffix('.jpg'))
        png.unlink()

    assets = {}
    for relative in EXPECTED:
        file_path = REFERENCE / relative
        if not file_path.is_file():
            raise SystemExit(f'Missing MIYU reference image: {relative}')
        width, height = normalize(file_path, file_path)
        if max(width, height) > 900:
            raise SystemExit(f'Reference image exceeds 900px: {relative}')
        assets[f'reference/{relative}'] = {
            'file': f'diagnosis/reference/{relative}',
            'mime': 'image/jpeg',
            'width': width,
            'height': height,
        }

    (REFERENCE / 'manifest.json').write_text(
        json.dumps({'version': 1, 'assets': assets}, ensure_ascii=False, indent=2) + '\n',
        encoding='utf-8'
    )


if __name__ == '__main__':
    main()
