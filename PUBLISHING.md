This repository is setup to auto-publish as a result of merged PRs to the `main` branch.


When merging, Github will use an internal workflow (see `.github/workflow/npm-publish.yml`) to publish the update to NPM and to create a release in Github itself.  


Git commits and PRs must follow the semantic standard outlined in `.git/hooks/commit-msg`