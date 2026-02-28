import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_MODEL = 'text-embedding-3-small';

export function parseArgs(argv) {
  const options = {};
  const positional = [];
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      positional.push(token);
      continue;
    }
    const key = token.slice(2);
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
  for (const envPath of candidates) {
    let raw = '';
    try {
      raw = await fs.readFile(envPath, 'utf8');
    } catch {
      continue;
    }
    applyEnv(raw);
  }
}

function applyEnv(raw) {
  for (const line of raw.split(/\r?\n/)) {
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
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

export function getEmbeddingConfig(modelOverride) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is missing. Set it in shell, .env.local, .env, or .codex/.env.');
  }
  const model = modelOverride || process.env.OPENAI_EMBEDDING_MODEL || DEFAULT_MODEL;
  const baseUrl = (process.env.OPENAI_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, '');
  return { apiKey, model, baseUrl };
}

export async function getMemoryDocs(projectRoot) {
  const docs = [];
  const codexRoot = path.join(projectRoot, '.codex');
  const stablePath = path.join(codexRoot, 'MEMORY.md');
  const stable = await readIfExists(stablePath);
  if (stable) {
    docs.push({ relPath: rel(projectRoot, stablePath), text: stable });
  }

  const dailyRoot = path.join(codexRoot, 'memory');
  try {
    const entries = await fs.readdir(dailyRoot, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.md')) {
        continue;
      }
      const abs = path.join(dailyRoot, entry.name);
      const text = await fs.readFile(abs, 'utf8');
      docs.push({ relPath: rel(projectRoot, abs), text });
    }
  } catch {
    // no daily folder yet
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

function rel(projectRoot, absPath) {
  return path.relative(projectRoot, absPath).split(path.sep).join('/');
}

export function chunkDocs(docs, maxChars = 1200, overlap = 200) {
  const chunks = [];
  const max = Math.max(300, Number(maxChars) || 1200);
  const ov = Math.max(0, Math.min(Math.floor(max / 2), Number(overlap) || 200));

  for (const doc of docs) {
    const sections = splitByHeadings(doc.text);
    let seq = 0;
    for (const section of sections) {
      const parts = splitSection(section.text, max, ov);
      for (const part of parts) {
        const text = part.trim();
        if (!text) continue;
        const chunk = {
          id: `${doc.relPath}:${seq}`,
          path: doc.relPath,
          title: section.title,
          startLine: section.startLine,
          endLine: section.endLine,
          text,
        };
        chunk.hash = crypto.createHash('sha256').update(`${chunk.path}\n${chunk.title}\n${chunk.text}`).digest('hex');
        chunks.push(chunk);
        seq += 1;
      }
    }
  }
  return chunks;
}

function splitByHeadings(markdown) {
  const lines = markdown.split(/\r?\n/);
  const sections = [];
  let current = { title: '(root)', startLine: 1, lines: [] };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^#{1,6}\s+/.test(line)) {
      if (current.lines.length > 0) {
        sections.push({
          title: current.title,
          startLine: current.startLine,
          endLine: i,
          text: current.lines.join('\n'),
        });
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
    sections.push({
      title: current.title,
      startLine: current.startLine,
      endLine: lines.length,
      text: current.lines.join('\n'),
    });
  }

  return sections.filter((s) => s.text.trim().length > 0);
}

function splitSection(text, maxChars, overlap) {
  if (text.length <= maxChars) {
    return [text];
  }

  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const out = [];
  let current = '';

  for (const para of paragraphs) {
    const candidate = current ? `${current}\n\n${para}` : para;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }

    if (current) {
      out.push(current);
      const tail = overlap > 0 ? current.slice(Math.max(0, current.length - overlap)) : '';
      current = tail ? `${tail}\n\n${para}` : para;
    } else {
      current = para;
    }

    if (current.length > maxChars) {
      const step = Math.max(100, maxChars - overlap);
      let start = 0;
      while (start + maxChars < current.length) {
        out.push(current.slice(start, start + maxChars));
        start += step;
      }
      current = current.slice(start);
    }
  }

  if (current) {
    out.push(current);
  }

  return out;
}

export async function loadJsonIfExists(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function saveJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
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

export async function embedBatch(inputs, config, batchSize = 64) {
  const vectors = [];
  const size = Math.max(1, Number(batchSize) || 64);

  for (let i = 0; i < inputs.length; i += size) {
    const batch = inputs.slice(i, i + size);
    const response = await fetch(`${config.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        input: batch,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Embeddings API error ${response.status}: ${body}`);
    }

    const payload = await response.json();
    const rows = payload?.data;
    if (!Array.isArray(rows) || rows.length !== batch.length) {
      throw new Error(`Unexpected embeddings response length (${rows?.length ?? 0}/${batch.length}).`);
    }

    for (const row of rows) {
      vectors.push(row.embedding);
    }

    console.log(`Embedded ${Math.min(i + size, inputs.length)}/${inputs.length}`);
  }

  return vectors;
}

export function shortSnippet(text, maxChars = 260) {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat.length <= maxChars) {
    return flat;
  }
  return `${flat.slice(0, Math.max(40, maxChars - 3))}...`;
}
export function mapExistingByHash(existingIndex) {
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
