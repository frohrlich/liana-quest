import express from "express";
import hbs, {
  NodemailerExpressHandlebarsOptions,
} from "nodemailer-express-handlebars";
import nodemailer from "nodemailer";
import path from "path";
import crypto from "crypto";
import asyncMiddleware from "../middleware/asyncMiddleware";
import UserModel from "../models/userModel";
import dotenv from "dotenv";
dotenv.config(); // Load environment variables from .env file

const email = process.env.EMAIL;
const pass = process.env.PASSWORD;

const smtpTransport = nodemailer.createTransport({
  service: process.env.EMAIL_PROVIDER,
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: email,
    pass: pass,
  },
});

const handlebarsOptions: NodemailerExpressHandlebarsOptions = {
  viewEngine: {
    extname: ".html", // handlebars extension
    layoutsDir: "./src/server/templates/", // location of handlebars templates
    defaultLayout: false, // name of main template
  },
  viewPath: path.resolve("./src/server/templates/"),
  extName: ".html",
};

smtpTransport.use("compile", hbs(handlebarsOptions));

const router = express.Router();

router.post(
  "/forgot-password",
  asyncMiddleware(async (req, res, next) => {
    const { email } = req.body;
    const user = await UserModel.findOne({ email });
    if (!user) {
      res.status(400).json({ message: "Unknown email address" });
      return;
    }

    // create user token
    const buffer = crypto.randomBytes(20);
    const token = buffer.toString("hex");

    // update user reset password token and exp
    await UserModel.findByIdAndUpdate(
      { _id: user._id },
      { resetToken: token, resetTokenExp: Date.now() + 600000 }
    );

    // send user password reset email
    const data = {
      to: user.email,
      from: email,
      template: "forgot-password",
      subject: "Liana Quest Password Reset",
      context: {
        url: `${req.protocol}://${req.get(
          "host"
        )}/reset-password?token=${token}`,
        name: user.username,
      },
    };
    await smtpTransport.sendMail(data);

    res.status(200).json({
      message:
        "An email has been sent to your email address. Password reset link is only valid for 10 minutes.",
    });
  })
);

router.post(
  "/reset-password",
  asyncMiddleware(async (req, res, next) => {
    const user = await UserModel.findOne({
      resetToken: req.body.token,
      resetTokenExp: { $gt: Date.now() },
    });
    if (!user) {
      res.status(400).json({ message: "Invalid token" });
      return;
    }

    // ensure provided password matches verified password
    if (req.body.password !== req.body.verifiedPassword) {
      res.status(400).json({ message: "Passwords do not match" });
      return;
    }

    if (!validatePassword(req.body.password)) {
      res.status(400).json({ message: "Invalid password format" });
      return;
    }

    // update user model
    user.password = req.body.password;
    user.resetToken = undefined;
    user.resetTokenExp = undefined;
    await user.save();

    // send user password update email
    const data = {
      to: user.email,
      from: email,
      template: "reset-password",
      subject: "Liana Quest Password Reset Confirmation",
      context: {
        name: user.username,
      },
    };
    await smtpTransport.sendMail(data);

    res.status(200).json({ message: "Password updated" });
  })
);

export default router;

const validatePassword = (password: string) => {
  return password.match(/^.{8,30}$/);
};
