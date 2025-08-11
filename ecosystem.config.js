module.exports = {
  apps: [{
    name: 'algoqube-backend',
    script: 'dist/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 4000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 4000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024',
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'dist'],
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    // Auto restart on file changes (development only)
    watch: process.env.NODE_ENV === 'development',
    // Health check
    health_check_grace_period: 3000,
    // Kill timeout
    kill_timeout: 5000,
    // Wait ready
    wait_ready: true,
    listen_timeout: 10000
  }]
}; 