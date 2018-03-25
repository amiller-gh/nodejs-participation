# Node.js Meeting Participation

Automated participation tables for NodeJs committee and working group meetings

This project pulls down whitelisted repos from the Node.js Github org, checks all meeting minutes committed to the project, and generates a participation table.

Repos are expected to commit meeting minutes under `/meetings/yyyy-mm-dd.md`.

Meeting minute markdown files **must** contain an attendance section in this format:

```markdown
## Present

 - Firstname Lastname @gh-username
```

> Note: The site generator will look for anything that looks like a github username under a section with a title called `Present`.

## Quick Start

```bash
$ npm install
$ npm run build
```

The static site will be available in the build `/dist` directory.

## Adding a New Repo

To add a new repository to the static site generator, simply add the Github repository to `/repositories.json`. Please run a build and confirm the page is generated properly.