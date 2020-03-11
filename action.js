const JIRA_IDENTIFIER = /[a-zA-Z]+(?<!id)-\d+/;
const JIRA_BRANCH_REVERT_IDENTIFIER = /^revert-\d+-([a-zA-Z]+-\d+)/;
const TP_BRANCH_IDENTIFIER = /^(?:issue)?(\d+)\b/g;
const GITHUB_OWNER = "rigup";

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

  validateBranchHasIssueId(branchName) {
    this.core.info(`Validating branch name '${branchName}'`);
    if (branchName.startsWith("revert")) {
      const matcher = branchName.match(JIRA_BRANCH_REVERT_IDENTIFIER);
      if (matcher === null) {
        this.core.error("No issue match for revert branch name");
        return false;
      }

      this.core.info(JSON.stringify({ branchName, matcher }));
      this.issueIds.add(matcher[1]);
      return true;
    }

    return (
      this.githubEvent.pull_request.head &&
      this.validateStringHasIssueId(branchName)
    );
  }

  async validateCommitsHaveIssueIds(commits) {
    this.core.info("Validating commits...");
    let valid = true;

    const masterMergeStart = [
      "Merge branch 'master'",
      `Merged master into ${this.githubEvent.pull_request.head.ref}`
    ];
    const originMergeStart = [
      "Merge remote-tracking branch 'origin/master'",
      `Merge remote-tracking branch '${this.githubEvent.pull_request.head.ref}'`
    ];
    const conflictResolutionStart = [
      `Merge branch '${this.githubEvent.pull_request.head.ref}' of github.com:rigup/${this.githubEvent.repository.name}`
    ];
    const revertStart = [`Revert`];
    const filterMatches = [
      ...masterMergeStart,
      ...originMergeStart,
      ...conflictResolutionStart,
      ...revertStart
    ];

    commits
      .filter(commit => {
        const commitMessage = commit.commit.message;
        return !filterMatches.some(matcher =>
          commitMessage.startsWith(matcher)
        );
      })
      .forEach(commit => {
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
    const commits = await this.getCommits();
    const branchName = this.githubEvent.pull_request.head.ref;
    const validCommits = await this.validateCommitsHaveIssueIds(commits);
    const validBranch = this.validateBranchHasIssueId(branchName);

    switch (type) {
      case "all":
        valid = validCommits && validBranch;
        break;
      case "commits":
        valid = validCommits;
        if (!validBranch) {
          this.core.warn(`Invalid Branch Warning. Branch name: ${branchName}`);
        }
        break;
      case "branch":
      default:
        valid = validBranch;
        if (!validCommits) {
          this.core.warn(`Invalid Commits Warning!`);
        }
        break;
    }

    if (!valid) return false;

    const { issue } = await this.getIssue();

    if (!issue || !issue.key) {
      return false;
    }

    if (validIssueTypes.indexOf(issue.fields.issuetype.name) === -1) {
      this.core.error(
        `Issue type ${
          issue.fields.issuetype.name
        } is not one of '${JSON.stringify(validIssueTypes)}'`
      );
      return false;
    }

    this.core.info(`Issue Type - ${issue.fields.issuetype.name}`);
    return true;
  }

  getCodeReviewers() {
    this.core.info(
      `Reviewers: ${this.githubEvent.pull_request.requested_reviewers.map(
        r => r.login
      )}`
    );
    return this.githubEvent.pull_request.requested_reviewers.map(rev => ({
      login: rev.login,
      id: rev.id
    }));
  }

  getAssignees() {
    return this.githubEvent.pull_request.assignees.map(assignee => ({
      login: assignee.login,
      id: assignee.id
    }));
  }

  async getCommits() {
    this.core.info(
      JSON.stringify({
        repo: this.githubEvent.repository.name,
        pull_number: this.githubEvent.number
      })
    );

    const { data } = await this.octkit.pulls.listCommits({
      owner: GITHUB_OWNER,
      repo: this.githubEvent.repository.name,
      pull_number: this.githubEvent.number
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
      this.core.info("No Reviewers!");
      return;
    }

    const rigupReviewers = await Promise.all(
      reviewers.map(async reviewer => {
        return this.dynamo.findByGithubId(reviewer.id);
      })
    );

    const jiraAccountIds = rigupReviewers.reduce((reviewerSet, record) => {
      if (record.Items[0].atlassianId) {
        reviewerSet.add(record.Items[0].atlassianId["S"]);
      } else {
        this.core.info(
          `Unknown Atlassian user ${record.Items[0].fullName["S"]}`
        );
      }
      return reviewerSet;
    }, new Set());

    const currentCodeReviewers = this.issue.fields.customfield_10180;
    if (currentCodeReviewers && currentCodeReviewers.length > 0) {
      currentCodeReviewers.forEach(rev => jiraAccountIds.add(rev.accountId));
    }

    const resp = await this.Jira.getUsersFromAccountIds(
      Array.from(jiraAccountIds)
    );

    if (resp && resp.data && resp.data.values) {
      this.core.info(
        `Adding Jira Users as Code Reviewers: ${JSON.stringify(
          resp.data.values.map(user => user.displayName)
        )}`
      );
      this.Jira.addCodeReviewersToIssue(this.issue.key, resp.data.values);
    }
  }

  async autoAssignCreator() {
    const { user } = this.githubEvent.pull_request;
    if (!user) {
      this.core.error(`No User on PR? - ${user}`);
      return;
    }

    let rigupUser;
    try {
      rigupUser = await this.dynamo.findByGithubId(user.id);
    } catch (error) {
      this.core.error(error);
      return;
    }

    if (!rigupUser) {
      this.core.error(`PR by unknown user? - ${user}`);
      return;
    }

    if (!rigupUser.Items[0].atlassianId) {
      this.core.error("Unknown Atlassian user");
      return;
    }
    const jiraAccountId = rigupUser.Items[0].atlassianId["S"];
    const resp = await this.Jira.getUsersFromAccountIds([jiraAccountId]);

    if (resp && resp.data && resp.data.values && resp.data.values[0]) {
      this.core.info(
        `Adding PR Creator, ${resp.data.values[0].name}, as ticket assignee`
      );
      this.Jira.addAssigneeToIssue(this.issue.key, resp.data.values[0]);
    } else {
      this.core.info(`No Jira user for account id = ${jiraAccountId}`);
    }
  }

  async setReleasePlatform(releasePlatform) {
    if (!releasePlatform) {
      return;
    }

    await this.Jira.setReleasePlatform(this.issue.key, releasePlatform);
  }
};
