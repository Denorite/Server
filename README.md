# Denorite Server

A Deno WebSocket server that bridges the gap between Minecraft and TypeScript, enabling real-time event monitoring and command execution.

## Features

- Real-time Minecraft event monitoring
- Secure WebSocket communication using JWT authentication
- Custom command registration system
- BlueMap integration for dynamic map markers
- Type-safe event handling
- Automatic reconnection handling

## Requirements

- Deno 2.0 or higher
- [Denorite Mod](https://github.com/denorite/mod) installed on your Minecraft server

## Installation

1. Clone the repository:
```bash
git clone https://github.com/denorite/server.git
cd denorite-server
```

2. Edit the configuration

## Usage

Start the server:
```bash
deno run --allow-net main.ts
```

### Event Listening

```typescript
import { Denorite } from "./denorite.ts";

const denorite = new Denorite({
  port: 8082,
  jwtSecret: "your-secret-key",
  allowedOrigins: ["http://localhost:25565"]
});

// Listen for player events
denorite.on("player_joined", (data) => {
  console.log(`Player ${data.playerName} joined the game`);
});

denorite.on("player_chat", (data) => {
  console.log(`${data.playerName}: ${data.message}`);
});

await denorite.start();
```

### Command Execution

```typescript
try {
  const response = await denorite.sendCommand("/time set day");
  console.log("Command response:", response);
} catch (err) {
  console.error("Command failed:", err);
}
```

### BlueMap Marker Management

```typescript
// Add a POI marker
await denorite.sendCommand({
  type: "bluemap",
  data: {
    subcommand: "add",
    arguments: {
      markerset: "spawn-points",
      markerid: "spawn-1",
      type: "poi",
      data: JSON.stringify({
        label: "Main Spawn",
        position: { x: 100, y: 64, z: 100 }
      })
    }
  }
});
```

## Events

The server receives the following events from the Minecraft mod:

### Player Events
- `player_joined` - When a player joins the server
- `player_left` - When a player leaves the server
- `player_chat` - When a player sends a chat message
- `player_death` - When a player dies
- `player_respawned` - When a player respawns

### World Events
- `world_load` - When a world loads
- `world_unload` - When a world unloads
- `weather_update` - When weather changes

### Entity Events
- `entity_death` - When an entity dies
- `entity_changed_world` - When an entity changes dimension

### Server Events
- `server_starting` - When the server is starting
- `server_started` - When the server has started
- `server_stopping` - When the server is stopping
- `server_stopped` - When the server has stopped

## Security

The server implements several security measures:

1. JWT Authentication
2. Origin validation
3. Command validation
4. Secure WebSocket connections

## Error Handling

The server includes robust error handling:

- Automatic reconnection attempts
- Command timeout handling
- Event error isolation
- Connection state management

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
