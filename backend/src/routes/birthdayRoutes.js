// backend/src/routes/birthdayRoutes.js

import express from "express";
import Member from "../models/Member.js";
// Replace this import with your existing admin-auth middleware.
import { protectAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public: get members who have birthdays saved
router.get("/", async (req, res) => {
  try {
    const members = await Member.find({
      birthday: { $ne: null },
    }).select("name birthday imageUrl");

    res.json(members);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch birthdays" });
  }
});

// Admin only: update a member's birthday
router.put("/:id", protectAdmin, async (req, res) => {
  try {
    const { birthday } = req.body;

    if (!birthday || Number.isNaN(Date.parse(birthday))) {
      return res.status(400).json({ message: "Enter a valid birthday" });
    }

    const member = await Member.findByIdAndUpdate(
      req.params.id,
      { birthday: new Date(birthday) },
      { new: true, runValidators: true }
    ).select("name birthday imageUrl");

    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }

    res.json(member);
  } catch (error) {
    res.status(500).json({ message: "Failed to update birthday" });
  }
});

// Admin only: remove a member's birthday
router.delete("/:id", protectAdmin, async (req, res) => {
  try {
    const member = await Member.findByIdAndUpdate(
      req.params.id,
      { birthday: null },
      { new: true }
    );

    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }

    res.json({ message: "Birthday removed successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to remove birthday" });
  }
});

export default router;