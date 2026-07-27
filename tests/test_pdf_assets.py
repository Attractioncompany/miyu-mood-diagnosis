import importlib.util
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "extract-pdf-assets.py"
PDF = ROOT / "reference" / "무드 체크 리스트. ver2.pdf"


def load_extractor():
    spec = importlib.util.spec_from_file_location("extract_pdf_assets", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class PdfAssetExtractionTest(unittest.TestCase):
    def test_extracts_34_question_images_and_12_type_faces(self):
        module = load_extractor()
        with tempfile.TemporaryDirectory() as temp_dir:
            output = Path(temp_dir)
            created = module.extract_assets(PDF, output)
            question_files = sorted((output / "questions").glob("*.png"))
            type_files = sorted((output / "types").glob("*.png"))

            self.assertEqual(46, len(created))
            self.assertEqual(34, len(question_files))
            self.assertEqual(12, len(type_files))

    def test_type_face_crops_exclude_table_lines_and_keep_expected_sizes(self):
        module = load_extractor()
        with tempfile.TemporaryDirectory() as temp_dir:
            output = Path(temp_dir)
            module.extract_assets(PDF, output)

            from PIL import Image

            with Image.open(output / "types" / "a-1.png") as a1_image:
                self.assertEqual((72, 91), a1_image.size)
            with Image.open(output / "types" / "d-3.png") as d3_image:
                self.assertEqual((78, 93), d3_image.size)

    def test_multi_image_answers_are_preserved(self):
        module = load_extractor()
        with tempfile.TemporaryDirectory() as temp_dir:
            output = Path(temp_dir)
            module.extract_assets(PDF, output)

            self.assertTrue((output / "questions" / "q01-c-1.png").is_file())
            self.assertTrue((output / "questions" / "q01-c-2.png").is_file())
            self.assertTrue((output / "questions" / "q06-c-1.png").is_file())
            self.assertTrue((output / "questions" / "q06-c-2.png").is_file())


if __name__ == "__main__":
    unittest.main()
