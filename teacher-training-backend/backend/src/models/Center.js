import mongoose from "mongoose";

const centerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true },
    city: String,
    pincode: String,
    contactPerson: String,
    phone: String,
    email: String,
    status: { type: String, enum: ["active", "inactive"], default: "active", index: true },
  },
  { timestamps: true }
);

export const Center = mongoose.model("Center", centerSchema);
