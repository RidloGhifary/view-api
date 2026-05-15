# Contributing to View API

Thank you for taking the time to contribute to View API.

View API is an open-source local mock API runner with a live JSON editor. It is built for frontend developers and teams who need realistic mock APIs before the real backend is ready.

## Project Overview

View API is a lightweight developer tool focused on a local-first workflow. It provides:

- A local mock API server.
- A live JSON editor.
- Endpoint management.
- Success and error response simulation.
- Configurable success rate behavior.
- Delay simulation.
- A workflow that runs locally without requiring a hosted backend.

## Getting Started

Clone the repository, install dependencies, and link the CLI locally:

```sh
git clone https://github.com/YOUR_USERNAME/view-api.git
cd view-api
npm install
npm link
view-api --help
```

Use `YOUR_USERNAME` as a placeholder and replace it with the correct GitHub username or organization when needed.

## Running the Project Locally

Start View API with the live editor:

```sh
view-api dev
```

Start View API with an existing mock config file:

```sh
view-api dev mock.json
```

For API-only mode without the editor UI, run:

```sh
view-api start mock.json
```

## Project Structure

```text
view-api/
├── bin/
│   └── mock-runner.js
├── src/
│   ├── api/
│   ├── editor/
│   └── shared/
├── README.md
├── package.json
├── LICENSE
├── CONTRIBUTING.md
└── CODE_OF_CONDUCT.md
```

## Development Guidelines

- Keep the tool lightweight.
- Avoid unnecessary dependencies.
- Prefer vanilla JavaScript for the local editor UI.
- Do not introduce React, Vite, Webpack, or other bundlers without discussion.
- Keep backend behavior stable.
- Preserve the `/__config` API contract.
- Do not break existing mock config files.
- Keep code readable over clever.

## Editor UI Guidelines

- Keep the dark dev-tool style consistent.
- Keep CodeMirror integration stable.
- Avoid infinite editor update loops.
- Do not auto-format JSON on every keystroke.
- Validate JSON before saving.
- Keep the last valid config active when the editor contains invalid JSON.

## Mock Config Compatibility

Config changes should be backward-compatible. Existing View API config files should continue to work after changes unless a breaking change has been discussed and clearly documented.

Example config:

```json
{
  "get": [
    {
      "/products": {
        "name": "Products",
        "successRate": 100,
        "delay": 0,
        "success": {
          "statusCode": 200,
          "body": {
            "status": "success",
            "data": []
          }
        },
        "errors": []
      }
    }
  ]
}
```

When working with mock configs:

- Preserve existing fields.
- Do not remove unknown or custom fields.
- Keep endpoint name as UI metadata only.
- Keep method and path matching stable.

## Testing Your Changes

Run the project locally:

```sh
view-api dev
```

Then verify:

- The editor UI opens.
- An endpoint can be added.
- An endpoint can be edited.
- An endpoint can be deleted.
- Success and error responses can be edited.
- Multiple error tabs work.
- The prettify button works.
- `/__config` is updated.
- The mock API responds using the updated config.

Useful curl examples:

```sh
curl http://localhost:4000/products
```

```sh
curl -X POST http://localhost:4000/products
```

## Submitting a Pull Request

- Keep changes focused.
- Test locally before submitting.
- Include screenshots for UI changes.
- Explain why the change is needed.
- Avoid unrelated formatting changes.

## Reporting Bugs

When reporting a bug, please include:

- OS.
- Node version.
- npm version.
- View API version.
- Command used.
- Config file, if relevant.
- Error message or screenshots.
- Reproduction steps.

## Requesting Features

When requesting a feature, please include:

- The problem you are trying to solve.
- The expected behavior.
- Example usage.
- Why it helps frontend or API development.

## Commit Message Style

Recommended commit message examples:

```text
feat: add multiple error response tabs
fix: sync UI-created endpoints with mock API server
docs: update README usage examples
chore: update package metadata
style: improve editor layout spacing
```

## Maintainer Notes

Common release commands:

```sh
git status
git add .
git commit -m "type: description"
npm version patch
npm version minor
git push --follow-tags
npm publish
npm view view-api version
```

## License

By contributing to View API, you agree that your contributions will be licensed under the same license as the project.
