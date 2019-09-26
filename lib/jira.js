/* eslint-disable no-param-reassign */
const { format } = require('url');
const { get } = require('lodash');

const serviceName = 'jira';
const client = require('./common/net/client')(serviceName);

module.exports = class {
  constructor({ baseUrl, token, email }) {
    this.baseUrl = baseUrl;
    this.token = token;
    this.email = email;
  }

  async createIssue(body) {
    return this.fetch('createIssue', { pathname: '/rest/api/2/issue' }, { method: 'POST', body });
  }

  async getIssue(issueId, query = {}) {
    const { fields = [], expand = [] } = query;

    try {
      const res = await this.fetch('getIssue', {
        pathname: `/rest/api/2/issue/${issueId}`,
        query: {
          fields: fields.join(','),
          expand: expand.join(','),
        },
      });

      return res;
    } catch (error) {
      if (get(error, 'res.status') === 404) {
        return {};
      }

      throw error;
    }
  }

  async getUsers() {
    const query = { maxResults: 70 };
    return this.fetch('getUsers', {
      pathname: `/rest/api/3/users/search`,
      query,
    });
  }

  async getUsersFromAccountIds(accountIds) {
    const query = { maxResults: 25, accountId: accountIds };

    return this.fetch('getUsersBulk', {
      pathname: `rest/api/3/user/bulk`,
      query,
    });
  }

  async addCodeReviewersToIssue(issueId, reviewers) {
    const customFieldId = 10180; // Code Reviewers

    const fields = {};
    fields[`customfield_${customFieldId}`] = reviewers;
    const data = {
      fields,
    };
    return this.editIssue(issueId, data);
  }

  async editIssue(issueId, data) {
    return this.fetch(
      'editIssue',
      {
        pathname: `/rest/api/3/issue/${issueId}`,
      },
      {
        method: 'PUT',
        body: data,
      }
    );
  }

  async getIssueTransitions(issueId) {
    return this.fetch(
      'getIssueTransitions',
      {
        pathname: `/rest/api/2/issue/${issueId}/transitions`,
      },
      {
        method: 'GET',
      }
    );
  }

  async transitionIssue(issueId, data) {
    return this.fetch(
      'transitionIssue',
      {
        pathname: `/rest/api/3/issue/${issueId}/transitions`,
      },
      {
        method: 'POST',
        body: data,
      }
    );
  }

  async fetch(apiMethodName, { host, pathname, query }, { method, body, headers = {} } = {}) {
    const url = format({
      host: host || this.baseUrl,
      pathname,
      query,
    });

    if (!method) {
      method = 'GET';
    }

    if (headers['Content-Type'] === undefined) {
      headers['Content-Type'] = 'application/json';
    }

    if (headers.Authorization === undefined) {
      headers.Authorization = `Basic ${Buffer.from(`${this.email}:${this.token}`).toString(
        'base64'
      )}`;
    }

    // strong check for undefined
    // cause body variable can be 'false' boolean value
    if (body && headers['Content-Type'] === 'application/json') {
      body = JSON.stringify(body);
    }

    const state = {
      req: {
        method,
        headers,
        body,
        url,
      },
    };

    try {
      await client(state, `${serviceName}:${apiMethodName}`);
    } catch (error) {
      const fields = {
        originError: error,
        source: 'jira',
      };

      delete state.req.headers;

      throw Object.assign(new Error('Jira API error'), state, fields);
    }

    return state.res.body;
  }
};
