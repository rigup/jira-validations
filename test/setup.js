const path = require('path');
const { Polly, setupMocha: setupPolly } = require('@pollyjs/core');
const NodeHttpAdapter = require('@pollyjs/adapter-node-http');
const FSPersister = require('@pollyjs/persister-fs');
const dotenv = require('dotenv');

dotenv.config();

Polly.register(NodeHttpAdapter);
Polly.register(FSPersister);

setupPolly({
  adapters: ['node-http'],
  persister: 'fs',
  persisterOptions: {
    fs: {
      recordingsDir: path.resolve(__dirname, './recordings'),
    },
  },
  logging: true,
});

// eslint-disable-next-line func-names
beforeEach(function() {
  const { server } = this.polly;
  // Before saving the recording we will look for any Authorization Head and remove the value
  server.any().on('beforePersist', (req, recording) => {
    // eslint-disable-next-line no-param-reassign
    recording.request.headers = recording.request.headers.map((header) => {
      if (header.name.toLowerCase() === 'authorization') {
        // eslint-disable-next-line no-param-reassign
        header.value = [''];
      }
      return header;
    });
  });
});
