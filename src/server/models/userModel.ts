import mongoose from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser {
  email: string;
  password: string;
  username: string;
  resetToken: string;
  resetTokenExp: Date;
  type: string;
  color: number;
  indX: number;
  indY: number;
  mapName: string;
}

interface IUserMethods {
  isValidPassword(password: string): Promise<boolean>;
}

const Schema = mongoose.Schema;

const UserSchema = new Schema<IUser, {}, IUserMethods>({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: true,
  },
  resetToken: {
    type: String,
  },
  resetTokenExp: {
    type: Date,
  },
  type: {
    type: String,
  },
  color: {
    type: Number,
  },
  indX: {
    type: Number,
  },
  indY: {
    type: Number,
  },
  mapName: {
    type: String,
  },
});

UserSchema.pre("save", async function (next) {
  const user = this;
  const hash = await bcrypt.hash(this.password, 10);
  this.password = hash;
  next();
});

UserSchema.methods.isValidPassword = async function (password: string) {
  const user = this;
  const compare = await bcrypt.compare(password, user.password);
  return compare;
};

const UserModel = mongoose.model("user", UserSchema);

export default UserModel;
