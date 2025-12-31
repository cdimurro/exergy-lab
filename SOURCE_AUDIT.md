# Exergy Lab - Data Source Audit & Setup Guide

## Executive Summary

**Total Sources Defined:** 15
**Currently Working:** ~8 (locally), fewer on Vercel
**Action Required:** Add missing API keys to Vercel environment variables

## All 15 Data Sources

### Academic Papers (6 sources)

| Source | API Key Required | Status | Notes |
|--------|-----------------|--------|-------|
| Semantic Scholar | Optional | ⚠️ Local only | Key in .env.local, needs Vercel |
| OpenAlex | No | ✅ Should work | Open API, no key needed |
| PubMed | No | ✅ Should work | NIH/NLM, no key needed |
| IEEE Xplore | Yes | ❌ Missing | Commented out in .env |
| Crossref | No | ✅ Should work | DOI registry, no key |
| CORE | Yes | ❌ Placeholder | Has placeholder value |

### Preprints (3 sources)

| Source | API Key Required | Status | Notes |
|--------|-----------------|--------|-------|
| arXiv | No | ✅ Working | Always works, no key needed |
| ChemRxiv | No | ⚠️ Availability issues | Public API, check errors |
| bioRxiv | No | ✅ Should work | Public API |

### Patents (2 sources)

| Source | API Key Required | Status | Notes |
|--------|-----------------|--------|-------|
| Google Patents | No | ✅ Should work | Public search |
| USPTO | Yes | ✅ Configured | PatentsView key set |

### Datasets & Reports (2 sources)

| Source | API Key Required | Status | Notes |
|--------|-----------------|--------|-------|
| NREL | Yes | ✅ Configured | Key set in .env |
| Materials Project | Yes | ✅ Configured | Key set in .env |

### Consensus & AI (1 source)

| Source | API Key Required | Status | Notes |
|--------|-----------------|--------|-------|
| Consensus | Yes | ❌ Missing | Requires paid subscription |

### Web (1 source)

| Source | API Key Required | Status | Notes |
|--------|-----------------|--------|-------|
| Web Search | Yes | ❌ Missing | Needs Google Custom Search key |

## Why "6/8 sources" in UI?

The search only queried **8 out of 15** sources because 7 failed to register. Those 7 likely have:
- Missing API keys
- Failed availability checks
- Import/registration errors

## Immediate Actions

### 1. Add to Vercel Environment Variables

Go to: Vercel Dashboard → Your Project → Settings → Environment Variables

Add these:

```
SEMANTIC_SCHOLAR_API_KEY=UFKlmCwCCq48xiFmNG4jI7IjFajxmNWa7057jvBy
```

### 2. Register for Free API Keys (Optional but Recommended)

**CORE (Open Access Papers)**
- URL: https://core.ac.uk/services/api
- Free tier: 10 requests/minute
- Add to Vercel: `CORE_API_KEY=your_key`

**IEEE Xplore (Engineering Papers)**
- URL: https://developer.ieee.org/
- Free tier: 200 requests/day
- Add to Vercel: `IEEE_API_KEY=your_key`

### 3. Update Local .env.local

Replace the placeholder CORE key:
```
CORE_API_KEY=your_actual_core_api_key
```

## Expected Results After Fix

With all free API keys configured:
- **Available sources:** 13/15
- **Missing:** Consensus (paid), Web Search (needs Google Custom Search key)

With just Semantic Scholar + CORE:
- **Available sources:** 10/15 minimum

## Verifying the Fix

After adding environment variables to Vercel:

1. Trigger a redeploy in Vercel
2. Hard refresh browser (`Cmd+Shift+R`)
3. Run a search
4. Check "Compare Sources" panel - should see error messages for unavailable sources
5. Count should show actual queried sources (e.g., "10/10" or "13/13")

## Technical Details

- Source definitions: `src/components/search/SourceSelector.tsx` (line 37-95)
- Registry initialization: `src/lib/discovery/data-sources/registry.ts` (line 506-531)
- Availability check: Each adapter's `isAvailable()` method
- Missing keys = source won't register = won't appear in search

