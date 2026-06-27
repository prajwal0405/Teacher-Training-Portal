import mongoose from "mongoose";

const fileAssetSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    originalName: { type: String, required: true },
    storageKey: { type: String, required: true },
    mimeType: String,
    sizeBytes: Number,
    publicUrl: String,
  },
  { timestamps: true }
);

export const FileAsset = mongoose.model("FileAsset", fileAssetSchema);
