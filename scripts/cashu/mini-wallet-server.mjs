import http from 'node:http';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CashuMint, CashuWallet, getEncodedTokenV4 } from '@cashu/cashu-ts';

const DEFAULT_HOST = process.env.CASHU_WEB_HOST || '127.0.0.1';
const DEFAULT_PORT = Number.parseInt(process.env.CASHU_WEB_PORT || '8787', 10);
const DEFAULT_MINT_URL = process.env.CASHU_WEB_MINT_URL || 'http://127.0.0.1:3338';
const MAX_BODY_BYTES = 1024 * 1024;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webRoot = path.join(__dirname, 'mini-wallet');
const statePath = path.join(__dirname, '.mini-wallet-state.json');

function sanitizeMintUrl(input) {
  if (typeof input !== 'string') {
    throw new Error('Mint URL must be a string');
  }

  const value = input.trim();
  if (!value) {
    throw new Error('Mint URL is required');
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('Mint URL must be a valid URL');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Mint URL must use http or https');
  }

  return parsed.toString().replace(/\/$/, '');
}

function proofBalance(proofs) {
  return proofs.reduce((sum, proof) => sum + (proof?.amount || 0), 0);
}

function defaultState() {
  return {
    mintUrl: DEFAULT_MINT_URL,
    proofs: [],
  };
}

async function loadState() {
  try {
    const raw = await fs.readFile(statePath, 'utf8');
    const parsed = JSON.parse(raw);
    const mintUrl = sanitizeMintUrl(parsed?.mintUrl || DEFAULT_MINT_URL);
    const proofs = Array.isArray(parsed?.proofs) ? parsed.proofs : [];
    return { mintUrl, proofs };
  } catch {
    return defaultState();
  }
}

async function saveState(state) {
  await fs.writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

function walletSummary(state) {
  return {
    mintUrl: state.mintUrl,
    proofCount: state.proofs.length,
    balance: proofBalance(state.proofs),
  };
}

async function createWallet(mintUrl) {
  const mint = new CashuMint(mintUrl);
  const wallet = new CashuWallet(mint);
  await wallet.loadMint();
  return wallet;
}

async function getConnectionStatus(mintUrl) {
  const startedAt = Date.now();
  try {
    const mintInfo = await Promise.race([
      CashuMint.getInfo(mintUrl),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timed out')), 4000)),
    ]);

    return {
      mintUrl,
      connected: true,
      latencyMs: Date.now() - startedAt,
      checkedAt: new Date().toISOString(),
      mintName: mintInfo?.name || 'Unknown mint',
      version: mintInfo?.version || 'unknown',
    };
  } catch (error) {
    return {
      mintUrl,
      connected: false,
      latencyMs: Date.now() - startedAt,
      checkedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown connection error',
    };
  }
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(body);
}

async function parseBody(req) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > MAX_BODY_BYTES) {
      throw new Error('Request body too large');
    }
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw.trim()) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('Invalid JSON payload');
  }
}

async function serveStatic(req, res) {
  const reqPath = req.url === '/' ? '/index.html' : req.url;
  const requested = path.normalize(reqPath || '/index.html').replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(webRoot, requested);
  if (!filePath.startsWith(webRoot)) {
    sendJson(res, 403, { error: 'Forbidden' });
    return;
  }

  let contentType = 'text/plain; charset=utf-8';
  if (filePath.endsWith('.html')) contentType = 'text/html; charset=utf-8';
  if (filePath.endsWith('.js')) contentType = 'text/javascript; charset=utf-8';
  if (filePath.endsWith('.css')) contentType = 'text/css; charset=utf-8';

  try {
    const data = await fs.readFile(filePath);
    res.writeHead(200, { 'content-type': contentType, 'cache-control': 'no-store' });
    res.end(data);
  } catch {
    sendJson(res, 404, { error: 'Not found' });
  }
}

async function handleApi(req, res) {
  const state = await loadState();
  const method = req.method || 'GET';
  const pathname = new URL(req.url || '/', 'http://localhost').pathname;

  if (method === 'GET' && pathname === '/api/state') {
    sendJson(res, 200, walletSummary(state));
    return;
  }

  if (method === 'GET' && pathname === '/api/connection-status') {
    const connection = await getConnectionStatus(state.mintUrl);
    sendJson(res, 200, connection);
    return;
  }

  if (method === 'POST' && pathname === '/api/mint-url') {
    const body = await parseBody(req);
    const mintUrl = sanitizeMintUrl(body.mintUrl);
    const wallet = await createWallet(mintUrl);
    const mintInfo = await wallet.getMintInfo();
    const nextState = { ...state, mintUrl };
    await saveState(nextState);
    sendJson(res, 200, {
      ...walletSummary(nextState),
      mintInfo: {
        name: mintInfo.name || 'Unknown mint',
        version: mintInfo.version || 'unknown',
        description: mintInfo.description || '',
      },
    });
    return;
  }

  if (method === 'GET' && pathname === '/api/mint-info') {
    const wallet = await createWallet(state.mintUrl);
    const mintInfo = await wallet.getMintInfo();
    sendJson(res, 200, {
      mintUrl: state.mintUrl,
      mintInfo: {
        name: mintInfo.name || 'Unknown mint',
        version: mintInfo.version || 'unknown',
        description: mintInfo.description || '',
      },
    });
    return;
  }

  if (method === 'POST' && pathname === '/api/create-quote') {
    const body = await parseBody(req);
    const amount = Number.parseInt(String(body.amount || ''), 10);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Amount must be a positive integer');
    }

    const wallet = await createWallet(state.mintUrl);
    const quote = await wallet.createMintQuote(amount);
    sendJson(res, 200, { quote, amount });
    return;
  }

  if (method === 'POST' && pathname === '/api/check-quote') {
    const body = await parseBody(req);
    const quoteId = String(body.quote || '').trim();
    if (!quoteId) {
      throw new Error('Quote is required');
    }

    const wallet = await createWallet(state.mintUrl);
    const quote = await wallet.checkMintQuote(quoteId);
    sendJson(res, 200, { quote });
    return;
  }

  if (method === 'POST' && pathname === '/api/mint-proofs') {
    const body = await parseBody(req);
    const amount = Number.parseInt(String(body.amount || ''), 10);
    const quoteId = String(body.quote || '').trim();
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Amount must be a positive integer');
    }
    if (!quoteId) {
      throw new Error('Quote is required');
    }

    const wallet = await createWallet(state.mintUrl);
    const mintedProofs = await wallet.mintProofs(amount, quoteId);
    const nextState = { ...state, proofs: [...state.proofs, ...mintedProofs] };
    await saveState(nextState);
    sendJson(res, 200, {
      ...walletSummary(nextState),
      mintedProofCount: mintedProofs.length,
    });
    return;
  }

  if (method === 'POST' && pathname === '/api/send') {
    const body = await parseBody(req);
    const amount = Number.parseInt(String(body.amount || ''), 10);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Amount must be a positive integer');
    }
    if (!Array.isArray(state.proofs) || state.proofs.length === 0) {
      throw new Error('Wallet has no proofs to send');
    }

    const wallet = await createWallet(state.mintUrl);
    const split = await wallet.send(amount, state.proofs);
    const token = getEncodedTokenV4({
      mint: state.mintUrl,
      proofs: split.send,
    });
    const nextState = { ...state, proofs: split.keep };
    await saveState(nextState);
    sendJson(res, 200, {
      ...walletSummary(nextState),
      token,
      sentProofCount: split.send.length,
    });
    return;
  }

  if (method === 'POST' && pathname === '/api/receive') {
    const body = await parseBody(req);
    const token = String(body.token || '').trim();
    if (!token) {
      throw new Error('Token is required');
    }

    const wallet = await createWallet(state.mintUrl);
    const receivedProofs = await wallet.receive(token);
    const nextState = { ...state, proofs: [...state.proofs, ...receivedProofs] };
    await saveState(nextState);
    sendJson(res, 200, {
      ...walletSummary(nextState),
      receivedProofCount: receivedProofs.length,
    });
    return;
  }

  if (method === 'POST' && pathname === '/api/reset') {
    const body = await parseBody(req);
    if (body.confirm !== true) {
      throw new Error('Set confirm=true to reset wallet proofs');
    }

    const nextState = { ...state, proofs: [] };
    await saveState(nextState);
    sendJson(res, 200, walletSummary(nextState));
    return;
  }

  sendJson(res, 404, { error: 'Unknown API route' });
}

const server = http.createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url || '/', 'http://localhost').pathname;
    if (pathname.startsWith('/api/')) {
      await handleApi(req, res);
      return;
    }
    await serveStatic(req, res);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    sendJson(res, 400, { error: message });
  }
});

server.listen(DEFAULT_PORT, DEFAULT_HOST, () => {
  console.log(`[Cashu Mini Wallet] http://${DEFAULT_HOST}:${DEFAULT_PORT}`);
  console.log(`[Cashu Mini Wallet] Using default mint URL ${DEFAULT_MINT_URL}`);
});
