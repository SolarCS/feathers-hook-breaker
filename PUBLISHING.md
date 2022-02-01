This repository is setup to auto-publish as a result of merged PRs to the `main` branch.


When merging, Github will use an internal workflow (see `.github/workflow/npm-publish.yml`) to publish the update to NPM and to create a release in Github itself.  


Git commits and PRs must follow the semantic standard outlined in `.git/hooks/commit-msg`

Please see https://github.com/angular/angular.js/blob/master/DEVELOPERS.md#commit-message-format".

Commit messages must start with `feat|fix|docs|ci|style|refactor|perf|test|chore`.

Also, `docs|refactor|style|perf` trigger a patch.  This modification is configured in the `package.json`.
