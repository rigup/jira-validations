# Jira Validations JavaScript Action

This action prints verfied 'true' or 'false' if the github event contains a valid Jira Issue ID

## Inputs

### `verify-from`

**Required** Can be `'branch'`, `'commits'` or `'all'`. Default `'branch'`.

### `fail-invalid`

**Required** Can be `true`, or `false`. Default `'true'`.

If false, will fail a GitHub Check if Validation fails, otherwise all checks will pass.

### `allowed-issue-types`

**Required** Comma separated list of allowed Issue Types. If the matching issue type isn't in this list, validation fails.

Defaults to `"Task,Standalone Task,Bug"`

## Outputs

### `verified`

If Jira Issue ID is valid

## Example usage

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
          github-token: ${{ secrets.GITHUB_TOKEN }} # Passed in from Github, no need to setup
        env:
          JIRA_BASE_URL: ${{ secrets.JIRA_BASE_URL }}
          JIRA_API_TOKEN: ${{ secrets.JIRA_API_TOKEN }}
          JIRA_USER_EMAIL: ${{ secrets.JIRA_USER_EMAIL }}

      # Use the output from the `jira` step
      - name: Get the output
        run: echo "Verified ${{ steps.jira-pr.outputs.verified }}"

```
