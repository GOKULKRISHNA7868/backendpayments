require("dotenv").config();
const express = require("express");
const cors = require("cors");

const ccavRoutes = require("./routes/ccavenue");

const app = express();

/* ===============================
   Middlewares
   =============================== */
app.use(cors());
app.use(express.json()); // JSON body
app.use(express.urlencoded({ extended: false })); // ✅ REQUIRED for CCAvenue

/* ===============================
   Routes
   =============================== */
app.use("/api/ccav", ccavRoutes);

app.get("/health", (req, res) => {
  res.send("CC Avenue API Running");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("Server running on", PORT));
