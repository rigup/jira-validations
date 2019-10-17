const JIRA_IDENTIFIER = /^[a-zA-Z]+(?<!id)-\d+/g;
const TP_BRANCH_IDENTIFIER = /^(?:issue)?(\d+)\b/g;
const GITHUB_OWNER = 'rigup';

module.exports = class {
  constructor({ context, jira, octokit, core, dynamo }) {
    this.githubEvent = context.payload;
    this.Jira = jira;
    this.octkit = octokit;
    this.core = core;
    this.dynamo = dynamo;
    this.issueIds = new Set();
    this.issue = {};
  }

  isTargetProcess() {
    return (
      this.githubEvent.pull_request.head &&
      this.validateStringHasTPIssueId(this.githubEvent.pull_request.head.ref)
    );
  }

  validateStringHasTPIssueId(input) {
    const matcher = input.match(TP_BRANCH_IDENTIFIER);
    if (matcher === null) return false;

    this.core.debug(JSON.stringify({ input, matcher }));
    this.issueIds.add(matcher[0]);
    return true;
  }

  validateStringHasIssueId(input) {
    const matcher = input.match(JIRA_IDENTIFIER);
    if (matcher === null) return false;

    this.core.debug(JSON.stringify({ input, matcher }));
    this.issueIds.add(matcher[0]);
    return true;
  }

  validateBranchHasIssueId() {
    return (
      this.githubEvent.pull_request.head &&
      this.validateStringHasIssueId(this.githubEvent.pull_request.head.ref)
    );
  }

  async validateCommitsHaveIssueIds() {
    const commits = await this.getCommits();
    const masterMergeStart = [
      "Merge branch 'master'",
      `Merged master into ${this.githubEvent.pull_request.head.ref}`,
    ];
    const originMergeStart = [
      "Merge remote-tracking branch 'origin/master'",
      `Merge remote-tracking branch '${this.githubEvent.pull_request.head.ref}'`,
    ];
    const conflictResolutionStart = [
      `Merge branch '${this.githubEvent.pull_request.head.ref}' of github.com:rigup/${this.githubEvent.repository.name}`,
    ];
    const filterMatches = [...masterMergeStart, ...originMergeStart, ...conflictResolutionStart];

    let valid = true;

    commits
      .filter((commit) => {
        const commitMessage = commit.commit.message;
        return !filterMatches.some((matcher) => commitMessage.startsWith(matcher));
      })
      .forEach((commit) => {
        if (!this.validateStringHasIssueId(commit.commit.message)) {
          this.core.error(
            `Commit message '${commit.commit.message}' doesn't have a valid Jira Issue`
          );
          valid = false;
        }
      });

    return valid;
  }

  async validate(type, validIssueTypes) {
    let valid = false;
    switch (type) {
      case 'all':
        valid = (await this.validateCommitsHaveIssueIds()) && this.validateBranchHasIssueId();
        break;
      case 'commits':
        valid = await this.validateCommitsHaveIssueIds();
        break;
      case 'branch':
      default:
        valid = this.validateBranchHasIssueId();
    }

    if (!valid) return false;

    const { issue } = await this.getIssue();

    if (!issue || !issue.key) {
      return false;
    }

    if (validIssueTypes.indexOf(issue.fields.issuetype.name) === -1) {
      this.core.error(
        `Issue type ${issue.fields.issuetype.name} is not one of '${JSON.stringify(
          validIssueTypes
        )}'`
      );
      return false;
    }

    this.core.info(`Issue Type - ${issue.fields.issuetype.name}`);
    return true;
  }

  getCodeReviewers() {
    this.core.info(
      `Reviewers: ${this.githubEvent.pull_request.requested_reviewers.map((r) => r.login)}`
    );
    return this.githubEvent.pull_request.requested_reviewers.map((rev) => ({
      login: rev.login,
      id: rev.id,
    }));
  }

  getApprovers() {
    return this.githubEvent.pull_request.assignees.map((assignee) => ({
      login: assignee.login,
      id: assignee.id,
    }));
  }

  async getCommits() {
    this.core.info(
      JSON.stringify({
        repo: this.githubEvent.repository.name,
        pull_number: this.githubEvent.number,
      })
    );

    const { data } = await this.octkit.pulls.listCommits({
      owner: GITHUB_OWNER,
      repo: this.githubEvent.repository.name,
      pull_number: this.githubEvent.number,
    });
    return data;
  }

  async getIssue() {
    if (this.issue.key) {
      return { issue: this.issue };
    }
    // eslint-disable-next-line no-restricted-syntax
    for (const issueKey of this.issueIds) {
      // eslint-disable-next-line no-await-in-loop
      const resp = await this.Jira.getIssue(issueKey);
      const issue = resp.data;
      if (issue) {
        this.issue = issue;
        return { issue };
      }
    }
    return {};
  }

  async updateCodeReviewers() {
    const reviewers = this.getCodeReviewers();
    if (!reviewers || reviewers.length === 0) {
      this.core.info('No Reviewers!');
      return;
    }

    const rigupReviewers = await Promise.all(
      reviewers.map(async (reviewer) => {
        return this.dynamo.findByGithubId(reviewer.id);
      })
    );

    const jiraAccountIds = rigupReviewers.reduce((reviewers, record) => {
      if(record.Items[0].atlassianId) {
        reviewers.push(record.Items[0].atlassianId["S"])
      } else {
        this.core.info(`Unknown Atlassian user ${record.Items[0].fullName["S"]}` )
      }
      return reviewers;
    }, []);

    const resp = await this.Jira.getUsersFromAccountIds(jiraAccountIds);

    if (resp && resp.data && resp.data.values) {
      this.core.info(
        `Adding Jira Users as Code Reviewers: ${JSON.stringify(
          resp.data.values.map((user) => user.displayName)
        )}`
      );
      this.Jira.addCodeReviewersToIssue(this.issue.key, resp.data.values);
    }
  }

  async updateApprovers() {
    const approvers = this.getApprovers();

    if (!approvers || approvers.length === 0) {
      this.core.info('No Approvers!');
      return;
    }

    const rigupApprovers = await Promise.all(
      approvers.map(async (approver) => {
        return this.dynamo.findByGithubId(approver.id);
      })
    );

    const jiraAccountIds = rigupApprovers.reduce((approvers, record) => {
      if(record.Items[0].atlassianId) {
        approvers.push(record.Items[0].atlassianId["S"])
      } else {
        this.core.info(`Unknown Atlassian user ${record.Items[0].fullName.S}` )
      }
      return approvers;
    }, []);

    const resp = await this.Jira.getUsersFromAccountIds(jiraAccountIds);

    if (resp && resp.data && resp.data.values) {
      this.core.info(
        `Adding Jira Users as Approvers: ${JSON.stringify(
          resp.data.values.map((user) => user.displayName)
        )}`
      );
      this.Jira.addApproversToIssue(this.issue.key, resp.data.values);
    }
  }

  async autoAssignCreator() {
    const { user } = this.githubEvent.pull_request;
    if (!user) {
      this.core.error(`No User on PR? - ${user}`);
    }

    const rigupUser = await this.dynamo.findByGithubId(user.id);

    if (!rigupUser) {
      this.core.error(`PR by unknown user? - ${user}`);
    }

    if(!rigupUser.Items[0].atlassianId) {
      this.core.error("Unknown Atlassian user")
    }
    const jiraAccountId = rigupUser.Items[0].atlassianId["S"];
    const resp = await this.Jira.getUsersFromAccountIds([jiraAccountId]);

    if (resp && resp.data && resp.data.values) {
      this.core.info(`Adding PR Creator, ${resp.data.values[0].name}, as ticket assignee`);
      this.Jira.addAssigneeToIssue(this.issue.key, resp.data.values[0]);
    }
  }
};
