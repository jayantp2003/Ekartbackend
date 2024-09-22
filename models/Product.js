const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    price: {
        type: Number,
        required: true,
    },
    quantity:{
        type: Number,
        default: 0,
    },
    image: {
        type: String,
        required: true,
    },
    addedOn: {
        type: Date,
        default: Date.now(),
    },
    addedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
});
module.exports = mongoose.model('Product', productSchema);