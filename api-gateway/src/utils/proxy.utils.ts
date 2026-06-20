import {
  createProxyMiddleware,
  fixRequestBody,
} from "http-proxy-middleware";

export const createServiceProxy = (
  target: string,
  basePath: string
) => {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    ws: true,

    proxyTimeout: 5000,
    timeout: 5000,

    pathRewrite: (path) => {
      return basePath + path;
    },

    on: {
      proxyReq: (proxyReq, req) => {
        fixRequestBody(proxyReq, req);

        console.log(
          `[Gateway] ${req.method} ${basePath}${req.url} -> ${target}`
        );
      },

      error: (err, req, res: any) => {
        console.error(
          `[Gateway Error] ${target}:`,
          err.message
        );

        if (!res.headersSent) {
          res.status(503).json({
            success: false,
            message: "Service temporarily unavailable",
          });
        }
      },
    },
  });
};