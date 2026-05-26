import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "./models/user.js";

dotenv.config();

await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);

const user = await User.findOne({ email: "22501a4244@pvpsit.ac.in" }).lean();

console.log(user);

await mongoose.disconnect();
