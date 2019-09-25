const AWS = require('aws-sdk');
const moment = require('moment');
const _ = require('lodash');
const { mapValues } = require('lodash');

const { PEOPLE_TABLE_NAME } = process.env;

module.exports = class {
  constructor() {
    this.dynamo = new AWS.DynamoDB({ region: 'us-east-1' });
  }

  annotate(item) {
    return mapValues(item, this.annotateValue.bind(this));
  }

  annotateValue(value) {
    if (typeof value === 'string') {
      return { S: value };
    }
    if (typeof value === 'number') {
      return { N: value.toString() };
    }
    if (typeof value === 'boolean') {
      return { BOOL: value };
    }
    if (value == null) {
      return { NULL: true };
    }
    if (moment.isMoment(value)) {
      return { S: value.toISOString() };
    }
    if (_.isArray(value)) {
      return { L: _.map(value, this.annotateValue.bind(this)) };
    }
    if (_.isPlainObject(value)) {
      return { M: this.annotate(value) };
    }
  }

  async query(table, index, condition, attrs) {
    const params = {
      TableName: table,
      IndexName: index,
      KeyConditionExpression: condition,
      ExpressionAttributeValues: this.annotate(attrs),
    };

    return await this.dynamo.query(params).promise();
  }

  async findByGithubId(githubId) {
    return await this.findBy('githubId', githubId);
  }

  async findBy(attr, value) {
    return this.query(PEOPLE_TABLE_NAME, `${attr}-index`, `${attr} = :v1`, {
      ':v1': value,
    });
  }
};
