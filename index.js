const core = require("@actions/core");
const github = require("@actions/github");
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

    const githubToken = core.getInput("github-token");
    if (!githubToken) throw new Error("Please specify 'github-token' input");

    // `verify-from` input defined in action.yml
    const verifyFromInput = core.getInput("verify-from");
    console.log(`Verifying Issue ID from ${verifyFromInput}`);

    // `fail-invalid` input defined in action.yml
    const failInvalidInput = core.getInput("fail-invalid");
    console.log(`Fail Invalid? ${failInvalidInput}`);

    const config = {
      baseUrl: process.env.JIRA_BASE_URL,
      token: process.env.JIRA_API_TOKEN,
      email: process.env.JIRA_USER_EMAIL
    };

    const jira = new Jira(config);
    const octokit = new github.GitHub(githubToken);
    const context = github.context;
    const action = new Action({ context, jira, octokit });

    const valid = await action.validate(verifyFromInput);
    console.log({ valid });

    if (!valid && failInvalidInput === "true") {
      core.setFailed("Validation Failed!");
    }

    if (!valid && failInvalidInput === "checks") {
      console.log(`TODO: Send GitHub Check`);
    }

    core.setOutput("verified", `${valid}`);
  } catch (error) {
    core.setFailed(error.message);
  }
})();
