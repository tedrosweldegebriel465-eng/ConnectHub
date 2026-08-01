/**
 * Seed script — creates a default test user
 * Run with: node server/scripts/seed.js
 */
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const User = require("../models/user");

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    // Check if test user already exists
    const exists = await User.findOne({ email: "test@socialapp.com" });
    if (exists) {
      console.log("ℹ️  Test user already exists — skipping creation");
      console.log("\n📋 Login credentials:");
      console.log("   Email:    test@socialapp.com");
      console.log("   Password: Test@1234");
      process.exit(0);
    }

    const user = await User.create({
      name: "Test User",
      username: "testuser",
      email: "test@socialapp.com",
      password: "Test@1234",
      bio: "This is the default test account for ConnectHub",
    });

    console.log("✅ Test user created successfully!");
    console.log("\n📋 Login credentials:");
    console.log("   Email:    test@socialapp.com");
    console.log("   Password: Test@1234");
    console.log("   Username: testuser");
    console.log("\n🌐 Go to: http://localhost:5000/login.html");

    process.exit(0);
  } catch (err) {
    console.error("❌ Seed error:", err.message);
    process.exit(1);
  }
}

seed();
