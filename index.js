const core = require("@actions/core");
const github = require("@actions/github");
const Dynamo = require("./lib/dynamo");
const Jira = require("./lib/jira");
const Action = require("./action");

const GITHUB_OWNER = "rigup";
const ROBOTS = ["dependabot[bot]", "dependabot-preview[bot]"];

(async () => {
  try {
    if (!process.env.JIRA_BASE_URL)
      throw new Error("Please specify JIRA_BASE_URL env");
    if (!process.env.JIRA_API_TOKEN)
      throw new Error("Please specify JIRA_API_TOKEN env");
    if (!process.env.JIRA_USER_EMAIL)
      throw new Error("Please specify JIRA_USER_EMAIL env");
    if (!process.env.PEOPLE_TABLE_NAME)
      throw new Error("Please specify PEOPLE_TABLE_NAME env");
    if (!process.env.GITHUB_TOKEN)
      throw new Error("Please specify GITHUB_TOKEN env");

    // `verify-from` input defined in action.yml
    const verifyFromInput = core.getInput("verify-from");
    core.debug(`Verifying Issue ID from '${verifyFromInput}'`);

    // `fail-invalid` input defined in action.yml
    const failInvalidInput = core.getInput("fail-invalid");
    core.debug(`Fail Invalid? ${failInvalidInput}`);

    // `allowed-issue-types` input defined in action.yml
    const allowedIssueTypesInput = core
      .getInput("allowed-issue-types")
      .split(",");
    core.info(`Allowed Issue Types - ${JSON.stringify(allowedIssueTypesInput)}`);

    const config = {
      baseUrl: process.env.JIRA_BASE_URL,
      token: process.env.JIRA_API_TOKEN,
      email: process.env.JIRA_USER_EMAIL
    };

    const jira = new Jira(config);
    const dynamo = new Dynamo();
    const octokit = new github.GitHub(process.env.GITHUB_TOKEN);
    const { context } = github;
    const action = new Action({ context, jira, octokit, core, dynamo });

    const isRobot = ROBOTS.indexOf(context.payload.pull_request.user.login) !== -1;
    core.info(`Is Robot - ${isRobot}`);

    let valid = true;
    if (!isRobot && !action.isTargetProcess()) {
      valid = await action.validate(verifyFromInput, allowedIssueTypesInput);

      if (!valid && failInvalidInput === "true") {
        core.setFailed("Validation Failed!");
      } else {
        await action.updateCodeReviewers();
        await action.updateApprovers();
        await action.autoAssignCreator();
      }
    }

    core.setOutput("verified", `${valid}`);
  } catch (error) {
    core.error(JSON.stringify(error));
    core.setFailed(JSON.stringify(error));
  }
})();
