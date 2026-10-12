import app from "./app.js";
import env from "./config/env.js";

const PORT = env.PORT;

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Environment: ${env.NODE_ENV}`);
    console.log(`Started at: ${new Date().toLocaleString()}\n`);
  });
}

export default app;
