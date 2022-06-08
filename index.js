var express = require('express');
var app = express();
var bodyParser = require('body-parser');
//var session = require('express-session');
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


// Initialise App Routes
app.use('/api',auth); 
app.use('/api',alumni); 

/*
app.get('/charles', (req,res)=>{
  
  var staff = [
      { sid: 1, name: 'John', type: 'A'},
      { sid: 2, name: 'Ama', type: 'B'},
      { sid: 3, name: 'Akos', type: 'C'},
      { sid: 4, name: 'Anima', type: 'D'},
      { sid: 5, name: 'Anita', type: 'A'},
      { sid: 6, name: 'George', type: 'B'},
      { sid: 7, name: 'Fred', type: 'C'},
      { sid: 8, name: 'Michael', type: 'D'},
      { sid: 9, name: 'Lucy', type: 'A'},
      { sid: 10, name: 'Duncan', type: 'B'},
    ]

    var zones = [
      { zid: 1, name: 'Kias'},
      { zid: 2, name: 'Benz'},
      { zid: 3, name: 'BMW'},
      { zid: 4, name: 'Honda'},
    ]

    var zone_index = 0, check = {};
    staff = staff && staff.map((s,j) => {  
      if(!check[j]){ 
        check[j] = zone_index;
        s.zid = zones[zone_index].zid
        if(j%2 === 1){
          const new_zone_index = zone_index+1
          const exceed = new_zone_index % zones.length
          zone_index = zones[new_zone_index] ? new_zone_index : exceed;
        }
      } return s;
    })
    
});
*/


// Start Server Instance
var port = process.env.PORT || 5020;
var server = app.listen(port, () => {
  console.log("Server started on Port : "+port);
});
 