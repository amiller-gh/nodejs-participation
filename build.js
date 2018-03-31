const P = require("bluebird");

const path = require('path');

const fs = P.promisifyAll(require('fs'));
const rimraf = P.promisify(require('rimraf'));
const ghdownload = P.promisify(require('download-git-repo'));
const ejs = require('ejs');

const REPOS = require('./repositories.json').sort();
const REPO_DEST = path.join(__dirname, 'repo');
const SITE_DEST = path.join(__dirname, 'dist');
const PRESENT_SECTION_REGEXP = /# Present([^#]*)#/gmi;
const GITHUB_USERNAME_REGEXP = /@[a-zA-Z0-9-]+/g;

async function fetch(REPO) {
  // Blow it all away!
  await rimraf(REPO_DEST);

  // Fetch the repo.
  return ghdownload(REPO, REPO_DEST);
}

async function parse(REPO){
  const MEETING_PRESENT = {};
  const MEMBERS = {};
  const ALL_DATES = new Set();
  let docs = await fs.readdirAsync(path.join(REPO_DEST, 'meetings'));

  for (let doc of docs) {
    let date = path.parse(doc).name;
    let notesPath = path.join(REPO_DEST, 'meetings', doc);

    // Ensure is a file.
    let stat = await fs.statAsync(notesPath);
    if (!stat.isFile()) { continue; }

    // Read the meeting minutes markdown file.
    let file = await fs.readFileAsync(notesPath, { encoding: 'utf8' });

    // Find the "# Present" section.
    let section = (file.match(PRESENT_SECTION_REGEXP) || [])[0];

    // If no "# Present" section, log error and continue.
    if (!section) {
      console.error(`No Present section found for ${doc}`);
      continue;
    }

    // Find list of present members' Github user names.
    let present = section.match(GITHUB_USERNAME_REGEXP);

    // If nobody present, log error and continue.
    if (!present) {
      console.error(`Discovered no present members for ${doc}`);
      continue;
    }

    // Standardize user names.
    present = present.map((s) => s.toLowerCase());

    // Add to our data structures.
    for (let uid of present) {
      MEMBERS[uid] || (MEMBERS[uid] = new Set());
      MEMBERS[uid].add(date);
      ALL_DATES.add(date);
    }
  }

  // Return all discovered members' attendance and all discovered meeting dates.
  return { members: MEMBERS, dates: ALL_DATES };
}

// Write the final HTML document to disk.
async function write(repos, repo, content) {

  let options = {
    'client': true,
    'root': './'
  };
  let data = {
    'repos': repos,
    'repo' : repo,
    'content': content
  };
  let html = await ejs.renderFile('templates/page.ejs', data, options);
  let desc = repo.split('/');
  try {
    await fs.mkdirAsync(SITE_DEST);
    await fs.mkdirAsync(path.join(SITE_DEST, desc[0]));
  } catch (e) { 
    console.log('error', e);
  }
  await fs.writeFileAsync(path.join(SITE_DEST, desc[0], `${desc[1]}.html`), html);
}

async function run(){

  // Remove old site
  await rimraf(SITE_DEST);

  // For each repository we are generating a report for
  for (let repo of REPOS) {
    // Fetch the repository
    await fetch(repo);
    // Parse the member participant data for each meeting
    let data = await parse(repo);
    // Write a new HTML document for this page
    await write(REPOS.slice(), repo, data);
  }
}

run();