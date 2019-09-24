const JIRA_IDENTIFIER = /[A-Z]+-\d+/g;
const GITHUB_OWNER = "rigup";

module.exports = class {
  constructor({ context, jira, octokit }) {
    this.githubEvent = context.payload;
    this.eventName = context.eventName;
    this.Jira = jira;
    this.octkit = octokit;
    this.issueIds = new Set();
  }

  validateStringHasIssueId(input) {
    const matcher = input.match(JIRA_IDENTIFIER);
    if (matcher === null) return false;

    console.log({ input, matcher });
    this.issueIds.add(matcher[0]);
    return true;
  }

  // TODO - Test this
  validateTitleHasIssueId() {
    return this.validateStringHasIssueId(this.githubEvent.pull_request.title);
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
      `Merged master into ${this.githubEvent.pull_request.head.ref}`
    ];
    const originMergeStart = [
      "Merge remote-tracking branch 'origin/master'",
      `Merge remote-tracking branch '${this.githubEvent.pull_request.head.ref}'`
    ];
    const conflictResolutionStart = [
      `Merge branch '${this.githubEvent.pull_request.head.ref}' of github.com:rigup/${this.githubEvent.repository.name}`
    ];
    const filterMatches = [
      ...masterMergeStart,
      ...originMergeStart,
      ...conflictResolutionStart
    ];

    let valid = true;

    commits
      .filter(commit => {
        const commitMessage = commit.commit.message;
        return !filterMatches.some(matcher =>
          commitMessage.startsWith(matcher)
        );
      })
      .forEach(commit => {
        if (!this.validateStringHasIssueId(commit.commit.message)) {
          console.error(
            `Commit message '${commit.commit.message}' doesn't have a valid Jira Issue`
          );
          valid = false;
        }
      });

    return valid;
  }

  async validate(type) {
    let _valid = false;
    switch (type) {
      case "all":
        _valid =
          (await this.validateCommitsHaveIssueIds()) &&
          this.validateBranchHasIssueId();
        break;
      case "commits":
        _valid = await this.validateCommitsHaveIssueIds();
        break;
      case "branch":
      default:
        _valid = this.validateBranchHasIssueId();
    }

    if (!_valid) return false;

    const issues = await this.getIssues();
    console.log({ issues });
    return issues && issues.hasOwnProperty("issue");
  }

  async getCommits() {
    console.log({
      repo: this.githubEvent.repository.name,
      pull_number: this.githubEvent.number
    });

    try {
      const { data } = await this.octkit.pulls.listCommits({
        owner: GITHUB_OWNER,
        repo: this.githubEvent.repository.name,
        pull_number: this.githubEvent.number
      });
      return data;
    } catch (error) {
      console.error({ error });
      throw e;
    }
  }

  async getIssues() {
    try {
      for (const issueKey of this.issueIds) {
        const issue = await this.Jira.getIssue(issueKey);

        if (issue) {
          return { issue: issue.key };
        }
      }
    } catch (error) {
      console.error({ error });
      throw e;
    }
  }
};
