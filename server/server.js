import http from "http";
import express from "express";
import cors from "cors";
import users from "./routes/users.js";
import notes from "./routes/notes.js";
import folders from "./routes/folders.js";
import ai from "./routes/ai.js"
import compression from "compression";

const PORT = process.env.PORT || 5000;
const app = express();

const server = http.createServer(app);


app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(compression());
app.use("/api/users", users);
app.use("/api/notes", notes);
app.use("/api/folders", folders);
app.use("/api/ai", ai)

app.get("/keepalive", (req, res) => {
  res.send("Alive");
});

server.listen(PORT, () => {
  console.log("Server is listening on port:" + PORT);
});
