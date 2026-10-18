import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rolldown } from 'rolldown';

test('large optional experiences load outside the initial application chunk', async () => {
  const bundle = await rolldown({
    input: 'src/App.jsx',
    plugins: [{
      name: 'external-packages',
      resolveId(id) {
        if (/^(react(?:-dom)?|zustand|lucide-react|pdfjs-dist|use-sound|@dnd-kit)(\/|$)/.test(id)) {
          return { id, external: true };
        }
      },
    }],
  });
  const output = await bundle.generate({ format: 'esm', entryFileNames: '[name].mjs', chunkFileNames: '[name]-[hash].mjs' });
  await bundle.close();
  const lazyEntries = new Set(output.output.filter(file => file.type === 'chunk' && file.isDynamicEntry)
    .map(file => file.facadeModuleId?.replaceAll('\\', '/').split('/src/').at(-1)));
  for (const module of [
    'components/CharacterImportDialog.jsx',
    'components/DiceTray.jsx',
    'pages/SpellTomePage.jsx',
  ]) assert.ok(lazyEntries.has(module), `${module} should be loaded on demand`);
});
