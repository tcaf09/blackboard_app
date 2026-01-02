import db from "../db/connection.js";
import express from "express";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import uploadImage from "../uploadImage.js";

const router = express.Router();

router.get("/", authenticateToken, async (req, res) => {
  try {
    const user = await db
      .collection("Users")
      .findOne({ _id: new ObjectId(req.user._id) });
    const noteIds = user.notes.map((note) => new ObjectId(note));
    const collection = db.collection("Notes");
    const notes = await collection
      .find({ _id: { $in: noteIds } })
      .project({ paths: 0, texboxes: 0 })
      .toArray();
    res.status(200).send(notes);
  } catch (err) {
    console.log(err);
    res.status(500).send({ message: "Server Error" });
  }
});

router.get("/:id", authenticateToken, async (req, res) => {
  const noteId = req.params.id;

  if (!ObjectId.isValid(noteId)) {
    return res.status(400).send({ message: "Invalid note id" });
  }
  try {
    const collection = db.collection("Notes");
    const user = await db
      .collection("Users")
      .findOne({ _id: new ObjectId(req.user._id) });
    const ownsNote = user.notes.some((id) => id.equals(new ObjectId(noteId)));

    if (ownsNote) {
      const note = await collection.findOne({
        _id: new ObjectId(noteId),
      });
      if (!note) {
        return res.status(404).send({ message: "Note not found" });
      }
      res.status(200).send(note);
    } else {
      return res.status(404).send({ message: "Note not found" });
    }
  } catch (err) {
    console.log(err);
    res.status(500).send({ message: "Server Error" });
  }
});

router.delete("/:id", authenticateToken, async (req, res) => {
  const noteId = req.params.id;

  if (!ObjectId.isValid(noteId)) {
    return res.status(400).send({ message: "Invalid note id" });
  }
  try {
    const collection = db.collection("Notes");
    const user = await db
      .collection("Users")
      .findOne({ _id: new ObjectId(req.user._id) });
    const ownsNote = user.notes.some((id) => id.equals(new ObjectId(noteId)));

    if (ownsNote) {
      const results = await collection.deleteOne({ _id: new ObjectId(noteId) });

      if (results.deletedCount === 0) {
        return res.status(404).send({ message: "Note note found" });
      }

      res.status(200).send({ message: "Note Deleted" });
    } else {
      return res.status(404).send({ message: "You dont own this note" });
    }
  } catch (err) {
    console.log(err);
    res.status(500).send({ message: "Server Error" });
  }
});

router.patch("/:id", authenticateToken, async (req, res) => {
  const noteId = req.params.id;

  if (!ObjectId.isValid(noteId)) {
    return res.status(400).send({ message: "Invalid note id" });
  }

  try {
    const user = await db
      .collection("Users")
      .findOne({ _id: new ObjectId(req.user._id) });
    const ownsNote = user.notes.some((id) => id.equals(new ObjectId(noteId)));

    const collection = db.collection("Notes");

    let note = null;

    if (ownsNote) {
      note = await collection.findOne({ _id: new ObjectId(noteId) });
    }

    if (!note) {
      return res.status(404).send({ message: "Note not found" });
    }
    const imageUrl = await uploadImage(req.body.thumbnailUrl, `note_${noteId}`);

    const result = await collection.updateOne(
      { _id: new ObjectId(noteId) },
      {
        $set: {
          thumbnailUrl: imageUrl,
          paths: req.body.paths,
          textboxes: req.body.textboxes,
        },
      }
    );
    res.status(200).send({ message: "Note saved" });
  } catch (err) {
    console.log(err);
    res.status(500).send({ message: "Server error" });
  }
});

router.post("/", authenticateToken, async (req, res) => {
  try {
    const { name, folderId, userIds } = req.body;

    if (!name) {
      return res
        .status(400)
        .send({ message: "Name and folder id are required" });
    }

    if (folderId && !ObjectId.isValid(folderId)) {
      return res.status(400).send({ message: "Invalid folderId" });
    }
    let folderObjectId = null;
    if (folderId) {
      folderObjectId = new ObjectId(folderId);
    }

    const collection = db.collection("Notes");

    const results = await collection.insertOne({
      name: name,
      paths: [],
      textboxes: [],
      folderId: folderObjectId,
      thumbnailUrl: "",
    });

    await db
      .collection("Users")
      .updateOne(
        { _id: new ObjectId(req.user._id) },
        { $push: { notes: results.insertedId } }
      );

    if (userIds) {
      const objIds = userIds.map((userId) => new ObjectId(userId));
      await db
        .collection("Users")
        .updateMany(
          { _id: { $in: objIds } },
          { $push: { notes: results.insertedId } }
        );
    }

    res.status(200).send(results);
  } catch (err) {
    console.log(err);
    res.status(500).send({ message: "Server Error" });
  }
});

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

export default router;
