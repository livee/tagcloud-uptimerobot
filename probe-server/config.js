"use strict";

module.exports = (logger) => {
  return require("common-env/withLogger")(logger).getOrElseAll({
    api: {
      port: 3021,
    },
    tagcloud: {
      domain: "https://tagcloud.staging.livee.com",
      namespace: "tagcloud",
      socketioPath: "/api/socket.io/",
    },
    cloud: {
      session: "691381",
      client: "robot.tests",
    },
  });
};
