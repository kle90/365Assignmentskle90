const db = require('../../config/db');
const fs = require('mz/fs');

const imageDirectory = './storage/images/';
const defaultImageDirectory = './storage/default/';

// GET ALL EVENTS
exports.getEvents = async function (req, res) {
    console.log('Request to get all events from the database...');
    console.log("index is ", req.query.startIndex);

    let sqlStartIndex = "";
    let sqlCountLimit = "";
    let sqlQuery = "";
    let sqlCategory = "";
    let sqlOrganizer = "";
    let sqlSortBy = "";

   //console.log("index is ", req.query.startIndex);
    //console.log("category id is ", typeof req.query.categoryIds)


    if (req.query.count != undefined) {
        sqlCountLimit = ` LIMIT ${Number(req.query.count)}`;
    } else {
        sqlCountLimit = ` LIMIT 100`;
    //console.log("sqlCountLimit inside if is ", sqlCountLimit)
    } if (req.query.startIndex != undefined) {
        sqlStartIndex = ` OFFSET ${Number(req.query.startIndex)}`;
    } if (req.query.q != undefined) {
        sqlQuery = ` AND event.title LIKE '%${req.query.q}%' OR event.description LIKE '%${req.query.q}%'`;
    } if (req.query.categoryIds != undefined) {
        if (req.query.categoryIds.length > 1) {
            for (i = 0; i < req.query.categoryIds.length; i++) {
                sqlCategory += ` OR event_category.category_id = ${Number(req.query.categoryIds[i])}`;
            }
        } else {
            sqlCategory = ` AND event_category.category_id = ${Number(req.query.categoryIds)}`;
        }
    } if (req.query.organizerId != undefined) {
        sqlOrganizer = ` AND event.organizer_id = ${req.query.organizerId}`;
    } if (req.query.sortBy == undefined) {
        sqlSortBy = " ORDER BY event.date DESC";
    } if (req.query.sortBy != undefined) {
        switch(req.query.sortBy) {
            case "ALPHABETICAL_ASC":
                sqlSortBy = " ORDER BY event.title ASC"
                break;
            case "ALPHABETICAL_DESC":
                sqlSortBy = " ORDER BY event.title DESC"
                break;
            case "DATE_ASC":
                sqlSortBy = " ORDER BY event.date ASC"
                break;
            case "DATE_DESC":
                sqlSortBy = " ORDER BY event.date DESC"
                break;
            case "ATTENDEES_ASC":
                sqlSortBy = " ORDER BY numAcceptedAttendees ASC"
                break;
            case "ATTENDEES_DESC":
                sqlSortBy = " ORDER BY numAcceptedAttendees DESC"
                break;
            case "CAPACITY_ASC":
                sqlSortBy = " ORDER BY event.capacity ASC"
                break;
            case "CAPACITY_DESC":
                sqlSortBy = " ORDER BY event.capacity DESC"
                break;
        }
    }

    const conn = await db.getPool().getConnection();
    const sql = "SELECT event.id as eventId, event.title, " +
        "event.capacity as capacity, user.first_name as organizerFirstName, " +
        "user.last_name as organizerLastName, event.date, GROUP_CONCAT(DISTINCT event_category.category_id) AS categories, " +
        "(SELECT COUNT(*) FROM event_attendees WHERE event_attendees.attendance_status_id=1 AND event.id = event_attendees.event_id) " +
        "AS numAcceptedAttendees " +
        "FROM event " +
        "JOIN event_category ON event.id = event_category.event_id " +
        "JOIN user ON event.organizer_id = user.id " +
        "JOIN event_attendees ON event.id = event_attendees.event_id " +
        "WHERE event.id"

    const groupBy = " GROUP BY event.id"

    const finalSQL = sql + sqlCategory + sqlQuery + sqlOrganizer + groupBy + sqlSortBy + sqlCountLimit + sqlStartIndex;
    console.log("final sql is ", finalSQL)

    const [ rows ] = await conn.query(finalSQL);
    conn.release();
    //console.log("rows is ", rows)
    return rows
};

// POST AN EVENT
exports.addEvent = async function (req, res) {
    const conn = await db.getPool().getConnection();
    let sqlDateVal = req.body.date;
    let sqlIsOnlineVal = null;
    let sqlUrlVal = null;
    let sqlVenueVal = null;
    let sqlCapacityVal = null;
    let sqlRAControl = null;
    let sqlFeeVal = 0.00;

    let sqlOraganizerID = `SELECT user.id FROM user WHERE auth_token = "${req.headers["x-authorization"]}"`;
    const OraganizerID = await conn.query(sqlOraganizerID);

    console.log("oraganier id is", OraganizerID[0][0].id);


    let sqlInsert = `INSERT INTO event (title, description, date`
    let sqlValues = `VALUES ("${req.body.title}", "${req.body.description}", "${sqlDateVal}"`

    if (req.body.isOnline != undefined) {
        if (req.body.isOnline == true) {
            sqlIsOnlineVal = 1
        } else {
            sqlIsOnlineVal = 0
        }
        sqlInsert += ", is_online"
        sqlValues += `, ${sqlIsOnlineVal}`
    } if (req.body.url != undefined) {
        sqlUrlVal = req.body.url
        sqlInsert += ", url";
        sqlValues += `, "${sqlUrlVal}"`;
    } if (req.body.capacity != undefined) {
        sqlCapacityVal = Number(req.body.capacity);
        sqlInsert += ", capacity";
        sqlValues += `, ${sqlCapacityVal}`
    } if (req.body.requiresAttendanceControl != undefined) {
        sqlRAControl = req.body.requiresAttendanceControl;
        sqlInsert += ", requires_attendance_control";
        sqlValues += `, ${sqlRAControl}`
    } if (req.body.fee != undefined) {
        sqlFeeVal = Number(req.body.fee);
        sqlInsert += ", fee";
        sqlValues += `, ${sqlFeeVal}`;
    } if (req.body.venue != undefined) {
        sqlVenueVal = req.body.venue;
        sqlInsert += ", venue";
        sqlValues += `, "${sqlVenueVal}"`;
    }

    let sqlFinal = sqlInsert + ", " + "organizer_id" + ")" + " " + sqlValues + `, ${OraganizerID[0][0].id}` + ")";
    //
    // let sqlFinal = `INSERT INTO event (title, description, date, is_online, url, venue, capacity, ` +
    //     `requires_attendance_control, fee, organizer_id) VALUES ("${req.body.title}", "${req.body.description}", ${sqlDateVal}, ${sqlIsOnlineVal}, ${sqlUrlVal},
    //     ${sqlVenueVal}, ${sqlCapacityVal}, ${sqlFeeVal}, ${sqlRAControl}, ${OraganizerID[0][0].id})`;
    // [req.body.title, req.body.description, sqlDateVal, sqlIsOnlineVal,
    //     sqlUrlVal, sqlVenueVal, sqlCapacityVal, sqlRAControl, sqlFeeVal, oraganID]
    const [row] = await conn.query(sqlFinal);
    conn.release();
    return row;
}

// GET ONE EVENT
exports.getOneEvent = async function (eventID) {
    console.log( "Request to get a single event from the database using id..." );
    const conn = await db.getPool().getConnection();
    console.log("I have entered this function")
    console.log("eventID in getoneevent is ", eventID)
    const getEventsql = "SELECT event.id as eventId, event.title, GROUP_CONCAT(DISTINCT event_category.category_id) AS categories, " +
        "user.first_name as organizerFirstName, user.last_name as organizerLastName, " +
        "(SELECT COUNT(*) FROM event_attendees WHERE event_attendees.attendance_status_id=1 AND event.id = event_attendees.event_id) " +
        "AS numAcceptedAttendees, event.capacity as capacity, event.description as description, organizer_id as organizerId, " +
        "event.date as date, event.is_online as isOnline, event.url as url, event.venue as venue, " +
        "event.requires_attendance_control as requiresAttendanceControl, event.fee as fee " +
        "FROM event " +
        "JOIN event_category ON event.id = event_category.event_id " +
        "JOIN user ON event.organizer_id = user.id " +
        "JOIN event_attendees ON event.id = event_attendees.event_id " +
        `WHERE event.id = ${eventID}`
    const [ rows ] = await conn.query(getEventsql);
    conn.release();
    console.log(rows)
    return rows;
};

// GET ALL CATEGORIES
exports.getCategory = async function (req, res) {
    console.log("Request to get categories from db...");
    const conn = await db.getPool().getConnection();
    const sql = "SELECT category.id as categoryId, category.name FROM category";
    const [rows] = await conn.query(sql);
    conn.release();
    return rows
}

// GET ALL ATTENDEES
exports.getAttendees = async function (eventid) {
    console.log("Request to get attendees from db...");
    const conn = await db.getPool().getConnection();
    const sql = "SELECT user.id AS attendeeId, user.first_name AS firstName, user.last_name AS lastName, " +
        "event_attendees.date_of_interest AS dateOfInterest, attendance_status.name AS status " +
        "FROM user " +
        "JOIN event_attendees ON user.id = event_attendees.user_id " +
        "JOIN attendance_status ON attendance_status.id = event_attendees.attendance_status_id " +
        `WHERE event_attendees.event_id = ${eventid} ` +
        "ORDER BY event_attendees.date_of_interest"

    const [rows] = await conn.query(sql);
    conn.release();
    return rows;
}

exports.getOraganizerID = async function (eventId) {
    const conn = await db.getPool().getConnection();
    console.log("eventId in get organ iss ", eventId)
    const sql = `SELECT organizer_id FROM event WHERE event.id = ${Number(eventId)}`;
    console.log("Sql is ", sql)
    const [rows] = await conn.query(sql);
    conn.release();
    console.log("rows in getOraganizerID is ", rows)
    // console.log("rows is ", rows[0].id)
    return rows[0].organizer_id;
}

exports.Authenticate = async function (UserId) {
    const conn = await db.getPool().getConnection();
    console.log("evnet id in authenticate is", UserId)
    const getAuth = `SELECT id, auth_token FROM user WHERE id = ${UserId}`
    const [row] = await conn.query( getAuth );
    conn.release();
    console.log("getAuth is ", getAuth)
    console.log("row in auth is ", row.length)
    return row;
}

exports.ImgIsInDB = async function () {
    const conn = await db.getPool().getConnection();
    const getFileNameSql = `SELECT event.id, event.image_filename FROM event`;
    const [rows] = await conn.query( getFileNameSql );
    console.log(rows)
    conn.release();
    return rows;
}

exports.putEventAnImage = async function ( Userid, imageFile) {
    console.log("Request to put image to user profile....");
    const conn = await db.getPool().getConnection();
    const putImageSql = `UPDATE event SET image_filename = "${imageFile}" WHERE event.id = ${Number(Userid)}`;
    console.log(putImageSql);
    await conn.query( putImageSql );
    conn.release();
}

exports.checkCategory = async function ( categoryId ) {
    const conn = await db.getPool().getConnection();
    const sql = `SELECT * FROM category WHERE id = ${categoryId}`;
    const [rows] = await conn.query(sql);
    conn.release();
    return rows;
}

exports.eventIDCheck = async function (eventID) {
    const conn = await db.getPool().getConnection();
    const sql = `SELECT * FROM event WHERE id = ${eventID}`;
    const [rows] = await conn.query(sql);
    conn.release();
    return rows;
}

exports.getEImage = async function (eventID) {
    const conn = await db.getPool().getConnection();
    const sql = `SELECT image_filename FROM event WHERE id = ${eventID}`;
    const [rows] = await conn.query(sql);
    conn.release();
    return rows;
}

// exports.postAttendees = async function (eventid) {
//     console.log("Request attendance to an event....");
//     const conn = await db.getPool().getConnection();
//     const checkSql = "INSERT "
// }

