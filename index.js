const core = require("@actions/core");
const github = require("@actions/github");
const jira = require("./common/net/jira");
const action = require("./action");

try {
  if (!process.env.JIRA_BASE_URL)
    throw new Error("Please specify JIRA_BASE_URL env");
  if (!process.env.JIRA_API_TOKEN)
    throw new Error("Please specify JIRA_API_TOKEN env");
  if (!process.env.JIRA_USER_EMAIL)
    throw new Error("Please specify JIRA_USER_EMAIL env");

  // `verify-from` input defined in action metadata file
  const verifyFromInput = core.getInput("verify-from");
  console.log(`Verifying Issue ID from ${verifyFromInput}`);

  const { eventName, payload } = github.context;

  const config = {
    baseUrl: process.env.JIRA_BASE_URL,
    token: process.env.JIRA_API_TOKEN,
    email: process.env.JIRA_USER_EMAIL
  };

  this.jira = new jira(config);
  this.action = new action(payload, this.jira);

  switch (verifyFromInput) {
    case "all":
      break;
    case "commits":
      break;
    case "branch":
    default:
  }

  core.setOutput("verified", true);
  console.log(`The context: ${JSON.stringify(github.context)}`);
} catch (error) {
  core.setFailed(error.message);
}
