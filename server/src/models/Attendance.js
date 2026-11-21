import mongoose from "mongoose";

const punchSchema = new mongoose.Schema(
  {
    time: { type: Date, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    selfieUrl: { type: String, required: true },
  },
  { _id: false }
);

const attendanceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    date: {
      type: String, // YYYY-MM-DD
      required: true,
    },
    punchIn: {
      type: punchSchema,
      required: true,
    },
    punchOut: {
      type: punchSchema,
      default: null,
    },
    totalHours: {
      type: Number,
      default: 0,
    },
    shiftStatus: {
      type: String,
      enum: ["completed", "incomplete"],
      default: "incomplete",
    },
    validation: {
      status: {
        type: String,
        enum: ["pending", "valid", "invalid"],
        default: "pending",
      },
      remarks: {
        type: String,
        default: "",
      },
      validatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      validatedAt: {
        type: Date,
        default: null,
      },
    },
    overtimeStatus: {
      type: String,
      enum: ["none", "pending", "approved", "rejected"],
      default: "none",
    },
  },
  {
    timestamps: true,
  }
);

// One punch record per user per day
attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: 1 });

attendanceSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id.toString();
  delete obj.__v;
  // Provide convenient client format
  if (obj.punchIn && obj.punchIn.time) {
    const d = new Date(obj.punchIn.time);
    obj.punchInFormatted = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (obj.punchOut && obj.punchOut.time) {
    const d = new Date(obj.punchOut.time);
    obj.punchOutFormatted = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return obj;
};

export const Attendance = mongoose.model("Attendance", attendanceSchema);
export default Attendance;
