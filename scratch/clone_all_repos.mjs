import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const repos = JSON.parse(fs.readFileSync('d:/project/otbk_github_repos_list.json', 'utf8'));
const targetDir = 'd:/project/otbk_github_repositories';

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

console.log(`Cloning ${repos.length} repositories into: ${targetDir}`);

let successCount = 0;
let failCount = 0;

for (const repo of repos) {
  const repoPath = path.join(targetDir, repo.name);
  if (fs.existsSync(repoPath)) {
    console.log(`[SKIP] Repository '${repo.name}' already exists at: ${repoPath}`);
    successCount++;
    continue;
  }

  console.log(`\n[CLONING] ${repo.name} (${repo.clone_url})...`);
  try {
    execSync(`git clone ${repo.clone_url} "${repoPath}"`, { stdio: 'inherit' });
    console.log(`[SUCCESS] Cloned '${repo.name}' successfully!`);
    successCount++;
  } catch (err) {
    console.error(`[ERROR] Failed to clone '${repo.name}':`, err.message);
    failCount++;
  }
}

console.log(`\n🎉 ALL DONE! Cloned: ${successCount}, Failed: ${failCount}`);
