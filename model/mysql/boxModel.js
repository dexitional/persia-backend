const moment =  require('moment');
var {adcon,gs} = require('../../config/ad');

module.exports.Box = {
    

    // ACTIVE DIRECTORY CALLS

    insertAdUser: async ({ userName,password,commonName,firstName,lastName,title,location,objectClass,phone,email,passwordExpires,enabled,description,unit }, domain) => {
        //const dm = { userName,password,commonName,firstName,lastName,title,location,objectClass,phone,email,passwordExpires,enabled,description,unit } 
        const dm = { userName,password,commonName,firstName,lastName,title,location,phone,email,passwordExpires,enabled } 
        const ad = adcon(domain)
        try{ 
          const user = await ad.user().add(dm)
          return user
        }
        catch(e){ 
          console.log(e)
          return null
        } 
    },

    updateAdUser: async (dm,domain) => {
        const { tag,mail } = dm
        const ad = adcon(domain)
        try{ 
          const user = await ad.user(mail).get()
          return user
        }
        catch(e){ 
          console.log(e)
          return false
        } 
    },

    getAdUser: async ({mail},domain) => {
        const ad = adcon(domain)
        try{ 
          const user = await ad.user(mail).get()
          return user
        }
        catch(e){ 
          console.log(e)
          return false
        } 
    },

    checkAdUser: async ({mail},domain) => {
        const ad = adcon(domain)
        try{ 
          const user = await ad.user(mail).exists()
          return user
        }
        catch(e){ 
          console.log(e)
          return false
        } 
    },

    changeAdPwd: async ({userName,password},domain) => {
        const ad = adcon(domain)
        try{ 
          const user = await ad.user(userName).password(password);
          return user
        }
        catch(e){ 
          console.log(e)
          return false
        } 
       
    },

    // GSUITE CALLS

    insertGsUser: async ({ password,commonName,firstName,lastName,title,location,phone,email,description,unit }) => {
        try{ 
          const gm = {
            "primaryEmail":email,
            "name":{"familyName":lastName,"givenName":firstName,"fullName":commonName},
            "organizations":[{"name":title,"title":title,"primary": true,"type": "work","description":description,"department":unit}],
            "phones":[{"value":phone,"type": "work"}],
            "orgUnitPath":`${location == 'students' ? '/Students/'+new Date().getFullYear():'/staff'}`,
            "includeInGlobalAddressList":true,
            "password":password,
            "hashFunction":"SHA-1",
            "changePasswordAtNextLogin":false,
          }
          const user = await gs.insertUser(gm)
          if(user.status == 200){
            return true
          }else{
            return false
          } 
        }
        catch(e){ 
          console.log(e)
          return false
        } 
    },

    updateGsUser: async ({ password,commonName,firstName,lastName,title,location,phone,email,description,unit }) => {
        try{ 
          const gm = {
            "primaryEmail":email,
            "name":{"familyName":lastName,"givenName":firstName,"fullName":commonName },
            "organizations":[{"name":title,"title":title,"primary": true,"type": "work","description":description,"department":unit}],
            "phones":[{"value":phone,"type": "work"}],
            "orgUnitPath":`${location == 'students' ? '/Students/'+new Date().getFullYear():'/staff'}`,
            "includeInGlobalAddressList":true,
            "password":password,
            "hashFunction":"SHA-1",
            "changePasswordAtNextLogin":false,
          }
          const user = await gs.updateUser(gm,email)
          if(user.status == 200){
            return true
          }else{
            return false
          } 
        }
        catch(e){ 
          console.log(e)
          return false
        } 
    },

    getGsUser: async (dm) => {
        try{ 
          const user = await gs.getUser(mail)
          return user
        }
        catch(e){ 
          console.log(e)
          return false
        } 
    },

    checkGsUser: async ({mail}) => {
        try{ 
          const user = await gs.checkUser(mail)
          return user
        }
        catch(e){ 
          console.log(e)
          return false
        } 
    },

    changeGsPwd: async ({ mail,password }) => {
        try{ 
          const user = await gs.changePwd(password,mail)
          if(user.status == 200){
            return true
          }else{
            return false
          } 
        }catch(e){ 
          console.log(e)
          return false
        } 
    },

 
};

