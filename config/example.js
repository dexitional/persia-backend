const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');
const SCOPES = ['https://www.googleapis.com/auth/admin.directory.user'];
const TOKEN_PATH = 'token.json';


fs.readFile('credentials.json', (err, content) => {
    if (err) return console.error('Error loading client secret file', err);
  
    // Authorize a client with the loaded credentials, then call the
    // Directory API.
    authorize(JSON.parse(content), listUsers);
});
  
module.exports = {
   
    authorize: function authorize(credentials, callback) {
            const {client_secret, client_id, redirect_uris} = credentials.installed;
            const oauth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
            fs.readFile(TOKEN_PATH, (err, token) => {
                if (err) return getNewToken(oauth2Client, callback);
                oauth2Client.credentials = JSON.parse(token);
                callback(oauth2Client);
            });
      },

      getNewToken : function getNewToken(oauth2Client, callback) {
            const authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
            });
            console.log('Authorize this app by visiting this url:', authUrl);
            const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            });
            rl.question('Enter the code from that page here: ', (code) => {
            rl.close();
            oauth2Client.getToken(code, (err, token) => {
                if (err) return console.error('Error retrieving access token', err);
                    oauth2Client.credentials = token;
                    storeToken(token);
                    callback(oauth2Client);
                });
            });
      },

      storeToken: function storeToken(token) {
            fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
                if (err) return console.warn(`Token not stored to ${TOKEN_PATH}`, err);
                console.log(`Token stored to ${TOKEN_PATH}`);
            });
      },

      listUsers: function listUsers(auth) {
            const service = google.admin({version: 'directory_v1', auth});
            service.users.list({
                customer: 'my_customer',
                maxResults: 10,
                orderBy: 'email',
            }, (err, res) => {
                if (err) return console.error('The API returned an error:', err.message);
                const users = res.data.users;
                if (users.length) {
                    console.log('Users:');
                    users.forEach((user) => {
                    console.log(`${user.primaryEmail} (${user.name.fullName})`);
                    });
                } else {
                    console.log('No users found.');
                }
            });
      }
      


      
}

/* SCRIPTS TWO */

  const useDirectory = async keyFile => {
    const auth = new google.auth.GoogleAuth({
      keyFile,
      scopes: [
        'https://www.googleapis.com/auth/admin.directory.user',
        'https://www.googleapis.com/auth/admin.directory.group',
        'https://www.googleapis.com/auth/admin.directory.group.member'
      ]
    });
  
    return google.admin({
      version: "directory_v1",
      auth: await auth.getClient()
    });
  };
  
  const token = path.resolve("./token.json");
  if (!fs.existsSync(token)) {
    throw new Error("Could not find token.json for authentication.");
  }
  
  const directory = await useDirectory(token);
  const users = await directory.groups
    .list({ domain: "mydomain.com" })
    .catch(console.error);


/* MAIN Examples */

/*
Effective release of googleapis version 30.0.0 resource and requestBody are equally accepted.
Below are working examples for users.insert, users.list, users.update, users.get and users.delete functions, all tested with googleapis version 30.0.0
*/
async function insertUser(auth) {
    const service = google.admin({version: 'directory_v1', auth});
    console.log("Inserting user");
    const response = await service.users.insert({
    "requestBody":{
        "name": {
        "familyName": "Friends",
        "givenName": "John Smith",
        },
        "password": "**********",
        "primaryEmail": "j.smith@jopfre.com",
    }
    })
    // Log the results here.
    console.log(`status: ${response.status}\nprimary email: ${response.data.primaryEmail}\nupdated familyName: ${response.data.name.fullName}`)
    console.log("\n"); // insert a line break.
}

async function listUsers(auth) {
    console.log('Listing users')
    const service = google.admin({version: 'directory_v1', auth});
    const response  = await service.users.list({
        customer: 'my_customer',
        maxResults: 150,
        orderBy: 'email',
    })
    const users = response.data.users;
    if (users.length) {
        console.log('Users:');

        users.forEach((user) => {
            console.log(`${user.primaryEmail} -(${user.name.fullName})`);
        });
    } else {
        console.log('No users found.');
    }
    console.log("\n"); // insert a line break.
}

async function updateUserInfo(auth) {
    console.log('Updating user info')
    const service = google.admin({version: 'directory_v1', auth});
    const response = await service.users.update({
        "userKey": "j.smith@jopfre.com",
        "requestBody": {
        "name": {
            "familyName": "Work"
            },
        "primaryEmail": "john.smith@jopfre.com"
        }
    })
    // Log the results here.
    console.log('User info is updated successfully')
    console.log(`status: ${response.status}, prime email: ${response.data.primaryEmail} updated familyName: ${response.data.name.familyName}`)
    for (i = 0; i < response.data.emails.length; i++) {
        console.log(`address: ${response.data.emails[i]["address"]}`)
    }
    console.log("\n"); // insert a line break.
}

async function getUserMeta(auth) {
    console.log('Getting user info')
    const service = google.admin({version: 'directory_v1', auth});
    const response = await service.users.get({
        "userKey" : "j.smith@jopfre.com"
    })
    console.log('User info is obtained successfully')
    console.log(`primary email: ${response.primaryEmail}, full name: ${response.data.name.fullName}`)
    console.log("\n"); // insert a line break.
}

async function deleteUser(auth) {
    console.log('Deleting user')
    const service = google.admin({version: 'directory_v1', auth});
    const response =  await service.users.delete({
        "userKey" : "j.smith@jopfre.com"
    })
    if (response.data == "") {
        console.log("User is deleted successfully");
    }
}



/*

UCC DATA OBJECTS

New user = { 

    "primaryEmail": "liz@ucc.edu.gh",
    "name": {
        "givenName": "Elizabeth",
        "familyName": "Smith"
    },
    "suspended": false,
    "password": "new user password",
    "hashFunction": "SHA-1",
    "changePasswordAtNextLogin": false,
    "organizations": [
        {
        "name": "Unit Name",
        "title": "Job Title",
        "primary": true,
        "type": "work",
        "description": "staff_no or regno "
        }
    ],
    "phones": [
        {
        "value": "+1 206 555 nnnn",
        "type": "work"
        }
    ],
    "orgUnitPath": "/corp/engineering",
    "includeInGlobalAddressList": true
}


*/