var express = require("express");
var bodyParser = require("body-parser");
var information = require("./information");

var port = process.env.PORT || 3000;
var app = express();
app.use(bodyParser.json());

app.post("/information", information);

app.listen(port, () => console.log("listening on port " + port + "!"));
