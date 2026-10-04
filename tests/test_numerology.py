import unittest

from cogs.numerology import calculate_ruling_number


class NumerologyTests(unittest.TestCase):
    def test_preserves_master_numbers(self):
        self.assertEqual(calculate_ruling_number(1, 1, 2007), 11)
        self.assertEqual(calculate_ruling_number(29, 11, 2007), 22)

    def test_reduces_to_a_single_digit(self):
        self.assertEqual(calculate_ruling_number(1, 1, 2001), 5)
        self.assertEqual(calculate_ruling_number(1, 1, 1), 3)

    def test_rejects_invalid_birth_date(self):
        with self.assertRaises(ValueError):
            calculate_ruling_number(31, 2, 2000)


if __name__ == "__main__":
    unittest.main()
