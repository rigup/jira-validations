# Jira Validations JavaScript Action

This action prints verified 'true' or 'false' if the github event contains a valid Jira Issue ID.

Action also checks DynamoDB for User lookup information. A.k.a mapping a Github ID to a Jira Account ID.

## Inputs

`verify-from`

**Required** Can be `'branch'`, `'commits'` or `'all'`. Default `'branch'`.

`fail-invalid`

**Required** Can be `true`, or `false`. Default `'true'`.

If false, will fail a GitHub Check if Validation fails, otherwise all checks will pass.

`allowed-issue-types`

**Required** Comma separated list of allowed Issue Types. If the matching issue type isn't in this list, validation fails.

Defaults to `"Task,Standalone Task,Bug"`

## Outputs

`verified`

Can be `true` or `false` depending if the Jira Issue ID is verified

## Example: Add this action to your own workflow

```
name: Validate PR
on: [pull_request]

jobs:
  validate_pr_job:
    runs-on: ubuntu-latest
    name: Validate Jira PR

    steps:
      - name: Validate Jira step
        id: jira-pr
        uses: rigup/jira-validations@master
        with:
          verify-from: "branch"
          fail-invalid: "true"
          allowed-issue-types: "Task,Standalone Task,Bug"
        env:
          JIRA_BASE_URL: ${{ secrets.JIRA_BASE_URL }}
          JIRA_API_TOKEN: ${{ secrets.JIRA_API_TOKEN }}
          JIRA_USER_EMAIL: ${{ secrets.JIRA_USER_EMAIL }}
          AWS_REGION: ${{ secrets.AWS_REGION }}
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      # Use the output from the `jira` step
      - name: Get the output
        run: echo "Verified ${{ steps.jira-pr.outputs.verified }}"

```

## Development of this Action

### Setup

> Requires Node 12.x

```
npm install
```

Copy `.env.sample` to `.env` and fill out fields.

Install `@zeit/ncc`

```
npm i -g @zeit/ncc
```

### Testing

```
npm run test
```

### Committing/Deploying

This action uses itself!

So you'll need a valid branch name with Jira issue key, as well as all commit messages will need a Jira Issue Key :)

Compile the `index.js` file.

```
npm run build
```

You'll see a new dist/index.js file with your code and the compiled modules.

main keywork in `action.yml` points to `dist/index.js`

Commit the newly updated `dist/index.js` file and push.
