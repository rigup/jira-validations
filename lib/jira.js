/* eslint-disable no-param-reassign */
const querystring = require('querystring');
const axios = require('axios');

module.exports = class {
  constructor({ baseUrl, token, email }) {
    this.baseUrl = baseUrl;
    this.token = token;
    this.email = email;

    const headers = {};
    headers['Content-Type'] = 'application/json';
    headers.Accept = 'application/json';
    headers.Authorization = `Basic ${Buffer.from(`${this.email}:${this.token}`).toString(
      'base64'
    )}`;

    this.instance = axios.create({
      baseURL: baseUrl,
      headers,
      timeout: 5000,
    });
  }

  async getIssue(issueId) {
    return this.instance.get(`/rest/api/3/issue/${issueId}`);
  }

  async getUsers() {
    return this.instance.get(`/rest/api/3/users/search`, {
      params: { maxResults: 70 },
    });
  }

  async getUsersFromAccountIds(accountIds) {
    return this.instance.get(`/rest/api/3/user/bulk`, {
      params: { maxResults: 25, accountId: accountIds },
      paramsSerializer: (params) => {
        return querystring.stringify(params);
      },
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

  async addApproversToIssue(issueId, approvers) {
    const customFieldId = 10003; // Approvers

    const fields = {};
    fields[`customfield_${customFieldId}`] = approvers;
    const data = {
      fields,
    };
    return this.editIssue(issueId, data);
  }

  async addAssigneeToIssue(issueId, assignee) {
    const data = { accountId: assignee.accountId };
    return this.instance.put(`/rest/api/3/issue/${issueId}/assignee`, {
      ...data,
    });
  }

  async editIssue(issueId, data) {
    return this.instance.put(`/rest/api/3/issue/${issueId}`, { ...data });
  }

  async getIssueTransitions(issueId) {
    return this.instance(`/rest/api/3/issue/${issueId}/transitions`);
  }

  async setReleasePlatform(issueId, releasePlatform) {
    const customFieldId = 10189; // Release Platform

    const fields = {};
    fields[`customfield_${customFieldId}`] = { value: releasePlatform };
    const data = {
      fields,
    };
    return this.editIssue(issueId, data);
  }

  async transitionIssue(issueId, data) {
    return this.instance.post(`/rest/api/3/issue/${issueId}/transitions`, {
      ...data,
    });
  }
};
