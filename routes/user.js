const express = require("express");
const router = express.Router();
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const userAccess = require("../middleware/userAccess");
const passport = require("passport");
const { OIDCStrategy } = require("passport-azure-ad");
require("dotenv").config();

passport.use(new OIDCStrategy({
  identityMetadata: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0/.well-known/openid-configuration`,
  clientID: process.env.AZURE_CLIENT_ID,
  clientSecret: process.env.AZURE_CLIENT_SECRET,
  redirectUrl: "http://localhost:3003/auth/azure/callback",
  responseType: "code id_token",
  responseMode: "query",
  scope: ["profile", "offline_access"],
  passReqToCallback: true
}, async (req, iss, sub, profile, accessToken, refreshToken, done) => {
  try {
    let user = await User.findOne({ email: profile.upn }).exec();

    if (!user) {
      user = await User.create({
        username: profile.given_name,
        email: profile.upn,
        password: await bcrypt.hash(Math.random().toString(36).slice(-8), 10), // Random password for new users
      });
    }

    return done(null, user);
  } catch (error) {
    return done(error, null);
  }
}));

router.get("/auth/azure", passport.authenticate("AzureAD", { failureRedirect: "http:localhost:3003/" }));
router.get("/auth/azure/callback", passport.authenticate("AzureAD", { failureRedirect: "http:localhost:3003/" }), (req, res) => {
  const token = jwt.sign({ id: req.user._id, role: req.user.role }, process.env.JWT, { expiresIn: '1h' });
  res.json({ user: req.user, token: token }); // Send user and token to frontend
});

// checked
router.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
  console.log(username, email, password);
  try {
    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const duplicate = await User.findOne({ email }).exec();

    if (duplicate) {
      return res.status(409).json({ message: "User already exists" });
    }

    const user = await User.create({ username, email, password });

    const token = jwt.sign({ id: user._id,role:user.role }, process.env.JWT, {
      expiresIn: '1h'
    });
    res.json({ user: user, token: token });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// checked
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await User.findOne({ email }).exec();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user._id,role: user.role }, process.env.JWT, {
        expiresIn: '1h'
      });
    res.json({ user: user, token: token });
  } 
  catch (err) {
    console.log(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// checked
router.post('/forgotpassword',async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email }).exec();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const token = jwt.sign({ id: user._id,role: user.role,key:"forgotpassword" }, process.env.JWT, {
        expiresIn: '1h'
    });
    res.json({ user: user, token: token });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Internal server error" });
  }
})

// checked
router.post('/resetpassword', userAccess, async (req, res) => {
  const {  password } = req.body;
  try {
    const user = await User.findOne({ _id: req.user.id }).exec();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if(req.user.key!="forgotpassword"){
      return res.status(401).json({ message: "Invalid token" });
    }
    user.password = password
    await user.save()
    res.status(200).json({ message: "Password reset successful" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Internal server error" });
  }
})

module.exports = router;