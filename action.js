const JIRA_IDENTIFIER = /[A-Z]+-\d+/g;

module.exports = class {
  constructor({ github, jira }) {
    this.githubEvent = github.context.payload;
    this.eventName = github.context.eventName;
    this.Jira = jira;
    this.valid = false;
    this.issueIds = new Set();
  }

  validateStringHasIssueId(input) {
    const matcher = input.match(JIRA_IDENTIFIER);
    if (matcher === null) return false;

    console.log({ input, matcher });
    this.issueIds.push(matcher);
    return true;
  }

  validateTitleHasIssueId() {
    return this.validateStringHasIssueId(this.githubEvent.pull_request.title);
  }

  validateBranchHasIssueId() {
    console.log("Branch: " + this.githubEvent.pull_request.head);
    return (
      this.githubEvent.pull_request.head &&
      this.validateStringHasIssueId(this.githubEvent.pull_request.head.ref)
    );
  }

  async validateCommitsHaveIssueIds() {
    if (
      this.eventName === "push" &&
      this.githubEvent.pull_request.base.ref === "master"
    )
      return true;
    else this.githubEvent.commits = await getCommits();

    const masterMergeStart = "Merge branch 'master'";
    const originMergeStart = "Merge remote-tracking branch 'origin/master'";

    this.githubEvent.commits
      .filter(commit => !commit.message.startsWith(masterMergeStart))
      .filter(commit => !commit.message.startsWith(originMergeStart))
      .forEach(commit => {
        if (!this.validateStringHasIssueId(commit.message)) {
          return false;
        }
      });

    return true;
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
    return issues && issues.hasOwnProperty("issue");
  }

  async getCommits() {
    const { data } = await github.Github.listCommitsOnPullRequest({
      repo: this.githubEvent.pull_request.repository.name,
      pullNumber: this.githubEvent.pull_request.number
    });

    return data;
  }

  async getIssues() {
    for (const issueKey of this.issueIds) {
      const issue = await this.Jira.getIssue(issueKey);

      if (issue) {
        return { issue: issue.key };
      }
    }
  }
};
