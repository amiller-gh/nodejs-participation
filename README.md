# Node.js Meeting Participation

Automated participation tables for NodeJs committee and working group meetings

This project pulls down whitelisted repos from the Node.js Github org, checks all meeting minutes committed to the project, and generates a participation table.

Repos are expected to commit meeting minutes under `/meetings/yyyy-mm-dd.md`.

Meeting minute markdown files **must** contain an attendance section in this format:

```
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