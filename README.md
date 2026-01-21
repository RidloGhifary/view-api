# view-api

A lightweight CLI tool to run mock APIs locally from a JSON configuration file.

Perfect for frontend development, testing, and prototyping without a real backend.

## ✨ Features

- Run mock APIs from a single JSON file
- Auto Refresh JSON file
- Customizable port
- Randomized success / error responses
- Zero setup for frontend teams
- Works fully offline

## 📦 Installation

You don’t need to install it globally.

Run directly with `npx`:

```bash
npx view-api start ./mock.json --port 4000
```

Or install globally:

```bash
npm install -g view-api
view-api start mock.json
```

## 🚀 Usage

```bash
view-api start <config-path> [options]
```

### Options

| Option         | Description            | Default |
| -------------- | ---------------------- | ------- |
| `--port`, `-p` | Port to run the server | `3000`  |

Example:

```bash
view-api start src/mocks/mock.json --port 4000
```

## 📄 Mock Config Format

```json
{
  "version": "1.0.0",
  "routes": {
    "GET /products": {
      "behavior": {
        "successRate": 70
      },
      "responses": {
        "success": {
          "statusCode": 200,
          "body": {
            "status": "success",
            "data": [{ "id": 1, "name": "Product A" }]
          }
        },
        "errors": [
          {
            "statusCode": 500,
            "body": {
              "status": "failed",
              "message": "Server error"
            }
          }
        ]
      }
    }
  }
}
```

## 📜 License

MIT
