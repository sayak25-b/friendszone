import mongoose from "mongoose";

const memorySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    date: { type: Date, required: true },
    imageUrl: { type: String, required: true, trim: true, maxlength: 2048 },
    location: { type: String, trim: true, maxlength: 120, default: "" },
    album: { type: String, trim: true, maxlength: 120, default: "" },
    tags: { type: [String], default: [] },
    featured: { type: Boolean, default: false },
    published: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("Memory", memorySchema);
