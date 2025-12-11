module.exports = {
    apps: [{
        name: "sucht-backend",
        script: "dist/main.js",
        instances: 1,
        autorestart: true,
        watch: false,
        max_memory_restart: "500M",
        combine_logs: true,
        env: {
            NODE_ENV: "production",
        }
    }]
}
