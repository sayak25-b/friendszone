import mongoose from "mongoose";

const awardSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 1000, default: "" },
    closesAt: { type: Date, required: true },
    nominees: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Member" }],
      validate: {
        validator: (nominees) => nominees.length >= 2 && new Set(nominees.map(String)).size === nominees.length,
        message: "An award needs at least two different nominees.",
      },
    },
  },
  { timestamps: true }
);

export default mongoose.model("Award", awardSchema);
