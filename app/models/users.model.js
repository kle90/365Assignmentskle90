const db = require('../../config/db');
const fs = require('mz/fs');

const imageDirectory = './storage/images/';
const defaultImageDirectory = './storage/default/';

exports.registerUser = async function ( firstname, lastname, email, password ) {
    console.log("Request to register a single user....");
    console.log("I have entered this function")
    const conn = await db.getPool().getConnection();
    const sql = "INSERT INTO users (first_name, last_name, email, password) VALUES (?, ?, ?, ?)";
    const result  = await conn.query( sql, [firstname, lastname, email, password] );
    return result;
};

// exports.loginUser = async function () {
//     console.log("Request to login a single user....");
//     const conn = await db.getPool().getConnection();
//     const sql = ""
//
// }

exports.getAUser = async function ( Userid ) {
    console.log("Request to retrieve details of a single user....");
    const conn = await db.getPool().getConnection();
    //console.log(Userid)
    const sql = "SELECT first_name, last_name, email FROM user WHERE id=(?)";
    const [ rows, fields ] = await conn.query( sql, [ Userid ] );
    //console.log(rows.length)
    return rows
};

exports.getImage = async function ( Userid ) {
    console.log("Request to retrieve user profile image....");
    const conn = await db.getPool().getConnection();
    const sql = "SELECT image_filename FROM user WHERE id=?";
    const [ rows, fields ] = await conn.query( sql, [Userid] );
    return rows
};