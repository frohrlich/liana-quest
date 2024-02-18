import passport from "passport";
const localStrategy = require("passport-local").Strategy;
const JWTstrategy = require("passport-jwt").Strategy;

import UserModel from "../models/userModel";

// handle user registration
passport.use(
  "signup",
  new localStrategy(
    {
      usernameField: "email",
      passwordField: "password",
      passReqToCallback: true,
    },
    async (req, email, password, done) => {
      try {
        if (!validateEmail(email)) {
          return done(null, false, { message: "Invalid email format" });
        }
        const userAlreadyThere = await UserModel.findOne({ email });
        if (userAlreadyThere) {
          return done(null, false, { message: "Email already in use" });
        }
        const { username } = req.body;
        const user = await UserModel.create({ email, password, username });
        return done(null, user);
      } catch (error) {
        done(error);
      }
    }
  )
);

// handle user login
passport.use(
  "login",
  new localStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    async (email, password, done) => {
      try {
        if (!validateEmail(email)) {
          return done(null, false, { message: "Invalid email format" });
        }
        const user = await UserModel.findOne({ email });
        if (!user) {
          return done(null, false, { message: "Wrong email or password" });
        }
        const validate = await user.isValidPassword(password);
        if (!validate) {
          return done(null, false, { message: "Wrong email or password" });
        }
        return done(null, user, { message: "Logged in Successfully" });
      } catch (error) {
        return done(error);
      }
    }
  )
);

// verify token is valid
passport.use(
  new JWTstrategy(
    {
      secretOrKey: process.env.TOKEN_SECRET,
      jwtFromRequest: function (req) {
        let token = null;
        if (req && req.cookies) token = req.cookies["jwt"];
        return token;
      },
    },
    async (token, done) => {
      try {
        return done(null, token.user);
      } catch (error) {
        done(error);
      }
    }
  )
);

const validateEmail = (email: string) => {
  return email.match(
    /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
  );
};
