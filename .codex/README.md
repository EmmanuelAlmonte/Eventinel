# Memory Docs

This repo uses a two-layer memory model:

- Durable memory: `.codex/MEMORY.md`
- Daily log: `.codex/memory/YYYY-MM-DD.md`

## Quick Usage (PowerShell)

From repo root, append a daily note:

```powershell
$today = Get-Date -Format 'yyyy-MM-dd'
$time = Get-Date -Format 'HH:mm'
Add-Content ".codex/memory/$today.md" "`n## $time`n- <note>"
```

Search memory:

```powershell
if (Get-Command rg -ErrorAction SilentlyContinue) {
  rg -n --hidden --glob '.codex/MEMORY.md' --glob '.codex/memory/*.md' -S '<query>' .
}
```

## Semantic Search (OpenAI Embeddings)

Set your key in the current PowerShell session:

```powershell
$env:OPENAI_API_KEY = "<your_api_key>"
```

Optional model override (default is `text-embedding-3-small`):

```powershell
$env:OPENAI_EMBEDDING_MODEL = "text-embedding-3-small"
```

Build/update semantic index:

```powershell
.\.codex\scripts\memory_index_semantic.ps1
```

Query semantically:

```powershell
.\.codex\scripts\memory_semantic_search.ps1 "How did we decide auth state handling?"
```

Output JSON results:

```powershell
.\.codex\scripts\memory_semantic_search.ps1 "auth state handling" -TopK 8 -Json
```

Notes:

- Index file is `.codex/memory/.semantic/index.json`.
- Re-indexing reuses cached embeddings for unchanged chunks.
- If your model changes, run index with `-Force` once.

## Promotion Rule

At day end, move recurring or important notes from daily logs into `.codex/MEMORY.md`.
