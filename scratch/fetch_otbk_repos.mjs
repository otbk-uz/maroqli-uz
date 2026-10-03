import fs from 'fs';
import path from 'path';

async function fetchRepos() {
  const username = 'otbk-uz';
  console.log(`Fetching all repositories for GitHub user: ${username}...`);

  try {
    const res = await fetch(`https://api.github.com/users/${username}/repos?per_page=100`);
    if (!res.ok) {
      throw new Error(`GitHub API returned status ${res.status}`);
    }

    const repos = await res.json();
    console.log(`Found ${repos.length} repositories for ${username}:`);

    const repoList = repos.map(r => ({
      name: r.name,
      full_name: r.full_name,
      clone_url: r.clone_url,
      ssh_url: r.ssh_url,
      default_branch: r.default_branch,
      description: r.description,
      private: r.private
    }));

    console.table(repoList);

    const savePath = 'd:/project/otbk_github_repos_list.json';
    fs.writeFileSync(savePath, JSON.stringify(repoList, null, 2), 'utf8');
    console.log(`Saved repository list to: ${savePath}`);
  } catch (err) {
    console.error("Error fetching repositories:", err.message);
  }
}

fetchRepos();
