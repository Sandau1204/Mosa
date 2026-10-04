"""Guard the extension contract used by MyBot.setup_hook without logging in."""
import ast
from pathlib import Path
import unittest


class CogEntrypointTests(unittest.TestCase):
    def test_every_auto_loaded_module_has_async_setup(self):
        cogs = Path(__file__).resolve().parent.parent / 'cogs'
        for path in cogs.glob('*.py'):
            if path.name.startswith('_'):
                continue
            with self.subTest(module=path.name):
                module = ast.parse(path.read_text(encoding='utf-8-sig'))
                self.assertTrue(
                    any(isinstance(node, ast.AsyncFunctionDef) and node.name == 'setup'
                        for node in module.body),
                    f'{path.name} is auto-loaded as a Discord extension and needs async setup.',
                )
