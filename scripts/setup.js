#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🚀 GitHub Commit Workspace Runner Setup\n');

async function setup() {
  try {
    // Check if .env.local already exists
    if (fs.existsSync('.env.local')) {
      console.log('✅ .env.local already exists');
      const answer = await question('Do you want to overwrite it? (y/N): ');
      if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
        console.log('Setup cancelled.');
        process.exit(0);
      }
    }

    // Copy env.example to .env.local
    if (fs.existsSync('env.example')) {
      fs.copyFileSync('env.example', '.env.local');
      console.log('✅ Created .env.local from template');
    } else {
      console.log('❌ env.example not found');
      process.exit(1);
    }

    console.log('\n📋 GitHub Personal Access Token Setup:');
    console.log('1. Go to: https://github.com/settings/tokens');
    console.log('2. Click "Generate new token (classic)"');
    console.log('3. Select the "repo" scope for private repository access');
    console.log('4. Copy the generated token\n');

    const token = await question('Enter your GitHub token (or press Enter to set it later): ');
    
    if (token.trim()) {
      // Update .env.local with the token
      let envContent = fs.readFileSync('.env.local', 'utf8');
      envContent = envContent.replace('GITHUB_TOKEN=your_github_token_here', `GITHUB_TOKEN=${token.trim()}`);
      fs.writeFileSync('.env.local', envContent);
      console.log('✅ GitHub token saved to .env.local');
    } else {
      console.log('⚠️  Remember to set GITHUB_TOKEN in .env.local before starting the server');
    }

    console.log('\n🎉 Setup complete!');
    console.log('\nNext steps:');
    console.log('1. npm install');
    console.log('2. npm run dev:full');
    console.log('3. Open http://localhost:5173 in your browser');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

setup();
