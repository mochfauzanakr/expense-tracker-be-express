import app from "./src/app.js";
import env from "./src/config/env.js";

const PORT = env.PORT;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Environment: ${env.NODE_ENV}`);
  console.log(`Started at: ${new Date().toLocaleString()}\n`);
});
