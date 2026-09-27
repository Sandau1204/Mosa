import { readFileSync } from 'node:fs';
import path from 'node:path';

export default function LegacyPage({ filename, bodyClassName }) {
  const filePath = path.join(process.cwd(), 'templates', filename);
  const document = readFileSync(filePath, 'utf8');
  const bodyMatch = document.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);

  if (!bodyMatch) {
    throw new Error(`Could not find a body element in ${filename}`);
  }

  return (
    <main
      className={bodyClassName}
      dangerouslySetInnerHTML={{ __html: bodyMatch[1] }}
    />
  );
}
