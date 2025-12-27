import { MongoClient } from "mongodb";

const client = new MongoClient("mongodb://127.0.0.1:27017/");

await client.connect();

const db = client.db("school");

const studentsCollection = db.collection("students");
const teachersCollection = db.collection("teachers");

const result1 = await studentsCollection.insertOne({ name: "Aman", age: 15 });
const result2 = await teachersCollection.insertMany([
  { name: "Anurag", age: 89 },
  { name: "John", age: 55 },
]);

console.log(result1);
console.log(result2);

client.close();
