const express = require("express");
const app = express();

const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const morgan = require("morgan");

const connectDB=require("./config/db");

const  driverRoutes=require("./routes/driverRoutes")


dotenv.config();

const PORT = process.env.PORT || 5003;

// Database Connection
connectDB();

// Middlewares
app.use(express.json());

app.use(cookieParser());

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);

app.use(morgan("dev"));

// app.use((req, res, next) => {
//   console.log("Driver SERVICE RECEIVED:", req.method, req.originalUrl);
//   next();
// });


// Routes
app.use("/api/v1/drivers",driverRoutes );

// Health Check Route
app.get("/health", (req, res) => {
  return res.status(200).json({
    success: true,
    service: "driver Service",
    message: "driver Service is healthy",
  });
});

// Root Route
app.get("/", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "driver Service is running...",
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`driver Service running on port ${PORT}`);
});