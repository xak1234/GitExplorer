/**
 * Commit Preview Analyzer - Client utility for AI-based preview viability checking
 */

export interface CommitAnalysis {
  previewViabilityScore: number;
  riskFactors: string[];
  positiveFactors: string[];
  recommendation: 'highly_recommended' | 'recommended' | 'risky' | 'not_recommended';
  reasoning: string;
  aiInsights: string;
}

export interface CommitInfo {
  message: string;
  author: string;
  filesChanged: number;
}

export interface BasicIndicators {
  hasPackageJson: boolean;
  hasIndexHtml: boolean;
  hasBuildFiles: boolean;
  hasSourceFiles: boolean;
  hasWebFiles: boolean;
  fileCount: number;
}

export interface PreviewCheckResponse {
  previewable: boolean;
  previewViabilityScore: number;
  recommendation: string;
  basicIndicators: BasicIndicators;
  aiAnalysis?: CommitAnalysis;
  commitInfo: CommitInfo;
}

export interface CommitPreviewRequest {
  repoUrl: string;
  sha: string;
}

/**
 * Check if a commit is previewable using AI analysis
 */
export async function checkCommitPreviewability(
  repoUrl: string,
  sha: string
): Promise<PreviewCheckResponse> {
  try {
    const response = await fetch('/api/commit-preview-check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ repoUrl, sha }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Preview check failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? error.message
        : 'Failed to check commit preview'
    );
  }
}

/**
 * Get visual representation of preview viability score
 */
export function getScoreVisualization(score: number): string {
  if (score >= 80) return '🟢';
  if (score >= 60) return '🟡';
  if (score >= 40) return '🟠';
  return '🔴';
}

/**
 * Get score label for display
 */
export function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Moderate';
  return 'Poor';
}

/**
 * Get recommendation emoji
 */
export function getRecommendationEmoji(
  recommendation: string
): string {
  switch (recommendation) {
    case 'highly_recommended':
      return '✅';
    case 'recommended':
      return '✔️';
    case 'risky':
      return '⚠️';
    case 'not_recommended':
      return '❌';
    default:
      return '❓';
  }
}

/**
 * Format analysis for display
 */
export function formatAnalysisForDisplay(data: PreviewCheckResponse): string {
  const visualization = getScoreVisualization(data.previewViabilityScore);
  const label = getScoreLabel(data.previewViabilityScore);
  const emoji = getRecommendationEmoji(data.recommendation);

  let output = `
${emoji} Preview Viability Check
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Score: ${visualization} ${data.previewViabilityScore}/100 (${label})
Previewable: ${data.previewable ? '✅ Yes' : '❌ No'}
Recommendation: ${data.recommendation}

Commit: ${data.commitInfo.message}
Author: ${data.commitInfo.author}
Files Changed: ${data.commitInfo.filesChanged}

File Indicators:
  📦 package.json: ${data.basicIndicators.hasPackageJson ? '✓' : '✗'}
  📄 index.html: ${data.basicIndicators.hasIndexHtml ? '✓' : '✗'}
  🏗️  Build files: ${data.basicIndicators.hasBuildFiles ? '✓' : '✗'}
  📝 Source files: ${data.basicIndicators.hasSourceFiles ? '✓' : '✗'}
  🎨 Web files: ${data.basicIndicators.hasWebFiles ? '✓' : '✗'}
  📊 Total files: ${data.basicIndicators.fileCount}
`;

  if (data.aiAnalysis) {
    output += `
AI Analysis (Score: ${data.aiAnalysis.previewViabilityScore}/100):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Reasoning: ${data.aiAnalysis.reasoning}

💡 Insights: ${data.aiAnalysis.aiInsights}
`;

    if (data.aiAnalysis.riskFactors.length > 0) {
      output += `
⚠️  Risk Factors:
${data.aiAnalysis.riskFactors.map((factor) => `  • ${factor}`).join('\n')}
`;
    }

    if (data.aiAnalysis.positiveFactors.length > 0) {
      output += `
✅ Positive Factors:
${data.aiAnalysis.positiveFactors.map((factor) => `  • ${factor}`).join('\n')}
`;
    }
  }

  return output;
}

/**
 * Batch check multiple commits
 */
export async function checkMultipleCommits(
  requests: CommitPreviewRequest[]
): Promise<PreviewCheckResponse[]> {
  const results = await Promise.all(
    requests.map((req) => checkCommitPreviewability(req.repoUrl, req.sha))
  );
  return results;
}

/**
 * Filter commits by viability score
 */
export function filterCommitsByScore(
  commits: PreviewCheckResponse[],
  minScore: number
): PreviewCheckResponse[] {
  return commits.filter((commit) => commit.previewViabilityScore >= minScore);
}

/**
 * Sort commits by viability score
 */
export function sortCommitsByScore(
  commits: PreviewCheckResponse[],
  descending = true
): PreviewCheckResponse[] {
  return commits.sort((a, b) => {
    const diff = a.previewViabilityScore - b.previewViabilityScore;
    return descending ? -diff : diff;
  });
}

/**
 * Get recommendation statistics
 */
export function getRecommendationStats(commits: PreviewCheckResponse[]): Record<string, number> {
  return {
    highly_recommended: commits.filter(
      (c) => c.recommendation === 'highly_recommended'
    ).length,
    recommended: commits.filter((c) => c.recommendation === 'recommended').length,
    risky: commits.filter((c) => c.recommendation === 'risky').length,
    not_recommended: commits.filter((c) => c.recommendation === 'not_recommended').length,
  };
}
