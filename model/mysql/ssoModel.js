const moment =  require('moment');
var db = require('../../config/mysql');
const { getUsername } = require('../../middleware/util');
const { Box } = require('./boxModel');

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
      var sql;
      if(parseInt(gid) == 1){
         sql = "update osisextra.useraccount set password = md5('"+password+"'), cdate = now() where regno = '"+tag+"'";
      }else if(parseInt(gid) == 2){
         sql = "update hr.`user` set password = '"+password+"' where staff_no = '"+tag+"'";
      }
      const res = await db.query(sql);
      if(res && res.affectedRows > 0){
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
   
   

   fetchRoles : async (uid) => {
      const sql = "select u.arole_id,a.role_name,a.role_desc,x.app_name,x.app_tag from ehub_identity.user_role u left join ehub_identity.app_role a on u.arole_id = a.arole_id left join ehub_identity.app x on a.app_id = x.app_id where u.uid = "+uid;
      const res = await db.query(sql);
      return res;
   },

   fetchPhoto : async (uid) => {
      //const sql = "select p.tag,p.path from ehub_identity.photo p where p.uid = '"+uid+"' or p.tag = '"+uid+"'";
      const sql = "select p.tag,p.path from ehub_identity.photo p where p.tag = '"+uid+"'";
      const res = await db.query(sql);
      return res;
   },

   fetchSSOUser : async (tag) => {
      const sql = "select u.*,p.photo_id from ehub_identity.user u left join ehub_identity.photo p on p.uid = u.uid where u.tag = '"+tag+"'";
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

   fetchUser : async (uid,gid) => {
      var sql;
      switch(gid){
        case '01': // Student
           sql = "select s.*,p.short as program_name,m.title as major_name,concat(s.fname,' ',ifnull(concat(mname,' '),''),s.lname) as name, x.title as session_name,x.academic_year as session_year,x.academic_sem as session_semester,x.id as session_id,x.cal_register_start,x.cal_register_end from ehub_identity.user u left join ais.student s on u.tag = s.refno left join utility.program p on s.prog_id = p.id left join ais.major m on s.major_id = m.id left join utility.session x on x.mode_id = p.mode_id where x.default = 1 and u.uid = "+uid; break;
        case '02': // Staff
           sql = "select s.*,j.title as designation,x.title as unitname,concat(s.fname,' ',ifnull(concat(mname,' '),''),s.lname) as name,c.title as countryname, r.title as regioname,u.uid from ehub_identity.user u left join hrs.staff s on u.tag = s.staff_no left join hrs.job j on j.id = s.job_id left join utility.unit x on s.unit_id = x.id left join utility.region r on r.id = s.region_id left join utility.country c on c.id = s.country_id where u.uid = "+uid; break;
        case '03': // NSS
           sql = "select from ehub_identity.photo p where p.uid = "+uid; break;
        case '04': // Applicant (Job)
           sql = "select from ehub_identity.photo p where p.uid = "+uid; break;
        case '05': // Alumni
           sql = "select from ehub_alumni.member p where p.refno = "+uid; break;
        default :  // Staff
           sql = "select s.*,j.title as designation,x.title as unitname,concat(s.fname,' ',ifnull(concat(mname,' '),''),s.lname) as name,c.title as countryname, r.title as regioname,u.uid from ehub_identity.user u left join hrs.staff s on u.tag = s.staff_no left join hrs.job j on j.id = s.job_id left join utility.unit x on s.unit_id = x.id left join utility.region r on r.id = s.region_id left join utility.country c on c.id = s.country_id where u.uid = "+uid; break;
      } const res = await db.query(sql);
        return res;
   },

   fetchUserByVerb : async (keyword) => {
      
      var sql,res;
      // Student
      sql = "select s.*,concat(s.fname,' ',ifnull(concat(mname,' '),''),s.lname) as name,s.inst_email as mail,s.regno as tag,s.cellphone as phone,'01' as gid,p.short_name as descriptor,d.short_name as unitname from osis.students_db s left join osis.prog_db p on s.progid = p.progid  left join osis.departments d on d.deptid = p.deptid where s.regno = '"+keyword+"' or s.inst_email = '"+keyword+"'";
      const res1 = await db.query(sql);
      if(res1 && res1.length > 0) res = res1[0]
       
      // Staff
      sql = "select s.*,j.title as designation,x.long_name as unitname,concat(s.fname,' ',ifnull(concat(mname,' '),''),s.lname) as name,s.ucc_mail as mail,s.staff_no as tag,'02' as gid,j.title as descriptor,x.long_name as unitname from hr.staff s left join hr.promotion p on s.promo_id = p.id left join hr.job j on j.id = p.job_id left join hr.unit x on p.unit_id = x.id where s.ucc_mail = '"+keyword+"'";
      const res2 = await db.query(sql);
      if(res2 && res2.length > 0) res = res2[0] 
      
      // NSS
      sql = "select s.*,concat(s.fname,' ',ifnull(concat(mname,' '),''),s.lname) as name,s.mobile as phone,'03' as gid from hr.nss s left join hr.unit x on s.unit_id = x.id where s.nss_no = '"+keyword+"' or s.email = '"+keyword+"'";
      const res3 = await db.query(sql);
      if(res3 && res3.length > 0) res = res3[0]
      
      // Applicant (Job)
      //sql = "select *,'04' as gid from ehub_identity.photo p where p.uid = "+uid;
      //const res4 = await db.query(sql);
      //if(res4 && res4.length > 0) res = res4[0]

      // Alumni
      sql = "select *,'05' as gid from ehub_alumni.member where refno = '"+keyword+"'";
      const res5 = await db.query(sql);
      if(res5 && res5.length > 0) res = res5[0]
      
      return res;
   },


   fetchUserByPhone : async (phone) => {
        // Student
        const res1 = await db.query("select s.*,p.short as program_name,m.title as major_name,concat(s.fname,' ',ifnull(concat(mname,' '),''),s.lname) as name, x.title as session_name,x.academic_year as session_year,x.academic_sem as session_semester,x.id as session_id,x.cal_register_start,x.cal_register_end,u.username,u.uid,u.group_id,u.group_id as gid from ehub_identity.user u left join ais.student s on u.tag = s.refno left join utility.program p on s.prog_id = p.id left join ais.major m on s.major_id = m.id left join utility.session x on x.mode_id = p.mode_id where x.default = 1 and s.phone = "+phone);
        // Staff
        const res2 = await db.query("select s.*,j.title as designation,x.title as unitname,concat(s.fname,' ',ifnull(concat(mname,' '),''),s.lname) as name,u.username,u.uid,u.group_id,u.group_id as gid from ehub_identity.user u left join hrs.staff s on u.tag = s.staff_no left join hrs.job j on j.id = s.job_id left join utility.unit x on s.unit_id = x.id where s.phone = "+phone);
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
      var sql = "select s.*,u.uid,u.flag_locked,u.flag_disabled,p.short as program_name,m.title as major_name,concat(s.fname,' ',ifnull(concat(s.mname,' '),''),s.lname) as name from ais.student s left join ehub_identity.user u on s.refno = u.tag left join utility.program p on s.prog_id = p.id left join ais.major m on s.major_id = m.id"
      var cql = "select count(*) as total from ais.student s left join ehub_identity.user u on s.refno = u.tag left join utility.program p on s.prog_id = p.id left join ais.major m on s.major_id = m.id";
      
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
      var sql = "select s.*,u.uid,u.flag_locked,u.flag_disabled,ifnull(j.title,s.position) as designation,m.title as unit_name,concat(s.fname,' ',ifnull(concat(s.mname,' '),''),s.lname) as name from hrs.staff s left join ehub_identity.user u on s.staff_no = u.tag left join hrs.job j on s.job_id = j.id left join utility.unit m on s.unit_id = m.id"
      var cql = "select count(*) as total from hrs.staff s left join ehub_identity.user u on s.staff_no = u.tag left join hrs.job j on s.job_id = j.id left join utility.unit m on s.unit_id = m.id";
      
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
      const res = await db.query("select s.*,u.uid,u.flag_locked,u.flag_disabled,ifnull(j.title,s.position) as designation,m.title as unit_name,concat(s.fname,' ',ifnull(concat(s.mname,' '),''),s.lname) as name from hrs.staff s left join ehub_identity.user u on s.staff_no = u.tag left join hrs.job j on s.job_id = j.id left join utility.unit m on s.unit_id = m.id");
      return res;
   },

   insertHRStaff : async (data) => {
      const res = await db.query("insert into hrs.staff set ?", data);
      return res;
   },

   updateHRStaff : async (id,data) => {
      const res = await db.query("update hrs.staff set ? where id = "+id,data);
      return res;
   },


   deleteHRStaff : async (id) => {
      const st = await db.query("select u.uid from hrs.staff s left join ehub_identity.user u on u.tag = s.staff_no where s.id = "+id);
      var resp;
      if(st && st.length > 0){
         var res = await db.query("delete from ehub_identity.photo where uid = "+st[0].uid);
         var res = await db.query("delete from ehub_identity.user where uid = "+st[0].uid);
         var res = await db.query("delete from ehub_identity.user_role where uid = "+st[0].uid);
         resp = await db.query("delete from hrs.staff where id = "+id);
      }
      return res;
   },

   getNewStaffNo : async () => {
      const res = await db.query("select staff_no+1 as staff_no from hrs.staff where staff_no not in ('15666','16000') order by staff_no desc limit 1");
      if(res && res.length > 0) return res[0].staff_no;
      return null;
   },

   fetchStaffProfile : async (staff_no) => {
      const res = await db.query("select s.*,x.long_name as unit_name,m.title as designation,concat(s.fname,' ',ifnull(concat(mname,' '),''),s.lname) as name from hrs.staff s left join ehub_identity.user u on u.tag = s.staff_no left join utility.unit x on s.unit_id = x.id left join hrs.job m on s.job_id = m.id  where s.staff_no = "+staff_no);
      return res;
   },

   updateStaffProfile : async (staff_no,data) => {
      const res = await db.query("update hrs.staff s set ? where s.staff_no = "+staff_no,data);
      return res;
   },

   findEmail : async (email) => {
      const res = await db.query("select * from hrs.staff where inst_mail = '"+email+"'");
      return res;
   },


   
   // HRUNIT - HRS MODELS

   fetchHRUnit : async (page,keyword) => {
      var sql = "select u.*,upper(concat(s.fname,' ',s.lname)) as head_name,s.staff_no as head_no,m.title as school from utility.unit u left join hrs.staff s on u.head = s.staff_no left join utility.unit m on u.lev2_id = m.id"
      var cql = "select count(*) as total from utility.unit u left join hrs.staff s on u.head = s.staff_no left join utility.unit m on u.lev2_id = m.id";
      
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
      const res = await db.query("insert into utility.unit set ?", data);
      return res;
   },

   updateHRUnit : async (id,data) => {
      const res = await db.query("update utility.unit set ? where id = "+id,data);
      return res;
   },


   deleteHRUnit : async (id) => {
      var res = await db.query("delete from utility.unit where id = "+id);
      return res;
   },


   
  // HRUNIT - HRS MODELS

  fetchHRJob : async (page,keyword) => {
      var sql = "select j.* from hrs.job j"
      var cql = "select count(*) as total from hrs.job j";
      
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
      const res = await db.query("insert into hrs.job set ?", data);
      return res;
   },

   updateHRJob : async (id,data) => {
      const res = await db.query("update hrs.job set ? where id = "+id,data);
      return res;
   },


   deleteHRJob : async (id) => {
      var res = await db.query("delete from hrs.job where id = "+id);
      return res;
   },



   // HELPERS

   fetchFMShelpers : async () => {
      const progs = await db.query("select * from utility.program where status = 1");
      const bankacc = await db.query("select * from fms.bankacc where status = 1");
      //const resm = await db.query("select s.session_id as `sessionId`,s.title as `sessionName` from P06.session s where s.status = 1");
      if(progs && progs.length > 0) return { programs:progs, bankacc }
      return null;
   },

   fetchAIShelpers : async () => {
      const progs = await db.query("select * from utility.program where status = 1");
      const majs = await db.query("select * from ais.major where status = 1");
      //const resm = await db.query("select s.session_id as `sessionId`,s.title as `sessionName` from P06.session s where s.status = 1");
      if(progs && majs) return { programs:progs,majors:majs }
      return null;
   },

   fetchHRShelpers : async () => {
      const countries = await db.query("select * from utility.country where status = 1");
      const regions = await db.query("select * from utility.region where status = 1");
      const units = await db.query("select * from utility.unit where active = '1'");
      const jobs = await db.query("select * from hrs.job where active = '1'");
      const parents = await db.query("select * from utility.unit where active = '1'");
      const schools = await db.query("select * from utility.unit where level = '2' and active = '1'");
      const depts = await db.query("select * from utility.unit where level = '3' and active = '1'");
      const roles = await db.query("select a.arole_id,a.role_name,a.role_desc,p.app_name from ehub_identity.app_role a left join ehub_identity.app p on a.app_id = p.app_id");
      
      if(jobs && units) return { units,jobs,countries,regions,parents,schools,depts,roles }
      return null;
   },

   fetchAMShelpers : async () => {
      const vendors = await db.query("select * from P06.vendor where status = 1");
      const session = await db.query("select * from P06.session where status = 1");
      const programs = await db.query("select * from utility.program where status = 1");
      const majors = await db.query("select m.*,p.`short` as program_name from ais.major m left join utility.program p on p.id = m.prog_id where m.status = 1");
      const stages = await db.query("select * from P06.stage where status = 1");
      const applytypes = await db.query("select * from P06.apply_type where status = 1");
      if(vendors && programs && stages && session && majors && applytypes) return { vendors,programs,majors,stages,applytypes,session: session && session[0] }
      return null;
   },

   
};

