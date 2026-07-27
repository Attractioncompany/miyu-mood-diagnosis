from pathlib import Path

from pypdf import PdfReader


QUESTION_IMAGES = {
    "q01-a.png": "Im12.jp2",
    "q01-b.png": "Im29.jp2",
    "q01-c-1.png": "Im10.jp2",
    "q01-c-2.png": "Im13.jp2",
    "q01-d.png": "Im11.jp2",
    "q02-a.png": "Im14.jp2",
    "q02-b.png": "Im15.jp2",
    "q02-c.png": "Im34.jp2",
    "q02-d.png": "Im16.jp2",
    "q03-a.png": "Im17.jp2",
    "q03-b.png": "Im19.jp2",
    "q03-c.png": "Im20.jp2",
    "q03-d.png": "Im18.jp2",
    "q04-a.png": "Im26.jp2",
    "q04-b.png": "Im27.jp2",
    "q04-c.png": "Im25.jp2",
    "q04-d.png": "Im28.jp2",
    "q05-a.png": "Im6.jp2",
    "q05-b.png": "Im7.jp2",
    "q05-c.png": "Im8.jp2",
    "q05-d.png": "Im9.jp2",
    "q06-a.png": "Im21.jp2",
    "q06-b.png": "Im22.jp2",
    "q06-c-1.png": "Im23.jp2",
    "q06-c-2.png": "Im30.jp2",
    "q06-d.png": "Im24.jp2",
    "q07-a.png": "Im5.jp2",
    "q07-b.png": "Im32.jp2",
    "q07-c.png": "Im31.jp2",
    "q07-d.png": "Im33.jp2",
    "q08-a.png": "Im4.jp2",
    "q08-b.png": "Im2.jp2",
    "q08-c.png": "Im3.jp2",
    "q08-d.png": "Im1.jp2",
}


TYPE_CROPS = {
    "a-1.png": (27, 139, 99, 230),
    "a-2.png": (151, 139, 223, 230),
    "a-3.png": (275, 139, 353, 230),
    "b-1.png": (27, 278, 99, 374),
    "b-2.png": (151, 278, 223, 374),
    "b-3.png": (275, 278, 353, 374),
    "c-1.png": (27, 418, 99, 510),
    "c-2.png": (151, 418, 223, 510),
    "c-3.png": (275, 418, 353, 510),
    "d-1.png": (27, 553, 99, 646),
    "d-2.png": (151, 553, 223, 646),
    "d-3.png": (275, 553, 353, 646),
}


def extract_assets(pdf_path: Path, output_dir: Path) -> list[Path]:
    page = PdfReader(str(pdf_path)).pages[0]
    images = {image.name: image.image.convert("RGBA") for image in page.images}
    question_dir = output_dir / "questions"
    type_dir = output_dir / "types"
    question_dir.mkdir(parents=True, exist_ok=True)
    type_dir.mkdir(parents=True, exist_ok=True)
    created = []

    for filename, image_name in QUESTION_IMAGES.items():
        target = question_dir / filename
        images[image_name].save(target, "PNG")
        created.append(target)

    table_image = images["Im0.png"]
    for filename, crop_box in TYPE_CROPS.items():
        target = type_dir / filename
        table_image.crop(crop_box).save(target, "PNG")
        created.append(target)

    return created


if __name__ == "__main__":
    project_root = Path(__file__).resolve().parents[1]
    extract_assets(
        project_root / "reference" / "무드 체크 리스트. ver2.pdf",
        project_root / "assets" / "diagnosis",
    )
