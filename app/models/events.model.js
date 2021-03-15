const db = require('../../config/db');
const fs = require('mz/fs');

const imageDirectory = './storage/images/';
const defaultImageDirectory = './storage/default/';

exports.getEvents = async function (req, res) {
    console.log( 'Request to get all events from the database...' );
    const conn = await db.getPool().getConnection();
    console.log("I have entered this function")
    const query = "SELECT * FROM event";
    const [ rows ] = await conn.query(query);
    return rows
}

exports.getOneEvent = async function (req, res) {
    console.log( "Request to get a single event from the database using id..." );
    const conn = await db.getPool().getConnection();
    console.log("I have entered this function")
    const query = "SELECT * FROM event";
    const [ rows ] = await conn.query(query);
    return rows
}
