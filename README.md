# Jira Validations JavaScript Action

This action prints verfied 'true' or 'false' if the github event contains a valid Jira Issue ID

## Inputs

### `verify-from`

**Required** Can be `'branch'`, `'commits'` or `'all'`. Default `'branch'`.

### `fail-invalid`

**Required** Can be `'true'`, `'false'` or `'checks'`. Default `'checks'`.

`'checks'` Will send a successful / failed github check

## Outputs

### `verified`

If Jira Issue ID is valid

## Example usage

```
uses: rigup/jira-validations@v1
with:
  verify-from: 'branch'
  fail-invalid: 'true'
```
