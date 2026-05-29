// PM2 process definition — used when running the app via PM2 over SSH
// (as opposed to Plesk's managed Passenger). Start with: pm2 start ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'wa-automation-api',
      script: 'dist/main.js',
      cwd: __dirname,
      instances: 1, // keep 1: in-process BullMQ workers must not be duplicated
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
      },
      // Logs (Plesk: visible under the domain's logs dir)
      out_file: 'logs/out.log',
      error_file: 'logs/error.log',
      merge_logs: true,
      time: true,
    },
  ],
};
