import express from "express";

import db from "../db/connection.js";
import jwt from "jsonwebtoken";

import bcrypt from "bcrypt";

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { username, password, email } = req.body;
    if (!username || !password || !email) {
      return res
        .status(400)
        .send({ message: "Username, password and email required" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
      username,
      hashedPassword,
      email,
      notes: [],
    };
    const collection = db.collection("Users");
    const existingUser = await collection.findOne({
      $or: [{ username }, { email }],
    });

    if (existingUser) {
      if (existingUser.username === username) {
        return res.status(409).send({ message: "Username already exists" });
      }
      if (existingUser.email === email) {
        return res.status(409).send({ message: "Email is in use" });
      }
    }
    const result = await collection.insertOne(newUser);
    let accessToken = "";
    if (result) {
      const payload = {
        _id: user._id,
        username: user.username,
      };
      accessToken = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET);
    }
    res.status(200).json({ accessToken });
  } catch (err) {
    console.log(err);
    res.status(500).send({ message: "Error adding user" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res
        .status(400)
        .send({ message: "Username and password required" });
    }

    const collection = db.collection("Users");
    const user = await collection.findOne({ username });
    if (!user) {
      res.status(401).send({ message: "Invalid Credentials" });
    }

    const passwordMatch = await bcrypt.compare(password, user.hashedPassword);
    if (!passwordMatch) {
      res.status(401).send({ message: "Invalid Credentials" });
    }
    const payload = {
      _id: user._id,
      username: user.username,
    };
    const accessToken = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET);
    res.status(200).json({ accessToken });
  } catch (err) {
    console.log(err);
    res.status(500).send({ message: "Server error" });
  }
});

router.get("/", authenticateToken, async (req, res) => {
  try {
    const collection = db.collection("Users");
    const user = await collection.findOne({ username: req.user.username });

    res.status(200).send(user);
  } catch (err) {
    console.log(err);
    res.status(500).send({ message: "Server error" });
  }
});

router.get("/search", authenticateToken, async (req, res) => {
  try {
    const q = req.query.q;

    if (!q) {
      return res.status(200).send([]);
    }

    const results = await db
      .collection("Users")
      .find({
        username: { $regex: q, $options: "i" },
      })
      .project({
        hashedPassword: 0,
      })
      .toArray();

    res.status(200).send(results);
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
