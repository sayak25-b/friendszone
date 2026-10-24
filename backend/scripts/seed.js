import "../src/config/loadEnv.js";
import mongoose from "mongoose";
import { memories, members } from "../../src/data/websiteData.js";
import Memory from "../src/models/Memory.js";
import Member from "../src/models/Member.js";

if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required.");

await mongoose.connect(process.env.MONGODB_URI);
try {
  for (const item of memories) {
    await Memory.updateOne(
      { title: item.title },
      {
        $setOnInsert: {
          title: item.title,
          description: item.description,
          date: new Date(`${item.date} 1`),
          imageUrl: item.image,
          published: true,
        },
      },
      { upsert: true }
    );
  }

  for (const item of members) {
    await Member.updateOne(
      { name: item.name },
      {
        $setOnInsert: {
          name: item.name,
          role: item.role,
          imageUrl: item.image,
          joinedAt: item.joined ? new Date(`${item.joined} 1`) : new Date(),
          isActive: true,
        },
      },
      { upsert: true }
    );
  }
  console.log(`Seeded ${memories.length} memories and ${members.length} members.`);
} finally {
  await mongoose.disconnect();
}
