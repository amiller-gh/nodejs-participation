const P = require("bluebird");

const path = require('path');

const fs = P.promisifyAll(require('fs'));
const rimraf = P.promisify(require('rimraf'));
const ghdownload = P.promisify(require('download-git-repo'));

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

// Format the parsed data from all markdown files into an HTML table.
async function format(data) {
  let TABLE = `<table><tbody>`;
  let members = Object.keys(data.members).sort();
  let allDates = [...data.dates.entries()].sort().reverse();

  // Table headers.
  TABLE += `\n  <tr>`
  TABLE += `\n    <th class="sr-only">Username</th>`;
  for (let [date] of allDates) {
    TABLE += `\n    <th>${(new Date(date)).toDateString()}</th>`
  }
  TABLE += `\n  </tr>`

  // Member rows.
  for (let user of members) {
    TABLE += `\n  <tr>`;
    TABLE += `\n    <td><a href="https://www.github.com/${user.replace('@', '')}" target="_blank">${user}</a></td>`;
    for (let [date] of allDates) {
      let isPresent = data.members[user].has(date);
      TABLE += `\n    <td class="${isPresent ? 'present' : 'absent'}">${isPresent ? 'Present' : 'Absent'}</td>`;
    }
    TABLE += `\n  </tr>`;
  }
  TABLE += `</tbody></table>`;

  return TABLE;
}

// Write the final HTML document to disk.
async function write(repos, repo, table) {

  let html = `
<!DOCTYPE html>
<html>
  <head>
    <title>Node.js Meeting Participation</title>
    <style>
      ${await fs.readFileAsync('./styles.css')}
    </style>
  </head>
  <body>
    <nav>
      <ul>
        ${repos.map((n) => `<li class=${n === repo ? 'active' : ''}><a href="../${n}.html">${n}</a></li>`).join('\n')}
      </ul>
    </nav>
    ${table}
  </body>
</html>
`;

  let desc = repo.split('/');
  try {
    await fs.mkdirAsync(SITE_DEST);
    await fs.mkdirAsync(path.join(SITE_DEST, desc[0]));
  } catch (e) { }

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
    // Generate an HTML table using the data
    let table = await format(data);
    // Write a new HTML document for this page
    await write(REPOS.slice(), repo, table);
  }
}

run();