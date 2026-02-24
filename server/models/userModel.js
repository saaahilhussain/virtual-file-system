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
  password: {
    type: String,
    minLength: 6,
  },
  picture: {
    type: String,
    default:
      "https://static.vecteezy.com/system/resources/thumbnails/002/318/271/small/user-profile-icon-free-vector.jpg",
  },
  rootDirId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: "Directory",
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
