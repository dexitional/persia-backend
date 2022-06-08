var bcrypt = require('bcrypt');
var moment = require('moment');
var jwt = require('jsonwebtoken');
const fs = require('fs');
const sha1 = require('sha1');
const path = require('path');
const { customAlphabet } = require('nanoid')
const nanoid = customAlphabet('1234567890abcdefghijklmnopqrstuvwzyx', 8)
const digit = customAlphabet('1234567890',5)
const mailer = require('../../config/email')
const sms = require('../../config/sms')
const db = require('../../config/mysql')

const { ALU } = require('../../model/mysql/alumniModel');
const { SSO } = require('../../model/mysql/ssoModel');


module.exports = {
  
  // ALUMNI CONTROLS

  fetchAlumni : async (req,res) => {
    try{
        var alumni = await ALU.fetchAlumni();
        if(alumni && alumni.length > 0){
            res.status(200).json({success:true, data:alumni});
        }else{
            res.status(200).json({success:false, data: null, msg:"No records!"});
        }
    }catch(e){
        console.log(e)
        res.status(200).json({success:false, data: null, msg: "Something went wrong error !"});
    }
  },


  postAlumni : async (req,res) => {
      try{
        const { id,pass,is_staff,email,phone } = req.body;
        delete req.body.mtoken,delete req.body.token;
        delete req.body.view,delete req.body.rpass,delete req.body.pass;
        var resp
        const isExist = await ALU.checkUser(req.body.email,req.body.phone)
        if(isExist && isExist.length > 0){
          res.status(200).json({success:false, data: null, msg:"Alumni user already exists, please signin or reset your account!"});
        }else{

          var msg = ``
          const counter = await ALU.getAlumniRefNo(req.body.country_id) || `000001`
          const refno = `${req.body.country_id}${counter}`
          req.body.country_count = counter;
          req.body.refno = refno;
          req.body.created_at = new Date()
          
          if(!req.body.is_staff){
            const ups = await SSO.insertSSOUser({username:email,password:sha1(pass.trim()),group_id:6,tag:refno})
            const role = await SSO.insertSSORole({uid:ups.insertId,arole_id:1})
            const pic = await SSO.insertPhoto(ups.insertId,refno,6,'./public/cdn/photo/none.png')
            msg = `Hi ${req.body.fname}, please signin to alumni account with sso email: ${email} and sso password: ${pass.trim()}!`

          }else{
            const user = await SSO.fetchSSOUser(req.body.emp_no)
            if(user && user.length > 0){
              const role = await SSO.insertSSORole({uid:user && user[0].uid,arole_id:1})
            } msg = `Hi ${req.body.fname}, please signin to alumni account with your UCC institutional email and password!`
          }
          resp = await ALU.insertAlumni(req.body);
          if(resp){
            await sms(phone,msg) // Send SMS for Verification
            res.status(200).json({success:true, data:resp});
          }else{
            res.status(200).json({success:false, data: null, msg:"Action failed!"});
          }
        }
        
      }catch(e){
        console.log(e)
        res.status(200).json({success:false, data: null, msg: "Something wrong happened!"});
      }
  },

  deleteAlumni : async (req,res) => {
    try{
        const { id } = req.params;
        var resp = await SSO.deleteAlumni(id);
        if(resp){
            res.status(200).json({success:true, data:resp});
        }else{
            res.status(200).json({success:false, data: null, msg:"Action failed!"});
        }
    }catch(e){
        console.log(e)
        res.status(200).json({success:false, data: null, msg: "Something wrong !"});
    }
  },

   

}

