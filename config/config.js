const _ = require("underscore");
const path = require("path");
const util = require("util");
const fs = require("fs");

const finalEnv = process.env.NODE_ENV || "development";

const allConf = require(path.resolve(__dirname + "/../config/env/all.js"));
const envConf = require(path.resolve(__dirname + "/../config/env/" + finalEnv.toLowerCase() + ".js")) || {};

// Read MongoDB URI from Docker secret file if it exists
let mongodbUri;
const secretPath = "/run/secrets/mongodb_uri";

try {
  if (fs.existsSync(secretPath)) {
    mongodbUri = fs.readFileSync(secretPath, "utf8").trim();
    console.log("Using MongoDB URI from Docker Secret:", mongodbUri);
  } else {
    mongodbUri = process.env.MONGODB_URI || "mongodb://localhost:27017/nodegoat";
    console.log("Using MongoDB URI from environment or default:", mongodbUri);
  }
} catch (err) {
  console.error("Error reading MongoDB URI:", err);
  process.exit(1);
}

// Merge configurations
const config = { ...allConf, ...envConf, db: mongodbUri };

console.log(`Current Config:`);
console.log(util.inspect(config, false, null));

module.exports = config;
