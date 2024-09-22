const mongoose = require("mongoose");

const requestsSchema = new mongoose.Schema({
    by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    for: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    creationStamp: {
        type: Date,
        default: Date.now(),
    },
    approvalStamp: {
        type: Date,
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    type:{
        type: String,
        enum: ['regAdmin','resPass']
    }
}); 

module.exports = mongoose.model("Requests", requestsSchema)