const mongoose = require("mongoose");

const loggerSchema = new mongoose.Schema({
  by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  for: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  type: {
    type: String,
    enum: ["auth", "regAdmin","logAdmin","reqPass", "resPass", "appAdmin", "appPass" ,"delReq","addProd", "upProd"],
  },
  creationStamp: {
    type: Date,
    default: Date.now(),
  },
  description: {
    type: String,
  },
});

module.exports = mongoose.model("Logger", loggerSchema);
