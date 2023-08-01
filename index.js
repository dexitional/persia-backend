var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var helmet = require('helmet');
var fileUpload = require('express-fileupload');
var cors = require('cors');
var compression = require('compression');

//  Include Routes
var auth = require('./route/authRoute');
var alumni = require('./route/alumniRoute');
app.set('view engine','ejs');
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use("/public",express.static("public"));
app.use(cors()); 
app.use(compression()); 
app.use(fileUpload());
app.use(helmet());
 

// Initialise App Routes
app.use('/api',auth); 
app.use('/api',alumni); 
app.use("/",express.static("public/frontend"));


// Start Server Instance
var port = process.env.PORT || 5020;
var server = app.listen(port, () => {
  console.log("Server started on Port : "+port);
});
 