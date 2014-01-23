var mongoose = require("mongoose");
mongoose.connect("mongodb://localhost:27017/dropsphere_dev");
var db = mongoose.connection;

exports.db = db; 