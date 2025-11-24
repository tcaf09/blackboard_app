import db from "../db/connection.js";
import express from "express";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";

const router = express.Router();

router.get("/", authenticateToken, async (req, res) => {
  try {
    const user = await db
      .collection("Users")
      .findOne({ _id: new ObjectId(req.user._id) });
    const folderIds = user.folders.map((folder) => new ObjectId(folder));
    const collection = db.collection("Folders");
    const folders = await collection
      .find({ _id: { $in: folderIds } })
      .toArray();
    if (!folders) {
      return res.status(404).send({ message: "This user has no folders" });
    }
    res.status(200).send(folders);
  } catch (err) {
    console.log(err);
    res.status(500).send({ message: "Server Error" });
  }
});

router.post("/", authenticateToken, async (req, res) => {
  try {
    const { name, parentId } = req.body;
    let parentObjectId = null;
    if (parentId) {
      parentObjectId = new ObjectId(parentId);
    }
    if (!name) {
      return res.status(400).send({ message: "Folder Name is Required" });
    }
    const collection = db.collection("Folders");
    const newFolder = {
      name,
      parentId: parentObjectId,
      user: req.user.username,
    };
    const results = await collection.insertOne(newFolder);
    await db
      .collection("Users")
      .updateOne(
        { _id: new ObjectId(req.user._id) },
        { $push: { folders: results.insertedId } }
      );
    res.status(200).send(results);
  } catch (err) {
    console.log(err);
    res.status(500).send({ message: "Server Error" });
  }
});

async function deleteFolder(folderId) {
  const folderCollection = db.collection("Folders");
  const noteCollection = db.collection("Notes");

  const folder = await folderCollection.findOne({
    _id: new ObjectId(folderId),
  });

  if (!folder) {
    throw new Error("Folder not found");
  }

  await noteCollection.deleteMany({ folderId: new ObjectId(folder._id) });

  const childFolders = await folderCollection
    .find({
      parentId: new ObjectId(folder._id),
    })
    .toArray();

  for (const child of childFolders) {
    await deleteFolder(child._id);
  }

  await folderCollection.deleteOne({ _id: folder._id });
}

router.delete("/:id", authenticateToken, async (req, res) => {
  const id = req.params.id;

  if (!ObjectId.isValid(id)) {
    return res.status(400).send({ message: "Invalid id" });
  }
  try {
    const user = await db
      .collection("Users")
      .findOne({ _id: new ObjectId(req.user._id) });
    const ownsFolder = user.folders.some((folder) =>
      folder.equals(new ObjectId(id))
    );
    if (ownsFolder) {
      await deleteFolder(id);
      return res.status(200).send({ message: "Folder deleted" });
    } else {
      return res.status(404).send({ message: "You dont own this folder" });
    }
  } catch (err) {
    console.log(err);
    res.status(500).send({ message: "Server error" });
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
