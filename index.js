require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const ccavRoutes = require("./routes/ccavenue");

const app = express();

app.use(cors());

// ✅ Parse JSON bodies
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
// ✅ Parse URL-encoded bodies (needed for CCAvenue response)

// Optional: ignore favicon requests
app.get("/favicon.ico", (req, res) => res.status(204).end());

// Routes
app.use("/api/ccav", ccavRoutes);

app.get("/health", (req, res) => {
  res.send("CC Avenue API Running");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("Server running on", PORT));
