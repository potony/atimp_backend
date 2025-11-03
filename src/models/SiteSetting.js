 // src/models/SiteSetting.js
import mongoose from "mongoose";

const SiteSettingSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, index: true },
    value: { type: Object, default: {} },
  },
  { timestamps: true }
);

export default mongoose.model("SiteSetting", SiteSettingSchema);