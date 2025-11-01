# 🚀 Quick Start - AI Commit Analysis

## What You Get
A smart AI-powered preview viability checker for GitHub commits that analyzes commits and scores them 0-100.

## Setup (Already Done ✅)

Your environment is configured:
- ✅ GitHub token: Set in `.env.local`
- ✅ Local LLM: Running on `192.168.0.15:1234`
- ✅ Mistral Model: `mistral-7b-instruct-v0.3` available

## Start the Server

```bash
npm run server
# Server starts on port 4000
```

## Test It

### Simple Test
```bash
curl -X POST http://localhost:4000/api/commit-preview-check \
  -H "Content-Type: application/json" \
  -d '{"repoUrl":"https://github.com/facebook/react","sha":"0a5fb67ddfbd50740e2cbd6f1e575e834f696444"}'
```

### Result
```json
{
  "previewable": true,
  "previewViabilityScore": 81,
  "recommendation": "recommended",
  "aiAnalysis": {
    "previewViabilityScore": 85,
    "riskFactors": [...],
    "positiveFactors": [...],
    "reasoning": "...",
    "aiInsights": "..."
  }
}
```

## Use in React Component

```typescript
import { checkCommitPreviewability } from '@/utils/commitAnalyzer';

function CommitSelector() {
  const analyzeCommit = async (sha: string) => {
    const result = await checkCommitPreviewability(repoUrl, sha);
    
    // Show score
    console.log(`Score: ${result.previewViabilityScore}/100`);
    
    // Show recommendation
    console.log(`Recommended: ${result.recommendation === 'highly_recommended'}`);
    
    // Show AI insights
    if (result.aiAnalysis) {
      console.log('Risks:', result.aiAnalysis.riskFactors);
      console.log('Improvements:', result.aiAnalysis.positiveFactors);
    }
  };
}
```

## Score Meaning

| Score | Meaning | Icon |
|-------|---------|------|
| 80-100 | Excellent, safe to preview | 🟢 |
| 60-79 | Good, likely to work | 🟡 |
| 40-59 | Moderate risk, may have issues | 🟠 |
| 0-39 | High risk, avoid previewing | 🔴 |

## Response Fields

```typescript
{
  // Overall verdict
  previewable: boolean          // Can this be previewed?
  previewViabilityScore: number // 0-100 combined score
  recommendation: string        // highly_recommended|recommended|risky|not_recommended
  
  // File-based indicators
  basicIndicators: {
    hasPackageJson: boolean
    hasIndexHtml: boolean
    hasBuildFiles: boolean
    hasSourceFiles: boolean
    hasWebFiles: boolean
    fileCount: number
  }
  
  // AI analysis (if available)
  aiAnalysis?: {
    previewViabilityScore: number     // 0-100 AI score
    riskFactors: string[]              // Potential issues
    positiveFactors: string[]           // Improvements
    recommendation: string              // Recommendation
    reasoning: string                   // Why this score
    aiInsights: string                 // Technical details
  }
  
  // Commit info for reference
  commitInfo: {
    message: string                    // First line of commit message
    author: string                     // Commit author name
    filesChanged: number               // Number of files in this commit
  }
}
```

## Configuration

Change models or LLM URL in `.env.local`:

```bash
# Use different model
LOCAL_LLM_MODEL=deepseek-coder-v2-lite-instruct

# Use different LLM server
LOCAL_LLM_URL=http://your-server:8000
```

Available models on your server:
- `mistral-7b-instruct-v0.3` ⭐ (currently used)
- `deepseek-coder-v2-lite-instruct`
- `qwen2.5-coder-32b-instruct`
- And more...

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Error accessing repository" | Check GitHub token is valid and has 'repo' scope |
| No `aiAnalysis` in response | LLM might be slow, check server logs |
| LLM connection refused | Verify LLM running at `192.168.0.15:1234` |
| Slow response (>15s) | Local LLM is processing, this is normal |

## Performance

- GitHub API: ~100-200ms
- File tree analysis: ~50-150ms
- Local LLM analysis: ~2-10s
- **Total: 2-15 seconds**

## Example Scores Explained

### Score 85 - Recommended ✅
```
Commit: Minor DevTools UI sorting improvement
Risk: Minor UI changes
Benefit: Better UX
→ Safe to preview
```

### Score 45 - Risky ⚠️
```
Commit: Major React version upgrade with breaking changes
Risk: API changes, potential failures
Benefit: New features
→ May not preview correctly
```

### Score 25 - Not Recommended ❌
```
Commit: Remove critical dependencies, major refactor
Risk: Build may fail
Benefit: Code cleanup
→ Preview likely to fail
```

## Next: Integrate into UI

The endpoint is production-ready. Next step: integrate the `checkCommitPreviewability` function into your commit selector UI component.

Files to import:
- `src/utils/commitAnalyzer.ts` - All utilities and types

---

**Ready to go!** 🎉
