# AI Commit Analysis - Testing Guide

## Prerequisites

1. **Ensure OpenAI API key is set**:
   ```bash
   # Add to .env.local
   OPENAI_API_KEY=sk-proj-your-api-key-here
   ```

2. **Ensure GitHub token is set**:
   ```bash
   # Add to .env.local
   GITHUB_TOKEN=ghp_your-github-token-here
   ```

3. **Start both servers**:
   ```bash
   # Terminal 1: Start Express backend
   npm run server
   
   # Terminal 2: Start Vite frontend
   npm run dev
   ```

## Testing Methods

### Method 1: Using cURL (Command Line)

#### Test 1: Bug Fix Commit (Highly Recommended)
```bash
curl -X POST http://localhost:4000/api/commit-preview-check \
  -H "Content-Type: application/json" \
  -d '{
    "repoUrl": "https://github.com/facebook/react",
    "sha": "0707dfc92b99a4fc63c0e96f82a1ac1d7e3e9f8f"
  }'
```

**Expected Result**: Score 80+, recommendation: "highly_recommended"

#### Test 2: Major Version Upgrade (Risky)
```bash
curl -X POST http://localhost:4000/api/commit-preview-check \
  -H "Content-Type: application/json" \
  -d '{
    "repoUrl": "https://github.com/vercel/next.js",
    "sha": "abcdef1234567890"
  }'
```

**Expected Result**: Score 40-60, recommendation: "risky"

#### Test 3: Documentation Update (Recommended)
```bash
curl -X POST http://localhost:4000/api/commit-preview-check \
  -H "Content-Type: application/json" \
  -d '{
    "repoUrl": "https://github.com/nodejs/node",
    "sha": "1234567890abcdef"
  }'
```

**Expected Result**: Score 60-79, recommendation: "recommended"

### Method 2: Using Node.js Script

Create `test-ai-analysis.js`:

```javascript
import fetch from 'node-fetch';

const API_URL = 'http://localhost:4000/api/commit-preview-check';

const testCases = [
  {
    name: 'React - Bug Fix',
    repoUrl: 'https://github.com/facebook/react',
    sha: '0707dfc92b99a4fc63c0e96f82a1ac1d7e3e9f8f',
    expectedScore: 80,
  },
  {
    name: 'Next.js - Major Update',
    repoUrl: 'https://github.com/vercel/next.js',
    sha: 'abc123def456',
    expectedScore: 50,
  },
];

async function runTests() {
  console.log('🧪 Running AI Commit Analysis Tests\n');

  for (const testCase of testCases) {
    try {
      console.log(`📝 Testing: ${testCase.name}`);
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoUrl: testCase.repoUrl,
          sha: testCase.sha,
        }),
      });

      const data = await response.json();

      console.log(`  ✅ Score: ${data.previewViabilityScore}/100`);
      console.log(`  📊 Previewable: ${data.previewable ? 'Yes' : 'No'}`);
      console.log(`  🎯 Recommendation: ${data.recommendation}`);

      if (data.aiAnalysis) {
        console.log(`  ⚠️  Risk Factors: ${data.aiAnalysis.riskFactors.join(', ') || 'None'}`);
        console.log(`  ✅ Positive Factors: ${data.aiAnalysis.positiveFactors.join(', ') || 'None'}`);
        console.log(`  💡 Insights: ${data.aiAnalysis.aiInsights}`);
      }

      console.log('');
    } catch (error) {
      console.error(`  ❌ Error: ${error.message}\n`);
    }
  }
}

runTests();
```

Run with:
```bash
node test-ai-analysis.js
```

### Method 3: Using TypeScript/React Component

Create `src/components/CommitAnalyzerTest.tsx`:

```typescript
import React, { useState } from 'react';
import { checkCommitPreviewability, formatAnalysisForDisplay } from '@/utils/commitAnalyzer';

export function CommitAnalyzerTest() {
  const [repoUrl, setRepoUrl] = useState('https://github.com/facebook/react');
  const [sha, setSha] = useState('0707dfc92b99a4fc63c0e96f82a1ac1d7e3e9f8f');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAnalyze = async () => {
    setLoading(true);
    setError('');
    
    try {
      const data = await checkCommitPreviewability(repoUrl, sha);
      setResult(data);
      console.log(formatAnalysisForDisplay(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">🤖 AI Commit Analyzer</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Repository URL</label>
          <input
            type="text"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            className="w-full px-3 py-2 border rounded"
            placeholder="https://github.com/owner/repo"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Commit SHA</label>
          <input
            type="text"
            value={sha}
            onChange={(e) => setSha(e.target.value)}
            className="w-full px-3 py-2 border rounded"
            placeholder="commit-sha-here"
          />
        </div>

        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '⏳ Analyzing...' : '🔍 Analyze'}
        </button>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-6 p-4 bg-gray-100 rounded">
          <pre className="whitespace-pre-wrap text-sm font-mono">
            {formatAnalysisForDisplay(result)}
          </pre>

          {result.aiAnalysis && (
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-bold mb-2">Risk Factors</h4>
                <ul className="text-sm">
                  {result.aiAnalysis.riskFactors.map((factor, i) => (
                    <li key={i}>⚠️ {factor}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-bold mb-2">Positive Factors</h4>
                <ul className="text-sm">
                  {result.aiAnalysis.positiveFactors.map((factor, i) => (
                    <li key={i}>✅ {factor}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

## Expected Behavior

### Scenario 1: No API Key
```
⚠️ OpenAI API key not configured. AI analysis skipped.
✓ Falls back to heuristic analysis only
✓ Response includes basicIndicators without aiAnalysis
```

### Scenario 2: Successful Analysis
```
✅ API call successful
✓ AI analysis returned
✓ Score combined from heuristics (30%) + AI (70%)
✓ Risk and positive factors included
```

### Scenario 3: API Error
```
❌ OpenAI API failed
✓ Graceful fallback to heuristic score
✓ Error logged for debugging
✓ Endpoint still returns valid response
```

## Performance Benchmarks

| Operation | Time | Notes |
|-----------|------|-------|
| Fetch commit data | 100-200ms | GitHub API call |
| Build file tree | 50-150ms | Tree construction |
| AI analysis | 500-2000ms | OpenAI API latency |
| Total | 700-2350ms | Total endpoint time |

## Sample Responses

### High Score (80+)
```json
{
  "previewable": true,
  "previewViabilityScore": 87,
  "recommendation": "highly_recommended",
  "aiAnalysis": {
    "previewViabilityScore": 92,
    "riskFactors": [],
    "positiveFactors": [
      "Minor bug fixes with no API changes",
      "Performance improvements",
      "Type-safe updates"
    ],
    "reasoning": "Small targeted patch with zero breaking changes",
    "aiInsights": "Stable release with full backward compatibility"
  }
}
```

### Medium Score (60-79)
```json
{
  "previewable": true,
  "previewViabilityScore": 68,
  "recommendation": "recommended",
  "aiAnalysis": {
    "previewViabilityScore": 72,
    "riskFactors": [
      "Minor dependency updates"
    ],
    "positiveFactors": [
      "New features with backward compatibility",
      "Security patches"
    ],
    "reasoning": "Standard feature release with minor dependency changes",
    "aiInsights": "Well-tested update, expect normal behavior"
  }
}
```

### Low Score (< 40)
```json
{
  "previewable": false,
  "previewViabilityScore": 32,
  "recommendation": "not_recommended",
  "aiAnalysis": {
    "previewViabilityScore": 28,
    "riskFactors": [
      "Major version bump (v18 to v19)",
      "Breaking API changes",
      "Removed deprecated features"
    ],
    "positiveFactors": [],
    "reasoning": "Major release with significant breaking changes",
    "aiInsights": "High risk of preview failure, test in development first"
  }
}
```

## Troubleshooting

### Issue: "Network Error" or "Cannot fetch from server"
- ✓ Ensure Express server is running on port 4000
- ✓ Check firewall/localhost access
- ✓ Verify `PUBLIC_SERVER_URL` in environment

### Issue: "OpenAI API key not configured"
- ✓ Add `OPENAI_API_KEY` to `.env.local`
- ✓ Restart server after adding key
- ✓ Verify key format starts with `sk-proj-`

### Issue: "Invalid GitHub token"
- ✓ Verify `GITHUB_TOKEN` has 'repo' scope
- ✓ Check token hasn't expired
- ✓ Ensure proper permissions for private repos

### Issue: "AI analysis returns poor scores"
- ✓ Check commit message quality (AI uses this)
- ✓ Verify commit diff is properly fetched
- ✓ Review file changes being analyzed
- ✓ Consider using commits with detailed messages

## Advanced Testing

### Batch Testing
```bash
for sha in abc123 def456 ghi789; do
  curl -X POST http://localhost:4000/api/commit-preview-check \
    -H "Content-Type: application/json" \
    -d "{\"repoUrl\": \"https://github.com/facebook/react\", \"sha\": \"$sha\"}"
done
```

### Performance Testing
```bash
time curl -X POST http://localhost:4000/api/commit-preview-check \
  -H "Content-Type: application/json" \
  -d '{"repoUrl": "https://github.com/facebook/react", "sha": "abc123def456"}'
```

### Load Testing
Use `ab` (Apache Bench):
```bash
ab -n 100 -c 10 -p request.json http://localhost:4000/api/commit-preview-check
```

## Next Steps

1. ✅ Test with your own repositories
2. ✅ Integrate into commit selection UI
3. ✅ Add result caching layer
4. ✅ Implement batch endpoint
5. ✅ Add analytics on AI accuracy
