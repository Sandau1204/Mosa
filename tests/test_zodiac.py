import unittest

from cogs.zodiac import get_zodiac_index


class ZodiacTests(unittest.TestCase):
    def test_sign_boundaries(self):
        self.assertEqual(get_zodiac_index(21, 3), 0)
        self.assertEqual(get_zodiac_index(19, 4), 0)
        self.assertEqual(get_zodiac_index(20, 4), 1)
        self.assertEqual(get_zodiac_index(19, 1), 9)
        self.assertEqual(get_zodiac_index(20, 1), 10)
        self.assertEqual(get_zodiac_index(18, 2), 10)
        self.assertEqual(get_zodiac_index(20, 2), 11)
        self.assertEqual(get_zodiac_index(29, 2), 11)
        self.assertEqual(get_zodiac_index(20, 3), 11)

    def test_rejects_invalid_birth_date(self):
        with self.assertRaises(ValueError):
            get_zodiac_index(31, 2)


if __name__ == "__main__":
    unittest.main()
