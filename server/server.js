import http from "http";
import express from "express";
import cors from "cors";
import users from "./routes/users.js";
import notes from "./routes/notes.js";
import folders from "./routes/folders.js";
import jwt from "jsonwebtoken";
import db from "./db/connection.js";
import { ObjectId } from "mongodb";
import uploadImage from "./uploadImage.js";
import { WebSocketServer, WebSocket } from "ws";
import compression from "compression";

const PORT = process.env.PORT || 5000;
const app = express();

const server = http.createServer(app);

const wss = new WebSocketServer({ server });
const rooms = {};

wss.on("connection", (ws, req) => {
  const params = new URLSearchParams(req.url.replace("/", ""));
  const token = params.get("token");

  if (!token) {
    ws.close(4001, "Missing Token");
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    ws.userId = decoded._id;
  } catch (err) {
    console.log(err);
    ws.close(4002, "Invalid token");
  }
  ws.on("message", async (data) => {
    const msg = JSON.parse(data);

    if (msg.type === "joinNote") {
      const noteId = msg.noteId;
      if (!rooms[noteId]) rooms[noteId] = new Set();

      if (ws.currentNoteId && rooms[ws.currentNoteId]) {
        rooms[ws.currentNoteId].delete(ws);
      }

      rooms[noteId].add(ws);
      ws.currentNoteId = noteId;
    }

    if (msg.type === "saveNote") {
      const currentUser = ws;
      const noteId = msg.noteId;
      const body = msg.data;

      if (!ObjectId.isValid(noteId)) {
        currentUser.send(
          JSON.stringify({ status: "error", message: "Invalid note id" })
        );
        return;
      }

      try {
        const user = await db
          .collection("Users")
          .findOne({ _id: new ObjectId(currentUser.userId) });
        const ownsNote = user.notes.some((id) =>
          id.equals(new ObjectId(noteId))
        );

        const collection = db.collection("Notes");

        let note = null;

        if (ownsNote) {
          note = await collection.findOne({ _id: new ObjectId(noteId) });
        }

        if (!note) {
          currentUser.send(
            JSON.stringify({ status: "error", message: "Note not found" })
          );
          return;
        }

        const imageUrl = await uploadImage(body.thumbnailUrl, `note_${noteId}`);

        const boxesToAdd = [];
        const boxesToChange = [];

        for (const textbox of body.boxesToSave) {
          const boxExists = note.textboxes.find((box) => box.id === textbox.id);
          if (boxExists) {
            boxesToChange.push(textbox);
          } else {
            boxesToAdd.push(textbox);
          }
        }

        for (const box of boxesToChange) {
          await collection.updateOne(
            { _id: new ObjectId(noteId) },
            {
              $set: {
                "textboxes.$[elem]": box,
              },
            },
            {
              arrayFilters: [{ "elem.id": box.id }],
            }
          );
        }

        const updateOperation = {};

        if (body.pathsToSave && body.pathsToSave.length > 0) {
          updateOperation.$push = updateOperation.$push || {};
          updateOperation.$push.paths = { $each: body.pathsToSave };
        }

        if (boxesToAdd.length > 0) {
          updateOperation.$push = updateOperation.$push || {};
          updateOperation.$push.textboxes = { $each: boxesToAdd };
        }

        const pullOp = {};
        const boxIdsToDelete = body.boxesToDelete?.map((b) => b.id) || [];
        if (
          boxIdsToDelete.length > 0 ||
          (body.pathsToDelete && body.pathsToDelete.length > 0)
        ) {
          pullOp.$pull = {};
          if (boxIdsToDelete.length > 0) {
            pullOp.$pull.textboxes = { id: { $in: boxIdsToDelete } };
          }
          if (body.pathsToDelete && body.pathsToDelete.length > 0) {
            pullOp.$pull.paths = { $in: body.pathsToDelete };
          }
        }

        updateOperation.$set = {
          thumbnailUrl: imageUrl,
        };

        await collection.updateOne(
          { _id: new ObjectId(noteId) },
          updateOperation
        );
        if (pullOp.$pull) {
          await collection.updateOne({ _id: new ObjectId(noteId) }, pullOp);
        }

        currentUser.send(JSON.stringify({ type: "noteSaved" }));

        rooms[noteId].forEach((client) => {
          if (client !== currentUser) {
            client.send(JSON.stringify({ type: "noteUpdate", note: body }));
          }
        });
      } catch (err) {
        console.log(err);
        ws.send(JSON.stringify({ type: "error", message: "Server error" }));
      }
    }
  });
});

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(compression());
app.use("/api/users", users);
app.use("/api/notes", notes);
app.use("/api/folders", folders);

app.get("/keepalive", (req, res) => {
  res.send("Alive");
});

server.listen(PORT, () => {
  console.log("Server is listening on port:" + PORT);
});
