var bcrypt = require('bcrypt');
var moment = require('moment');
var jwt = require('jsonwebtoken');
const fs = require('fs');
const sha1 = require('sha1');
const path = require('path');
const { customAlphabet } = require('nanoid')
const nanoid = customAlphabet('1234567890abcdefghijklmnopqrstuvwzyx', 8)
const digit = customAlphabet('1234567890', 4)
const mailer = require('../../config/email')
const sms = require('../../config/sms')
const db = require('../../config/mysql')

const { SSO } = require('../../model/mysql/ssoModel');
const { Admission } = require('../../model/mysql/admissionModel');
const { Student } = require('../../model/mysql/studentModel');
const { cleanPhone } = require('../../middleware/util');
const { Box } = require('../../model/mysql/boxModel');
const { exit } = require('process');


module.exports = {
 
  authenticateUser : async (req,res) => {
      const { username,password } = req.body;
      try{
            var user = await SSO.verifyUser({username,password});
            if(user && user.length > 0){
                var roles = await SSO.fetchRoles(user[0].uid); // Roles
                var photo = await SSO.fetchPhoto(user[0].uid); // Photo
                var userdata = await SSO.fetchUser(user[0].uid,user[0].group_id); // UserData
                userdata[0] = userdata ? { ...userdata[0], user_group : user[0].group_id, mail: user[0].username } : null;
                var data = { roles, photo: ((photo && photo.length) > 0 ? `${req.protocol}://${req.get('host')}/api/photos/?tag=${photo && photo[0].tag}`: `${req.protocol}://${req.get('host')}/api/photos/?tag=00000000`), user:userdata && userdata[0] };
                // Generate Session Token 
                const token = jwt.sign({ data:user }, 'secret', { expiresIn: 60 * 60 });
                data.token = token;
                
                const lgs = await SSO.logger(user[0].uid,'LOGIN_SUCCESS',{username}) // Log Activity
                console.log(lgs)
                res.status(200).json({success:true, data});

            }else{
                const lgs = await SSO.logger(0,'LOGIN_FAILED',{username}) // Log Activity
                console.log(lgs)
                res.status(200).json({success:false, data: null, msg:"Invalid username or password!"});
            }
      }catch(e){
          console.log(e)
          const lgs = await await SSO.logger(0,'LOGIN_ERROR',{username,error:e}) // Log Activity
          console.log(lgs)
          res.status(200).json({success:false, data: null, msg: "System error detected."});
      }
  },


  sendOtp : async (req,res) => {
    
    try{
      var { email } = req.body;
      var user = await SSO.fetchUserByVerb(email)
      const newphone = cleanPhone(user.phone)
      const { mail,tag }  = user;
      const otp = digit() // Generate OTP 
      const dt = { access_token:otp,access_expire:moment().add(5,'minutes').format('YYYY-MM-DD HH:mm:ss') }
       
      var msg;
      console.log(newphone)
      console.log(mail)
      if(!newphone) {
         res.status(200).json({ success:false, data:null, msg:`${user.gname} phone incorrect, visit MIS-DICT for assistance !` });
      }else{
         // If User exist
         if(user){
            var sdata;

            if(parseInt(user.gid) == 1){ 
                // STUDENTS
                var userdata;
                if(mail){
                    const domain = 'stu.ucc.edu.gh'
                    const dm = { ...user }
                    const ad = await Box.checkAdUser(dm,domain) // Check existence in SSO-AD
                    const gs = await Box.checkGsUser(dm)        // Check existence in SSO-GSuite
                    userdata = { username:mail, flag_ad:ad?1:0, flag_gs:gs?1:0, access_token:otp, access_expire:moment().add(5,'minutes').format('YYYY-MM-DD HH:mm:ss') }
                    // Check User SSO 
                    const isUser = await SSO.fetchSSOUser(tag)
                    if(isUser && isUser.length > 0){
                      // Update Existing SSO User
                      const ups = await SSO.updateUserByEmail(isUser[0].username,userdata)
                      if(ups && ups.affectedRows > 0) userdata = { ...userdata,uid:isUser[0].uid }
                    }else{
                      // Insert New SSO User
                      userdata = { ...userdata,password:sha1(otp), group_id:user.gid, tag }
                      const ins = await SSO.insertSSOUser(userdata)  
                      if(ins && ins.insertId > 0) userdata = { ...userdata,uid:ins.insertId }
                    }
                    sdata = { user,userdata }
                
                }else{
                    // Note if UCC Mail does not exist, reset portal password but leave gsuite & AD && send SMS for update with MIS && Log Password for later setup of AD & Gsuite
                    userdata = { username:tag, flag_ad:0, flag_gs:0,access_token:otp,access_expire:moment().add(5,'minutes')  }
                    // Check User SSO 
                    const isUser = await SSO.fetchSSOUser(tag)
                    if(isUser && isUser.length > 0){
                      // Update Existing SSO User
                      const ups = await SSO.updateUserByEmail(isUser[0].username,userdata)
                      if(ups && ups.affectedRows > 0) userdata = { ...userdata,uid:isUser[0].uid }
                    }else{
                      // Insert New SSO User
                      userdata = { ...userdata,password:sha1(otp), group_id:user.gid, tag }
                      const ins = await SSO.insertSSOUser(userdata)
                      if(ins && ins.insertId > 0) userdata = { ...userdata,uid:ins.insertId }
                    }
                    sdata = { user,userdata }
                }

                
            }else if(parseInt(user.gid) == 2){ 
               // STAFF
               var userdata;
               const domain = 'ucc.edu.gh'
               // Run Mail Generator
               const genMail = await SSO.generateMail(user,domain)

               if(mail){
                   const dm = { ...user }
                   const ad = await Box.checkAdUser(dm,domain) // Check existence in SSO-AD
                   const gs = await Box.checkGsUser(dm)        // Check existence in SSO-GSuite
                   userdata = { username:mail, flag_ad:ad?1:0, flag_gs:gs?1:0, access_token:otp, access_expire:moment().add(5,'minutes').format('YYYY-MM-DD HH:mm:ss') }
                   // Check User SSO 
                   const isUser = await SSO.fetchSSOUser(tag)
                   if(isUser && isUser.length > 0){
                     // Update Existing SSO User
                     const ups = await SSO.updateUserByEmail(isUser[0].username,userdata)
                     if(ups && ups.affectedRows > 0) userdata = { ...userdata,uid:isUser[0].uid }
                   }else{
                     // Insert New SSO User
                     userdata = { ...userdata,password:sha1(otp), group_id:user.gid, tag }
                     const ins = await SSO.insertSSOUser(userdata)
                     if(ins && ins.insertId > 0) userdata = { ...userdata,uid:ins.insertId }
                   }
                   sdata = { user,userdata }
               
               }else{
                   // Note if UCC Mail does not exist, reset portal password but leave gsuite & AD && send SMS for update with MIS && Log Password for later setup of AD & Gsuite
                   userdata = { username:tag, flag_ad:0, flag_gs:0,access_token:otp,access_expire:moment().add(5,'minutes')  }
                   // Check User SSO 
                   const isUser = await SSO.fetchSSOUser(tag)
                   if(isUser && isUser.length > 0){
                     // Update Existing SSO User
                     const ups = await SSO.updateUserByEmail(isUser[0].username,userdata)
                     if(ups && ins.affectedRows > 0) userdata = { ...userdata,uid:isUser[0].uid }
                   }else{
                     // Insert New SSO User
                     userdata = { ...userdata,password:sha1(otp), group_id:user.gid,tag }
                     const ins = await SSO.insertSSOUser(userdata)
                     if(ins && ins.insertId > 0) userdata = { ...userdata,uid:ins.insertId }
                   }
                   sdata = { user,userdata }
               }


            }else if(parseInt(user.gid) == 3){ // NSS

            }else if(parseInt(user.gid) == 4){ // Job

            }else if(parseInt(user.gid) == 5){ // Alumni

            }

            if(sdata){
              var sendcode;
              // Send OTP-SMS
              const msg = `Hi ${user.fname}, Reset OTP code is ${otp}`
              const sm = await sms(newphone,msg)
              //const sm = { code: 1000 }
              sendcode = sm.code
              console.log(sm.code)
              console.log(sdata)
              if(sendcode == 1000) { res.status(200).json({success:true, data: { otp, email:  sdata.userdata.username, sdata } }) }
              else if(sendcode == 1003) { res.status(200).json({ success:false, data: null, msg:"OTP credit exhausted!" }) }
              else { res.status(200).json({ success:false, data: null, msg:"OTP was not sent!" }) }
              
            }else{
              res.status(200).json({ success:false, data: null, msg:"Something wrong happened!" });
            }
         }else{
           res.status(200).json({ success:false, data: null, msg:"User does not exist!" });
         }
         
      }
      
    }catch(e){
        console.log(e)
        res.status(200).json({success:false, data: null, msg: "Please try again later."});
    }
  },


  verifyOtp : async (req,res) => {
    const { email,token,sdata } = req.body;
    try{
      //var user = await SSO.verifyUserByEmail({email});
      if(sdata  && sdata.userdata.access_token == token){
      //if(user  && user[0].access_token == token){
        res.status(200).json({success:true, data: { token,sdata } }) 
      }else{
        res.status(200).json({ success:false, data: null, msg:"OTP verification failed!" });
      }
    }catch(e){
        console.log(e)
        res.status(200).json({success:false, data: null, msg: "Please try again later."});
    }
  },


  sendPwd : async (req,res) => {
    var { email,password,sdata } = req.body;
    try{
      // SSO Password Reset
      const dt = { password : sha1(password.trim()) }
      const ups = await SSO.updateUserByEmail(email,dt)
      
      if(sdata.user.mail){
        const ad_domain = parseInt(sdata.user.gid) == 1 ? 'stu.ucc.edu.gh':'ucc.edu.gh'
        const ad_location = parseInt(sdata.user.gid) == 1 ? 'students':'staff'
        const userName = sdata.user.mail.split('@')[0]
        const ad_data = { mail:sdata.user.mail,password,userName,commonName:`${sdata.user.name}`,firstName:sdata.user.fname,lastName:sdata.user.lname,email:sdata.user.mail,title:sdata.user.tag,location:ad_location,objectClass: ["top", "person", "organizationalPerson", "user"],phone:sdata.user.phone,email:sdata.user.mail,passwordExpires:false,enabled:true,description:sdata.user.descriptor,unit:sdata.user.unitname}
        const gs_data = { mail:sdata.user.mail,password:dt.password,commonName:`${sdata.user.name}`,firstName:sdata.user.fname,lastName:sdata.user.lname,email:sdata.user.mail,title:sdata.user.tag,location:ad_location,phone: sdata.user.phone,email:sdata.user.mail,description:sdata.user.descriptor,unit:sdata.user.unitname}
        // AD Password Reset
        if(sdata.userdata.flag_ad){
          const sendToAd = await Box.changeAdPwd(ad_data,ad_domain)
        }else{
          const sendToAd = await Box.insertAdUser(ad_data,ad_domain)
          if(sendToAd) sdata.userdata.flag_ad = 1
        }
        // GS Password Reset
        if(sdata.userdata.flag_ad){
          const sendToGs = await Box.changeGsPwd(gs_data)
        }else{
          const sendToGs = await Box.insertGsUser(gs_data)
          if(sendToAd) sdata.userdata.flag_gs = 1
        }
      }
      
      // Domain Password Reset
      const sentToDomain = await SSO.updateDomainPassword(sdata.user.tag,sdata.user.gid,password,sdata)
  
      if(ups){ res.status(200).json({ success:true, data:'password changed!' }) 
      }else{
        res.status(200).json({ success:false, data: null, msg:"Password change failed!" });
      }
    }catch(e){
        console.log(e)
        res.status(200).json({ success:false, data: null, msg:"Please try again later." });
    }
  },

  stageusers : async (req,res) => {
    try{
        const students = await Student.fetchUsers('01');
        const staff = await Student.fetchUsers('02');
        var count = 0;
        if(students && students.length > 0){
          for(user of students){
            const pwd = nanoid()
            if(user.phone && count < 1){
              const ups = await SSO.updateUserByEmail(user.username,{password: sha1(pwd)})
              const msg = `Hello ${user.fname.toLowerCase()}, Login info, U: ${user.username}, P: ${pwd} Goto https://portal.aucc.edu.gh to access portal.`
              const resp = sms(user.phone,msg);
              //if(resp.code == '1000') 
              count = count + 1
              console.log(count)
              console.log(resp.code)
            }
          }
        }
        if(staff && staff.length > 0){
          for(user of staff){
            const pwd = nanoid()
            if(user.phone){
              const ups = await SSO.updateUserByEmail(user.username,{password: sha1(pwd)})
              const msg = `Hello ${user.fname.toLowerCase()}, Login info, U: ${user.username}, P: ${pwd} Goto https://portal.aucc.edu.gh to access portal.`
              const resp = sms(user.phone,msg);
              //if(resp.code == '1000') 
              count += 1
              console.log(count)
              console.log(resp.code)
            }
          } 
        }
        res.status(200).json({success:true, data: count })
       
    }catch(e){
        console.log(e)
        res.status(200).json({success:false, data: null, msg: "Please try again later."});
    }
  },

  testsms : async (req,res) => {
    try{
      const pwd = nanoid()
       const msg = `Hello kobby, Login info, U: test\@st.aucc.edu.gh, P: ${pwd} Goto https://portal.aucc.edu.gh to access portal.`
       const resp = sms('0277675089',msg);
       //if(resp.code == '1000') 
       console.log(resp.code)
       res.status(200).json({success:true, data: resp })
       
    }catch(e){
        console.log(e)
        res.status(200).json({success:false, data: null, msg: "Please try again later."});
    }
  },

  
  fetchPhoto : async (req,res) => {
      const tag = req.query.tag;
      var pic = await SSO.fetchPhoto(tag); // Photo
      if(pic.length > 0){
          var filepath = path.join(__dirname,'/../../', pic[0].path);
          try{
            var stats = fs.statSync(filepath);
            console.log(stats);
            if(stats){
              res.status(200).sendFile(path.join(__dirname,'/../../', pic[0].path));
            }else{
              res.status(200).sendFile(path.join(__dirname, '/../../public/cdn/photo', 'none.png'));
            } 
          }catch(e){
             console.log(e);
             res.status(200).sendFile(path.join(__dirname, '/../../public/cdn/photo', 'none.png'));
          }
      }else{
          res.status(200).sendFile(path.join(__dirname, '/../../public/cdn/photo', 'none.png'));
      }
  },

  postPhoto : async (req,res) => {
      const { tag,group_id,lock } = req.body;
      var mpath;
      switch(group_id){
        case '01': mpath = 'student'; break;
        case '02': mpath = 'staff'; break;
        case '03': mpath = 'nss'; break;
        case '04': mpath = 'applicant'; break;
        case '05': mpath = 'alumni'; break;
        default: mpath = 'student'; break;
      }
      var imageBuffer = decodeBase64Image(req.body.photo);
      const dest = path.join(__dirname, '/../../public/cdn/photo/'+mpath, tag.trim().toLowerCase()+'.'+(imageBuffer.type.split('/')[1]));
      const dbpath = './public/cdn/photo/'+mpath+'/'+tag.trim().toLowerCase()+'.'+(imageBuffer.type.split('/')[1]);
      console.log(`Tag: ${tag}, Group ID: ${group_id}`)
      fs.writeFile(dest, imageBuffer.data, async function(err) {
        if(err) res.status(200).json({success:false, data: null, msg:"Photo not saved!"});
        const ssoUser = await SSO.fetchSSOUser(tag)
        if(ssoUser.length > 0){
         
          const insertData = !ssoUser[0].photo_id ? await SSO.insertPhoto(ssoUser[0].uid,tag,group_id,dbpath) : await SSO.updatePhoto(ssoUser[0].photo_id,dbpath)
          if(lock){
            if(group_id == '01'){
              const slk = await Student.updateStudentProfile(tag,{flag_photo_lock:1})
            }
          } 
          const stphoto = `${req.protocol}://${req.get('host')}/api/photos/?tag=${tag}`
          if(insertData) res.status(200).json({success:true, data:stphoto});
        }
      });
  },

 

stageAccount : async (req,res) => {
  try{
      const { refno } = req.params;
      const pwd = nanoid()
      var resp = await Student.fetchStudentProfile(refno);
      console.log(resp)
      if(resp && resp.length > 0){
         if(resp[0].institute_email && resp[0].phone){
            const ups = await SSO.insertSSOUser({username:resp[0].institute_email,password:sha1(pwd),group_id:1,tag:refno})
            if(ups){
                const pic = await SSO.insertPhoto(ups.insertId,refno,1,'./public/cdn/photo/none.png')
                const msg = `Hi, your username: ${resp[0].institute_email} password: ${pwd} .Goto https://portal.aucc.edu.gh to access AUCC Portal!`
                const sm = sms(resp[0].phone,msg)
                res.status(200).json({success:true, data:msg});
            }else{
                res.status(200).json({success:false, data: null, msg:"Action failed!"});
            }
         }else{
            res.status(200).json({success:false, data: null, msg:"Please update Phone or Email!"});
         }
      }
  }catch(e){
      console.log(e)
      res.status(200).json({success:false, data: null, msg: "Something wrong !"});
  }
},

generateMail : async (req,res) => {
  try{
      const { refno } = req.params;
      var resp = await Student.fetchStProfile(refno);
      console.log(resp)
      var ups;
      var email;
      
      if(resp && resp.length > 0){
          const username = getUsername(resp[0].fname,resp[0].lname)
          email = `${username}@st.aucc.edu.gh`
          const isExist = await Student.findEmail(email)
          console.log(email)
          console.log(isExist)
          if(isExist && isExist.length > 0){
            email = `${username}${isExist.length+1}@st.aucc.edu.gh`
            ups = await Student.updateStudentProfile(refno,{ institute_email:email })
          }else{
            ups = await Student.updateStudentProfile(refno,{ institute_email:email }) 
          }
      }
     
      if(ups){
          res.status(200).json({success:true, data:email});
      }else{
          res.status(200).json({success:false, data: null, msg:"Action failed!"});
      }
  }catch(e){
      console.log(e)
      res.status(200).json({success:false, data: null, msg: "Something wrong !"});
  }
},



recoverVoucher : async (req,res) => {
  try{
    const { serial,email,phone } = req.body;
    console.log(req.body)
    var resp
    if(serial && email){ 
       const sr = await SSO.fetchVoucherBySerial(serial);
       if(sr && sr.length > 0){
         const ms = { title: "AUCC VOUCHER", message : `Your recovered voucher details are: [ SERIAL: ${serial}, PIN: ${sr[0].pin} ]` }
         mailer(email.trim(),ms.title,ms.message)
         resp = sr;
       }
    }else if(phone){
       const sr = await SSO.fetchVoucherByPhone(phone);
       console.log(phone)
       if(sr && sr.length > 0){
         const message = `Hello! voucher for ${sr[0].applicant_name} is : ( SERIAL: ${sr[0].serial} PIN: ${sr[0].pin} )`;
         sms(phone,message)
         resp = sr;
       }
    }

    if(resp){
      res.status(200).json({success:true, data:resp});
    }else{
      res.status(200).json({success:false, data: null, msg:"INVALID VOUCHER INFO PROVIDED !"});
    }
  }catch(e){
    console.log(e)
    res.status(200).json({success:false, data: null, msg: "Something wrong happened!"});
  }
},



generateIndexNo : async (req,res) => {
  try{
      const refno = req.body.refno;
      var indexNo = await SSO.generateIndexNo(refno);
      var resp = await Student.fetchStProfile(refno);
      var ups;
      var email;
      
      if(resp && resp.length > 0){
          const username = getUsername(resp[0].fname,resp[0].lname)
          email = `${username}@st.aucc.edu.gh`
          const isExist = await Student.findEmail(email)
          if(isExist && isExist.length > 0){
            email = `${username}${isExist.length+1}@st.aucc.edu.gh`
            ups = await Student.updateStudentProfile(refno,{ institute_email:email })
          }else{
            ups = await Student.updateStudentProfile(refno,{ institute_email:email }) 
          }
      }
      
      if(indexNo && email){
        res.status(200).json({success:true, data: { indexno: indexNo, email }});
      }else{
        res.status(200).json({success:false, data: null, msg:"No records!"});
      }
  }catch(e){
      console.log(e)
      res.status(200).json({success:false, data: null, msg: "Something went wrong !"});
  }
},

resetAccountHRS : async (req,res) => {
  try{
      const { staff_no } = req.params;
      const pwd = nanoid()
      var resp = await SSO.fetchStaffProfile(staff_no);
      const ups = await SSO.updateUserByEmail(resp[0].inst_mail,{password:sha1(pwd)})
      const msg = `Hi, your username: ${resp[0].inst_mail} password: ${pwd} .Goto https://ehub.ucc.edu.gh to access eHub Portal!`
      const sm = sms(resp[0].phone,msg)
      if(ups){
          res.status(200).json({success:true, data:msg});
      }else{
          res.status(200).json({success:false, data: null, msg:"Action failed!"});
      }
  }catch(e){
      console.log(e)
      res.status(200).json({success:false, data: null, msg: "Something wrong !"});
  }
},


upgradeRole : async (req,res) => {
  try{
      const { uid,role } = req.params;
      const pwd = nanoid()
      var resp = await SSO.fetchUser(uid,'02');
      if(resp && resp.length > 0){
        if(resp[0].phone){
          const roles = await SSO.insertSSORole({uid,arole_id:role}) // Unit Staff Role
          const msg = `Hi ${resp.lname}! Your privilege on UCC eHub has been upgraded. Goto https://ehub.ucc.edu.gh to access portal!`
          if(roles){
            const send = await sms(resp[0].phone,msg)
            console.log(send)
          }
          res.status(200).json({success:true, data:roles});
        }else{
          res.status(200).json({success:false, data: null, msg:"Please update contact details!"});
        }
      }else{
        res.status(200).json({success:false, data: null, msg:"User not found!"});
      }
  }catch(e){
      console.log(e)
      res.status(200).json({success:false, data: null, msg: "Something wrong !"});
  }
},


revokeRole : async (req,res) => {
  try{
      const { uid,role } = req.params;
      const pwd = nanoid()
      console.log(uid,role)
      var resp = await SSO.fetchUser(uid,'02');
      if(resp && resp.length > 0){
        if(resp[0].phone){
          const roles = await SSO.deleteSSORole(uid,role) 
          const msg = `Hi ${resp.lname}! A privilege on UCC eHub has been revoked. Goto https://ehub.ucc.edu.gh to access portal!`
          if(roles){
             const send = await sms(resp[0].phone,msg)
             console.log(send)
          }
          res.status(200).json({success:true, data:roles});
        }else{
          res.status(200).json({success:false, data: null, msg:"Please update contact details!"});
        }
      }else{
        res.status(200).json({success:false, data: null, msg:"User not found!"});
      }
  }catch(e){
      console.log(e)
      res.status(200).json({success:false, data: null, msg: "Something wrong !"});
  }
},


// HELPERS 


fetchFMShelpers : async (req,res) => {
  try{
    const hp = await SSO.fetchFMShelpers();
    res.status(200).json({success:true, data:hp});
  }catch(e){
    console.log(e)
    res.status(200).json({success:false, data: null, msg: "Something wrong happened!"});
  }
},

fetchAIShelpers : async (req,res) => {
  try{
    const hp = await SSO.fetchAIShelpers();
    res.status(200).json({success:true, data:hp});
  }catch(e){
    console.log(e)
    res.status(200).json({success:false, data: null, msg: "Something wrong happened!"});
  }
},

fetchHRShelpers : async (req,res) => {
  try{
    const hp = await SSO.fetchHRShelpers();
    res.status(200).json({success:true, data:hp});
  }catch(e){
    console.log(e)
    res.status(200).json({success:false, data: null, msg: "Something wrong happened!"});
  }
},

fetchAMShelpers : async (req,res) => {
  try{
    const hp = await SSO.fetchAMShelpers();
    res.status(200).json({success:true, data:hp});
  }catch(e){
    console.log(e)
    res.status(200).json({success:false, data: null, msg: "Something wrong happened!"});
  }
},




   

}

