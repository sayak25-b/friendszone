import "dotenv/config";
import mongoose from "mongoose";
import app from "./app.js";

const port = Number(process.env.PORT || 5000);

if (!process.env.MONGODB_URI) {
  throw new Error("MONGODB_URI is required.");
}
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must contain at least 32 characters.");
}

await mongoose.connect(process.env.MONGODB_URI);
console.log("Connected to MongoDB.");

const server = app.listen(port, () => {
  console.log(`FriendsZone API listening on port ${port}.`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
  });
}
