/* eslint-disable no-param-reassign */
/* eslint-disable class-methods-use-this */
const fetch = require('node-fetch');
const core = require('@actions/core');

module.exports = class {
  async request(state) {
    const response = await fetch(state.req.url, state.req);

    core.info(JSON.stringify(response));

    state.res = {
      headers: response.headers.raw(),
      status: response.status,
    };

    state.res.body = await response.text();

    const isJSON = (response.headers.get('content-type') || '').includes('application/json');

    if (isJSON && state.res.body) {
      state.res.body = JSON.parse(state.res.body);
    }

    if (!response.ok) {
      throw new Error(response.statusText);
    }

    return state;
  }
};
