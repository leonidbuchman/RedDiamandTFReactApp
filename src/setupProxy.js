const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  app.use(
    createProxyMiddleware(['/frontail', '/socket.io'], {
      target: 'http://192.168.2.45:8080',
      changeOrigin: true,
      ws: true,
      logLevel: 'silent',
      pathRewrite: (path, req) => {
        if (path.startsWith('/frontail')) {
          return '/';
        }
        return path;
      },
    }),
  );
};
