import { Schema, model } from "mongoose";

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
    minLength: 3,
    required: true,
  },
  rootDirId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: "Directory",
  },
});

const User = model("User", userSchema);
export default User;
