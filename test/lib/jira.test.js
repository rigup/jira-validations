const assert = require('assert');
const Jira = require('../../lib/jira');

describe('Jira Class Test', () => {
  const config = {
    baseUrl: process.env.JIRA_BASE_URL,
    token: process.env.JIRA_API_TOKEN,
    email: process.env.JIRA_USER_EMAIL,
  };

  const jira = new Jira(config);

  it('getIssue should return valid issue', async () => {
    const issue = await jira.getIssue('EE-232');

    assert.notEqual(null, issue);
    assert.notEqual({}, issue);
    assert.equal('EE-232', issue.key);
  });

  it('getUsers should return valid users', async () => {
    const users = await jira.getUsers();

    assert.notEqual(null, users);
    assert.notEqual([], users);
  });

  it('getUsersByAccountIds should return valid users', async () => {
    const accountIds = ['5c7d4b0d16effa74fa9deac3', '5c6c66f347a54a6728e56778'];
    const resp = await jira.getUsersFromAccountIds(accountIds);

    assert.notEqual(null, resp);
    assert.notEqual(null, resp.values);
    assert.notEqual([], resp.values);
    assert.equal(2, resp.values.length);
  });

  it('addCodeReviewersToIssue should add reviewers to an issue', async () => {
    const accountIds = ['5c7d4b0d16effa74fa9deac3', '5c6c66f347a54a6728e56778'];
    const resp = await jira.getUsersFromAccountIds(accountIds);
    const users = resp.values;

    assert.notEqual(null, resp);
    assert.notEqual(null, users);
    assert.notEqual([], users);
    assert.equal(2, users.length);

    const edit = await jira.addCodeReviewersToIssue('EE-232', users);
    assert.notEqual(null, edit);
  });

  it('addApproversToIssue should add assignees as approvers to an issue', async () => {
    const accountIds = ['5be06148923d3245b8ba1a1f'];
    const resp = await jira.getUsersFromAccountIds(accountIds);
    const users = resp.values;

    assert.notEqual(null, resp);
    assert.notEqual(null, users);
    assert.notEqual([], users);
    assert.equal(1, users.length);

    const edit = await jira.addApproversToIssue('EE-225', users);
    assert.notEqual(null, edit);
  });
});
