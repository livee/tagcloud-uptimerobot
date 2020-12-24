const config = require('./config');

global.logger = require('lib-logger');
global.config = config(logger);
