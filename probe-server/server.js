'use strict';

require('./bootstrap');
const schedule = require('node-schedule');

const Hapi = require('@hapi/hapi');

const TagcoudProbeService = require('./tagcloud-probe-service')();

const init = async () => {
  const server = Hapi.server({
    port: 3021,
    host: 'localhost'
  });

  server.app.createProbe = false;

  server.route({
    method: 'GET',
    path: '/create_probe',
    handler: (request, h) => {
      return server.app.createProbe ? 'ok' : 'ko'
    }
  });

  await server.start();
  console.log('Server running on %s', server.info.uri);

  const createProbe = async () => {
    try {
      server.app.createProbe = await TagcoudProbeService.createProbe();
    } catch {
      server.app.createProbe = false;
    }
  };

  createProbe();
  schedule.scheduleJob('*/5 * * * *', () => {
    createProbe();
  })
};

process.on('unhandledRejection', (err) => {
  console.log(err);
  process.exit(1);
});

init();
