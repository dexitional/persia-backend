var express = require('express');
var Router = express.Router();
const db = require('../config/mysql')
var jwt = require('jsonwebtoken');
const sha1 = require('sha1')
const { customAlphabet } = require('nanoid')
const nanoid = customAlphabet('1234567890abcdefghijklmnopqrstuvwzyx', 8)

/* Controllers */
var ApplicantController = require('../controller/admission/applicantController');
var SSOController = require('../controller/admission/ssoController');

/* Voucher Recovery */
//Router.post('/auth/voucher', AuthController.verifyVoucher);
/* Developer & Vendor API */
//Router.post('/auth/developer', AuthController.authenticateDeveloper);

/* SSO User Photo */
Router.get('/photos', SSOController.fetchPhoto);
Router.post('/ssophoto', SSOController.postPhoto);

/* SSO Authentication */
Router.post('/auth/sso', SSOController.authenticateUser);

/* SSO Reset */
Router.post('/reset/sendotp', SSOController.sendOtp);
Router.post('/reset/verifyotp', SSOController.verifyOtp);
Router.post('/reset/sendpwd', SSOController.sendPwd);
Router.get('/reset/stageusers', SSOController.stageusers);
Router.get('/reset/testsms', SSOController.testsms);


module.exports = Router;
