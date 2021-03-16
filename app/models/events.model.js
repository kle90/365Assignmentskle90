const db = require('../../config/db');
const fs = require('mz/fs');

const imageDirectory = './storage/images/';
const defaultImageDirectory = './storage/default/';

exports.getEvents = async function (req, res) {
    console.log( 'Request to get all events from the database...' );
    const conn = await db.getPool().getConnection();
    console.log("I have entered this function")
    const query = "SELECT event.id as eventId, event.title as title, user.first_name as organizerFirstName, " +
        "user.last_name as organizerLastName, " +
        "event.date as Date " +
        "FROM event_attendees " +
        "JOIN user ON event_attendees.user_id = user.id " +
        "JOIN event ON event_attendees.event_id = event.id " +
        "ORDER BY convert(datetime, event.date, 103) ASC"
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
