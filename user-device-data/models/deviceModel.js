const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
}, { strict: false })

const Device = mongoose.model('Device', deviceSchema);

module.exports = Device;