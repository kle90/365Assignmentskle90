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

//get eventid num max
exports.geteventNumMax = async function () {
    const conn = await db.getPool().getConnection();
    const sql = "SELECT max(event.id) as maxNum FROM event";
    const [rows] = await conn.query(sql);
    conn.release();
    return rows;
}

// POST AN EVENT
exports.addEvent = async function (req, res, organID, maxEventID) {
    const conn = await db.getPool().getConnection();
    let sqlDateVal = req.body.date;
    let sqlIsOnlineVal = null;
    let sqlUrlVal = null;
    let sqlVenueVal = null;
    let sqlCapacityVal = null;
    let sqlRAControl = null;
    let sqlFeeVal = 0.00;

    console.log("maxEventID is ", maxEventID[0].maxNum)

    let sqlInsert = `INSERT INTO event (id, title, description, date`
    let sqlValues = `VALUES (${maxEventID[0].maxNum + 1}, "${req.body.title}", "${req.body.description}", "${sqlDateVal}"`

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

    console.log("organID is ", organID)

    let sqlFinal = sqlInsert + ", " + "organizer_id" + ")" + " " + sqlValues + `, ${organID[0].id}` + ")";
    const [row] = await conn.query(sqlFinal);

    console.log("req.body.categoryIds is ", req.body.categoryIds)
    console.log("row in post event model is ", row.insertId);



    let sqlinserCat = "INSERT INTO event_category (event_category.event_id, event_category.category_id) VALUES (";
    for (i=0; i < req.body.categoryIds.length; i++) {
        let sqlinserCat = "INSERT INTO event_category (event_category.event_id, event_category.category_id) VALUES (";
        sqlinserCat += `${row.insertId}, ${req.body.categoryIds[i]})`
        console.log("cat insert sql is ", sqlinserCat)
        await conn.query(sqlinserCat);
    }

    conn.release();
}

// GET ONE EVENT
exports.getCategoryListForGetEvent = async function (eventID) {
    const conn = await db.getPool().getConnection();
    const sql = `SELECT GROUP_CONCAT(DISTINCT event_category.category_id) as category FROM event_category 
    JOIN event On event_category.event_id = event.id WHERE event_category.event_id = ${eventID}`
    const [rows] = await conn.query(sql);
    conn.release();
    return rows;
}


exports.getOneEventMain = async function (eventID) {
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
    console.log("sql in getonevent is ", getEventsql)
    console.log("rows in get one event is ", rows);
    return rows;
};

exports.deleterowsIneventCat = async function (eventID) {
    const conn = await db.getPool().getConnection();
    const sql = `DELETE FROM event_category WHERE event_id = ${eventID}`;
    await conn.query(sql);
    conn.release();
};

//PATCH event
exports.patchAevent = async function (req, res, eventID) {
    const conn = await db.getPool().getConnection();

    let title = "";
    let description = "";
    let date = ""
    let isOnline = "";
    let url = "";
    let venue = "";
    let capacity = "";
    let requiresAttendanceControl = "";
    let fee = "";

    let sqlList = []

    //console.log("date is ", req.body.date);
    //console.log("date is ", req.body.date.toISOString().slice(0, 19).replace('T', ' '))

    if (req.body.title != undefined) {
        title = `title = "${req.body.title}"`
        sqlList.push(title);
    } if (req.body.description) {
        description = `description = "${req.body.description}"`
        sqlList.push(description);
    } if (req.body.date != undefined) {
        date = `date = "${req.body.date.slice(0, 19).replace('T', ' ')}"`;
        sqlList.push(date);
    } if (req.body.isOnline != undefined) {
        if (req.body.isOnline == true) {
            isOnline = `is_online = ${1}`
        } else {
            isOnline = `is_online = ${0}`
        }
        sqlList.push(isOnline);
    } if (req.body.url != undefined) {
        url = `url = "${req.body.url}"`;
        sqlList.push(url);
    } if (req.body.venue != undefined) {
        venue = `venue = "${req.body.venue}"`;
        sqlList.push(venue);
    } if (req.body.capacity) {
        capacity = `capacity = ${req.body.capacity}`;
        sqlList.push(capacity);
    } if (req.body.requiresAttendanceControl != undefined) {
        if (req.body.requiresAttendanceControl == true) {
            requiresAttendanceControl = `requires_attendance_control = ${1}`;
        } else {
            requiresAttendanceControl = `requires_attendance_control = ${0}`;;
        }
        sqlList.push(requiresAttendanceControl);
    } if (req.body.fee != undefined) {
        fee = `fee = ${req.body.fee}`;
        sqlList.push(fee);
    }

    sqlMain = "UPDATE event SET"
    sqlWhere = `WHERE event.id = ${eventID}`;
    let count = 0
    for (i=0; i < sqlList.length; i++) {
        if (sqlList[i] != "") {
            if (count == 0) {
                count += 1
                sqlMain = sqlMain + " " + sqlList[i]
            } else {
                sqlMain += ", " + sqlList[i];
            }
        }
    }

    let sqlcatIdUpate = `INSERT INTO event_category SET (event_id, category_id)`;

    for (i=0; i<req.body.categoryIds.length; i++) {
        sqlcatIdUpate = `INSERT INTO event_category (event_id, category_id)`;
        sqlcatIdUpate += ` VALUES (${eventID}, ${req.body.categoryIds[i]})`;
        console.log("sqlcatIdUpate is ", sqlcatIdUpate)
        await conn.query(sqlcatIdUpate);
    }



    let sqlFinal = sqlMain + " " + sqlWhere
    console.log("sqlFinal is ", sqlFinal);
    await conn.query(sqlFinal);
    conn.release();
}

//DELETE EVENT
exports.deleteEvent = async function (eventID) {
    const conn = await db.getPool().getConnection();
    const sqlDeleteEvent = `DELETE FROM event WHERE event.id = ${eventID}`;
    const sqlDeleteEventAtten = `DELETE FROM event_attendees WHERE event_id = ${eventID}`;
    const sqlDeleteEventCategory = `DELETE FROM event_category WHERE event_id = ${eventID}`;
    console.log("sqlDeleteEvent is ", sqlDeleteEvent);
    console.log("sqlDeleteEventCategory is ", sqlDeleteEventCategory);
    console.log("sqlDeleteEventAtten is ", sqlDeleteEventAtten);
    await conn.query(sqlDeleteEventAtten);
    await conn.query(sqlDeleteEventCategory);
    await conn.query(sqlDeleteEvent);
    conn.release();
};

// GET ALL CATEGORIES
exports.getCategory = async function (req, res) {
    console.log("Request to get categories from db...");
    const conn = await db.getPool().getConnection();
    const sql = "SELECT category.id as categoryId, category.name FROM category";
    const [rows] = await conn.query(sql);
    conn.release();
    return rows
};

// GET ALL ATTENDEES
exports.getAttendees = async function (eventid, userID, organizerID) {
    console.log("Request to get attendees from db...");
    const conn = await db.getPool().getConnection();

    console.log("userID is ", userID);
    console.log("organizerID is ", organizerID)

    if (userID == organizerID) {
        const sql = "SELECT user.id AS attendeeId, user.first_name AS firstName, user.last_name AS lastName, " +
            "event_attendees.date_of_interest AS dateOfInterest, attendance_status.name AS status " +
            "FROM user " +
            "JOIN event_attendees ON user.id = event_attendees.user_id " +
            "JOIN attendance_status ON attendance_status.id = event_attendees.attendance_status_id " +
            `WHERE event_attendees.event_id = ${eventid} ` +
            "ORDER BY event_attendees.date_of_interest"
    }

    const sql = "SELECT user.id AS attendeeId, user.first_name AS firstName, user.last_name AS lastName, " +
        "event_attendees.date_of_interest AS dateOfInterest, attendance_status.name AS status " +
        "FROM user " +
        "JOIN event_attendees ON user.id = event_attendees.user_id " +
        "JOIN attendance_status ON attendance_status.id = event_attendees.attendance_status_id " +
        `WHERE event_attendees.event_id = ${eventid} AND attendance_status_id = ${1} ` +
        "ORDER BY event_attendees.date_of_interest"

    console.log(sql);

    const [rows] = await conn.query(sql);
    conn.release();
    return rows;
};

exports.getOrganizerID = async function (eventId) {
    const conn = await db.getPool().getConnection();
    console.log("eventId in get organ iss ", eventId)
    const sql = `SELECT organizer_id FROM event WHERE event.id = ${Number(eventId)}`;
    console.log("Sql is ", sql)
    const [rows] = await conn.query(sql);
    conn.release();
    console.log("rows in getOraganizerID is ", rows)
    // console.log("rows is ", rows[0].id)
    if (rows.length == 0) {
        return rows
    } else {
        return rows[0].organizer_id;
    }
};

exports.Authenticate = async function (UserId) {
    const conn = await db.getPool().getConnection();
    console.log("evnet id in authenticate is", UserId)
    const getAuth = `SELECT id, auth_token FROM user WHERE id = ${UserId}`
    const [row] = await conn.query( getAuth );
    conn.release();
    console.log("getAuth is ", getAuth)
    console.log("row in auth is ", row.length)
    return row;
};

exports.ImgIsInDB = async function () {
    const conn = await db.getPool().getConnection();
    const getFileNameSql = `SELECT event.id, event.image_filename FROM event`;
    const [rows] = await conn.query( getFileNameSql );
    console.log(rows)
    conn.release();
    return rows;
};

exports.putEventAnImage = async function ( Userid, imageFile) {
    console.log("Request to put image to user profile....");
    const conn = await db.getPool().getConnection();
    const putImageSql = `UPDATE event SET image_filename = "${imageFile}" WHERE event.id = ${Number(Userid)}`;
    console.log(putImageSql);
    await conn.query( putImageSql );
    conn.release();
};

exports.checkCategory = async function ( categoryId ) {
    const conn = await db.getPool().getConnection();
    const sql = `SELECT * FROM category WHERE id = ${categoryId}`;
    const [rows] = await conn.query(sql);
    conn.release();
    return rows;
};

exports.checkEventwithNothing = async function(title) {
    const conn = await db.getPool().getConnection();
    const sql = `SELECT * FROM event WHERE title = "${title}"`;
    const [rows] = await conn.query(sql)
    conn.release();
    return rows;
}

exports.eventIDCheck = async function (eventID) {
    const conn = await db.getPool().getConnection();
    const sql = `SELECT * FROM event WHERE id = ${eventID}`;
    const [rows] = await conn.query(sql);
    conn.release();
    return rows;
};

exports.getEImage = async function (eventID) {
    const conn = await db.getPool().getConnection();
    const sql = `SELECT image_filename FROM event WHERE id = ${eventID}`;
    const [rows] = await conn.query(sql);
    conn.release();
    return rows;
};

exports.getUserIDViaAuth = async function (token) {
    const conn = await db.getPool().getConnection();
    console.log("token in getuseridviatuh is ", token)
    const sql = `SELECT id FROM user WHERE auth_token = "${token}"`;
    console.log("slq in getuseridvai auth is ", sql)
    const [rows] = await conn.query(sql);
    conn.release();
    return rows;
};

exports.checkAttendees = async function (eventid, userID) {
    const conn = await db.getPool().getConnection();
    console.log("user id in checkattendess is ", userID)
    const sql = `SELECT * FROM event_attendees WHERE user_id = ${userID} AND event_id = ${eventid}`;
    console.log("sql in check attendess is ", sql);
    const [rows] = await conn.query(sql);
    console.log("rows in checkattendees is ", rows)
    conn.release();
    return rows;
};

exports.checkDate = async function(eventID) {
    const conn = await db.getPool().getConnection();
    const sql = `SELECT date FROM event WHERE event.id = ${eventID}`;
    const [rows] = await conn.query(sql);
    conn.release();
    console.log("rows is ", rows);
    return [rows]
};

exports.postAttendees = async function (eventid, userID, eventDate) {
    // console.log("eventid in postatten is ", eventid);
    // console.log("userID in postatten is ", userID);
    // console.log("eventDate in postatten is ", eventDate[0][0].date);
    const Date = eventDate[0][0].date;
    const inputDAte = Date.toISOString().slice(0, 19).replace('T', ' ')
    console.log("inputDAte is ", inputDAte);

    const conn = await db.getPool().getConnection();
    const postSql = "INSERT INTO event_attendees (event_id, user_id, attendance_status_id, date_of_interest) " +
        `VALUES (${eventid}, ${userID[0].id}, ${2}, "${inputDAte}")`;

    console.log("postsql is ", postSql)
    await conn.query(postSql);
    conn.release();
};

exports.getAttendeeStatus = async function (eventid, userID) {
    const conn = await db.getPool().getConnection();
    const sql = `SELECT attendance_status_id FROM event_attendees WHERE event_id = ${eventid} and user_id = ${userID}`;
    const [rows] = await conn.query(sql);
    conn.release();
    return rows;
};

exports.deleteAttendee = async function (eventid, userID) {
    const conn = await db.getPool().getConnection();
    const sql = `DELETE FROM event_attendees WHERE event_id = ${eventid} AND user_id = ${userID}`;
    console.log("sql in delete atten is ", sql)
    await conn.query(sql);
    conn.release();
};

exports.patchAttenEvent = async function (status) {
    const conn = await db.getPool().getConnection();
    if (status == "accepted") {
        const insertStatus = 1;
    } if (status == "pending") {
        const insertStatus = 2;
    } if (status == "rejected") {
        const insertStatus = 13;
    }
    const sql = `UPDATE event_attendees SET attendance_status_id = ${insertStatus}`;
    await conn.query(sql);
    conn.release();
};