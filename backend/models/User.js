const mongoose = require("mongoose");


const userSchema = new mongoose.Schema(
    {

        fullName: {
            type: String,
            required: true
        },


        mobile: {
            type: String,
            required: true,
            unique: true
        },


        email: {
            type: String,
            required: false
        },


        password: {
            type: String,
            required: true
        },


        role: {
            type: String,
            enum: ["user", "admin"],
            default: "user"
        },

        walletBalance: {
            type: Number,
            default: 0,
            min: 0
        }

    },
    {
        timestamps: true
    }
);


module.exports = mongoose.model("User", userSchema);