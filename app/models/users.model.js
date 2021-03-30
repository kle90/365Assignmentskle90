const db = require('../../config/db');
const fs = require('mz/fs');
const passwordHash = require('password-hash');

const imageDirectory = './storage/images/';
const defaultImageDirectory = './storage/default/';

exports.checkEmail = async function (userEmail) {
    const conn = await db.getPool().getConnection();
    sql = "SELECT email FROM user WHERE email=?";
    const [result] = await conn.query(sql, userEmail);
    conn.release();
    return result;
};

exports.registerUser = async function ( firstname, lastname, email, password ) {
    console.log( "Request to register a single user...." );
    //console.log("I have entered this function");
    const conn = await db.getPool().getConnection();
    const hashedPassword = passwordHash.generate(password);
    const Insertsql = "INSERT INTO user (first_name, last_name, email, password) VALUES (?, ?, ?, ?)";
    const idSql = "SELECT * FROM user WHERE email=?";
    await conn.query( Insertsql, [firstname, lastname, email, hashedPassword] );
    const row = await conn.query( idSql, email );
    conn.release();
    return row;
};

exports.loginUser = async function ( email, token) {
    console.log("Request to login a single user....");
    const conn = await db.getPool().getConnection();
    const insertsql = "UPDATE user SET auth_token=(?) WHERE email=(?)";
    const selectsql = "SELECT * FROM user WHERE email=(?)";
    await conn.query( insertsql, [token, email] );
    const [row, field] = await conn.query(selectsql, email);
    //console.log(row)
    conn.release();
    return row;
}

exports.checkToken = async function (auth_token) {
    const conn = await db.getPool().getConnection();
    const sql = "SELECT * FROM user WHERE auth_token=?"
    const [result] = await conn.query( sql, [auth_token] );
    conn.release();
    return result;
};

exports.Authenticate = async function (userID) {
    const conn = await db.getPool().getConnection();
    const getAuth = `SELECT auth_token FROM user WHERE user.id = ${userID}`
    const [row] = await conn.query( getAuth );
    conn.release();
    return row;
};

exports.logoutUser = async function (req, res, xAuth) {
    //console.log("logoutUser");
    const conn = await db.getPool().getConnection();
    const sql = "UPDATE user SET auth_token=(?) WHERE auth_token=(?)";
    //const authToken = req.header["x-authorization"];
    const [result] = await conn.query( sql, [null, xAuth] );
    console.log("result for logout model is ", result);
    conn.release();
    return result
};

exports.getAUser = async function ( Userid ) {
    console.log("Request to retrieve details of a single user....");
    const conn = await db.getPool().getConnection();
    //console.log(Userid)
    const sql = "SELECT * FROM user WHERE id=(?)";
    const [ rows, fields ] = await conn.query( sql, [ Userid ] );
    //console.log(rows.length)
    conn.release();
    return rows
};



// With logging in you need to ADD the UNIQUE token
// For logging out you need to REMOVE the UNIQUE toekn


exports.patchUser = async function ( req ) {
    console.log("Request to edit user info ");
    const conn = await db.getPool().getConnection();
    sqlList = [];
    Fname = "";
    Lname = "";
    email = "";
    //means pwword change if currentexists
    currentPword = "";
    reqArray = [];

    if (req.body.firstName != undefined) {
        Fname = `first_name = "${req.body.firstName}"`;
        reqArray.push(Fname)
    } if (req.body.lastName != undefined) {
        Lname = `last_name = "${req.body.lastName}"`
        reqArray.push(Lname)
    } if (req.body.email != undefined) {
        email = `email = "${req.body.email}"`
        reqArray.push(email)
    } if (req.body.password != undefined) {
        pword = `password = "${req.body.password}"`;
        reqArray.push(pword)
    }

    console.log("pword is ", typeof req.body.password)
    sql = "UPDATE user SET";
    //const reqArray = [Fname, Lname, email, pword];
    count = 0;
    for (i = 0; i < reqArray.length; i++) {
        if (reqArray[i] != "") {
            if (count == 0) {
                sql = sql + " " + reqArray[i];
                count += 1
            } else {
                sql += ", " + reqArray[i];
            }
        }
    }
    const sqlFinal = sql + ` WHERE id = ${req.params.id}`;
    console.log(sqlFinal)
    const [ row, field ] = await conn.query( sqlFinal );
    conn.release();
};


exports.getImage = async function ( Userid ) {
    console.log("Request to retrieve user profile image....");
    const conn = await db.getPool().getConnection();
    const sql = `SELECT image_filename FROM user WHERE user.id = ${Userid}`;
    const [rows] = await conn.query(sql);
    conn.release();
    return rows;
};

exports.ImgIsInDB = async function () {
    const conn = await db.getPool().getConnection();
    const getFileNameSql = `SELECT user.id, image_filename FROM user`;
    const [rows] = await conn.query( getFileNameSql );
    console.log(rows)
    conn.release();
    return rows;
}

exports.Authenticate = async function (userID) {
    const conn = await db.getPool().getConnection();
    const getAuth = `SELECT auth_token FROM user WHERE user.id = ${userID}`
    const [row] = await conn.query( getAuth );
    conn.release();
    return row;
}

exports.putImage = async function ( Userid, imageFile) {
    console.log("Request to put image to user profile....");
    const conn = await db.getPool().getConnection();
    const putImageSql = `UPDATE user SET image_filename = "${imageFile}" WHERE user.id = ${Number(Userid)}`;
    console.log(putImageSql);
    await conn.query( putImageSql );
    conn.release();
}

exports.checkUserExists = async function ( Userid ) {
    const conn = await db.getPool().getConnection();
    const sql = `SELECT * FROM user WHERE user.id = ${Userid}`;
    const [row] = await conn.query(sql);
    conn.release();
    return row;
}

exports.deleteImageUser = async function (userId) {
    const conn = await db.getPool().getConnection();
    const sql = `UPDATE user SET user.image_filename = ${null} WHERE user.id = ${userId}`;
    console.log("sql in delete is ", sql)
    await conn.query(sql);
    conn.release();
}