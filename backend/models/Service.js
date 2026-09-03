const mongoose = require("mongoose");

const ServiceSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true, uppercase: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    category: { type: String, default: "General", trim: true },
    fee: { type: Number, default: 0, min: 0 },
    icon: { type: String, default: "📄", trim: true },
    route: { type: String, default: "", trim: true },
    fields: { type: [String], default: [] },
    documents: { type: [String], default: [] },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Service || mongoose.model("Service", ServiceSchema);
