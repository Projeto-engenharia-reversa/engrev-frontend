const target = process.env.API_PROXY || 'http://localhost:8000';

module.exports = {
  '/api': { target, changeOrigin: true },
  '/health': { target, changeOrigin: true },
};
