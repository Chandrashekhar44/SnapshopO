    import { createProxyMiddleware } from "http-proxy-middleware";

    export const createSocketProxy = (target: string) => {
    return createProxyMiddleware({
        target,
        changeOrigin: true,
        ws: true,

        pathRewrite: (path) => {
        if (path.startsWith("/socket.io")) {
            return path;
        }

        return `/socket.io${path}`;
        },

        on: {
        error: (err) => {
            console.error(
            "[Socket Gateway Error]",
            err.message
            );
        },
        },
    });
    };