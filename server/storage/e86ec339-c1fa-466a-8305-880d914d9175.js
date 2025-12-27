import { MongoClient } from "mongodb";

const client = new MongoClient("mongodb://127.0.0.1:27017/");

await client.connect();

const db = client.db("todoApp");
const collection = db.collection("todos");

// Cursor is a an Object in the eyes of JS.
const cursor = collection.find();

// console.log(await collection.countDocuments());
// console.log(await cursor.count());

// let count = 0;
while (await cursor.hasNext()) {
  count++;
  console.log(await cursor.next());
  if (count === 5) break;
}
// for (;await cursor.hasNext();) {
//   console.log(await cursor.next());
// }

// console.log(await cursor.hasNext());

// const data = await cursor.toArray();
// const data2 = await cursor.toArray();
// console.log(data);
// console.log(data2);
// for await (const document of cursor) {
//   console.log(document);
// }

client.close();
