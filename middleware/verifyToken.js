const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
    let token = req.headers["x-access-token"];
  
    if (!token) {
      return res.status(403).send({
        success: false,
        msg: "No token provided!"
      });
    }
  
    jwt.verify(token,
        "miguelblayackah",
        (err, decoded) => {
        if (err) {
            return res.status(401).send({
               success: false,
               msg: "Unauthorized!",
            });
        }
            console.log("decoded token: ", decoded)
            req.userId = decoded?.user?.tag;
            next();
        });
  };

  module.exports = {
    verifyToken
  }