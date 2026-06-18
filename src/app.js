import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import routes from "./routes/index.js";
import rateLimiter from "./middlewares/rateLimiter.js";
import notFound from "./middlewares/notFound.js";
import errorHandler from "./middlewares/errorHandler.js";

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(rateLimiter);

app.use("/api", routes);

app.get("/", (req, res) => {
  res.json({ message: "Expense Tracker API is running" });
});

app.use(notFound);
app.use(errorHandler);

export default app;