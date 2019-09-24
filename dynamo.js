const AWS = require("aws-sdk");

const PEOPLE_TABLE_NAME = process.env.PEOPLE_TABLE_NAME;

class NotFoundError extends Error {}

module.exports = class {
  constructor() {
    this.dynamo = new AWS.DynamoDB();
  }

  async findByGithubId(githubId) {
    return findBy("githubId", githubId);
  }

  async findBy(attr, value) {
    return dynamo
      .query(PEOPLE_TABLE_NAME, `${attr}-index`, `${attr} = :v1`, {
        ":v1": githubId
      })
      .then(results => {
        if (results.count === 1) {
          return results.items[0];
        } else {
          throw new NotFoundError();
        }
      });
  }
};
