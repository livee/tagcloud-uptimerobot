'use strict';

module.exports = () => {
  const socket_options = {
    path: config.tagcloud.socketioPath,
    transports: ['websocket', 'polling'],
    'reconnection delay': 1000,
    'reconnection limit': 1000,
    'max reconnection attempts': 'Infinity',
    upgrades: 'websocket'
  };

  const io = require('socket.io-client');
  const socket = io(`${config.tagcloud.domain}/${config.tagcloud.namespace}`, socket_options);

  const credentials = { client: config.cloud.client, session: config.cloud.session };

  const createParams = (credentials, args) => {
    return {
      credentials: credentials,
      body: args
    };
  };

  const socketPromise = (event, params) => {
    return new Promise((resolve, reject) => {
      socket.emit(event, params, (error, response) => {
        if (error !== null) return reject(error);
        return resolve(response);
      });
    });
  };

  socket.emit('join', createParams(credentials, {}));
  socket.on('reconnect', function () {
    // on reconnect whe have to join the room, because otherwise we wont receive any updates from server
    socket.emit('join', createParams(credentials, {}));
  });
  socket.on('connect_error', (err) => {
    logger.error('connection error: ' + JSON.stringify(err));
  });

  const create = (cloud) => socketPromise('CLOUD_CREATE', createParams(credentials, cloud));

  const remove = (id) => socketPromise('CLOUD_REMOVE', createParams(credentials, { id }));

  return {
    createProbe: async () => {
      const cloudToCreate = {
        name: `auto-created-${Date.now()}`,
        question: 'test',
        is_active: false,
        is_collecting: false,
        session_id: config.cloud.session,
        client: config.cloud.client
      };

      try {
        logger.info('attempt to create cloud: ' + JSON.stringify(cloudToCreate));

        const cloud = await create(cloudToCreate);

        try {
          logger.info('attempt to remove cloud: ' + JSON.stringify(cloud));
          await remove(cloud.id);
        } catch {
          // ignore remove error
        }

        return true;
      } catch (err) {
        logger.error(err);
        return false;
      }
    }
  };
};
