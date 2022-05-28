const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.join("/etc", "hgwarmap.env")});

module.exports = {
    apps: [{
        name: "hgapi",
        script: "./dist/index.js",
        env: {
            NODE_ENV: "production",
            HAG_USERNAME: String(process.env.HAG_USERNAME),
            HAG_USERAGENT: String(process.env.HAG_USERAGENT),
            HAG_PASSWORD: String(process.env.HAG_PASSWORD),
        },
    }],
    deploy: {
        production: {
            user: "root",
            host: [
                "192.168.3.104"
            ],
            ref: "origin/main",
            repo: "git@github.com:raouldeheer/hgapi.git",
            path: "/mnt/apps/hgwarmap",
            "post-deploy": "npm run post-deploy && pm2 startOrRestart ecosystem.config.js --env production",
        },
    },
};
