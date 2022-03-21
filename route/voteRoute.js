var express = require('express');
var Router = express.Router();
const db = require('../config/mysql')
var jwt = require('jsonwebtoken');
const sha1 = require('sha1')
const { customAlphabet } = require('nanoid')
const nanoid = customAlphabet('1234567890abcdefghijklmnopqrstuvwzyx', 8)

/* Controllers */
var ALUController = require('../controller/admission/alumniController');

/* ALUMNI MODULE ROUTES */

// ALUMNI routes
Router.get('/alumni', ALUController.fetchAlumni);
Router.post('/alumni', ALUController.postAlumni);
Router.delete('/alumni/:id', ALUController.deleteAlumni);





module.exports = Router;
