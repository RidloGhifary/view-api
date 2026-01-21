import createApp from "./app.js";

export default ({ configPath, port }) => {
  const server = createApp(configPath);

  server.listen(port, () => {
    console.log(`  ➜  [API] Server running on:   http://localhost:${port}`);
    console.log(`  ➜  [API] Using config file:   ${configPath}`);
  });
};
