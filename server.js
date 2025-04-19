"use strict";

const express = require("express");
const favicon = require("serve-favicon");
const bodyParser = require("body-parser");
const session = require("express-session");
const fs = require("fs");
const http = require("http");
const https = require("https");
const path = require("path");
const csrf = require('csurf');
const consolidate = require("consolidate"); // Templating library adapter for Express
const swig = require("swig");
const helmet = require("helmet");
const MongoClient = require("mongodb").MongoClient; // Driver for connecting to MongoDB
const marked = require("marked");
// const nosniff = require('dont-sniff-mimetype');
const app = express(); // Web framework to handle routing requests
const routes = require("./app/routes");
const { port, db, cookieSecret } = require("./config/config"); // Application config properties

// Fix for A6-Sensitive Data Exposure
// Load keys for establishing secure HTTPS connection
const httpsOptions = {
    key: fs.readFileSync(path.resolve(__dirname, "./artifacts/cert/server.key")),
    cert: fs.readFileSync(path.resolve(__dirname, "./artifacts/cert/server.crt")),
  };


console.log("Starting server...");

async function startServer() {
    try {

        console.log("Connecting to MongoDB...");
        const client = await MongoClient.connect(db); // Removed deprecated options
        console.log("Connected to the database");

        const database = client.db(); // Initialize the database
        routes(app, database); // Pass the database to your routes

        // Start the HTTP server
        http.createServer(app).listen(port, '0.0.0.0', () => {
            console.log(`Express http server listening on http://0.0.0.0:${port}`);
        });

        /*
        // Fix for A6-Sensitive Data Exposure
        // Use secure HTTPS protocol
        https.createServer(httpsOptions, app).listen(port, () => {
            console.log(`Express https server listening on port ${port}`);
        });
        */
    } catch (err) {
        console.error("Error connecting to the database:", err.stack);
        process.exit(1);
    }
}

startServer();

/*
    // Fix for A5 - Security MisConfig
    // TODO: Review the rest of helmet options, like "xssFilter"

    // TODO: Add another vuln: https://github.com/helmetjs/helmet/issues/26
    // Enable XSS filter in IE (On by default)
    // app.use(helmet.xssFilter({ setOnOldIE: true }));

    // Forces browser to only use the Content-Type set in the response header instead of sniffing or guessing it
    app.use(nosniff());
*/
// Use helmet to secure HTTP headers
app.use(helmet());

// Remove the "X-Powered-By" header to prevent revealing the technology stack
app.disable("x-powered-by");

// Add additional helmet security options as necessary
app.use(helmet.frameguard()); // Protects against clickjacking
app.use(helmet.noCache()); // Prevents caching
app.use(helmet.hsts()); // Enforces HTTPS
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
    },
  })
); 

// Implement Content Security Policy (CSP)
app.use(helmet.referrerPolicy({ policy: "same-origin" })); // Set referrer policy
app.use(helmet.dnsPrefetchControl()); // Control DNS prefetching

// Adding/ remove HTTP Headers for security
app.use(favicon(__dirname + "/app/assets/favicon.ico"));

// Express middleware to populate "req.body" so we can access POST variables
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    // Mandatory in Express v4
    extended: false
}));

// Enable session management using express middleware
app.use(
    session({
      secret: cookieSecret,
      saveUninitialized: true,
      resave: true,
      cookie: {
        httpOnly: true, // Prevents client-side access to the cookie (mitigates XSS risks)
        secure: process.env.NODE_ENV === "production", // Ensure the cookie is only sent over HTTPS in production
        maxAge: 60 * 60 * 1000, // Set session expiration time
      },
    })
  );

// Fix for A8 - CSRF
// Enable Express csrf protection
app.use(csrf());
// Make csrf token available in templates
app.use((req, res, next) => {
  res.locals.csrftoken = req.csrfToken();
  next();
});

// Register templating engine
app.engine(".html", consolidate.swig);
app.set("view engine", "html");
app.set("views", `${__dirname}/app/views`);

// Fix for A5 - Security MisConfig
// TODO: make sure assets are declared before app.use(session())
app.use(express.static(`${__dirname}/app/assets`));

// Initializing marked library
// Fix for A9 - Insecure Dependencies
marked.setOptions({
    sanitize: true, // Sanitize HTML to prevent XSS
    headerIds: false, // Disable automatic ID generation for headers to mitigate header injection
  });
  app.locals.marked = marked;

// Template system setup
swig.setDefaults({
    // Autoescape disabled
    autoescape: false
    /*
    // Fix for A3 - XSS, enable auto escaping
    autoescape: true // default value
    */
});
