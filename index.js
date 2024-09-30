const express = require("express");
const app = express();
require("dotenv").config();
const port = process.env.PORT || 8080;

const mongoose = require("mongoose");

const logger = require("./middleware/logger");
const apiTracker = require("./middleware/apiUsage");

const userRoutes = require("./routes/user");
const adminRoutes = require("./routes/admin");
const product = require("./routes/product");
const global = require("./routes/global");
const cors = require("cors");
const corsOptions = {
  origin: 'http://localhost:3000', // replace with your frontend URL
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

const uri = process.env.MongoString;

app.use(express.json());
app.use(logger);
app.use(apiTracker);

app.get("/", (req, res) => {
  res.send("Welcome to EKart!");
});

mongoose
  .connect(uri)
  .then(() => console.log("Connected to MongoDB Atlas"))
  .catch((err) => console.error("MongoDB connection error:", err));

app.use("/user", userRoutes);
app.use("/admin", adminRoutes);
app.use("/prod", product);
app.use("/global", global);

app.listen(port, () => {
  console.log("Server started on port 3003");
});
