const mongoose = require('mongoose')
const endpoint = process.env.ENDPOINT

module.exports = async () => {
    await mongoose.connect(endpoint, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    })

    return mongoose
}