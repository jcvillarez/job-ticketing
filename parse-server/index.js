const express = require("express");
const { ParseServer } = require("parse-server");
const ParseDashboard = require("parse-dashboard");
const Parse = require("parse/node");
const cors = require("cors");

const app = express();
app.use(cors());

// Constants
const APP_ID = "final";
const MASTER_KEY = "master";
const SERVER_URL = "http://localhost:1337/parse";

// Initialize Parse Server
const parseServer = new ParseServer({
  databaseURI: "mongodb://127.0.0.1:27017/parseDB",
  appId: APP_ID,
  masterKey: MASTER_KEY,
  serverURL: SERVER_URL,
  allowClientClassCreation: true
});

// Initialize Dashboard
const dashboard = new ParseDashboard({
  apps: [
    {
      serverURL: SERVER_URL,
      appId: APP_ID,
      masterKey: MASTER_KEY,
      appName: "Backend Server"
    }
  ],
  users: [
    {
      user: "admin",
      pass: "m1sm4st3rcL4ss@!"
    }
  ]
}, { allowInsecureHTTP: true });

// Function to create admin user if not exists
async function createAdminUser() {
  Parse.initialize(APP_ID, null, MASTER_KEY);
  Parse.serverURL = SERVER_URL;

  try {
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
  } catch (err) {
    console.error("❌ Error checking/creating admin user:", err);
  }
}

// Start server function
async function startServer() {
  await parseServer.start();

  // Mount Parse Server and Dashboard
  app.use("/parse", parseServer.app);
  app.use("/dashboard", dashboard);

  app.listen(1337, async () => {
    console.log("🚀 Parse Server running on http://localhost:1337/parse");
    console.log("🌐 Dashboard: http://localhost:1337/dashboard");

    // Create admin user without blocking server
    createAdminUser();
  });
}

// Start everything
startServer();