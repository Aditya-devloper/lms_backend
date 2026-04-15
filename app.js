const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const passport = require("passport");
require("./config/passport")(passport);

const cookieParser = require("cookie-parser")
const mainRoute = require("./routes/mainRoute");

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Mongo db connected"))
  .catch((err) => console.log("Mongo connection error", err));

const app = express();

// Cookie setup
app.use(cookieParser())

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: process.env.WEB_URL,
  credentials: true
}));

// Passport middleware
app.use(passport.initialize());

// Public
app.use("", express.static("public"));
app.use("", express.static("uploads"));

// Routes
app.use("/api", mainRoute);

app.get("/", (req, res) => {
  res.send("Welcome to LMS Backend");
});

app.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});
