import { Command } from 'commander';
import axios from 'axios';
import { loadConfig, validateGitHubToken } from '../utils/config.js';
import { formatOutput, handleError } from '../utils/output.js';

const repoCommand = new Command('repo');
repoCommand.description('Repository management commands');

repoCommand
  .command('list-commits')
  .description('List commits for a repository')
  .argument('<repo-url>', 'GitHub repository URL (e.g., https://github.com/owner/repo)')
  .option('-l, --limit <number>', 'limit number of commits', '10')
  .option('-b, --branch <branch>', 'branch name', 'main')
  .action(async (repoUrl, options) => {
    try {
      const config = loadConfig();
      await validateGitHubToken(config.GITHUB_TOKEN);
      
      const { owner, repo } = parseRepoUrl(repoUrl);
      const commits = await fetchCommits(owner, repo, options, config.GITHUB_TOKEN);
      
      formatOutput(commits.map(commit => ({
        sha: commit.sha.substring(0, 8),
        message: commit.commit.message.split('\n')[0],
        author: commit.commit.author.name,
        date: new Date(commit.commit.author.date).toLocaleDateString()
      })), 'table');
      
    } catch (error) {
      handleError(error);
    }
  });

repoCommand
  .command('info')
  .description('Get repository information')
  .argument('<repo-url>', 'GitHub repository URL')
  .action(async (repoUrl) => {
    try {
      const config = loadConfig();
      await validateGitHubToken(config.GITHUB_TOKEN);
      
      const { owner, repo } = parseRepoUrl(repoUrl);
      const repoInfo = await fetchRepoInfo(owner, repo, config.GITHUB_TOKEN);
      
      formatOutput({
        name: repoInfo.name,
        fullName: repoInfo.full_name,
        description: repoInfo.description,
        language: repoInfo.language,
        stars: repoInfo.stargazers_count,
        forks: repoInfo.forks_count,
        defaultBranch: repoInfo.default_branch,
        private: repoInfo.private,
        lastUpdated: new Date(repoInfo.updated_at).toLocaleDateString()
      }, 'json');
      
    } catch (error) {
      handleError(error);
    }
  });

repoCommand
  .command('files')
  .description('List files in repository at specific commit')
  .argument('<repo-url>', 'GitHub repository URL')
  .argument('<commit-sha>', 'Commit SHA')
  .option('-p, --path <path>', 'specific path to list', '')
  .action(async (repoUrl, commitSha, options) => {
    try {
      const config = loadConfig();
      await validateGitHubToken(config.GITHUB_TOKEN);
      
      const { owner, repo } = parseRepoUrl(repoUrl);
      const files = await fetchRepoFiles(owner, repo, commitSha, options.path, config.GITHUB_TOKEN);
      
      formatOutput(files.map(file => ({
        name: file.name,
        type: file.type,
        size: file.size || 0,
        path: file.path
      })), 'table');
      
    } catch (error) {
      handleError(error);
    }
  });

// Helper functions
function parseRepoUrl(url) {
  const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!match) {
    throw new Error('Invalid GitHub repository URL');
  }
  return { owner: match[1], repo: match[2].replace('.git', '') };
}

async function fetchCommits(owner, repo, options, token) {
  const response = await axios.get(
    `https://api.github.com/repos/${owner}/${repo}/commits`,
    {
      headers: { Authorization: `token ${token}` },
      params: {
        sha: options.branch,
        per_page: parseInt(options.limit)
      }
    }
  );
  return response.data;
}

async function fetchRepoInfo(owner, repo, token) {
  const response = await axios.get(
    `https://api.github.com/repos/${owner}/${repo}`,
    {
      headers: { Authorization: `token ${token}` }
    }
  );
  return response.data;
}

async function fetchRepoFiles(owner, repo, sha, path, token) {
  const response = await axios.get(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
    {
      headers: { Authorization: `token ${token}` },
      params: { ref: sha }
    }
  );
  return Array.isArray(response.data) ? response.data : [response.data];
}

export default repoCommand;
