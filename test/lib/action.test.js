const assert = require('assert');
const sinon = require('sinon');
const rewire = require('rewire');
const github = require('@actions/github');
const Action = require('../../action');
const Dynamo = require('../../lib/dynamo');
const Jira = require('../../lib/jira');

const payload = require('../../resources/pr-opened');
const payloadTp = require('../../resources/pr-opened-tp');

describe('Action Class Test', () => {
  const config = {
    baseUrl: process.env.JIRA_BASE_URL,
    token: process.env.JIRA_API_TOKEN,
    email: process.env.JIRA_USER_EMAIL,
  };

  const jira = new Jira(config);
  const dynamo = new Dynamo();
  const octokit = new github.GitHub(process.env.GITHUB_TOKEN);

  const core = rewire('@actions/core');
  // eslint-disable-next-line no-underscore-dangle
  core.__set__('debug', (input) => {
    // eslint-disable-next-line no-console
    console.log(input);
  });
  // eslint-disable-next-line no-underscore-dangle
  core.__set__('info', (input) => {
    // eslint-disable-next-line no-console
    console.info(input);
  });
  // eslint-disable-next-line no-underscore-dangle
  core.__set__('error', (input) => {
    // eslint-disable-next-line no-console
    console.error(input);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Target Process', () => {
    const context = {
      payload: payloadTp,
      eventName: 'pull_request',
    };

    const action = new Action({ context, jira, octokit, core, dynamo });

    it('validateStringHasTPIssueId() should return true', () => {
      const isTp = action.validateStringHasTPIssueId('18389-certs');
      assert.equal(true, isTp);
    });

    it('isTargetProcess() should return true', () => {
      const isTp = action.isTargetProcess();
      assert.equal(true, isTp);
    });
  });

  describe('Jira', () => {
    const context = {
      payload,
      eventName: 'pull_request',
    };

    const action = new Action({ context, jira, octokit, core, dynamo });

    it('getCommits() should return 1 commit', async () => {
      const commits = await action.getCommits();
      assert.equal(1, commits.length);
      assert.equal('duanebester', commits[0].author.login);
    });

    it('getCodeReviewers() should return 2 code reviewers', async () => {
      const reviewers = await action.getCodeReviewers();
      assert.equal('alxyuu', reviewers[0].login);
      assert.equal('himichaelroberts', reviewers[1].login);
    });

    it('validate() should return valid', async () => {
      const valid = await action.validate('all', 'Task,Standalone Task,Bug');

      assert.notEqual(null, valid);
      assert.notEqual(false, valid);
      assert.equal('EE-282', action.issue.key);
    });

    it('updateCodeReviewers() should return send req to Jira', async () => {
      const jiraStub = sinon.stub(jira, 'addCodeReviewersToIssue').resolves({ status: 204 });

      await action.updateCodeReviewers();
      sinon.assert.calledOnce(jiraStub);
    });

    it('updateApprovers() should return send req to Jira', async () => {
      const jiraStub = sinon.stub(jira, 'addApproversToIssue').resolves({ status: 204 });

      await action.updateApprovers();
      sinon.assert.calledOnce(jiraStub);
    });

    it('autoAssignCreator() should return send req to Jira', async () => {
      const jiraStub = sinon.stub(jira, 'addAssigneeToIssue').resolves({ status: 204 });

      await action.autoAssignCreator();
      sinon.assert.calledOnce(jiraStub);
    });

    it('validateStringHasTPIssueId() should return false', () => {
      const isTp = action.validateStringHasTPIssueId('EE-238');
      assert.equal(false, isTp);
    });

    it('isTargetProcess() should return false', () => {
      const isTp = action.isTargetProcess();
      assert.equal(false, isTp);
    });
  });
});
