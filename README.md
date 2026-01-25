# view-api

A lightweight CLI tool to run mock APIs locally from a JSON configuration file.

Perfect for frontend development, testing, and prototyping without a real backend.

## ✨ Features

- Run a command and get editor and the api fetchable
- Auto Refresh JSON file
- Customizable port
- Randomized success / error responses
- Delay response
- Zero setup for frontend teams
- Works fully offline

## 📦 Installation

You don’t need to install it globally.

Run directly with `npx`:

```bash
# simpler way
npx view-api dev

# or

# use your own file
npx view-api dev <file-path>
```

Or install globally:

```bash
npm install -g view-api
view-api dev
```

## 🚀 Usage

```bash
view-api dev <file-path> [options]
```

### Options

| Option       | Description            | Default |
| ------------ | ---------------------- | ------- |
| `--api-port` | Port to run the api    | `8723`  |
| `--ui-port`  | Port to run the editor | `8724`  |

Example:

```bash
view-api dev src/mocks/mock.json --api-port 4000 --ui-port 4001
```

Then you will have running editor and the API endpoint:

```bash
➜ API running at   http://localhost:4000
➜ EDITOR running at   http://localhost:4001
```

### Behavior Options

| Option        | Description                                    |
| ------------- | ---------------------------------------------- |
| `successRate` | Determine how much the request success rate    |
| `delay`       | Determine how long the request will be delayed |

## 📄 Mock Config Format

```json
{
  "GET /products": {
    "behavior": {
      "successRate": 50,
      "delay": 1000
    },
    "responses": {
      "success": {
        "statusCode": 200,
        "body": {
          "status": "success",
          "message": "Products fetched wkwk",
          "data": [
            {
              "id": 1,
              "name": "Product A",
              "price": 10000,
              "stock": 50
            },
            {
              "id": 2,
              "name": "Product B",
              "price": 15000,
              "stock": 30
            }
          ]
        }
      },
      "errors": [
        {
          "statusCode": 500,
          "body": {
            "status": "failed",
            "message": "Server error",
            "error_code": "SERVER_ERROR"
          }
        },
        {
          "statusCode": 400,
          "body": {
            "status": "failed",
            "message": "Bad request, invalid parameters",
            "error_code": "INVALID_PARAMETERS"
          }
        }
      ]
    }
  }
}
```

## 📜 License

Licensed under the MIT License.
