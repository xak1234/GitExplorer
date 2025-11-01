# Advanced Preview Scoring System

## Overview
The new commit preview validation system uses **predictive analysis** with weighted scoring across multiple factors to accurately determine if a commit can be successfully previewed.

## Scoring Breakdown (Total: 100 Points)

### 1. Package.json Analysis (30 points)
- **Framework Detection (15 points)**
  - Detects: React (Vite/CRA), Next.js, Vue.js, Angular, Svelte, Nuxt.js, Gatsby, Astro
  - Awards full points if modern framework detected
  
- **Dev Script Detection (15 points)**
  - Checks for: `npm run dev`, `npm start`, `npm run serve`
  - Critical for actually running the preview
  - Reduces confidence by 20% if missing

- **Dependency Complexity Analysis**
  - < 50 deps: ✅ Optimal (confidence boost)
  - 50-100 deps: ⚠️ Longer install (confidence -10%)
  - 100+ deps: ⚠️ Very long install (confidence -20%)

### 2. HTML Entry Points (20 points)
- Direct HTML files: **20 points**
- Framework-generated HTML: **10 points**
- Checks for `index.html` and other HTML files

### 3. Project Structure (20 points)
- Well-organized structure: **20 points**
  - Has `src/`, `app/`, or `pages/` directory
- Flat structure: **5 points**
  - Still works, but less organized

### 4. Configuration Files (10 points)
- Detects: `vite.config.js`, `next.config.js`, `webpack.config.js`, `tsconfig.json`, etc.
- Indicates proper project setup

### 5. Source Code Files (15 points)
- **5+ source files: 15 points**
- **1-5 source files: 5 points** (minimal project warning)
- Checks for: `.js`, `.jsx`, `.ts`, `.tsx`, `.vue`, `.svelte`

### 6. Blocker Detection (Negative Confidence)
Checks for potential issues that might complicate preview:
- `docker-compose.yml` → Requires Docker (-5% confidence)
- `Dockerfile` → Containerized app (-5% confidence)
- `.env.example` → Requires configuration (-5% confidence)
- Backend-only indicators → Python/Go/Rust projects (-30% confidence, -20 points)

### 7. File Count Analysis (5 points)
- **10-500 files: 5 points** (optimal range)
- **500+ files:** ⚠️ Very large project (-5% confidence)
- **< 5 files:** ⚠️ Incomplete project (-10% confidence)

## Confidence Scoring
Separate from the viability score, confidence indicates how certain the system is:
- **100%** - All checks passed, clear framework detected
- **80%+** - High confidence, minor issues
- **60%+** - Moderate confidence, some concerns
- **< 60%** - Low confidence, significant issues detected

## Recommendation Levels

| Score | Confidence | Recommendation | Meaning |
|-------|-----------|----------------|---------|
| 85+ | 80%+ | **Highly Recommended** 🟢 | Almost certainly will work |
| 70-84 | 60%+ | **Recommended** 🟢 | Very likely to work |
| 50-69 | Any | **Possible** 🟡 | Might work, but issues expected |
| < 50 | Any | **Not Recommended** 🔴 | Likely won't work or not a web project |

## Detailed Response Data

### New Fields in API Response:
```json
{
  "previewable": true,
  "previewViabilityScore": 85,
  "confidence": 95,
  "recommendation": "highly_recommended",
  "detectedFramework": "React (Vite)",
  "detectedBuildTool": "Vite/Modern",
  "estimatedSetupTime": "1-2 minutes",
  "analysis": {
    "strengths": [
      "✅ Modern framework detected: React (Vite)",
      "✅ Has development server script",
      "✅ Reasonable dependency count (23)",
      "✅ Has HTML entry point(s) (1)",
      "✅ Well-organized project structure",
      "✅ Has build configuration",
      "✅ Has source files (45)"
    ],
    "issues": [],
    "requirementsChecks": {
      "hasDevScript": true,
      "hasHtmlEntry": true,
      "hasSourceDirectory": true
    }
  }
}
```

## Examples

### Example 1: React Vite Project (Score: 95/100)
```
✅ Modern framework: React (Vite) (+15)
✅ Has dev script (+15)
✅ Reasonable deps: 23 (+0, confidence boost)
✅ Framework generates HTML (+10)
✅ Well-organized structure (src/) (+20)
✅ Has vite.config.ts (+10)
✅ Has 45 source files (+15)
✅ Optimal file count (+5)
✅ No blockers (+0)
---
Score: 90/100
Confidence: 100%
Recommendation: Highly Recommended 🟢
Setup Time: 1-2 minutes
```

### Example 2: Basic HTML/CSS Project (Score: 50/100)
```
❌ No package.json (-0, confidence -30%)
✅ Has index.html (+20)
✅ Has CSS files (+0)
⚠️ No src/ directory (+5)
❌ No config files (+0)
⚠️ Few source files: 3 (+5)
✅ Optimal file count (+5)
---
Score: 35/100
Confidence: 70%
Recommendation: Possible 🟡
Setup Time: < 1 minute (static)
```

### Example 3: Python Backend (Score: 10/100)
```
❌ No package.json (-0, confidence -30%)
❌ Python project detected (-20, confidence -30%)
❌ No HTML files (+0)
⚠️ No src/ directory (+5)
❌ No config files (+0)
⚠️ Few .py files: 8 (+5)
✅ Optimal file count (+5)
---
Score: -5/100 → 0/100
Confidence: 40%
Recommendation: Not Recommended 🔴
Reason: Backend-only project
```

## Implementation Details

### Function: `analyzeCommitPreviewability`
**Location:** `server/index.ts`

**Process:**
1. Fetches and parses `package.json` if present
2. Analyzes dependencies and scripts
3. Detects framework and build tools
4. Examines project file structure
5. Counts source files by type
6. Identifies potential blockers
7. Calculates weighted score and confidence
8. Returns comprehensive analysis object

### Benefits Over Previous System

| Old System | New System |
|-----------|------------|
| Fixed 70/30 score | Dynamic 0-100 score |
| Binary decision | 4-level recommendations |
| No framework detection | Detects 9+ frameworks |
| No confidence metric | Confidence percentage |
| No time estimates | Estimated setup time |
| Generic response | Detailed strengths/issues |
| No dependency analysis | Full package.json analysis |

## Usage in UI

The frontend can now display:
- **Score Badge** with color coding (green/yellow/red)
- **Confidence Indicator** showing system certainty
- **Framework Badge** (React, Vue, etc.)
- **Setup Time Estimate** (1-2 mins, 2-4 mins, 5+ mins)
- **Detailed Tooltip** showing strengths and issues
- **Warning Messages** for detected issues

## Future Enhancements

Potential improvements:
1. **Historical Success Tracking** - Learn from previous preview attempts
2. **Repository Size Check** - Warn about very large repos before cloning
3. **Dependency Security Scanning** - Check for known vulnerabilities
4. **Build Time Prediction** - ML-based estimate of actual preview time
5. **Auto-fix Suggestions** - Recommend fixes for common issues

---

## Quick Reference

**High Score (85+)** = Almost certain success ✅  
**Good Score (70-84)** = Very likely success ✅  
**Medium Score (50-69)** = Worth trying ⚠️  
**Low Score (< 50)** = Probably won't work ❌  

**High Confidence (80%+)** = Clear indicators  
**Medium Confidence (60-79%)** = Some ambiguity  
**Low Confidence (< 60%)** = Uncertain outcome  

