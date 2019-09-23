const _ = require("lodash");

const JIRA_IDENTIFIER = /[A-Z]+-\d+/g;

module.exports = class {
  constructor({ githubEvent, jira }) {
    this.Jira = jira;
    this.githubEvent = githubEvent;
    this.issueIds = [];
  }

  validateCommitsHaveIssueIds() {
    const masterMergeStart = "Merge branch 'master'";
    const originMergeStart = "Merge remote-tracking branch 'origin/master'";

    this.githubEvent.commits
      .filter(commit => !commit.message.startsWith(masterMergeStart))
      .filter(commit => !commit.message.startsWith(originMergeStart))
      .forEach(commit => {
        const matcher = commit.message.match(JIRA_IDENTIFIER);
        if (matcher === null) {
          return false;
        }
      });

    return true;
  }

  async execute() {
    const match = extractString.match(issueIdRegEx);

    if (!match) {
      console.log(`String "${extractString}" does not contain issueKeys`);

      return;
    }

    for (const issueKey of match) {
      const issue = await this.Jira.getIssue(issueKey);

      if (issue) {
        return { issue: issue.key };
      }
    }
  }
};
