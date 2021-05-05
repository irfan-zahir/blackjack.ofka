const mongoose = require('mongoose')

const guildSchema = mongoose.Schema({
    gid:{
        type: String,
        required: true
    },
    channelID:{
        type: String,
        required: true
    },
    name:{
        type: String,
        required: true
    }
})

module.exports = mongoose.model('guild', guildSchema)