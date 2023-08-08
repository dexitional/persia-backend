// rate-limiter.js
const rateLimiter = require("express-rate-limit");
 
const limiter = rateLimiter({
    max: 5,
    windowMS: 10000, // 10 seconds
    message: "You can't make any more requests at the moment. Try again later",
});

const signInLimiter = rateLimiter({
    max: 3,
    windowMS: 10000, //10 seconds
    message: "Too many sign-in attempts. Try again later."
})

const voteLimiter = rateLimiter({
    max: 3,
    windowMS: 10000, //10 seconds
    message: "Too many attempts. Try again later."
})
 
module.exports = {
    limiter,
    signInLimiter,
    voteLimiter
}
 

// EH/BSS/19/0234 - adongo
// EH/ACT/20/0075 - abanga

