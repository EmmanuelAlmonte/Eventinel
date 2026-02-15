import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const FALLBACK_MODEL = 'text-embedding-3-small';

export function parseArgs(argv) {
  const options = {};
  const positional = [];

  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (!item.startsWith('--')) {
      positional.push(item);
      continue;
    }

    const key = item.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      options[key] = true;
      continue;
    }

    options[key] = next;
    i += 1;
  }

  return { options, positional };
}

export async function loadEnvFiles(projectRoot) {
  const candidates = [
    path.join(projectRoot, '.codex', '.env'),
    path.join(projectRoot, '.env.local'),
    path.join(projectRoot, '.env'),
  ];

  for (const filePath of candidates) {
    let raw = '';
    try {
      raw = await fs.readFile(filePath, 'utf8');
    } catch {
      continue;
    }
    applySimpleEnv(raw);
  }
}

function applySimpleEnv(raw) {
  const lines = raw.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const eq = trimmed.indexOf('=');
    if (eq <= 0) {
      continue;
    }

    const key = trimmed.slice(0, eq).trim();
    if (!key || Object.prototype.hasOwnProperty.call(process.env, key)) {
      continue;
    }

    const value = stripQuotes(trimmed.slice(eq + 1).trim());
    process.env[key] = value;
  }
}

function stripQuotes(value) {
  if (value.length < 2) {
    return value;
  }
  const first = value[0];
  const last = value[value.length - 1];
  if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
    return value.slice(1, -1);
  }
  return value;
}

export function getEmbeddingConfig() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'Missing OPENAI_API_KEY. Set it in your shell or in .env.local/.env/.codex/.env.',
    );
  }

  const model = process.env.OPENAI_EMBEDDING_MODEL || FALLBACK_MODEL;
  const baseUrl = normalizeBaseUrl(process.env.OPENAI_BASE_URL || DEFAULT_BASE_URL);

  return { apiKey, model, baseUrl };
}

function normalizeBaseUrl(baseUrl) {
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
}

export async function collectMemoryDocuments(projectRoot) {
  const codexRoot = path.join(projectRoot, '.codex');
  const mainMemory = path.join(codexRoot, 'MEMORY.md');
  const dailyDir = path.join(codexRoot, 'memory');
  const docs = [];

  const main = await readIfExists(mainMemory);
  if (main) {
    docs.push({
      absPath: mainMemory,
      relPath: toRepoRelative(projectRoot, mainMemory),
      text: main,
    });
  }

  try {
    const entries = await fs.readdir(dailyDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.md')) {
        continue;
      }
      const absPath = path.join(dailyDir, entry.name);
      const text = await fs.readFile(absPath, 'utf8');
      docs.push({
        absPath,
        relPath: toRepoRelative(projectRoot, absPath),
        text,
      });
    }
  } catch {
    // No daily directory yet.
  }

  docs.sort((a, b) => a.relPath.localeCompare(b.relPath));
  return docs;
}

async function readIfExists(filePath) {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch {
    return '';
  }
}

function toRepoRelative(projectRoot, absPath) {
  return path.relative(projectRoot, absPath).split(path.sep).join('/');
}

export function chunkDocuments(documents, { maxChars = 1200, overlap = 200 } = {}) {
  const chunks = [];
  const normalizedMax = Math.max(300, Number(maxChars) || 1200);
  const normalizedOverlap = Math.max(0, Math.min(normalizedMax / 2, Number(overlap) || 200));

  for (const doc of documents) {
    const sections = splitIntoSections(doc.text);
    let seq = 0;

    for (const section of sections) {
      const sectionChunks = splitSectionText(section.text, normalizedMax, normalizedOverlap);
      for (const part of sectionChunks) {
        const clean = part.trim();
        if (!clean) {
          continue;
        }

        const chunk = {
          id: `${doc.relPath}:${seq}`,
          path: doc.relPath,
          title: section.title,
          startLine: section.startLine,
          endLine: section.endLine,
          text: clean,
        };
        chunk.hash = hashChunk(chunk);
        chunks.push(chunk);
        seq += 1;
      }
    }
  }

  return chunks;
}

function splitIntoSections(markdown) {
  const lines = markdown.split(/\r?\n/);
  const sections = [];
  let current = {
    title: '(root)',
    startLine: 1,
    lines: [],
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^#{1,6}\s+/.test(line)) {
      if (current.lines.length > 0) {
        sections.push(toSection(current, i));
      }
      current = {
        title: line.replace(/^#{1,6}\s+/, '').trim() || '(untitled)',
        startLine: i + 1,
        lines: [line],
      };
      continue;
    }

    current.lines.push(line);
  }

  if (current.lines.length > 0) {
    sections.push(toSection(current, lines.length));
  }

  return sections.filter((section) => section.text.trim().length > 0);
}

function toSection(current, endLine) {
  return {
    title: current.title,
    startLine: current.startLine,
    endLine,
    text: current.lines.join('\n'),
  };
}

function splitSectionText(text, maxChars, overlap) {
  if (text.length <= maxChars) {
    return [text];
  }

  const paragraphs = text.split(/\n\s*\n/);
  const chunks = [];
  let current = '';

  for (const paragraph of paragraphs) {
    const piece = paragraph.trim();
    if (!piece) {
      continue;
    }

    if (!current) {
      current = piece;
      continue;
    }

    const candidate = `${current}\n\n${piece}`;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }

    chunks.push(current);
    current = overlapTail(current, overlap);
    if (current) {
      current = `${current}\n\n${piece}`;
    } else {
      current = piece;
    }

    if (current.length > maxChars) {
      const forced = splitByWindow(current, maxChars, overlap);
      chunks.push(...forced.slice(0, -1));
      current = forced[forced.length - 1];
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

function splitByWindow(text, maxChars, overlap) {
  const out = [];
  const step = Math.max(100, maxChars - overlap);
  let start = 0;

  while (start < text.length) {
    out.push(text.slice(start, start + maxChars));
    start += step;
  }

  return out;
}

function overlapTail(text, overlap) {
  if (!overlap) {
    return '';
  }
  return text.slice(Math.max(0, text.length - overlap));
}

function hashChunk(chunk) {
  const payload = `${chunk.path}\n${chunk.title}\n${chunk.text}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

export async function loadIndex(indexPath) {
  try {
    const raw = await fs.readFile(indexPath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function saveIndex(indexPath, indexObject) {
  await fs.mkdir(path.dirname(indexPath), { recursive: true });
  await fs.writeFile(indexPath, `${JSON.stringify(indexObject, null, 2)}\n`, 'utf8');
}

export function mapEmbeddingsByHash(existingIndex) {
  const byHash = new Map();
  if (!existingIndex || !Array.isArray(existingIndex.chunks)) {
    return byHash;
  }

  for (const chunk of existingIndex.chunks) {
    if (chunk?.hash && Array.isArray(chunk?.embedding) && chunk.embedding.length > 0) {
      byHash.set(chunk.hash, chunk.embedding);
    }
  }
  return byHash;
}

export async function embedTexts(texts, { apiKey, model, baseUrl, batchSize = 64 }) {
  const size = Math.max(1, Number(batchSize) || 64);
  const vectors = [];

  for (let i = 0; i < texts.length; i += size) {
    const batch = texts.slice(i, i + size);
    const response = await fetch(`${baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: batch,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Embeddings request failed (${response.status}): ${body}`);
    }

    const data = await response.json();
    const rows = Array.isArray(data?.data) ? data.data : [];
    if (rows.length !== batch.length) {
      throw new Error(`Unexpected embeddings response length (${rows.length} for ${batch.length} inputs).`);
    }

    for (const row of rows) {
      vectors.push(row.embedding);
    }

    // Keep progress visible for longer index runs.
    // eslint-disable-next-line no-console
    console.log(`Embedded ${Math.min(i + size, texts.length)}/${texts.length}`);
  }

  return vectors;
}

export function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length || a.length === 0) {
    return 0;
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i += 1) {
    const av = Number(a[i]) || 0;
    const bv = Number(b[i]) || 0;
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function snippet(text, maxChars = 260) {
  const single = text.replace(/\s+/g, ' ').trim();
  if (single.length <= maxChars) {
    return single;
  }
  return `${single.slice(0, Math.max(40, maxChars - 3))}...`;
}

