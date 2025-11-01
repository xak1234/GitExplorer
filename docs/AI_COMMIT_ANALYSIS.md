# AI-Based Commit Preview Selection

## Overview

The enhanced `/api/commit-preview-check` endpoint now uses **OpenAI's GPT-4 Turbo** to intelligently analyze GitHub commits and determine their preview viability. This combines traditional heuristic file-based detection with AI-powered analysis.

## Features

### 1. **Intelligent Analysis**
- **Commit Message Analysis**: Extracts breaking changes, version bumps, and feature descriptions
- **File Diff Review**: Analyzes what files were modified and their impact
- **Dependency Detection**: Identifies package.json changes that might affect builds
- **Architecture Assessment**: Recognizes major refactors or infrastructure changes

### 2. **Scoring System** (0-100)
- **Score >= 80**: Highly recommended for preview
- **Score 60-79**: Recommended, likely to work
- **Score 40-59**: Risky, may have build issues
- **Score < 40**: Not recommended, high failure risk

### 3. **Risk Assessment**
- Detects breaking changes
- Identifies dependency conflicts
- Flags major deletions or renames
- Recognizes incompatible version upgrades

## API Response Format

### Endpoint
```
POST /api/commit-preview-check
```

### Request
```json
{
  "repoUrl": "https://github.com/owner/repo",
  "sha": "abc123def456..."
}
```

### Response
```json
{
  "previewable": true,
  "previewViabilityScore": 78,
  "recommendation": "recommended",
  "basicIndicators": {
    "hasPackageJson": true,
    "hasIndexHtml": true,
    "hasBuildFiles": false,
    "hasSourceFiles": true,
    "hasWebFiles": true,
    "fileCount": 42
  },
  "aiAnalysis": {
    "previewViabilityScore": 82,
    "riskFactors": [
      "Major version bump in React",
      "Breaking changes in API"
    ],
    "positiveFactors": [
      "Type-safe TypeScript updates",
      "Performance improvements"
    ],
    "recommendation": "recommended",
    "reasoning": "Despite version upgrades, changes are well-tested and backwards compatible.",
    "aiInsights": "The commit includes comprehensive refactoring with good test coverage."
  },
  "commitInfo": {
    "message": "chore: upgrade React to v19 with new hooks",
    "author": "John Doe",
    "filesChanged": 8
  }
}
```

## Setup

### 1. Add OpenAI API Key to `.env.local`

```bash
OPENAI_API_KEY=sk-proj-your-api-key-here
```

### 2. Optional Configuration

```bash
# Optional: customize AI model
AI_MODEL=gpt-4-turbo  # default

# Optional: customize analysis temperature
AI_TEMPERATURE=0.3    # default (0=deterministic, 1=creative)
```

## Usage Example

### Frontend Integration

```typescript
async function checkCommitPreview(repoUrl: string, sha: string) {
  const response = await fetch('/api/commit-preview-check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repoUrl, sha })
  });
  
  const result = await response.json();
  
  if (result.aiAnalysis) {
    console.log(`📊 AI Score: ${result.previewViabilityScore}/100`);
    console.log(`⚠️  Risk Factors:`, result.aiAnalysis.riskFactors);
    console.log(`✅ Positive Factors:`, result.aiAnalysis.positiveFactors);
    console.log(`💡 AI Insights:`, result.aiAnalysis.aiInsights);
  }
  
  return result;
}
```

### Example Outputs

#### Highly Recommended (Score: 90+)
```
✅ Minor bug fixes and performance improvements
🟢 Recommendation: highly_recommended
📝 Reasoning: Small targeted changes with no breaking updates
💡 Insights: Well-tested patch release with zero risk
```

#### Recommended (Score: 60-79)
```
✅ Feature additions with some dependencies updated
🟡 Recommendation: recommended
📝 Reasoning: New features are backward compatible
💡 Insights: Standard feature release, expect normal preview behavior
```

#### Risky (Score: 40-59)
```
⚠️  Major dependency upgrades, structural changes
🟠 Recommendation: risky
📝 Reasoning: Significant changes may cause preview build failures
💡 Insights: Consider testing in development environment first
```

#### Not Recommended (Score: < 40)
```
❌ Breaking changes, major version bumps, dependency conflicts
🔴 Recommendation: not_recommended
📝 Reasoning: High likelihood of preview failure
💡 Insights: Strongly recommend alternative commits for preview
```

## How It Works

### Processing Flow

```
Request (repoUrl, sha)
    ↓
1. Validate repo access ✓
    ↓
2. Fetch commit details (message, author, files changed)
    ↓
3. Build file tree (detect frameworks, build tools)
    ↓
4. Calculate basic heuristic score (30-70)
    ↓
5. Fetch commit diff (file changes, additions, deletions)
    ↓
6. Send to OpenAI for AI analysis
    ↓
7. Parse AI response (score, risks, insights)
    ↓
8. Combine scores: 30% heuristic + 70% AI = final score
    ↓
Response (combined analysis)
```

### AI Prompt Strategy

The AI analyzes:
- **Context**: Project type, framework detection
- **Changes**: File modifications, dependencies updates
- **Risk**: Breaking changes, version conflicts
- **Stability**: Test coverage signals, commit quality
- **Compatibility**: Build system changes, environment requirements

## Error Handling

### API Key Not Configured
If `OPENAI_API_KEY` is not set:
- ⚠️ Warning logged: "OpenAI API key not configured"
- ✓ Falls back to heuristic scoring only
- ✓ Response includes `basicIndicators` without `aiAnalysis`

### AI Analysis Fails
If OpenAI API call fails:
- ✓ Graceful fallback to heuristic score
- ✓ Error logged for debugging
- ✓ Endpoint still returns valid response

### Rate Limiting
- OpenAI API rate limits apply
- Consider caching analysis results
- Implement request throttling if needed

## Performance Considerations

- **AI Analysis Time**: ~500ms-2s per commit (depends on OpenAI API)
- **Recommended**: Cache results for same commits
- **Optimization**: Batch multiple commits for efficiency

## Example Curl Request

```bash
curl -X POST http://localhost:4000/api/commit-preview-check \
  -H "Content-Type: application/json" \
  -d '{
    "repoUrl": "https://github.com/facebook/react",
    "sha": "abc123def456..."
  }'
```

## Limitations

- ⚠️ AI analysis depends on commit message quality
- ⚠️ Diff analysis limited to 1000 characters (files only)
- ⚠️ Cannot predict runtime errors
- ⚠️ Requires valid GitHub token
- ⚠️ Requires valid OpenAI API key (for full analysis)

## Future Enhancements

- [ ] Caching layer for analysis results
- [ ] Batch endpoint for multiple commits
- [ ] Custom prompt templates per project type
- [ ] Integration with CI/CD logs
- [ ] Machine learning model fine-tuning
- [ ] Analysis history and trending
