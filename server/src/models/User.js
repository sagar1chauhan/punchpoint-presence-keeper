import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: [true, "Password hash is required"],
    },
    role: {
      type: String,
      enum: ["employee", "manager", "admin"],
      default: "employee",
      index: true,
    },
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    team: {
      type: String,
      default: "Engineering",
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.passwordHash);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  obj.id = obj._id.toString();
  delete obj.passwordHash;
  delete obj.__v;
  // Compute initials
  if (obj.name) {
    const parts = obj.name.trim().split(/\s+/);
    obj.initials = parts.map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  } else {
    obj.initials = "U";
  }
  return obj;
};

export const User = mongoose.model("User", userSchema);
export default User;
