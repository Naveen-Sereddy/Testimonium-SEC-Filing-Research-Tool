import { readFile } from 'node:fs/promises';
import path from 'node:path';

interface GoldenCase {
  id: string;
  category: string;
  query: string;
  expectedSections: string[];
  expectedRefusal?: boolean;
  requiresComparison?: boolean;
}

const filePath = path.resolve(__dirname, '../../eval/golden-set.json');
async function main() {
const cases = JSON.parse(await readFile(filePath, 'utf8')) as GoldenCase[];
const ids = new Set<string>();
const errors: string[] = [];

if (cases.length !== 50) errors.push(`Expected exactly 50 benchmark cases, found ${cases.length}`);
for (const item of cases) {
  if (!item.id || ids.has(item.id)) errors.push(`Duplicate or missing case id: ${item.id || '(missing)'}`);
  ids.add(item.id);
  if (!item.query?.trim()) errors.push(`${item.id}: query is empty`);
  if (!Array.isArray(item.expectedSections)) errors.push(`${item.id}: expectedSections must be an array`);
  if (item.category === 'refusal' && item.expectedRefusal !== true) errors.push(`${item.id}: refusal cases must set expectedRefusal=true`);
  if (item.category === 'comparison-in-scope' && item.requiresComparison !== true) errors.push(`${item.id}: comparison cases must set requiresComparison=true`);
  if (item.category === 'comparison-in-scope' && item.expectedSections.some((section) => !['Risk Factors', 'MD&A'].includes(section))) {
    errors.push(`${item.id}: comparison cases are limited to Risk Factors and MD&A`);
  }
}

const categories = new Map<string, number>();
for (const item of cases) categories.set(item.category, (categories.get(item.category) ?? 0) + 1);
const minimums: Array<[string, number]> = [['prose-in-scope', 20], ['table-in-scope', 10], ['comparison-in-scope', 10], ['refusal', 5]];
for (const [category, minimum] of minimums) {
  if ((categories.get(category) ?? 0) < minimum) errors.push(`Expected at least ${minimum} ${category} cases`);
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Golden-set contract valid: ${cases.length} cases (${Array.from(categories.entries()).map(([key, value]) => `${value} ${key}`).join(', ')})`);
}
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
