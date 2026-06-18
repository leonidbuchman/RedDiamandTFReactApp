const { createProxyMiddleware } = require("http-proxy-middleware");

const loggerTarget = "http://127.0.0.1:8085";

module.exports = function (app) {
  app.use(
    "/logpage",
    createProxyMiddleware({
      target: loggerTarget,
      changeOrigin: true,
      secure: false,
      pathRewrite: { "^/logpage": "/" },
      logLevel: "debug",
    })
  );

  app.use(
    "/socket.io",
    createProxyMiddleware({
      target: loggerTarget,
      changeOrigin: true,
      secure: false,
      ws: true,
      logLevel: "debug",
    })
  );
};

