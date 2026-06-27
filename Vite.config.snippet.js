// Reference only: this project already applies this proxy in vite.config.js.

export const viteProxySnippet = {
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
};
