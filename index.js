const express = require("express");
const app = express();
const { MongoClient } = require("mongodb");
const { ObjectId } = require("mongodb");
const Redis = require("redis");

// mongodb Connection URI
const mongoURL = "mongodb://127.0.0.1:27017";
// redis Connection URI
const redisURL = "http://127.0.0.1:6379";

// Create a new MongoClient
const mongoClient = new MongoClient(mongoURL);
// creating a redis client
const redisClient = Redis.createClient(redisURL);

async function connection() {
  try {
    await mongoClient.connect();
    await redisClient.connect();

    const redisDB = mongoClient.db("redis");
    const dataCollection = redisDB.collection("data");

    // get all users
    app.get("/users", async (req, res) => {
      const users = await cacheGetAndSet("users", async () => {
        const newUsers = await dataCollection.find({}).toArray();
        return newUsers;
      });

      res.json(users);
    });

    // get a single user
    app.get("/users/:id", async (req, res) => {
      const id = req.params.id;

      const user = await cacheGetAndSet(`users:${id}`, async () => {
        const newUser = await dataCollection.findOne({ _id: ObjectId(id) });
        return newUser;
      });

      res.json(user);
    });
  } catch (e) {
    console.error(e);
  }
}

connection().catch(console.error);

async function cacheGetAndSet(key, cb) {
  const data = await redisClient.get(key);
  if (data) {
    return JSON.parse(data);
  } else {
    const newData = await cb();
    redisClient.setEx(key, 3600, JSON.stringify(newData));
    return newData;
  }
}

app.listen(3000, console.log("Running @3000"));
