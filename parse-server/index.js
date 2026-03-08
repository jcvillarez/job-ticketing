const express = require("express");
const { ParseServer, FileSystemAdapter } = require("parse-server");
const ParseDashboard = require("parse-dashboard");
const Parse = require("parse/node");
const cors = require("cors");

const app = express();
app.use(cors());

const APP_ID = "final";
const MASTER_KEY = "master";
const SERVER_URL = "http://localhost:1337/parse"; // API endpoint
const FILES_DIR = "final"; // folder where Parse saves uploaded files
const FRONTEND_URL = "http://localhost:8080"; // your Vue frontend

// ----------------------
// Initialize Parse Server
// ----------------------
const parseServer = new ParseServer({
  databaseURI: "mongodb://127.0.0.1:27017/parseDB",
  appId: APP_ID,
  masterKey: MASTER_KEY,
  serverURL: SERVER_URL,
  publicServerURL: SERVER_URL, // <-- must be your Parse Server endpoint for files
  cloud: "./cloud/main.js",
  allowClientClassCreation: true,
  appName: "Backend Server",
  filesAdapter: new FileSystemAdapter({
    filesSubDirectory: FILES_DIR, // default "files" folder
  }),
  emailAdapter: {
    module: "parse-server-simple-mailgun-adapter",
    options: {
      fromAddress: "postmaster@sandbox307339f7ef3b44138abf7179e9af373d.mailgun.org",
      domain: "sandbox307339f7ef3b44138abf7179e9af373d.mailgun.org",
      apiKey: "612c082111166b5d74beafa8f63bc304-82cf32bf-2fca41c3",
      templates: {
        passwordResetEmail: {
          subject: "Reset your password",
          pathPlainText: null,
          pathHtml: null,
          callback: (user) => {
            // Redirect user to frontend reset password page
            return `${FRONTEND_URL}/resetPassword?token=${user.getSessionToken()}`;
          },
        },
      },
    },
  },
});

// ----------------------
// Initialize Parse Dashboard
// ----------------------
const dashboard = new ParseDashboard(
  {
    apps: [
      {
        serverURL: SERVER_URL,
        appId: APP_ID,
        masterKey: MASTER_KEY,
        appName: "Backend Server",
      },
    ],
    users: [
      {
        user: "admin",
        pass: "m1sm4st3rcL4ss@!",
      },
    ],
  },
  { allowInsecureHTTP: true }
);

// ----------------------
// Auto-create admin user
// ----------------------
async function createAdminUser() {
  Parse.initialize(APP_ID, null, MASTER_KEY);
  Parse.serverURL = SERVER_URL;

  const query = new Parse.Query(Parse.User);
  query.equalTo("username", "hashfloww@gmail.com");

  const existingUser = await query.first({ useMasterKey: true });
  if (!existingUser) {
    const user = new Parse.User();
    user.set("username", "hashfloww@gmail.com");
    user.set("password", "wkx5iab81lzu");
    user.set("role", "moderator");
    user.set("name", "Hashflow");
    user.set("address", "123 Elm St Metro Manila Quezon City, 1800");
    user.set("contact", "09123456789");

    await user.signUp(null, { useMasterKey: true });
    console.log("✅ Admin user created");
  } else {
    console.log("ℹ️ Admin user already exists");
  }
}

// ----------------------
// Start server
// ----------------------
async function startServer() {
  await parseServer.start();
  app.use("/parse", parseServer.app);
  app.use("/dashboard", dashboard);

  app.listen(1337, async () => {
    console.log("🚀 Parse Server running on", SERVER_URL);
    console.log("🌐 Dashboard: http://localhost:1337/dashboard");

    // Auto-create admin user
    createAdminUser();
  });
}

startServer();