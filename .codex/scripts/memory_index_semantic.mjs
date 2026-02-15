import path from 'node:path';
import {
  chunkDocs,
  embedBatch,
  getEmbeddingConfig,
  getMemoryDocs,
  loadEnvFiles,
  loadJsonIfExists,
  mapExistingByHash,
  parseArgs,
  saveJson,
} from './memory_semantic_utils.mjs';

const INDEX_REL = '.codex/memory/.semantic/index.json';

async function main() {
  const projectRoot = process.cwd();
  const { options } = parseArgs(process.argv.slice(2));

  await loadEnvFiles(projectRoot);
  const config = getEmbeddingConfig(options.model);
  const maxChars = Number(options['max-chars'] ?? 1200);
  const overlap = Number(options.overlap ?? 200);
  const batchSize = Number(options['batch-size'] ?? 64);
  const force = Boolean(options.force);

  const docs = await getMemoryDocs(projectRoot);
  if (docs.length === 0) {
    throw new Error('No memory docs found. Create .codex/MEMORY.md or .codex/memory/*.md first.');
  }

  const chunks = chunkDocs(docs, maxChars, overlap);
  if (chunks.length === 0) {
    throw new Error('No non-empty chunks found in memory docs.');
  }

  const indexPath = path.join(projectRoot, INDEX_REL);
  const existing = await loadJsonIfExists(indexPath);
  const byHash = mapExistingByHash(existing);

  let newCount = 0;
  const toEmbed = [];
  for (const chunk of chunks) {
    if (!force && byHash.has(chunk.hash)) {
      chunk.embedding = byHash.get(chunk.hash);
      continue;
    }
    toEmbed.push(chunk);
  }

  if (toEmbed.length > 0) {
    const vectors = await embedBatch(
      toEmbed.map((chunk) => chunk.text),
      config,
      batchSize,
    );
    for (let i = 0; i < toEmbed.length; i += 1) {
      toEmbed[i].embedding = vectors[i];
    }
    newCount = toEmbed.length;
  }

  const index = {
    version: 1,
    generatedAt: new Date().toISOString(),
    model: config.model,
    chunking: {
      maxChars,
      overlap,
    },
    stats: {
      docs: docs.length,
      chunks: chunks.length,
      embeddedFresh: newCount,
      reused: chunks.length - newCount,
    },
    chunks,
  };

  await saveJson(indexPath, index);

  console.log(`Index saved: ${INDEX_REL}`);
  console.log(`Model: ${config.model}`);
  console.log(`Docs: ${docs.length}`);
  console.log(`Chunks: ${chunks.length}`);
  console.log(`Embedded fresh: ${newCount}`);
  console.log(`Reused cache: ${chunks.length - newCount}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});