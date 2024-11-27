import { Denorite } from "./denorite.ts";

const denorite = new Denorite({
  port: 8080,
  jwtSecret: "your-secret-key",
  allowedOrigins: ["http://localhost:25565"]
});

// Listen for events
denorite.on("player_joined", (data) => {
  console.log("Player joined:", data);
});

denorite.on("player_left", (data) => {
  console.log("Player left:", data);
});

denorite.on("player_chat", (data) => {
  console.log(`${data.playerName}: ${data.message}`);
});

// Listen for connection events
denorite.on("connection", ({ count }) => {
  console.log(`Minecraft server connected. Total connections: ${count}`);
});

denorite.on("disconnection", ({ count }) => {
  console.log(`Minecraft server disconnected. Total connections: ${count}`);
});

// Handle errors
denorite.on("error", (error) => {
  console.error("WebSocket error:", error);
});

// Start the server
await denorite.start();

// Send commands when needed
try {
  const response = await denorite.sendCommand("/give @a diamond");
  console.log("Command response:", response);
} catch (err) {
  console.error("Command failed:", err);
}

// To stop the server when done
// await denorite.stop();
