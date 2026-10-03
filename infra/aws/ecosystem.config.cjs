// Node reads the protected backend .env; PM2 never saves secret values.
module.exports = {
  apps: [{
    name: "file-shelter-api",
    cwd: "/home/ubuntu/file-shelter/server",
    script: "server.js",
    node_args: "--env-file=/home/ubuntu/file-shelter/server/.env",
    instances: 1,
    exec_mode: "fork",
    autorestart: true,
    restart_delay: 3000,
    max_memory_restart: "600M",
    kill_timeout: 15000,
    time: true,
    env: { NODE_ENV: "production", PORT: "4000", AWS_REGION: "ap-south-1" },
  }],
};
