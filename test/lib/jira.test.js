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
    const resp = await jira.getIssue('EE-282');
    const issue = resp.data;
    assert.notEqual(null, issue);
    assert.notEqual({}, issue);
    assert.equal('EE-282', issue.key);
  });

  it('getUsers should return valid users', async () => {
    const resp = await jira.getUsers();
    const users = resp.data;
    assert.notEqual(null, users);
    assert.notEqual([], users);
  });

  it('getUsersByAccountIds should return valid users', async () => {
    const accountIds = ['5c7d4b0d16effa74fa9deac3', '5c6c66f347a54a6728e56778'];
    const resp = await jira.getUsersFromAccountIds(accountIds);

    assert.notEqual(null, resp);
    assert.notEqual(null, resp.data.values);
    assert.notEqual([], resp.data.values);
    assert.equal(2, resp.data.values.length);
  });

  it('addCodeReviewersToIssue should add reviewers to an issue', async () => {
    const accountIds = ['5c7d4b0d16effa74fa9deac3', '5c6c66f347a54a6728e56778'];
    const resp = await jira.getUsersFromAccountIds(accountIds);
    const users = resp.data.values;

    assert.notEqual(null, resp);
    assert.notEqual(null, users);
    assert.notEqual([], users);
    assert.equal(2, users.length);

    const edit = await jira.addCodeReviewersToIssue('EE-282', users);
    assert.notEqual(null, edit);
  });

  it('addAssigneeToIssue should add pr creator as assignee to an issue', async () => {
    const accountIds = ['5be06148923d3245b8ba1a1f'];
    const resp = await jira.getUsersFromAccountIds(accountIds);
    const users = resp.data.values;

    assert.notEqual(null, resp.data);
    assert.notEqual(null, users);
    assert.notEqual([], users);
    assert.equal(1, users.length);

    const edit = await jira.addAssigneeToIssue('EE-299', users[0]);
    assert.notEqual(null, edit);
  });

  it('setReleasePlatform should set release platform for an issue', async () => {
    const accountIds = ['5be06148923d3245b8ba1a1f'];

    const edit = await jira.setReleasePlatform('EE-859', 'other');
    assert.notEqual(null, edit);
  });
});
