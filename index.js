require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const ccavRoutes = require("./routes/ccavenue");

const app = express();

app.use(cors());
app.use(bodyParser.json());

app.use("/api/ccav", ccavRoutes);

app.get("/health", (req, res) => {
  res.send("CC Avenue API Running");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("Server running on", PORT));
