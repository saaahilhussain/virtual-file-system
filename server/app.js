import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import directoryRoutes from "./routes/directoryRoutes.js";
import fileRoutes from "./routes/fileRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import subscriptionRoutes from "./routes/subscriptionRoutes.js";
import trashRoutes from "./routes/trashRoutes.js";
import usersRoutes from "./routes/usersRoutes.js";
import checkAuth, { checkIsNotUser } from "./middlewares/authMiddleware.js";
import { connectDB } from "./config/db.js";
import { webhookController } from "./controllers/webhookController.js";

await connectDB();
const app = express();

app.get("/", (req, res) => {
	return res.json({message: "OK"})
})

app.get("/err", (req, res) => {

	process.exit(1);
})

app.use(cookieParser(process.env.SESSION_SECRET));
app.use(express.json());
app.use(
  cors({
    origin: process.env.CLIENT_URI,
    credentials: true,
  }),
);

// PROTECTED ROUTES
app.use("/directory", checkAuth, directoryRoutes);
app.use("/file", checkAuth, fileRoutes);
app.use("/trash", checkAuth, trashRoutes);
app.use("/users", checkAuth, checkIsNotUser, usersRoutes);
app.use("/subscriptions", checkAuth, subscriptionRoutes);

// UNPROTECTED ROUTES
app.use("/user", userRoutes);
app.use("/auth", authRoutes);

// WEBHOOK//
app.post("/api/billing/webhook", webhookController);

// global error handler
app.use((err, req, res, next) => {
  console.log(err);
  // return res.json(err);
  return res.status(err.status || 500).json({ error: "Something went wrong." });
});

app.listen(process.env.PORT, () => {
  console.log(`Server Started`);
});
