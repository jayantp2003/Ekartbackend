const express = require("express");
const router = express.Router();
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const userAccess = require("../middleware/userAccess");

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
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email }).exec();
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