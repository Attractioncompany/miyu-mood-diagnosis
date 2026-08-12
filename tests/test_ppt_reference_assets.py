import importlib.util
import unittest
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / 'scripts' / 'prepare-ppt-reference-assets.py'


def load_module():
    spec = importlib.util.spec_from_file_location('miyu_ppt_assets', SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class PptReferenceAssetTests(unittest.TestCase):
    def test_balanced_rows_fill_the_final_photo_row_without_blank_cells(self):
        module = load_module()

        row_counts = module.balanced_row_counts(10)

        self.assertEqual(row_counts, [4, 3, 3])
        self.assertEqual(sum(row_counts), 10)
        self.assertLessEqual(max(row_counts) - min(row_counts), 1)

    def test_pure_white_placeholder_is_excluded_from_photo_boards(self):
        module = load_module()

        self.assertTrue(module.is_blank_placeholder(Image.new('RGB', (28, 67), 'white')))
        self.assertFalse(module.is_blank_placeholder(Image.new('RGB', (28, 67), 'black')))


if __name__ == '__main__':
    unittest.main()
