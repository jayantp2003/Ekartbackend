const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Product = require("../models/Product");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const userAccess = require("../middleware/userAccess");
const adminAccess = require("../middleware/adminAccess");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

router.get("/products", userAccess, async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/updateWishlist", userAccess, async (req, res) => {
  const { productId, quantity } = req.body;
  try {
    const product = await Product.findOne({ _id: productId }).exec();
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    const user = await User.findOne({ _id: req.user.id }).exec();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.wishlist.find((p) => p.id === productId)) {
      await User.findOneAndUpdate(
        { _id: req.user.id },
        { $set: { "wishlist.$[elem].quantity": quantity } },
        { arrayFilters: [{ "elem.id": productId }], new: true }
      ).exec();
      res.status(200).json({ message: "Product updated successfully", user });
    } else {
      await User.findOneAndUpdate(
        { _id: req.user.id },
        { $push: { wishlist: { id: productId, quantity: quantity } } },
        { new: true }
      ).exec();
      res
        .status(200)
        .json({ message: "Product added to wishlist successfully", user });
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/transactWishList", userAccess, async (req, res) => {
  const { source } = req.body;
  try {
    const user = await User.findOne({ _id: req.user.id }).exec();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (!source) {
      return res.status(400).json({ message: "Missing payment source" });
    }
    const wishlist = user.wishlist;
    const wishlistIds = wishlist.map(item => item.id);
    const products = await Product.find({ _id: { $in: wishlistIds } }).exec();  
    const paymentIntent = await stripe.paymentIntents.create({
      amount: products.reduce(
        (acc, curr,idx) => acc + curr.price * wishlist[idx].quantity,
        0
      ),
      currency: "inr",
      source: source,
      description: "Payment for wishlist",
      metadata: { userId: req.user.id },
    });

    if (!paymentIntent) {
      return res.status(500).json({ message: "Payment failed" });
    }

    await User.findOneAndUpdate(
      { _id: req.user.id },
      { $set: { wishlist: [] } },
      { new: true }
    ).exec();

    for (let i = 0; i < products.length; i++) {
      await User.findOneAndUpdate(
        { _id: req.user.id },
        { $push: { productBought: { id: products[i]._id, quantity: wishlist[i].quantity, price: products[i].price } } },
        { new: true }
      ).exec();
    }
    res
      .status(200)
      .json({ message: "Payment successful", products, paymentIntent });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/transactionSingle", userAccess, async (req, res) => {
  const { productId, quantity, source } = req.body;
  try {
    const product = await Product.findOne({ _id: productId }).exec();
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    const user = await User.findOne({ _id: req.user.id }).exec();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (!source) {
      return res.status(400).json({ message: "Missing payment source" });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: quantity * product.price,
      currency: "inr",
      source: source,
      description: `Payment for ${product.name}`,
      metadata: { userId: req.user.id, productId: productId },
    });

    if (!paymentIntent) {
      return res.status(500).json({ message: "Payment failed" });
    }

    await User.findOneAndUpdate(
      { _id: req.user.id },
      { $pull: { wishlist: { id: productId } } },
      { new: true }
    ).exec();
    
    await User.findOneAndUpdate(
      { _id: req.user.id },
      { $push: { productBought: { id: productId, quantity: quantity, price: product.price } } },
      { new: true }
    ).exec();
    res
      .status(200)
      .json({ message: "Payment successful", product, paymentIntent });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
