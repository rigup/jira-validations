const core = require("@actions/core");
const github = require("@actions/github");
const jira = require("./common/net/jira");

try {
  //   if (!process.env.JIRA_BASE_URL)
  //     throw new Error("Please specify JIRA_BASE_URL env");
  //   if (!process.env.JIRA_API_TOKEN)
  //     throw new Error("Please specify JIRA_API_TOKEN env");
  //   if (!process.env.JIRA_USER_EMAIL)
  //     throw new Error("Please specify JIRA_USER_EMAIL env");

  // `verify-from` input defined in action metadata file
  const verifyFromInput = core.getInput("verify-from");
  console.log(`Verifying Issue ID from ${verifyFromInput}`);

  // `fail-invalid` input defined in action metadata file
  const failInvalidInput = core.getInput("fail-invalid");
  console.log(`Fail Invalid? ${failInvalidInput}`);

  // Get the JSON webhook payload for the event that triggered the workflow
  const payload = JSON.stringify(github.context.payload, undefined, 2);

  //   const config = {
  //     baseUrl: process.env.JIRA_BASE_URL,
  //     token: process.env.JIRA_API_TOKEN,
  //     email: process.env.JIRA_USER_EMAIL
  //   };

  //   this.jira = new jira(config);

  core.setOutput("verified", true);
  console.log(`The event payload: ${payload}`);
} catch (error) {
  core.setFailed(error.message);
}
