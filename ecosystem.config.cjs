// PM2 untuk Cloudways: `pm2 start ecosystem.config.cjs` lalu `pm2 save`.
// Variabel lingkungan dibaca dari .env.production.local / .env.local di folder aplikasi (dimuat Next.js).
module.exports = {
  apps: [
    {
      name: "ikp-wahdah",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      env: { NODE_ENV: "production", PORT: process.env.PORT || 3000 },
      max_memory_restart: "600M",
      time: true,
    },
  ],
};
