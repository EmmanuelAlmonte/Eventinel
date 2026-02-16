#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

function usage() {
  const message = [
    'Usage:',
    '  node scripts/compact-file.js <file> [options]',
    '',
    'Options:',
    '  --strip-comments      Remove // and /* */ comments',
    '  --no-trim             Do not trim trailing whitespace',
    '  --no-collapse-blank    Keep repeated blank lines (default: collapse)',
    '  --drop-blank           Remove all blank lines',
    '  --from <n>             Source start line (1-based, inclusive)',
    '  --to <n>               Source end line (1-based, inclusive)',
    '  --print-map            Print compact->source line map',
    '  --print-compact        Print compact file content',
    '  --tokenizer <name>     Token counter (`gpt-5` for tiktoken o200k_base)',
    '  --json                 Print JSON with mapping and metrics',
    '  --out <path>           Write compact text to a file',
    '  --out-map <path>       Write compact line map JSON to a file',
    '  --help                 Show this help',
  ].join('\n');
  console.error(message);
  process.exit(1);
}

function parseArgs(argv) {
  const args = {
    stripComments: false,
    trimTrailing: true,
    collapseBlank: true,
    dropBlank: false,
    from: null,
    to: null,
    printMap: false,
    printCompact: false,
    tokenizer: 'approximate',
    json: false,
    out: null,
    outMap: null,
    file: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      if (!args.file) {
        args.file = arg;
        continue;
      }
      console.error(`Unexpected argument: ${arg}`);
      usage();
    }

    if (arg === '--help') {
      usage();
    }
    if (arg === '--strip-comments') {
      args.stripComments = true;
      continue;
    }
    if (arg === '--from') {
      args.from = parseLineNumberArg(argv[i + 1], '--from');
      i += 1;
      continue;
    }
    if (arg === '--to') {
      args.to = parseLineNumberArg(argv[i + 1], '--to');
      i += 1;
      continue;
    }
    if (arg === '--print-map') {
      args.printMap = true;
      continue;
    }
    if (arg === '--print-compact') {
      args.printCompact = true;
      continue;
    }
    if (arg === '--tokenizer') {
      args.tokenizer = argv[i + 1] || 'approximate';
      if (!args.tokenizer) usage();
      i += 1;
      continue;
    }
    if (arg === '--json') {
      args.json = true;
      continue;
    }
    if (arg === '--no-trim') {
      args.trimTrailing = false;
      continue;
    }
    if (arg === '--no-collapse-blank') {
      args.collapseBlank = false;
      continue;
    }
    if (arg === '--drop-blank') {
      args.dropBlank = true;
      continue;
    }
    if (arg === '--out') {
      args.out = argv[i + 1];
      if (!args.out) usage();
      i += 1;
      continue;
    }
    if (arg === '--out-map') {
      args.outMap = argv[i + 1];
      if (!args.outMap) usage();
      i += 1;
      continue;
    }

    console.error(`Unknown option: ${arg}`);
    usage();
  }

  if (!args.file) usage();
  return args;
}

function parseLineNumberArg(value, flag) {
  if (!value || value.startsWith('--')) {
    console.error(`Missing value for ${flag}`);
    usage();
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    console.error(`Expected positive integer for ${flag}, got "${value}"`);
    usage();
  }
  return parsed;
}

function removeCommentsSource(source) {
  const out = [];
  let i = 0;
  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;
  let inLineComment = false;
  let inBlockComment = false;

  while (i < source.length) {
    const char = source[i];
    const next = source[i + 1];

    if (inLineComment) {
      if (char === '\n') {
        inLineComment = false;
        out.push('\n');
      }
      i += 1;
      continue;
    }

    if (inBlockComment) {
      if (char === '*' && next === '/') {
        inBlockComment = false;
        i += 2;
        continue;
      }
      i += 1;
      continue;
    }

    if (inSingle) {
      if (char === '\\' && next !== undefined) {
        out.push(char, next);
        i += 2;
        continue;
      }
      if (char === "'") {
        inSingle = false;
      }
      out.push(char);
      i += 1;
      continue;
    }

    if (inDouble) {
      if (char === '\\' && next !== undefined) {
        out.push(char, next);
        i += 2;
        continue;
      }
      if (char === '"') {
        inDouble = false;
      }
      out.push(char);
      i += 1;
      continue;
    }

    if (inTemplate) {
      if (char === '\\' && next !== undefined) {
        out.push(char, next);
        i += 2;
        continue;
      }
      if (char === '`') {
        inTemplate = false;
      }
      out.push(char);
      i += 1;
      continue;
    }

    if (char === '/' && next === '/' && isPotentialCommentBoundary(source, i - 1)) {
      inLineComment = true;
      i += 2;
      continue;
    }
    if (char === '/' && next === '*' && isPotentialCommentBoundary(source, i - 1)) {
      inBlockComment = true;
      i += 2;
      continue;
    }
    if (char === "'") {
      inSingle = true;
      out.push(char);
      i += 1;
      continue;
    }
    if (char === '"') {
      inDouble = true;
      out.push(char);
      i += 1;
      continue;
    }
    if (char === '`') {
      inTemplate = true;
      out.push(char);
      i += 1;
      continue;
    }

    out.push(char);
    i += 1;
  }

  return out.join('');
}

function isPotentialCommentBoundary(source, index) {
  if (index < 0) return true;
  const previous = source[index];
  return previous !== '\\';
}

function compactLines(input, options) {
  const rawLines = input.split(/\r\n|\n|\r/);
  const lines = [];
  const mapping = [];
  let previousWasBlank = false;

  for (let i = 0; i < rawLines.length; i += 1) {
    let line = options.trimTrailing ? rawLines[i].replace(/[ \t]+$/u, '') : rawLines[i];
    const isBlank = line.trim().length === 0;
    if (!options.dropBlank && isBlank && options.collapseBlank && previousWasBlank) {
      continue;
    }
    if (options.dropBlank && isBlank) {
      continue;
    }
    lines.push(line);
    mapping.push({ compactLine: lines.length, sourceLine: i + 1 });
    previousWasBlank = isBlank;
  }

  return { lines, mapping };
}

function approximateTokenCount(text) {
  const tokens = text.match(/\S+/gu);
  return tokens ? tokens.length : 0;
}

function loadTokenCounter(modelName) {
  const requested = modelName || 'approximate';
  if (requested !== 'gpt-5') {
    return {
      label: `approximate (${requested})`,
      count: approximateTokenCount,
      fallback: false,
      warning: null,
      mode: `approximate:${requested}`,
    };
  }

  try {
    const tiktoken = require('tiktoken');
    const model = 'o200k_base';
    const makeEncoder = tiktoken.get_encoding
      ? () => tiktoken.get_encoding(model)
      : tiktoken.getEncoding
      ? () => tiktoken.getEncoding(model)
      : tiktoken.encoding_for_model
      ? () => tiktoken.encoding_for_model('gpt-5')
      : null;

    if (!makeEncoder) {
      throw new Error('tiktoken module does not expose a supported encoder API');
    }

    const encoder = makeEncoder(model);

    return {
      label: `tiktoken:${model}`,
      mode: 'gpt-5',
      warning: null,
      fallback: false,
      count: (text) => {
        const localEncoder = makeEncoder(model);
        const encoded = localEncoder.encode(text);
        const count = encoded.length;
        if (typeof localEncoder.free === 'function') localEncoder.free();
        return count;
      },
    };
  } catch (error) {
    return {
      label: 'approximate',
      mode: 'gpt-5 (fallback)',
      warning: `Tokenizer unavailable: ${error.message}`,
      fallback: true,
      count: approximateTokenCount,
    };
  }
}

function resolveRange(totalLines, from, to) {
  const start = from ?? 1;
  const end = to ?? totalLines;

  if (start > end) {
    console.error(`Invalid range: --from (${start}) is greater than --to (${end})`);
    process.exit(1);
  }
  if (start < 1 || end > totalLines) {
    console.error(`Invalid range: expected 1-${totalLines}, got ${start}-${end}`);
    process.exit(1);
  }
  return { from: start, to: end };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const absoluteInput = path.resolve(process.cwd(), options.file);
  const original = fs.readFileSync(absoluteInput, 'utf8');
  const originalLines = original.split(/\r\n|\n|\r/);
  const range = resolveRange(originalLines.length, options.from, options.to);
  const selectedSource = originalLines.slice(range.from - 1, range.to).join('\n');

  const stripped = options.stripComments ? removeCommentsSource(selectedSource) : selectedSource;
  const compacted = compactLines(stripped, {
    trimTrailing: options.trimTrailing,
    collapseBlank: options.collapseBlank,
    dropBlank: options.dropBlank,
  });
  const lines = compacted.lines;
  const rangeOffset = range.from - 1;
  const mapping = compacted.mapping.map((entry) => ({
    compactLine: entry.compactLine,
    sourceLine: entry.sourceLine + rangeOffset,
  }));
  const compact = lines.join('\n');
  const tokenCounter = loadTokenCounter(options.tokenizer);

  const tokenStats = {
    mode: tokenCounter.mode,
    fallback: tokenCounter.fallback,
    warning: tokenCounter.warning,
  };
  const originalTokenCount = tokenCounter.count(originalLines.slice(range.from - 1, range.to).join('\n'));
  const compactTokenCount = tokenCounter.count(compact);
  const tokenSavings = originalTokenCount - compactTokenCount;
  const tokenSavingsPct = originalTokenCount
    ? Number(((tokenSavings / originalTokenCount) * 100).toFixed(1))
    : 0;

  if (options.out) {
    const outPath = path.resolve(process.cwd(), options.out);
    fs.writeFileSync(outPath, `${compact}\n`, 'utf8');
  }

  if (options.outMap) {
    const mapPayload = {
      source: absoluteInput,
      map: mapping,
      createdAt: new Date().toISOString(),
      options,
    };
    fs.writeFileSync(
      path.resolve(process.cwd(), options.outMap),
      `${JSON.stringify(mapPayload, null, 2)}\n`,
      'utf8'
    );
  }

  const stats = {
    sourcePath: absoluteInput,
    sourceLines: originalLines.length,
    rangeFrom: range.from,
    rangeTo: range.to,
    selectedLines: range.to - range.from + 1,
    compactLines: lines.length,
    tokenCounter: tokenCounter.label,
    originalTokens: originalTokenCount,
    compactTokens: compactTokenCount,
    tokenFallback: tokenStats.fallback,
    tokenFallbackWarning: tokenStats.warning,
  };
  stats.tokenSavings = tokenSavings;
  stats.tokenSavingsPct = tokenSavingsPct;

  if (options.json) {
    const payload = {
      ...stats,
      options: {
        stripComments: options.stripComments,
        trimTrailing: options.trimTrailing,
        collapseBlank: options.collapseBlank,
        dropBlank: options.dropBlank,
        tokenizer: options.tokenizer,
        rangeFrom: range.from,
        rangeTo: range.to,
      },
      mapping,
      compact,
    };
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  console.log(`# source: ${stats.sourcePath}`);
  console.log(
    `# range: ${stats.rangeFrom}-${stats.rangeTo} (${stats.selectedLines}/${stats.sourceLines} lines)` +
      ` | lines: ${stats.selectedLines} -> ${stats.compactLines} ` +
      `| tokens[${stats.tokenCounter}]: ${stats.originalTokens} -> ${stats.compactTokens} ` +
      `(${stats.tokenSavings} saved, ${stats.tokenSavingsPct}%${stats.tokenFallback ? ', fallback' : ''})`
  );

  if (options.printMap) {
    console.log('---MAP---');
    console.log(mapping.map((item) => `${item.compactLine}:${item.sourceLine}`).join('\n'));
  }

  if (options.printCompact) {
    console.log('---COMPACT---');
    console.log(compact);
  }

  if (stats.tokenFallbackWarning) {
    console.log(`# ${stats.tokenFallbackWarning}`);
  }
}

main();
