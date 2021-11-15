var db = require('../config/database');
var google = require('../config/gsuite2');
var AD = require('ad');

const getConn = (domain) => {
    var conn;
    if(domain == 'ucc.edu.gh'){ 
        conn = new AD({
            url: process.env.AD1_HOST,
            user: process.env.AD1_USER,
            pass: process.env.AD1_PASS,
            tlsOptions: {
                rejectUnauthorized: false
            }
        });
    }else if(domain == 'stu.ucc.edu.gh'){ 
        conn = new AD({
            url: process.env.AD2_HOST,
            user: process.env.AD2_USER,
            pass: process.env.AD2_PASS,
            tlsOptions: {
                rejectUnauthorized: false
            }
        });
    }else{ 
        conn = new AD({
            url: process.env.AD3_HOST,
            user: process.env.AD3_USER,
            pass: process.env.AD3_PASS,
            tlsOptions: {
                rejectUnauthorized: false
            }
        });
    }
    return conn;
}

module.exports = { adcon:getConn, gs:google };
