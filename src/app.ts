import express, { Express, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import routes from "./routes/index.js";
import rateLimiter from "./middlewares/rateLimiter.js";
import notFound from "./middlewares/notFound.js";
import errorHandler from "./middlewares/errorHandler.js";

const app: Express = express();

app.set('trust proxy', 1);

app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(rateLimiter);

app.use("/api", routes);

app.get("/", (_req: Request, res: Response) => {
  res.json({ message: "Expense Tracker API is running" });
});

app.use(notFound);
app.use(errorHandler);

export default app;