const mongoose = require('mongoose')

const userSchema = mongoose.Schema({
    uid: {
        type: String,
        required: true
    },
    gid:{
        //specific guild in case same user of different server
        type: String,
        required: true
    },
    wins: {
        type: Number,
        default: 0
    },
    loses: {
        type: Number,
        default: 0
    },
    dailyClaims: {
        type: Boolean,
        default: false
    },
    chips: {
        type: Number,
        default: 500
    },
    username: {
        type: String,
        required: true
    }
})

module.exports = mongoose.model('users', userSchema)