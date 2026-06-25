# Creating a Release

The webui is built nightly at 13:00 UTC. The nightly job always runs, but the release script checks whether `develop` has any commits beyond `master` — if not, it exits early with no release. When a release does occur, the resulting build is included with the main Flexget repo.

If you have write access to this repo, you can also trigger a manual release via Slack or the GitHub API directly.

To trigger a manual release in Slack (requires the [GitHub for Slack](https://slack.github.com/) app to be installed in your workspace):

1. Go to the #development channel
2. Run the following slash command (it will ask you to auth with GitHub to link your Slack account if you haven't already)
```
/github deploy Flexget/webui
```
3. When the popup comes up, change the `Branch or tag to deploy` to the develop branch. Leave everything else as is.
4. Press `Create`

You should be able to navigate to the [Build Release](https://github.com/Flexget/webui/actions?query=workflow%3A%22Build+Release%22) tab in Actions and see your workflow run there, as well as on the [Deployments Page](https://github.com/Flexget/webui/deployments?environment=production#activity-log).

## Building Locally

To produce a `dist.zip` equivalent to what the CI release publishes, run the local packaging script from the project root:

```bash
./package.sh
```

This will:
1. Install dependencies if `node_modules` is missing
2. Run a production Webpack build (output goes to `dist/`)
3. Zip the result to `dist.zip` in the project root

**Prerequisites:**
- Node 16 via nvm (`nvm use 16`) — Webpack 4 is incompatible with Node 17+ due to an OpenSSL change
- Dependencies installed: `yarn install --frozen-lockfile`

The resulting `dist.zip` has the same structure as the asset attached to a GitHub Release. Note that `dist/index.html` contains the placeholder `{{ base_url }}/` which Flexget substitutes at runtime — the files are not directly openable in a browser without that substitution.
