const moment =  require('moment');
var db = require('../../config/mysql');
const { getUsername } = require('../../middleware/util');
const { Box } = require('./boxModel');
var fs = require('fs');

// process.env.THEME_TAG

module.exports.SSO = {
   
   verifyUser : async ({username,password}) => {
      const sql = "select u.* from ehub_identity.user u where u.username = '"+username+"' and password = sha1('"+password+"')";
      const res = await db.query(sql);
      return res;
   },

   verifyUserByEmail : async ({email}) => {
      const sql = "select u.* from ehub_identity.user u where u.username = '"+email+"'";
      const res = await db.query(sql);
      return res;
   },

   updateDomainPassword : async (tag,gid,password,sdata) => {
      var sql,res;
      if(parseInt(gid) == 1){
         sql = "update osisextra.useraccount set password = md5('"+password+"'), cdate = now() where regno = '"+tag+"'";
         res = await db.query(sql);
      }else if(parseInt(gid) == 2){
         const isExist = await db.query("select * from hr.`user` where staff_no = '"+tag+"'")
         if(isExist && isExist.length > 0){
            sql = "update hr.`user` set password = '"+password+"' where staff_no = '"+tag+"'";
            res = await db.query(sql);
         }else{
            const dt = { username:tag, staff_no:tag, password, role:'03',roles:'03'}
            sql = "insert into hr.`user` set ?";
            res = await db.query(sql,dt);
         }
      }
      
      if(res && (res.affectedRows > 0 || res.insertId > 0)){
         const sql = "update ehub_identity.user set flag_ad = "+sdata.userdata.flag_ad+",flag_gs = "+sdata.userdata.flag_gs+" where uid = "+sdata.userdata.uid;
         const resx = await db.query(sql);
      }
      return res;
   },

   generateMail : async (user,domain) => {
      const { fname,lname,tag } = user
      var username = getUsername(fname,lname)
      var mail, count;
      while(true){
         mail = `${username}${!count ? '' : count}@${domain}`
         const isExist = await Box.checkGsUser(mail)
         if(isExist){
            count = !count ? 2 : count+1;
         }else{
            break;
         }  setTimeout(() => null,200)
      }

      if(parseInt(user.gid) == 1){
         // Update osis.students_db set inst_email = mail
      }else{
         // Update hr.staff set ucc_mail = mail
         const res = await db.query("update hr.staff set ucc_mail = '"+mail+"' where staff_no = "+tag)
      }
   },
   
   
   fetchEvsRoles : async (tag) => {
      var roles = [];
      // Electoral Roles
      var sql = "select e.*,v.vote_time,v.vote_status,v.vote_sum,JSON_SEARCH(e.voters_whitelist, 'all', "+tag+") as voter,find_in_set('"+tag+"',e.ec_admins) as ec,find_in_set('"+tag+"',e.ec_agents) as agent from ehub_vote.election e left join ehub_vote.elector v on (e.id = v.election_id and v.tag = '"+tag+"') where (json_search(e.voters_whitelist, 'one', "+tag+") is not null or find_in_set('"+tag+"',ec_admins) > 0 or find_in_set('"+tag+"',ec_agents) > 0) and e.live_status = 1";
      var res = await db.query(sql);
      if(res && res.length > 0){
         for(var r of res){
            if(r.ec) roles.push({ role_id:9, role_name:'ELECTORAL ADMIN', role_desc:'Electa Administrator', app_name:'Electa Voting System', app_desc:'Electa Voting System for the University', app_tag:'evs', ...r, data: res })
            else if(r.agent) roles.push({ role_id:10, role_name:'ELECTORAL AGENT', role_desc:'Electa Agent', app_name:'Electa Voting System', app_desc:'Electa Voting System for the University', app_tag:'evs', ...r, data: res })
            else if(r.voter) roles.push({ role_id:11, role_name:'ELECTORAL VOTER', role_desc:'Electa Voter', app_name:'Electa Voting System', app_desc:'Electa Voting System for the University', app_tag:'evs', ...r, data: res })
         }
      } 
      /*
      const mx = md.map( r => `${r}`)
      fs.writeFile('utag.json',JSON.stringify(mx), function (err) {
         if (err) throw err;
         console.log('File is created successfully.');
      });
      */
      return roles;
   },

   fetchRoles : async (uid) => {
      const sql = "select u.arole_id,a.role_name,a.role_desc,x.app_name,x.app_tag from ehub_identity.user_role u left join ehub_identity.app_role a on u.arole_id = a.arole_id left join ehub_identity.app x on a.app_id = x.app_id where u.uid = "+uid;
      const res = await db.query(sql);
      return res;
   },

   /*
   fetchPhoto : async (uid) => {
      //const sql = "select p.tag,p.path from ehub_identity.photo p where p.uid = '"+uid+"' or p.tag = '"+uid+"'";
      const sql = "select p.tag,p.path from ehub_identity.photo p where p.tag = '"+uid+"'";
      const res = await db.query(sql);
      return res;
   },
   */

   fetchPhoto : async (tag,gid) => {
      var mpath = `${process.env.CDN_DIR}`,spath;
      switch(parseInt(gid)){
         case 1: spath = `${mpath}/student/`; break;
         case 2: spath = `${mpath}/staff/`; break;
         case 3: spath = `${mpath}/nss/`; break;
         case 4: spath = `${mpath}/alumni/`; break;
         case 5: spath = `${mpath}/applicant/`; break;
         case 6: spath = `${mpath}/code/`; break;
      }
      var tag = tag.replace("/","").trim();
      const file = `${spath}${tag}.jpg`;
      try {
         var stats = fs.statSync(file);
         if(stats){
           return file;
         }else{
           return `${mpath}/none.png`;
         }
      }catch (e) {
         return `${mpath}/none.png`;
      }
   },


   fetchEvsPhoto : async (tag,eid) => {
      var sql;
      if(tag == 'logo'){
        sql = "select logo as path from ehub_vote.election where id = "+eid;
      }else{
        sql = "select photo as path from ehub_vote.candidate where id = "+eid;
      }
      const res = await db.query(sql);
      return res;
   },

   fetchSSOUser : async (tag) => {
      const sql = "select u.*,p.photo_id,g.group_name from ehub_identity.user u left join ehub_identity.group g on u.group_id = g.group_id left join ehub_identity.photo p on p.uid = u.uid where u.tag = '"+tag+"'";
      const res = await db.query(sql);
      return res;
   },

   insertPhoto : async (uid,tag,group_id,path) => {
      const sql = "insert into ehub_identity.photo(uid,tag,path,group_id) values("+uid+",'"+tag+"','"+path+"',"+group_id+")";
      const res = await db.query(sql);
      return res;
   },

   updatePhoto : async (pid,path) => {
      const sql = "update ehub_identity.photo set path = '"+path+"' where photo_id = "+pid;
      const res = await db.query(sql);
      return res;
   },

   /*

   fetchUser : async (uid,gid) => {
      var sql;
      switch(gid){
        case '01': // Student
           sql = "select s.*,p.short as program_name,m.title as major_name,concat(s.fname,' ',ifnull(concat(mname,' '),''),s.lname) as name, x.title as session_name,x.academic_year as session_year,x.academic_sem as session_semester,x.id as session_id,x.cal_register_start,x.cal_register_end from ehub_identity.user u left join ais.student s on u.tag = s.refno left join ehub_utility.program p on s.prog_id = p.id left join ais.major m on s.major_id = m.id left join ehub_utility.session x on x.mode_id = p.mode_id where x.default = 1 and u.uid = "+uid; break;
        case '02': // Staff
           sql = "select s.*,j.title as designation,x.title as unitname,concat(s.fname,' ',ifnull(concat(mname,' '),''),s.lname) as name,c.title as countryname, r.title as regioname,u.uid from ehub_identity.user u left join ehub_hrs.staff s on u.tag = s.staff_no left join ehub_hrs.job j on j.id = s.job_id left join ehub_utility.unit x on s.unit_id = x.id left join ehub_utility.region r on r.id = s.region_id left join ehub_utility.country c on c.id = s.country_id where u.uid = "+uid; break;
        case '03': // NSS
           sql = "select from ehub_identity.photo p where p.uid = "+uid; break;
        case '04': // Applicant (Job)
           sql = "select from ehub_identity.photo p where p.uid = "+uid; break;
        case '05': // Alumni
           sql = "select from ehub_alumni.member p where p.refno = "+uid; break;
        default :  // Staff
           sql = "select s.*,j.title as designation,x.title as unitname,concat(s.fname,' ',ifnull(concat(mname,' '),''),s.lname) as name,c.title as countryname, r.title as regioname,u.uid from ehub_identity.user u left join ehub_hrs.staff s on u.tag = s.staff_no left join ehub_hrs.job j on j.id = s.job_id left join ehub_utility.unit x on s.unit_id = x.id left join ehub_utility.region r on r.id = s.region_id left join ehub_utility.country c on c.id = s.country_id where u.uid = "+uid; break;
      } const res = await db.query(sql);
        return res;
   },

   */


   fetchUser : async (uid,gid) => {
      var sql;
      switch(gid){
        case '01': // Student
           sql = "select s.*,concat(s.fname,' ',ifnull(concat(mname,' '),''),s.lname) as name,s.inst_email as mail,s.regno as tag,s.cellphone as phone,'01' as gid,g.group_name,p.short_name as program_name,d.short_name as unitname from ehub_identity.user u left join ehub_identity.group g on u.group_id = g.group_id left join osis.students_db s on u.tag = s.regno left join osis.prog_db p on s.progid = p.progid left join osis.departments d on d.deptid = p.deptid where x.default = 1 and u.uid = "+uid; break;
        case '02': // Staff
           sql = "select s.*,j.title as designation,x.long_name as unitname,concat(s.fname,' ',ifnull(concat(mname,' '),''),s.lname) as name,s.staff_no as tag,u.uid,g.group_name from ehub_identity.user u left join ehub_identity.group g on u.group_id = g.group_id left join hr.staff s on u.tag = s.staff_no left join hr.promotion p on s.promo_id = p.id left join hr.job j on j.id = p.job_id left join hr.unit x on p.unit_id = x.id where u.uid = "+uid; break;
        case '03': // NSS
           sql = "select from ehub_identity.photo p where p.uid = "+uid; break;
        case '04': // Applicant (Job)
           sql = "select from ehub_identity.photo p where p.uid = "+uid; break;
        case '05': // Alumni
           sql = "select *, p.refno as tag from ehub_alumni.member p where p.refno = "+uid; break;
        default :  // Staff
           sql = "select s.*,j.title as designation,x.long_name as unitname,concat(s.fname,' ',ifnull(concat(mname,' '),''),s.lname) as name,u.uid,g.group_name from ehub_identity.user u left join ehub_identity.group g on u.group_id = g.group_id left join hr.staff s on u.tag = s.staff_no left join hr.promotion p on s.promo_id = p.id left join hr.job j on j.id = p.job_id left join hr.unit x on p.unit_id = x.id where u.uid = "+uid; break;
      } const res = await db.query(sql);
        return res;
   },


   fetchUserByVerb : async (keyword) => {
      keyword = (keyword == null || keyword == 'null') ? '' : keyword.trim();
      var sql,res;
      // Student
      sql = "select s.*,concat(s.fname,' ',ifnull(concat(mname,' '),''),s.lname) as name,s.inst_email as mail,s.regno as tag,s.cellphone as phone,'01' as gid,'STUDENT' as group_name,p.short_name as descriptor,d.short_name as unitname from osis.students_db s left join osis.prog_db p on s.progid = p.progid  left join osis.departments d on d.deptid = p.deptid where s.regno = '"+keyword+"' or s.inst_email = '"+keyword+"'";
      const res1 = await db.query(sql);
      if(res1 && res1.length > 0) res = res1[0]
       
      // Staff
      sql = "select s.*,j.title as designation,x.long_name as unitname,concat(s.fname,' ',ifnull(concat(mname,' '),''),s.lname) as name,s.ucc_mail as mail,s.staff_no as tag,'02' as gid,'STAFF' as group_name,j.title as descriptor,x.long_name as unitname from hr.staff s left join hr.promotion p on s.promo_id = p.id left join hr.job j on j.id = p.job_id left join hr.unit x on p.unit_id = x.id where (s.ucc_mail = '"+keyword+"' or trim(s.staff_no) = '"+keyword+"') and s.ucc_mail is not null";
      const res2 = await db.query(sql);
      if(res2 && res2.length > 0) res = res2[0] 
      
      // NSS
      sql = "select s.*,concat(s.fname,' ',ifnull(concat(mname,' '),''),s.lname) as name,s.mobile as phone,'03' as gid,'NSS' as group_name from hr.nss s left join hr.unit x on s.unit_id = x.id where s.nss_no = '"+keyword+"' or s.email = '"+keyword+"'";
      const res3 = await db.query(sql);
      if(res3 && res3.length > 0) res = res3[0]
      
      // Applicant (Job)
      //sql = "select *,'04' as gid from ehub_identity.photo p where p.uid = "+uid;
      //const res4 = await db.query(sql);
      //if(res4 && res4.length > 0) res = res4[0]

      // Alumni
      sql = "select *,'05' as gid,'ALUMNI' as group_name from ehub_alumni.member where refno = '"+keyword+"'";
      const res5 = await db.query(sql);
      if(res5 && res5.length > 0) res = res5[0]
      
      return res;
   },

   fetchUsersByVerb : async (keyword) => {
      keyword = (keyword == null || keyword == 'null') ? '' : keyword.trim();
      var sql,res;
      // Student
      sql = "select s.*,concat(s.fname,' ',ifnull(concat(mname,' '),''),s.lname) as name,s.inst_email as mail,s.regno as tag,s.cellphone as phone,'01' as gid,'STUDENT' as group_name,p.short_name as descriptor,d.short_name as unitname from osis.students_db s left join osis.prog_db p on s.progid = p.progid  left join osis.departments d on d.deptid = p.deptid where s.regno = '"+keyword+"' or s.inst_email = '"+keyword+"'";
      const res1 = await db.query(sql);
      if(res1 && res1.length > 0) res = res1
      
      // Staff
      sql = "select s.*,j.title as designation,x.long_name as unitname,concat(s.fname,' ',ifnull(concat(mname,' '),''),s.lname) as name,s.ucc_mail as mail,s.staff_no as tag,'02' as gid,'STAFF' as group_name,j.title as descriptor,x.long_name as unitname from hr.staff s left join hr.promotion p on s.promo_id = p.id left join hr.job j on j.id = p.job_id left join hr.unit x on p.unit_id = x.id where (s.ucc_mail = '"+keyword+"' or trim(s.staff_no) = '"+keyword+"') and s.ucc_mail is not null";
      const res2 = await db.query(sql);
      console.log(sql)
      if(res2 && res2.length > 0) res = res2 
      
      // NSS
      sql = "select s.*,concat(s.fname,' ',ifnull(concat(mname,' '),''),s.lname) as name,s.mobile as phone,'03' as gid,'NSS' as group_name from hr.nss s left join hr.unit x on s.unit_id = x.id where s.nss_no = '"+keyword+"' or s.email = '"+keyword+"'";
      const res3 = await db.query(sql);
      if(res3 && res3.length > 0) res = res3
      
      // Applicant (Job)
      //sql = "select *,'04' as gid from ehub_identity.photo p where p.uid = "+uid;
      //const res4 = await db.query(sql);
      //if(res4 && res4.length > 0) res = res4[0]

      // Alumni
      sql = "select *,'05' as gid,'ALUMNI' as group_name from ehub_alumni.member where refno = '"+keyword+"'";
      const res5 = await db.query(sql);
      if(res5 && res5.length > 0) res = res5
      
      return res;
   },


   fetchUserByPhone : async (phone) => {
        // Student
        const res1 = await db.query("select s.*,p.short as program_name,m.title as major_name,concat(s.fname,' ',ifnull(concat(mname,' '),''),s.lname) as name, x.title as session_name,x.academic_year as session_year,x.academic_sem as session_semester,x.id as session_id,x.cal_register_start,x.cal_register_end,u.username,u.uid,u.group_id,u.group_id as gid from ehub_identity.user u left join ais.student s on u.tag = s.refno left join ehub_utility.program p on s.prog_id = p.id left join ais.major m on s.major_id = m.id left join ehub_utility.session x on x.mode_id = p.mode_id where x.default = 1 and s.phone = "+phone);
        // Staff
        const res2 = await db.query("select s.*,j.title as designation,x.title as unitname,concat(s.fname,' ',ifnull(concat(mname,' '),''),s.lname) as name,u.username,u.uid,u.group_id,u.group_id as gid from ehub_identity.user u left join ehub_hrs.staff s on u.tag = s.staff_no left join ehub_hrs.job j on j.id = s.job_id left join ehub_utility.unit x on s.unit_id = x.id where s.phone = "+phone);
        // NSS
        // Applicant (Job)
        // Alumni
        if(res1 && res1.length > 0) return res1
        if(res2 && res2.length > 0) return res2
   },

   updateUserByEmail : async (email,data) => {
      const sql = "update ehub_identity.user set ? where username = '"+email+"'";
      const res = await db.query(sql,data);
      return res;
   },

   insertSSOUser : async (data) => {
      const sql = "insert into ehub_identity.user set ?";
      const res = await db.query(sql,data);
      return res;
   },

   insertSSORole : async (data) => {
      const sql = "insert into ehub_identity.user_role set ?";
      const res = await db.query(sql,data);
      return res;
   },

   deleteSSORole : async (uid,role) => {
      const sql = "delete from ehub_identity.user_role where uid = "+uid+" and arole_id = "+role;
      const res = await db.query(sql);
      return res;
   },
   

   logger : async (uid,action,meta) => {
      const data = { uid, title: action, meta: JSON.stringify(meta) }
      const res = await db.query("insert into ehub_identity.`activity` set ?", data);
      return res;
   },

   apilogger : async (ip,action,meta) => {
      const data = { ip, title: action, meta: JSON.stringify(meta) }
      const res = await db.query("insert into fms.`activity_api` set ?", data);
      return res;
   },

   
   

    // STUDENTS - AIS MODELS

    fetchStudents : async (page,keyword) => {
      var sql = "select s.*,u.uid,u.flag_locked,u.flag_disabled,p.short as program_name,m.title as major_name,concat(s.fname,' ',ifnull(concat(s.mname,' '),''),s.lname) as name from ais.student s left join ehub_identity.user u on s.refno = u.tag left join ehub_utility.program p on s.prog_id = p.id left join ais.major m on s.major_id = m.id"
      var cql = "select count(*) as total from ais.student s left join ehub_identity.user u on s.refno = u.tag left join ehub_utility.program p on s.prog_id = p.id left join ais.major m on s.major_id = m.id";
      
      const size = 10;
      const pg  = parseInt(page);
      const offset = (pg * size) || 0;
      
      if(keyword){
          sql += ` where s.fname like '%${keyword}%' or s.lname like '%${keyword}%' or s.refno = '${keyword}' or s.indexno = '${keyword}'`
          cql += ` where s.fname like '%${keyword}%' or s.lname like '%${keyword}%' or s.refno = '${keyword}' or s.indexno = '${keyword}'`
      }

      sql += ` order by s.complete_status asc,s.prog_id asc,s.lname asc, s.fname asc`
      sql += !keyword ? ` limit ${offset},${size}` : ` limit ${size}`
      
      const ces = await db.query(cql);
      const res = await db.query(sql);
      const count = Math.ceil(ces[0].total/size)

      return {
         totalPages: count,
         totalData: ces[0].total,
         data: res,
      }
   },
   insertAISStudent : async (data) => {
      const res = await db.query("insert into ais.student set ?", data);
      return res;
   },

   updateAISStudent : async (id,data) => {
      const res = await db.query("update ais.student set ? where id = "+id,data);
      return res;
   },

   deleteAISStudent : async (id) => {
      const res = await db.query("delete from ais.student where id = "+id);
      return res;
   },




    // HRSTAFF - HRS MODELS

    fetchHRStaff : async (page,keyword) => {
      var sql = "select s.*,u.uid,u.flag_locked,u.flag_disabled,ifnull(j.title,s.position) as designation,m.title as unit_name,concat(s.fname,' ',ifnull(concat(s.mname,' '),''),s.lname) as name from ehub_hrs.staff s left join ehub_identity.user u on s.staff_no = u.tag left join ehub_hrs.job j on s.job_id = j.id left join ehub_utility.unit m on s.unit_id = m.id"
      var cql = "select count(*) as total from ehub_hrs.staff s left join ehub_identity.user u on s.staff_no = u.tag left join ehub_hrs.job j on s.job_id = j.id left join ehub_utility.unit m on s.unit_id = m.id";
      
      const size = 10;
      const pg  = parseInt(page);
      const offset = (pg * size) || 0;
      
      if(keyword){
          sql += ` where s.fname like '%${keyword}%' or s.lname like '%${keyword}%' or s.staff_no = '${keyword}' or s.staff_no = '${keyword}' or s.title like '${keyword}%' or j.title like '${keyword}%' or s.position like '${keyword}%'`
          cql += ` where s.fname like '%${keyword}%' or s.lname like '%${keyword}%' or s.staff_no = '${keyword}' or s.staff_no = '${keyword}' or s.title like '${keyword}%' or j.title like '${keyword}%' or s.position like '${keyword}%'`
      }

      sql += ` order by s.staff_no asc,s.lname asc, s.fname asc`
      sql += !keyword ? ` limit ${offset},${size}` : ` limit ${size}`
      
      const ces = await db.query(cql);
      const res = await db.query(sql);
      const count = Math.ceil(ces[0].total/size)

      return {
         totalPages: count,
         totalData: ces[0].total,
         data: res,
      }
   },

   
   fetchActiveStListHRS : async () => {
      const res = await db.query("select s.*,u.uid,u.flag_locked,u.flag_disabled,ifnull(j.title,s.position) as designation,m.title as unit_name,concat(s.fname,' ',ifnull(concat(s.mname,' '),''),s.lname) as name from ehub_hrs.staff s left join ehub_identity.user u on s.staff_no = u.tag left join ehub_hrs.job j on s.job_id = j.id left join ehub_utility.unit m on s.unit_id = m.id");
      return res;
   },

   insertHRStaff : async (data) => {
      const res = await db.query("insert into ehub_hrs.staff set ?", data);
      return res;
   },

   updateHRStaff : async (id,data) => {
      const res = await db.query("update ehub_hrs.staff set ? where id = "+id,data);
      return res;
   },


   deleteHRStaff : async (id) => {
      const st = await db.query("select u.uid from ehub_hrs.staff s left join ehub_identity.user u on u.tag = s.staff_no where s.id = "+id);
      var resp;
      if(st && st.length > 0){
         var res = await db.query("delete from ehub_identity.photo where uid = "+st[0].uid);
         var res = await db.query("delete from ehub_identity.user where uid = "+st[0].uid);
         var res = await db.query("delete from ehub_identity.user_role where uid = "+st[0].uid);
         resp = await db.query("delete from ehub_hrs.staff where id = "+id);
      }
      return res;
   },

   getNewStaffNo : async () => {
      const res = await db.query("select staff_no+1 as staff_no from ehub_hrs.staff where staff_no not in ('15666','16000') order by staff_no desc limit 1");
      if(res && res.length > 0) return res[0].staff_no;
      return 1000;
   },

   fetchStaffProfile : async (staff_no) => {
      const res = await db.query("select s.*,x.long_name as unit_name,m.title as designation,concat(s.fname,' ',ifnull(concat(mname,' '),''),s.lname) as name from ehub_hrs.staff s left join ehub_identity.user u on u.tag = s.staff_no left join ehub_utility.unit x on s.unit_id = x.id left join ehub_hrs.job m on s.job_id = m.id  where s.staff_no = "+staff_no);
      return res;
   },

   updateStaffProfile : async (staff_no,data) => {
      const res = await db.query("update ehub_hrs.staff s set ? where s.staff_no = "+staff_no,data);
      return res;
   },

   findEmail : async (email) => {
      const res = await db.query("select * from ehub_hrs.staff where inst_mail = '"+email+"'");
      return res;
   },


   
   // HRUNIT - HRS MODELS

   fetchHRUnit : async (page,keyword) => {
      var sql = "select u.*,upper(concat(s.fname,' ',s.lname)) as head_name,s.staff_no as head_no,m.title as school from ehub_utility.unit u left join ehub_hrs.staff s on u.head = s.staff_no left join ehub_utility.unit m on u.lev2_id = m.id"
      var cql = "select count(*) as total from ehub_utility.unit u left join ehub_hrs.staff s on u.head = s.staff_no left join ehub_utility.unit m on u.lev2_id = m.id";
      
      const size = 10;
      const pg  = parseInt(page);
      const offset = (pg * size) || 0;
      
      if(keyword){
          sql += ` where u.title like '%${keyword}%' or u.code like '%${keyword}%' or u.location like '%${keyword}%' or u.head = '${keyword}'`
          cql += ` where u.title like '%${keyword}%' or u.code like '%${keyword}%' or u.location like '%${keyword}%' or u.head = '${keyword}'`
      }

      sql += ` order by u.title`
      sql += !keyword ? ` limit ${offset},${size}` : ` limit ${size}`
      
      const ces = await db.query(cql);
      const res = await db.query(sql);
      const count = Math.ceil(ces[0].total/size)

      return {
         totalPages: count,
         totalData: ces[0].total,
         data: res,
      }
   },
   insertHRUnit : async (data) => {
      const res = await db.query("insert into ehub_utility.unit set ?", data);
      return res;
   },

   updateHRUnit : async (id,data) => {
      const res = await db.query("update ehub_utility.unit set ? where id = "+id,data);
      return res;
   },


   deleteHRUnit : async (id) => {
      var res = await db.query("delete from ehub_utility.unit where id = "+id);
      return res;
   },


   
  // HRUNIT - HRS MODELS

  fetchHRJob : async (page,keyword) => {
      var sql = "select j.* from ehub_hrs.job j"
      var cql = "select count(*) as total from ehub_hrs.job j";
      
      const size = 10;
      const pg  = parseInt(page);
      const offset = (pg * size) || 0;
      
      if(keyword){
         sql += " where j.title like '%${keyword}%' or j.`type` like '%${keyword}%'"
         cql += " where j.title like '%${keyword}%' or j.`type` like '%${keyword}%'"
      }

      sql += ` order by j.title`
      sql += !keyword ? ` limit ${offset},${size}` : ` limit ${size}`
      
      const ces = await db.query(cql);
      const res = await db.query(sql);
      const count = Math.ceil(ces[0].total/size)

      return {
         totalPages: count,
         totalData: ces[0].total,
         data: res,
      }
   },

   insertHRJob : async (data) => {
      const res = await db.query("insert into ehub_hrs.job set ?", data);
      return res;
   },

   updateHRJob : async (id,data) => {
      const res = await db.query("update ehub_hrs.job set ? where id = "+id,data);
      return res;
   },


   deleteHRJob : async (id) => {
      var res = await db.query("delete from ehub_hrs.job where id = "+id);
      return res;
   },


   // EVS MODELS

   fetchEvsData : async (id,tag) => {
      var data = { }
      // Portfolio data
      var res = await db.query("select * from ehub_vote.portfolio where status = 1 and election_id = "+id);
      if(res && res.length > 0) data.portfolios = res;
      // Candidate data
      var res = await db.query("select c.*,p.name as portfolio,p.id as pid from ehub_vote.candidate c left join ehub_vote.portfolio p on c.portfolio_id = p.id where c.status = 1 and p.election_id = "+id);
      if(res && res.length > 0) data.candidates = res;
      // Election data
      var res = await db.query("select e.*,v.vote_status,vote_time,vote_sum from ehub_vote.election e left join ehub_vote.elector v on e.id = v.election_id where e.id = "+id+" and v.tag = '"+tag+"'");
      if(res && res.length > 0) data.election = res;
      // Voters data
      var res = await db.query("select * from ehub_vote.elector where election_id = "+id);
      if(res && res.length > 0) data.electors = res;

      return data;
   },

   fetchEvsMonitor : async (id) => {
      var data = { }
      // Portfolio data
      var res = await db.query("select * from ehub_vote.portfolio where status = 1 and election_id = "+id);
      if(res && res.length > 0) data.portfolios = res;
      // Candidate data
      var res = await db.query("select c.*,p.name as portfolio from ehub_vote.candidate c left join ehub_vote.portfolio p on c.portfolio_id = p.id where c.status = 1 and p.election_id = "+id);
      if(res && res.length > 0) data.candidates = res;
      // Election data
      var res = await db.query("select * from ehub_vote.election where id = "+id);
      if(res && res.length > 0) data.election = res;
      // Voters data
      var res = await db.query("select * from ehub_vote.elector where election_id = "+id);
      if(res && res.length > 0) data.electors = res;

      return data;
   },


   postEvsData : async (data) => {
      const { id,tag,votes,name } = data;
      
      // Get Portfolio count & Verify whether equal to data posted
      var res = await db.query("select * from ehub_vote.portfolio where status = 1 and election_id = "+id);
      if(res && res.length > 0) {
         const count = res.length;
         var vt = await db.query("select * from ehub_vote.elector where trim(tag) = '"+tag+"'");
         if(vt && vt.length <= 0){
            if(count == Object.values(votes).length){
               // Update Candidate Votes Count
               const vals = Object.values(votes)
               var update_count = 0;
               if(vals.length > 0){
                  for(var val of vals){
                     const cs = await db.query("select * from ehub_vote.candidate where id = "+val)
                     if(cs && cs.length> 0){
                        const ups = await db.query("update ehub_vote.candidate set votes = (votes+1) where id = "+val)
                        if(ups.affectedRows > 0) update_count += 1;
                     }
                  }
               }
               if(count != update_count) return { success: false, msg: 'Votes partially recorded', code : 1001 }
               // Insert Into Elector Database
               const dm = { vote_status: 1, vote_sum: Object.values(votes).join(','), vote_time:new Date(), name, tag, election_id:id }
               const ins = await db.query("insert into ehub_vote.elector set ?",dm);
               if(ins && ins.insertId > 0) return { success: true, msg: 'Voted successfully', code: 1000 }
               return { success: false, msg: 'Votes saved for elector', code: 1002 }
            }else{
               // Votes Not Received
               return { success: false, msg: 'Votes partially received', code: 1003 }
            }
            
         }else{
            // Voted Already
            return { success: false, msg: 'Elector already voted', code: 1004 }
         }
     
      }else{
         return { success: false, msg: 'Portfolio not found', code: 1005 }
      }
   },



   // SSO - Identity

   fetchSSOIdentity : async (req,search) => {
      var data;
      if(search != ''){
         const bio = await this.SSO.fetchUsersByVerb(search); // Biodata
         if(bio && bio.length > 0){
            data = [];
            for(let s of bio){
               var userdata = {}
               userdata = { ...userdata,...s }
               const user = await this.SSO.fetchSSOUser(s.tag,s.gid)
               //const photo = await this.SSO.fetchPhoto(s.tag,s.gid)
               const photo  = `${req.protocol}://${req.get('host')}/api/photos/?tag=${s.tag}`
               if(user && user.length > 0){ 
                 const roles = await this.SSO.fetchRoles(user[0].uid);
                 userdata = { ...userdata,...user[0], photo, roles, hasSSO:true }
               }else {
                 userdata = { ...userdata, photo, hasSSO:false }
               } data.push({ user: userdata })
            }
         }
      }
      return data;
   },

  



   // HELPERS

   fetchFMShelpers : async () => {
      const progs = await db.query("select * from ehub_utility.program where status = 1");
      const bankacc = await db.query("select * from fms.bankacc where status = 1");
      //const resm = await db.query("select s.session_id as `sessionId`,s.title as `sessionName` from P06.session s where s.status = 1");
      if(progs && progs.length > 0) return { programs:progs, bankacc }
      return null;
   },

   fetchAIShelpers : async () => {
      const progs = await db.query("select * from ehub_utility.program where status = 1");
      const majs = await db.query("select * from ais.major where status = 1");
      //const resm = await db.query("select s.session_id as `sessionId`,s.title as `sessionName` from P06.session s where s.status = 1");
      if(progs && majs) return { programs:progs,majors:majs }
      return null;
   },

   fetchHRShelpers : async () => {
      const countries = await db.query("select * from ehub_utility.country where status = 1");
      const regions = await db.query("select * from ehub_utility.region where status = 1");
      const units = await db.query("select * from ehub_utility.unit where active = '1'");
      const jobs = await db.query("select * from ehub_hrs.job where active = '1'");
      const parents = await db.query("select * from ehub_utility.unit where active = '1'");
      const schools = await db.query("select * from ehub_utility.unit where level = '2' and active = '1'");
      const depts = await db.query("select * from ehub_utility.unit where level = '3' and active = '1'");
      const roles = await db.query("select a.arole_id,a.role_name,a.role_desc,p.app_name from ehub_identity.app_role a left join ehub_identity.app p on a.app_id = p.app_id");
      
      if(jobs && units) return { units,jobs,countries,regions,parents,schools,depts,roles }
      return null;
   },

   fetchAMShelpers : async () => {
      const vendors = await db.query("select * from P06.vendor where status = 1");
      const session = await db.query("select * from P06.session where status = 1");
      const programs = await db.query("select * from ehub_utility.program where status = 1");
      const majors = await db.query("select m.*,p.`short` as program_name from ais.major m left join ehub_utility.program p on p.id = m.prog_id where m.status = 1");
      const stages = await db.query("select * from P06.stage where status = 1");
      const applytypes = await db.query("select * from P06.apply_type where status = 1");
      if(vendors && programs && stages && session && majors && applytypes) return { vendors,programs,majors,stages,applytypes,session: session && session[0] }
      return null;
   },

   
};

