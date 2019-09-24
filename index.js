const core = require("@actions/core");
const github = require("@actions/github");
const Dynamo = require("./dynamo");
const Jira = require("./common/net/jira");
const Action = require("./action");

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

    const githubToken = core.getInput("github-token");
    if (!githubToken) throw new Error("Please specify 'github-token' input");

    // `verify-from` input defined in action.yml
    const verifyFromInput = core.getInput("verify-from");
    console.log(`Verifying Issue ID from '${verifyFromInput}'`);

    // `fail-invalid` input defined in action.yml
    const failInvalidInput = core.getInput("fail-invalid");
    console.log(`Fail Invalid? ${failInvalidInput}`);

    // `allowed-issue-types` input defined in action.yml
    const allowedIssueTypesInput = core
      .getInput("allowed-issue-types")
      .split(",");
    console.log(
      `Allowed Issue Types - ${JSON.stringify(allowedIssueTypesInput)}`
    );

    const config = {
      baseUrl: process.env.JIRA_BASE_URL,
      token: process.env.JIRA_API_TOKEN,
      email: process.env.JIRA_USER_EMAIL
    };

    const jira = new Jira(config);
    const dynamo = new Dynamo();
    const octokit = new github.GitHub(githubToken);
    const context = github.context;
    const action = new Action({ context, jira, octokit });

    const valid = await action.validate(
      verifyFromInput,
      allowedIssueTypesInput
    );

    if (!valid && failInvalidInput === "true") {
      core.setFailed("Validation Failed!");
    }

    if (!valid && failInvalidInput === "checks") {
      console.log(`TODO: Send GitHub Check`);
    }

    const reviewers = action.getCodeReviewers();
    const rigupReviewers = await Promise.all(
      reviewers.map(async reviewer => {
        return await dynamo.findByGithubId(reviewer.id);
      })
    );

    console.log({ rigupReviewers });

    core.setOutput("verified", `${valid}`);
  } catch (error) {
    core.setFailed(error.message);
  }
})();
