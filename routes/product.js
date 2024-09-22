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

router.post("/updateProduct", userAccess, adminAccess, async (req, res) => {
  const { name, price, description, quantity, image } = req.body;
  try {
    if (!name) {
      return res.status(400).json({ message: "Name field is required" });
    }
    const duplicate = await Product.findOne({ name }).exec();
    if (duplicate) {
      if (quantity) {
        duplicate.quantity += quantity;
        if (duplicate.quantity <= 0) {
          await User.findOneAndUpdate(
            { _id: req.user.id },
            { $pull: { productAdded: duplicate._id } },
            { new: true }
          ).exec();
          await Product.findOneAndDelete({ name }).exec();
          return res.status(200).json({
            message: "Product deleted successfully",
            product: duplicate,
          });
        }
      }
      if(price)duplicate.price = price;
      if(description)duplicate.description = description;
      if(image)duplicate.image = image;
      duplicate.addedBy = req.user.id;
      duplicate.addedOn = Date.now();
      duplicate.save();

      await Logger.create({
        by: req.user.id,
        for: duplicate._id,
        type: "upProd",
        creationStamp: Date.now(),
        description: "Product updated successfully",
      });
      return res
        .status(200)
        .json({ message: "Product updated successfully", product: duplicate });
    }
    if(!name||!price||!description||!quantity||!image) return res.status(400).json({ message: "All fields are required" });
    const product = await Product.create({
      name,
      price,
      description,
      quantity,
      image,
      addedBy: req.user.id,
      addedOn: Date.now(),
    });
    await User.findOneAndUpdate(
      { _id: req.user.id },
      { $push: { productAdded: product._id } },
      { new: true }
    ).exec();

    await Logger.create({
      by: req.user.id,
      for: product._id,
      type: "addProd",
      creationStamp: Date.now(),
      description: "Product added successfully",
    });
    res.status(200).json({ message: "Product added successfully", product });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Internal server error" });
  }
});


module.exports = router;
