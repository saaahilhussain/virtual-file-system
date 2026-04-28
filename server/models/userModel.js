import { Schema, model } from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new Schema({
  name: {
    type: String,
    minLength: [3, "Name must have minimum 3 characters"],
    required: true,
  },
  email: {
    type: String,
    match: [
      /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+.[A-Za-z]{2,}$/,
      "Please enter a valid email",
    ],
    minLength: 4,
    required: true,
  },
  maxStorageInBytes: {
    type: Number,
    required: true,
    default: 1 * 1024 ** 3, // 1GB --> 50 GB -- FREE
    // default: 2 * 1024 ** 2, // 2GB  --> 200 GB   -- PRO
    // default: 1 * 1024 ** 3, //  2 TB  -- PREMIUM
  },
  password: {
    type: String,
    minLength: 6,
  },
  picture: {
    type: String,
    default:
      "https://static.vecteezy.com/system/resources/thumbnails/002/318/271/small/user-profile-icon-free-vector.jpg",
  },
  createdAt: {
    type: Date,
    default: null,
  },
  updatedAt: { type: Date, default: null },
  isTrashed: {
    type: Boolean,
    default: false,
  },
  rootDirId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: "Directory",
  },
  role: {
    type: String,
    enum: ["user", "manager", "admin", "owner"],
    default: "user",
  },
  // subscriptionId: {
  //   type: Schema.Types.ObjectId,
  //   required: true,
  //   ref: "Subscription",
  // },
  isDeleted: {
    type: Boolean,
    default: false,
  },
});

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return; // suppose user only changed his name, then early return old password hash
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = model("User", userSchema);
export default User;
