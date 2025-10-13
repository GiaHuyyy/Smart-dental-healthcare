#!/usr/bin/env node

/**
 * Quick test script for Appointment Notification System
 * Tests Socket.IO connection and event emission
 */

const io = require("socket.io-client");

// Configuration
const SERVER_URL = process.env.SERVER_URL || "http://localhost:8081";
const TEST_USER_ID = process.env.TEST_USER_ID || "60d5ec49f1b2c72b8c8e4a1b";
const TEST_USER_ROLE = process.env.TEST_USER_ROLE || "doctor";
const TEST_TOKEN = process.env.TEST_TOKEN || "dummy-token-for-test";

console.log("=== Appointment Socket Connection Test ===\n");
console.log(`Server URL: ${SERVER_URL}`);
console.log(`User ID: ${TEST_USER_ID}`);
console.log(`User Role: ${TEST_USER_ROLE}\n`);

// Connect to appointments namespace
const socket = io(`${SERVER_URL}/appointments`, {
  auth: {
    userId: TEST_USER_ID,
    userRole: TEST_USER_ROLE,
    token: TEST_TOKEN,
  },
  transports: ["websocket", "polling"],
});

let connected = false;
let receivedEvents = [];

// Connection handlers
socket.on("connect", () => {
  console.log("✅ Connected to appointment socket");
  console.log(`Socket ID: ${socket.id}\n`);
  connected = true;
});

socket.on("disconnect", (reason) => {
  console.log(`❌ Disconnected: ${reason}\n`);
  connected = false;
});

socket.on("connect_error", (error) => {
  console.error("❌ Connection error:", error.message);
  console.error("Details:", error);
});

// Event listeners
socket.on("appointment:new", (data) => {
  console.log("📩 Received: appointment:new");
  console.log("Data:", JSON.stringify(data, null, 2));
  receivedEvents.push({ type: "appointment:new", data, timestamp: new Date() });
});

socket.on("appointment:confirmed", (data) => {
  console.log("📩 Received: appointment:confirmed");
  console.log("Data:", JSON.stringify(data, null, 2));
  receivedEvents.push({ type: "appointment:confirmed", data, timestamp: new Date() });
});

socket.on("appointment:cancelled", (data) => {
  console.log("📩 Received: appointment:cancelled");
  console.log("Data:", JSON.stringify(data, null, 2));
  receivedEvents.push({ type: "appointment:cancelled", data, timestamp: new Date() });
});

socket.on("appointment:rescheduled", (data) => {
  console.log("📩 Received: appointment:rescheduled");
  console.log("Data:", JSON.stringify(data, null, 2));
  receivedEvents.push({ type: "appointment:rescheduled", data, timestamp: new Date() });
});

// Status check every 5 seconds
setInterval(() => {
  console.log(`\n--- Status Check ---`);
  console.log(`Connected: ${connected ? "✅" : "❌"}`);
  console.log(`Events received: ${receivedEvents.length}`);
  console.log(`-------------------\n`);
}, 5000);

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\n=== Test Summary ===");
  console.log(`Total events received: ${receivedEvents.length}`);
  if (receivedEvents.length > 0) {
    console.log("\nEvent breakdown:");
    const eventCounts = receivedEvents.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {});
    Object.entries(eventCounts).forEach(([type, count]) => {
      console.log(`  - ${type}: ${count}`);
    });
  }
  console.log("\n✅ Test completed\n");
  socket.close();
  process.exit(0);
});

console.log("Listening for events... (Press Ctrl+C to exit)\n");
console.log("💡 Tip: Create/cancel appointments in the UI to test notifications\n");
