import express from "express";
import { pathToFileURL } from "url";
import cors from "cors";
import cookieParser from "cookie-parser";
import directoryRoutes from "./routes/directoryRoutes.js";
import fileRoutes from "./routes/fileRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import subscriptionRoutes from "./routes/subscriptionRoutes.js";
import trashRoutes from "./routes/trashRoutes.js";
import usersRoutes from "./routes/usersRoutes.js";
import shareRoutes from "./routes/shareRoutes.js";
import publicShareRoutes from "./routes/publicShareRoutes.js";
import checkAuth, { checkIsNotUser } from "./middlewares/authMiddleware.js";
import { webhookController } from "./controllers/webhookController.js";

const app = express();

app.get("/", (req, res) => {
  return res.json({ message: "OK" });
});

const allowedOrigins = [
  process.env.CLIENT_URI,
  "http://fileshelter.app",
  "https://fileshelter.app",
  "http://www.fileshelter.app",
  "https://www.fileshelter.app",
];

app.use(cookieParser(process.env.SESSION_SECRET));

// Razorpay signs the exact request bytes, so this route must be registered
// before the global JSON parser.
app.post(
  "/api/billing/webhook",
  express.raw({ type: "application/json" }),
  webhookController,
);

app.use(express.json());
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);

// PROTECTED ROUTES
app.use("/directory", checkAuth, directoryRoutes);
app.use("/file", checkAuth, fileRoutes);
app.use("/trash", checkAuth, trashRoutes);
app.use("/users", checkAuth, checkIsNotUser, usersRoutes);
app.use("/subscriptions", checkAuth, subscriptionRoutes);
app.use("/share", checkAuth, shareRoutes);

// UNPROTECTED ROUTES
app.use("/user", userRoutes);
app.use("/auth", authRoutes);
app.use("/public/share", publicShareRoutes);

// global error handler
app.use((err, req, res, next) => {
  console.log(err);
  // return res.json(err);
  return res.status(err.status || 500).json({ error: "Something went wrong." });
});

export default app;

// Keep the historical `node app.js`/PM2 entrypoint working while allowing
// tests to import the Express app without opening network connections.
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  import("./server.js").catch((error) => {
    console.error("Unable to load server entrypoint", error);
    process.exitCode = 1;
  });
}
