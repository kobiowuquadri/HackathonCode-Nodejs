#!/usr/bin/env node

"use strict";

// This script resets the MongoDB database for NodeGoat using a Docker Secret for the URI.
// Usage: Ensure the MONGODB_URI secret is defined in your Docker Compose.

const { MongoClient } = require('mongodb');
const fs = require('fs');

const mongodbUriPath = '/run/secrets/mongodb_uri';
let dbUri;

try {
  dbUri = fs.readFileSync(mongodbUriPath, 'utf8').trim();
  console.log('Using MongoDB URI from Docker Secret:', dbUri);
} catch (err) {
  console.error('Failed to read MongoDB URI secret:', err);
  console.error('Ensure the MONGODB_URI secret is correctly configured in Docker Compose.');
  process.exit(1);
}

const dbName = new URL(dbUri).pathname.replace(/^\//, '');

console.log("Using DB Name:", dbName);

const USERS_TO_INSERT = [
  {
    _id: 1,
    userName: "admin",
    firstName: "Node Goat",
    lastName: "Admin",
    password: "Admin_123",
    isAdmin: true,
  },
  {
    _id: 2,
    userName: "user1",
    firstName: "John",
    lastName: "Doe",
    benefitStartDate: "2030-01-10",
    password: "User1_123",
  },
  {
    _id: 3,
    userName: "user2",
    firstName: "Will",
    lastName: "Smith",
    benefitStartDate: "2025-11-30",
    password: "User2_123",
  },
];

const COLLECTIONS = ["users", "allocations", "contributions", "memos", "counters"];

async function resetDatabase() {
  console.log("Connecting to MongoDB...");

  const client = new MongoClient(dbUri);

  try {
    await client.connect();
    const db = client.db(dbName);
    console.log(`Connected to database: ${dbName}`);

    // Drop specified collections if they exist
    console.log("Dropping existing collections...");
    for (const name of COLLECTIONS) {
      const exists = await db.listCollections({ name }).hasNext();
      if (exists) {
        await db.collection(name).drop();
        console.log(`Dropped collection: ${name}`);
      }
    }

    // Insert users
    const usersCol = db.collection("users");
    const countersCol = db.collection("counters");
    const allocationsCol = db.collection("allocations");

    console.log("Resetting counter...");
    await countersCol.insertOne({ _id: "userId", seq: USERS_TO_INSERT.length });
    console.log("Inserted counter");

    console.log("Inserting users...");
    const userResult = await usersCol.insertMany(USERS_TO_INSERT);
    console.log(`Inserted ${userResult.insertedCount} users`);

    // Generate and insert allocations
    const allocations = USERS_TO_INSERT.map((user) => {
      const stocks = Math.floor(Math.random() * 40 + 1);
      const funds = Math.floor(Math.random() * 40 + 1);
      return {
        userId: user._id,
        stocks,
        funds,
        bonds: 100 - (stocks + funds),
      };
    });

    console.log("Inserting allocations...");
    const allocResult = await allocationsCol.insertMany(allocations);
    console.log(`Inserted ${allocResult.insertedCount} allocations`);

    console.log("✅ Database reset performed successfully.");
  } catch (err) {
    console.error("❌ Error during DB reset:", err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

resetDatabase();
