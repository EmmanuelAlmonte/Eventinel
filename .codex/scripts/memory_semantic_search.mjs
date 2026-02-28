import path from 'node:path';
import {
  cosineSimilarity,
  embedBatch,
  getEmbeddingConfig,
  loadEnvFiles,
  loadJsonIfExists,
  parseArgs,
  shortSnippet,
} from './memory_semantic_utils.mjs';

const INDEX_REL = '.codex/memory/.semantic/index.json';

async function main() {
  const projectRoot = process.cwd();
  const { options, positional } = parseArgs(process.argv.slice(2));
  const query = positional.join(' ').trim();
  if (!query) {
    throw new Error('Usage: node .codex/scripts/memory_semantic_search.mjs "query" [--top-k 5] [--json]');
  }

  await loadEnvFiles(projectRoot);

  const indexPath = path.join(projectRoot, INDEX_REL);
  const index = await loadJsonIfExists(indexPath);
  if (!index || !Array.isArray(index.chunks) || index.chunks.length === 0) {
    throw new Error('Semantic index not found or empty. Run memory_index_semantic.mjs first.');
  }

  const config = getEmbeddingConfig(index.model);
  const queryEmbedding = (await embedBatch([query], config, 1))[0];
  const topK = Math.max(1, Number(options['top-k'] ?? 5));
  const useJson = Boolean(options.json);

  const terms = tokenize(query);

  const scored = index.chunks
    .filter((chunk) => Array.isArray(chunk.embedding) && chunk.embedding.length > 0)
    .map((chunk) => {
      const cosine = cosineSimilarity(queryEmbedding, chunk.embedding);
      const keyword = keywordScore(chunk.text, terms);
      const score = cosine * 0.9 + keyword * 0.1;
      return {
        score,
        cosine,
        keyword,
        path: chunk.path,
        title: chunk.title,
        startLine: chunk.startLine,
        endLine: chunk.endLine,
        text: chunk.text,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  if (useJson) {
    console.log(JSON.stringify({ query, model: index.model, results: scored }, null, 2));
    return;
  }

  console.log(`Query: ${query}`);
  console.log(`Model: ${index.model}`);
  console.log(`Top ${scored.length}:`);
  console.log('');

  scored.forEach((item, i) => {
    console.log(
      `[${i + 1}] score=${item.score.toFixed(4)} cosine=${item.cosine.toFixed(4)} keyword=${item.keyword.toFixed(4)}`,
    );
    console.log(`file: ${item.path}:${item.startLine}`);
    if (item.title && item.title !== '(root)') {
      console.log(`title: ${item.title}`);
    }
    console.log(`text: ${shortSnippet(item.text)}`);
    console.log('');
  });
}

function tokenize(query) {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.replace(/[^a-z0-9_-]/g, ''))
    .filter((term) => term.length >= 3);
}

function keywordScore(text, terms) {
  if (terms.length === 0) {
    return 0;
  }
  const haystack = text.toLowerCase();
  let matches = 0;
  for (const term of terms) {
    if (haystack.includes(term)) {
      matches += 1;
    }
  }
  return matches / terms.length;
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});