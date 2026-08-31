module.exports = {
  apps: [{
    name: "rengas-backend",
    script: "dist/main.js",
    cwd: __dirname,
    instances: 1,
    exec_mode: "fork",
    autorestart: true,
    max_memory_restart: "750M",
    env_production: {
      NODE_ENV: "production",
      PORT: 3000,
      UPLOAD_DIR: "/var/www/rengas-admin/shared/uploads",
    },
  }],
};
