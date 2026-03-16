---
name: api-mock-server
description: 当用户需要模拟API、新增接口mock、启动mock服务器或管理模拟数据时，使用此技能。支持REST和SSE端点
---

# API Mock Server Skill

A lightweight, zero-dependency API Mock Server for frontend development and testing. This skill enables AI Agents to manage mock APIs programmatically.

## Quick Start

### Start the Server

The server code is included in this skill's `scripts` directory. Start it directly:

```bash
# Start server from skill directory (default port: 3000)
node /scripts/server.js

# Or with custom port
node /scripts/server.js
```

After startup, access:
- **Admin Panel**: `http://localhost:3000/`
- **API List**: `http://localhost:3000/_list`
- **Health Check**: `http://localhost:3000/_health`

## Management API Endpoints

All management APIs are prefixed with `/_api/routes`. The server must be running before calling these APIs.

### Health Check Endpoint

```http
GET /_health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": 1773384296000,
  "uptime": 123.456
}
```

Use this endpoint to check if the server is running and healthy.

### Shutdown Server Endpoint

```http
POST /_api/shutdown
```

**Response:**
```json
{
  "success": true,
  "message": "Server shutting down..."
}
```

Use this endpoint to gracefully shutdown the server. This endpoint requires authentication if admin password is enabled.

**Note:** After calling this endpoint, the server will close and the process will exit.

### Base URL
```
http://localhost:3000/_api/routes
```

### 1. List All Routes (GET)

```http
GET /_api/routes
```

**Response:**
```json
{
  "routes": [
    {
      "path": "/api/user",
      "method": "GET",
      "delay": 500,
      "response": { "code": 200, "data": {} },
      "createdAt": 1772527195265,
      "updatedAt": 1772527195265
    }
  ]
}
```

### 2. Create Route (POST)

```http
POST /_api/routes
Content-Type: application/json

{
  "path": "/api/users",
  "method": "GET",
  "delay": 200,
  "response": {
    "code": 200,
    "message": "success",
    "data": [{ "id": 1, "name": "John" }]
  }
}
```

**Response:** Returns the created route object.

### 3. Get Single Route (GET)

```http
GET /_api/routes/:key
```

**Key format:**
- REST: `METHOD:PATH` (e.g., `GET:/api/user`)
- SSE: `SSE:METHOD:PATH` (e.g., `SSE:GET:/sse/chat`)

**Example:**
```http
GET /_api/routes/GET:/api/users
```

### 4. Update Route (PUT)

```http
PUT /_api/routes/:key
Content-Type: application/json

{
  "delay": 1000,
  "response": {
    "code": 200,
    "data": [{ "id": 1, "name": "Updated" }]
  }
}
```

### 5. Delete Route (DELETE)

```http
DELETE /_api/routes/:key
```

**Example:**
```http
DELETE /_api/routes/GET:/api/users
```

### 6. Clear All Routes (POST)

```http
POST /_api/routes/clear
```

### 7. Export Routes (GET)

```http
GET /_api/routes/export
```

Returns all routes as JSON for backup.

### 8. Import Routes (POST)

```http
POST /_api/routes/import
Content-Type: application/json

{
  "routes": [
    {
      "path": "/api/imported",
      "method": "GET",
      "response": { "code": 200 }
    }
  ]
}
```

## Route Configuration Schema

### REST API Route

```json
{
  "path": "/api/example",
  "method": "GET",
  "delay": 0,
  "headers": { "X-Custom": "value" },
  "response": {
    "code": 200,
    "message": "success",
    "data": {}
  },
  "conditions": [
    {
      "match": {
        "body.action": { "operator": "equals", "value": "login" }
      },
      "response": { "code": 200, "data": { "token": "xxx" } }
    }
  ]
}
```

### SSE Route

```json
{
  "path": "/sse/stream",
  "method": "GET",
  "type": "sse",
  "delay": 0,
  "interval": 100,
  "repeat": false,
  "events": [
    { "data": "{\"type\":\"start\"}" },
    { "data": "{\"type\":\"message\",\"content\":\"Hello\"}" },
    { "data": "{\"type\":\"end\"}" }
  ]
}
```

## Condition Matching

Routes can return different responses based on request conditions:

| Condition Type | Description |
|---------------|-------------|
| `body` | Match request body field |
| `query` | Match URL query parameter |
| `header` | Match request header |
| `path` | Match path parameter (for dynamic paths) |

**Operators:** `equals`, `notEquals`, `contains`, `startsWith`, `endsWith`, `regex`, `exists`, `in`, `notIn`, `gt`, `gte`, `lt`, `lte`

**Example:**
```json
{
  "path": "/api/order",
  "method": "POST",
  "conditions": [
    {
      "match": {
        "body.status": { "operator": "equals", "value": "pending" }
      },
      "response": { "code": 200, "data": { "approved": false } }
    },
    {
      "match": {
        "body.status": { "operator": "equals", "value": "approved" }
      },
      "response": { "code": 200, "data": { "approved": true } }
    }
  ],
  "response": { "code": 400, "message": "Unknown status" }
}
```

## Common Use Cases

### 1. Quick Mock API Creation

```bash
curl -X POST http://localhost:3000/_api/routes \
  -H "Content-Type: application/json" \
  -d '{"path":"/api/products","method":"GET","response":{"code":200,"data":[{"id":1,"name":"Product A"}]}}'
```

### 2. Mock Login API

```bash
curl -X POST http://localhost:3000/_api/routes \
  -H "Content-Type: application/json" \
  -d '{
    "path": "/api/login",
    "method": "POST",
    "delay": 500,
    "response": {
      "code": 200,
      "data": { "token": "mock-jwt-token", "expiresIn": 3600 }
    }
  }'
```

### 3. Mock Paginated List

```bash
curl -X POST http://localhost:3000/_api/routes \
  -H "Content-Type: application/json" \
  -d '{
    "path": "/api/users",
    "method": "GET",
    "response": {
      "code": 200,
      "data": {
        "list": [{"id":1,"name":"User1"},{"id":2,"name":"User2"}],
        "total": 100,
        "page": 1,
        "pageSize": 10
      }
    }
  }'
```

### 4. Mock Error Response

```bash
curl -X POST http://localhost:3000/_api/routes \
  -H "Content-Type: application/json" \
  -d '{
    "path": "/api/error",
    "method": "GET",
    "response": {
      "code": 500,
      "message": "Internal Server Error"
    }
  }'
```

### 5. Create SSE Stream

```bash
curl -X POST http://localhost:3000/_api/routes \
  -H "Content-Type: application/json" \
  -d '{
    "path": "/sse/notifications",
    "method": "GET",
    "type": "sse",
    "interval": 1000,
    "repeat": true,
    "events": [
      {"data": "{\"type\":\"notification\",\"message\":\"New message\"}"}
    ]
  }'
```

### 6. Shutdown Server

```bash
curl -X POST http://localhost:3000/_api/shutdown
```

This will gracefully shutdown the server. If admin password is enabled, you need to authenticate first.

## Programmatic Usage (Node.js)

The skill includes a helper module for programmatic control:

```javascript
const MockServer = require('./.trae/skills/api-mock-server/scripts/server.js');

// Or use the API client
const baseUrl = 'http://localhost:3000';

// Create route
await fetch(`${baseUrl}/_api/routes`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    path: '/api/test',
    method: 'GET',
    response: { code: 200, data: { message: 'Hello' } }
  })
});

// List routes
const res = await fetch(`${baseUrl}/_api/routes`);
const { routes } = await res.json();

// Delete route
await fetch(`${baseUrl}/_api/routes/GET:/api/test`, { method: 'DELETE' });
```

## Static Configuration Files

For permanent routes, edit configuration files in `scripts/config/`:

- **REST APIs**: `scripts/config/interfaces.js`
- **SSE APIs**: `scripts/config/sse-interfaces.js`

Changes require server restart.

## Environment Variables

Create `.env` file in `scripts/` directory:

```
PORT=3000
ADMIN_PASSWORD=admin123
```

## Data Persistence

Dynamic routes are automatically saved to `scripts/data/routes.json` and loaded on server restart.

## Workflow for AI Agents

1. **Check server health**: Try `GET /_health` to verify server is running and healthy
2. **Check server status**: Try `GET /_api/routes` to verify server is running
3. **Start server if needed**: Run `node .trae/skills/api-mock-server/scripts/server.js`
4. **Create/Update routes**: Use management API to configure mock endpoints
5. **Test endpoints**: Call the mock endpoints to verify responses
6. **Shutdown server (optional)**: Use `POST /_api/shutdown` to gracefully stop the server
7. **Clean up**: Use `DELETE /_api/routes/:key` or `POST /_api/routes/clear`

## Notes

- Routes are matched in order: Dynamic SSE → Static SSE → Static REST → Dynamic REST → 404
- CORS headers are automatically added to all responses
- Use `delay` field to simulate network latency
- Key format for route operations: `METHOD:PATH` or `SSE:METHOD:PATH`
- The server is zero-dependency, using only Node.js built-in modules
