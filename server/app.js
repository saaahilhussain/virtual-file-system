import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import directoryRoutes from "./routes/directoryRoutes.js";
import fileRoutes from "./routes/fileRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import checkAuth from "./middlewares/authMiddleware.js";
import { connectDB } from "./db.js";

try {
  const db = await connectDB();

  const app = express();

  app.use(cookieParser());
  app.use(express.json());
  app.use(
    cors({
      origin: "http://localhost:5173",
      credentials: true,
    })
  );

  app.use((req, res, next) => {
    req.db = db;
    next();
  });

  app.use("/directory", checkAuth, directoryRoutes);
  app.use("/file", checkAuth, fileRoutes);
  app.use("/user", userRoutes);

  // global error handler
  app.use((err, req, res, next) => {
    console.log(err);
    return res
      .status(err.status || 500)
      .json({ error: "Something went wrong." });
  });

  app.listen(4000, () => {
    console.log(`Server Started`);
  });

  // database error handler
} catch (err) {
  console.log("Count not connect to Database");
  console.log(err);
}
