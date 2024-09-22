const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Product = require("../models/Product");
const Requests = require("../models/Requests");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const userAccess = require("../middleware/userAccess");
const adminAccess = require("../middleware/adminAccess");
const superAccess = require("../middleware/superAccess");
const Logger = require("../models/internalLogger");

// checked
router.post("/adminRegister", userAccess, adminAccess, async (req, res) => {
  const { username, email, password } = req.body;
  try {
    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const duplicate = await User.findOne({ email }).exec();

    if (duplicate) {
      return res.status(409).json({ message: "User already exists" });
    }

    if(req.user.role==="super"){
      await User.create({
        username,
        email,
        password,
        role: "admin",
        addedBy: req.user.id,
        addedOn: Date.now(),
        approvedBy: req.user.id,
        approvedOn: Date.now(),
      })

      await Logger.create({
        by: req.user.id,
        for: req.user.id,
        type: "regAdmin",
        creationStamp: Date.now(),
        description: "Admin created successfully",
      });

      res.status(201).json({ message: "Admin created successfully" });
      return
    }

    const user1 = await User.findOne({ _id: req.user.id }).exec();
    if (!user1) {
      return res.status(404).json({ message: "User not found" });
    }
    if(user1.approvedBy==null)
    {
      return res
        .status(403)
        .json({ message: "Wait for approval and then get started!!" });
    }
    const user = await User.create({
      username,
      email,
      password,
      role: "admin",
      addedBy: req.user.id,
      addedOn: Date.now(),
    });

    await Logger.create({
      by: req.user.id,
      for: user._id,
      type: "regAdmin",
      creationStamp: Date.now(),
      description: "Admin created successfully, Approval Pending",
    });

    const requests = await Requests.create({
      by: req.user.id,
      for: user._id,
      type: "regAdmin",
      creationStamp: Date.now(),
    });

    await User.findOneAndUpdate(
      { _id: req.user.id },
      { $push: { requests: requests._id } },
      { new: true }
    ).exec();
    res
      .status(201)
      .json({
        user,
        message:
          "Admin created successfully, Wait for approval and then get started!!",
      });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Internal server error" });
  }
});



router.post("/adminLogin", adminAccess, async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await User.findOne({ email }).exec();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role !== "user") {
      return res.status(403).json({ message: "Not an admin" });
    }

    if (user.approvedBy === null && user.role === "admin") {
      return res
        .status(403)
        .json({ message: "Wait for approval and then get started!!" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    await Logger.create({
      by: user._id,
      for: user._id,
      type: "logAdmin",
      creationStamp: Date.now(),
      description: `Admin ${user.email} logged in successfully`,
    });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT, {
      expiresIn: "1h",
    });

    res
      .status(200)
      .json({ user: user, token: token, message: "Admin Login successful" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get(
  "/getallRequest",
  userAccess,
  adminAccess,
  superAccess,
  async (req, res) => {
    try {
      const requests = await Requests.find({}).exec();
      res.status(200).json({ requests });
    } catch (err) {
      console.log(err);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

router.post(
  "/adminResetPasswordRequest",
  userAccess,
  adminAccess,
  async (req, res) => {
    const { email } = req.body;
    try {
      const user = await User.findOne({ email }).exec();
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.approvedBy === null) {
        return res
          .status(403)
          .json({ message: "Wait for approval and then get started!!" });
      }

      const requests = await Requests.create({
        by: req.user.id,
        for: user._id,
        type: "resPass",
        creationStamp: Date.now(),
      });

      await User.findOneAndUpdate(
        { _id: req.user.id },
        { $push: { requests: requests._id } },
        { new: true }
      ).exec();

      await Logger.create({
        by: req.user.id,
        for: user._id,
        type: "reqPass",
        creationStamp: Date.now(),
        description: `Password reset request sent for ${user.email}`,
      });

      res.status(200).json({ message: "Password reset request sent" });
    } catch (err) {
      console.log(err);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

router.post("/updatePassword", userAccess, adminAccess, async (req, res) => {
  const { password } = req.body;
  try {
    if (!password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (req.user.approvedBy === null) {
      return res
        .status(403)
        .json({ message: "Wait for approval and then get started!!" });
    }

    const user = await User.findOne({ _id: req.user.id }).exec();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    user.password = password;
    user.save();

    await Logger.create({
      by: req.user.id,
      for: user._id,
      type: "resPass",
      creationStamp: Date.now(),
      description: `Password updated for ${user.email}`,
    });

    res.status(200).json({ message: "Password updated successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Internal server error" });
  }
});


router.post("/deleteRequest", userAccess, adminAccess, async (req, res) => {
  const { requestId } = req.body;
  try {
    const request = await Requests.findOne({ _id: requestId }).exec();
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }
    await Requests.findOneAndDelete({ _id: requestId }).exec();
    await User.findOneAndUpdate(
      { _id: request.for },
      { $pull: { requests: request._id } },
      { new: true }
    ).exec();

    await Logger.create({
      by: req.user.id,
      for: request.for,
      type: "delReq",
      creationStamp: Date.now(),
      description: `Request deleted for ${request.for}`,
    });
    res.status(200).json({ message: "Request deleted successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post(
  "/processRequest",
  userAccess,
  adminAccess,
  superAccess,
  async (req, res) => {
    const { requestId } = req.body;
    try {
      const request = await Requests.findOne({ _id: requestId }).exec();
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }
      if (request.type === "regAdmin") {
        const user = await User.findOne({ _id: request.for }).exec();
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
        user.role = "admin";
        user.approvedBy = req.user.id;
        user.save();

        await Logger.create({
          by: req.user.id,
          for: user._id,
          type: "appAdmin",
          creationStamp: Date.now(),
          description: `Admin ${user.email} approved successfully`,
        });
        // a mail to be sent informing that you are now an admin
      } else {
        const user = await User.findOne({ _id: request.for }).exec();
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        // this token will be sent on mail as url and to be used to reset password
        const token = jwt.sign(
          { id: user._id, role: user.role, approvedBy: user.approvedBy },
          process.env.JWT,
          {
            expiresIn: "6h",
          }
        );

        await Logger.create({
          by: req.user.id,
          for: user._id,
          type: "appPass",
          creationStamp: Date.now(),
          description: `User ${user.email} approved successfully`,
        });
        // res.json({ user: user, token: token });
      }
      await Requests.findOneAndUpdate(
        { _id: requestId },
        { $set: { approvalStamp: Date.now(), approvedBy: req.user.id } },
        { new: true }
      ).exec();
      res.status(200).json({ message: "Request processed successfully" });
    } catch (err) {
      console.log(err);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

router.get("/getLog", userAccess, adminAccess,superAccess, async (req, res) => {
  const logId = req.body.logId;
  try {
    const log = await Logger.findOne({ _id: logId }).exec();
    if (!log) {
      return res.status(404).json({ message: "Log not found" });
    }
    const user1 = await User.findOne({ _id: log.by }).exec();
    const user2 = await User.findOne({ _id: log.for }).exec();
    user1.password = null;
    user2.password = null;
    log.by = user1;
    log.for = user2;
    res.status(200).json({ log });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/getAllLogs", userAccess, adminAccess, async (req, res) => {
  try {
    const logs = await Logger.find({}).exec();
    res.status(200).json({ logs });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
