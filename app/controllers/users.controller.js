const user = require("../models/users.model")
const auth = require('randomstring');
const passwordHash = require('password-hash');
const imageDirectory = './storage/images/';
const path = require("path");
const filepath = path.join(__dirname, "../../")
const fs = require('mz/fs');
const FileType = require('file-type');
const fs2 = require('fs');

// eg const file = path.join(__dirname, "../../")

// POST: Register a new user
exports.createUser = async function ( req, res ) {
    console.log("\nRequest to register a user.....");
    //console.log(req.body);
    const Fname = req.body.firstName;
    const Lname = req.body.lastName;
    const UserEmail = req.body.email;
    const Pword = req.body.password;

    //console.log(Pword);
    // REMEMBER TO USE REGEX CURRENTLY IT ACCEPTS '@'

    try {
        //console.log("inside the first try");
        if (UserEmail.includes("@") == false) {
            //console.log("inside the first if");
            res.status( 400 ).send( "Email is not syntactically valid, must contain '@'" );
        } else if (!Pword.trim()) {
            //console.log(!Pword.trim());
            res.status( 400 ).send( "Password can not be empty!!" )
        } else {
            const checkemail = await user.checkEmail(UserEmail);
            console.log(checkemail);
            if (checkemail.length === 0) {
                const result = await user.registerUser(Fname, Lname, UserEmail, Pword);
                res.status(201).send({"userId": result[0][0].id});
            } else {
                res.status( 400 ).send("Email already exists");
            }
        }
    } catch( err ) {
        res.status( 500 ).send( `ERROR registering user ${err}` );
    }
};

// POST: login user
exports.login = async function ( req, res ) {
    console.log("\nRequest to login a user.....");
    //console.log("x auth first log in login is", req.headers["x-authorization"])
    const userEmail = req.body.email;
    const pword = req.body.password;
    // const accessTokenSecret = "myaccessTokenSecret";
    const token = auth.generate({length:32});
    //console.log("x auth second log in login is", req.headers["x-authorization"])
    //console.log("x auth is ", req.headers["x-authorization"])
    if (userEmail.includes("@") == false) {
        //console.log("inside the first if");
        res.status(400).send("Email is not syntactically valid, must contain '@'")
    }
    try {
        const result = await user.loginUser(userEmail, token);
        //console.log("result is ", result.legnth);
        if (result.length == 0) {
            res.status(400).send("No such email exists");
        } else if (userEmail == result[0].email && !passwordHash.verify(pword, result[0].password)) {
            console.log("testing for login ", passwordHash.verify(pword, result[0].password))
            // console.log(passwordHash.generate(pword))
            // console.log(result[0].password)
            res.status(400).send("Invalid password");
        } else {
            res.status(200).send({"userId": result[0].id, "token": result[0].auth_token});
        }
    } catch (err) {
        console.log(err)
        res.status(500).send("ERROR getting data from server....");
    }
};

//POST LOGOUT: logout user
exports.logout = async function (req, res) {
    console.log("\nRequest to logout user.....");
    const xAuth = req.headers["x-authorization"]
    //console.log("x auth in logout func", xAuth);
    if (!xAuth) {  // is empty
        res.status(401).send("Unauthorized!!")
    } else {
        try {
            // console.log("result is in logout function contorller ", result);
            //console.log("x auth is", req.headers["x-authorization"]);
            const checker = await user.checkToken(xAuth);
            //console.log("checker is ", checker);
            if (checker.length === 0) {
                res.status(401).send("Authorization token does not match any user");
            } else {
                const result = await user.logoutUser(req, res, xAuth);
                res.status(200).send("Logout successful");
            }
        } catch (err) {
            console.log(err);
            res.status(500).send("ERROR getting data from server....");
        }
    }
};

// GET: Retrieve info about a user
exports.getUserInfo = async function ( req, res ) {
    console.log("\nRequest to register a user.....");
    const ID = req.params.id;
    //const token = req.body.token;
    try {
        const result = await user.getAUser( ID );
        if ( result.length == 0 ) {
            res.status( 404 ).send( "User not found!" )
        } else if ( req.headers["x-authorization"] != undefined ) {
            const token = await user.Authenticate(ID);
            console.log(token);
            if (token[0].auth_token == req.headers["x-authorization"]) {
                res.status(200).send({
                    "firstName": result[0].first_name, "lastName": result[0].last_name,
                    "email": result[0].email
                }); //When user is authenticated
            } else {
                res.status( 200 ).send({"firstName": result[0].first_name, "lastName": result[0].last_name}); //When user is not authenticated
            }
        } else if (req.headers["x-authorization"] == undefined) {
            res.status( 200 ).send({"firstName": result[0].first_name, "lastName": result[0].last_name}); //When user is not authenticated
        }
    } catch ( err ) {
        console.log(err)
        res.status( 500 ).send( `ERROR getting user ${ID}: ${err}` );
    }
};

//PATCH: Change a user's detail
exports.editUserInfo = async function ( req, res ) {
    console.log("\nRequest to edit user details.....");
    const ID = req.params.id;
    const xAuth = req.headers["x-authorization"];
    const userCheck = await user.checkUserExists(ID);
    const authUser = await user.Authenticate(ID);
    if (userCheck.length == 0) {
        res.status(404).send("user no exists");
        return
    }
    if (!xAuth) {  // is empty
        res.status(401).send("Unauthorized!!!!! INTRUDER ALERT! INTRUDER ALERT!!");
        return;
    } if (xAuth != authUser[0].auth_token) {
        console.log("xauth is ", xAuth);
        console.log("auth user is ", authUser[0]);
        res.status(403).send("token does not match.");
        return;
    } if (req.body.password != undefined && req.body.currentPassword == undefined) {
        res.status(400).send("If changing password must provide current password.");
        return;
    } else {
        try {
            if (req.body.email != undefined) {
                if (req.body.email.includes("@") == false) {
                    res.status(400).send("Must have the '@' for email.");
                    return;
                }
            } else if (req.body.password != undefined) {
                 if (!req.body.password.trim()) {
                     res.status(400).send("Password must not be empty.");
                     return
                 }
            }
            const result = await user.patchUser( req );
            res.status(200).send("Edit successful")
            return;

        } catch (err) {
            console.log(err)
            res.status(500).send(`ERROR trying to edit user ${err}`);
        }
    }
};

// GET user's image
exports.getUserImage = async function ( req, res ) {
    console.log("\nRequest to get user image.....");

    const ID = req.params.id;
    console.log(ID)
    try {
        const result = await user.getImage(ID);
        console.log("result is ", result)
        if (result.length == 0) {
            res.status(404).send("No such user exists");
            return;
        } else if (result[0].image_filename == null) {
            res.status(404).send("User does not have a image.");
            return;
        }
        console.log("result is ", result[0]);
        console.log("image type is ", result[0].image_filename.split('.')[1]);
        console.log("directory is ", imageDirectory+result)
        const imageType = result[0].image_filename.split('.')[1];
        const files = fs.readFileSync(imageDirectory+result[0].image_filename);
        if (imageType == 'gif') {
            res.setHeader('content-type', 'image/gif');
        } else if (imageType == 'jpg' || imageType == 'jpeg') {
            res.setHeader('content-type', 'image/jpeg');
        } else if (imageType == 'png') {
            res.setHeader('content-type', 'image/png');
        }
        res.status( 200 ).send( files );
    } catch ( err ) {
        console.log(err)
        res.status( 500 ).send( `ERROR getting user image ${ID}: ${err}` );
    }
};

//PUT user ID image
exports.putUserImage = async function ( req, res ) {
    // console.log("\nRequest to put image for user.....");
    const headerCheck = req.headers["content-type"];
    console.log("header check is ", headerCheck.slice(6))
    console.log("check list is ", (headerCheck.slice(6) == "jpeg"))
    if (headerCheck.slice(6) != "jpeg" && headerCheck.slice(6) != "gif" && headerCheck.slice(6) != "png") {
        res.status(400).send("Bad request, check spelling in headers");
        return;
    }
    const userID = Number(req.params.id);
    const image = req.body
    const imageType = await FileType.fromBuffer(req.body);
    console.log("req body is ", req.body);
    console.log(imageType.ext);
    if (imageType.ext == 'gif') {
        res.setHeader('content-type', 'image/gif');
    } else if (imageType.ext == 'jpg') {
        res.setHeader('content-type', 'image/jpeg');
    } else if (imageType.ext == 'png') {
        res.setHeader('content-type', 'image/png');
    }
    // console.log("image type is ", imageType);
    // console.log("headerCheck is ", req.headers["content-type"].slice(6))
    // console.log("image type is ", imageType.ext)
    const authenticate = await user.Authenticate(userID);
    if (authenticate[0].auth_token != req.headers["x-authorization"]) {
        res.status(403).send("Forbidden");
        return
    } if (req.headers["x-authorization"] == undefined) {
        res.status(401).send("unauthorized");
        return
    }

    try {
        const checkerImg = await user.ImgIsInDB();
        if (checkerImg[userID-1].image_filename != null) {
            const userNum =  checkerImg[userID-1].image_filename.slice(5, 6);
            uniqueFileName = "user_" + userNum + '.' + imageType.ext;
            fs.writeFileSync(imageDirectory + uniqueFileName, image);
            await user.putImage(userID, uniqueFileName);
            res.status(200).send("replaced")
        } else if (checkerImg[userID - 1].image_filename == null) {
            i = 0
            max = 0;
            while (i < checkerImg.length) {
                if (checkerImg[i].image_filename != null) {
                    if (max < Number(checkerImg[i].image_filename.slice(5, 6))) {
                        max = Number(checkerImg[i].image_filename.slice(5, 6));
                    }
                }
                i += 1
            }
            uniqueFileName = "user_" + (max + 1).toString() + '.' + imageType.ext;
            fs.writeFileSync(imageDirectory + uniqueFileName, image);
            await user.putImage(userID, uniqueFileName);
            res.status(201).send("created")
        }
    }catch (err)
        {
            console.log(err)
            res.status(500).send(`ERROR trying to edit user ${err}`);
        }
};

// DELETE user ID image
exports.deleteUserImage = async function ( req, res ) {
    console.log("user id in delete is ", req.params.id);
    const tokenCheck = await user.Authenticate(req.params.id);
    const checkUser = await user.getAUser(req.params.id);
    if (req.params.id == undefined) {
        res.status(400).send("id is required parameter in url");
    } if (req.headers["x-authorization"] == undefined) {
        res.status(401).send("No auth in header");
        return
    } if (checkUser.length == 0) {
        res.status(404).send("User does not exists.")
        return;
    } if (req.headers["x-authorization"] != tokenCheck[0].auth_token) {
        console.log("token check is ", tokenCheck);
        console.log("x auth in headers is ", req.headers["x-authorization"]);
        res.status(403).send("Forbidden");
        return;
    } if (checkUser[0].image_filename == null) {
        res.status(404).send("No image exists can't delete");
        return;
    }

    try {
        await user.deleteImageUser(Number(req.params.id));
        res.status(200).send("delete successful");
    } catch (err)
        {
            console.log(err)
            res.status(500).send(`ERROR trying to edit user ${err}`);
        }
}

// user image filename does it have to be same format?
//

// event attendees?
// organizer leader can control/see who is accepted else just see who is going etc