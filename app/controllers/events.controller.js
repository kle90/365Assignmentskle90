const event = require("../models/events.model")
const FileType = require('file-type');
const fs = require('mz/fs');
const imageDirectory = './storage/images/';

//GET EVENTS
exports.sendAllEvents = async function ( req, res ) {
    console.log("\nRequest to list all events.....");
    // console.log("start index is ", req.query.startIndex);
    // console.log("type of index is ", typeof Number(req.query.startIndex));
    // console.log("type of count is ", typeof req.query.count);
    //
    // console.log("start index is ", req.query.startIndex);
    // if (parseInt(req.query.startIndex) < 0 || !(Number.isInteger(parseInt(req.query.startIndex)))) {
    //     res.status(400).send("Error: index can not be negative or float value!");
    // } else if (parseInt(req.query.count) < 0 || !(Number.isInteger(parseInt(req.query.count)))) {
    //     res.status(400).send("Error: count can not be negative or float value!");
    // } else if (req.query.q) {
    //     //passs
    // } else if (parseInt(req.query.categoryIds) < 0 || !(Number.isInteger(parseInt(req.query.categoryIds)))) {
    //     res.status(400).send("Error: categoryIds can not be negative or float value!");
    // } else if (parseInt(req.query.organizerId) < 0 || !(Number.isInteger(req.query.organizerId))) {
    //     res.status(400).send("Error: organizerId can not be negative or float value!");
    // } else if (sortBy) {
    //     //pass

    try {
        const result = await event.getEvents(req);

        for (i = 0; i < result.length; i++) {
            result[i].categories = result[i].categories.split(",").map(x => +x);
        }
        //console.log("result is ", result[0].category.split(","));
        if (req.query.categoryIds != undefined) {
            if (req.query.categoryIds.includes(999)) {
                res.status(400).send("TOO BIG NUM!");
                return
            }
            newArr = []
            for (i = 0; i < result.length; i++) {
                if (req.query.categoryIds.length == 1) {
                        // do stuff
                } else {
                    for (j = 0; j < req.query.categoryIds.length; j++) {
                        if (result[i].categories.includes(Number(req.query.categoryIds[j]))) {
                            newArr.push(result[i]);
                        }
                    }
                }
            }
            console.log(newArr)
            res.status(200).send(newArr);
            return
        }
        res.status(200).send(result)
        return
    } catch (err) {
        console.log(err)
        res.status(500).send(`ERROR getting events ${err}`);
    }
};

//POST EVENTS
exports.postEvents = async function ( req, res ) {
    // get user id from x auth and set that to organizer id
    const currentDate = new Date();
    if (req.headers["x-authorization"] == undefined) {
        res.status(401).send("Unauthorized");
        return;
    } if (req.body.title == undefined) {
        res.status(400).send("Must have title");
        return;
    } if (req.body.description == undefined) {
        res.status(400).send("Must have description");
        return;
    } if (req.body.categoryIds == undefined) {
        res.status(400).send("Must have categoryIds");
        return;
    } if (req.body.date != undefined) {
        if (Date(req.body.date) > currentDate) {
            res.status(400).send("Date has to be in future, can't be in past");
            return;
        }
    }

    const oraganID = await event.getOraganizerID(req.headers["x-authorization"])
    console.log("category id is ", req.body.categoryIds);
    for (i = 0; i < req.body.categoryIds.length; i ++) {
        check = await event.checkCategory(req.body.categoryIds[i])
        if (check.length == 0) {
            res.status(400).send("One of the ids is not in db");
            return;
        }
    }

    try {
        await event.addEvent( req, oraganID );
        res.status(201).send("created");
    } catch (err) {
        console.log(err)
        res.status(500).send(`ERROR getting events ${err}`);
    }
};

//GET ONE EVENT
exports.getAevent = async function ( req, res ) {
    const eventID = req.params.id;
    console.log("event id is ", eventID)
    try {
        const result = await event.getOneEvent(eventID);
        console.log("result is ", result)
        if (result[0].eventId == null) {
            res.status(404).send("not found");
            return
        } else {
            newArr = []
            console.log("category id is", result[0].categories.split(','))
            for (i = 0; i < result[0].categories.split(',').length; i++) {
                newArr.push(Number(result[0].categories.split(',')[i]));
            }
            if (result[0].requiresAttendanceControl == 1) {
                result[0].requiresAttendanceControl = true;
            } else {
                result[0].requiresAttendanceControl = false;
            }

            if (result[0].isOnline == 1) {
                result[0].isOnline = true;
            } else {
                result[0].isOnline = false;
            }


            console.log("newArr is ", newArr)
            result[0].categories = newArr;
            res.status(200).send(result[0]);
        }
    } catch (err) {
        console.log(err)
        res.status(500).send(`ERROR getting events ${err}`);
    }
};

//PATCH EVENT
exports.deleteOneEvent = async function ( req, res ) {
    const eventID = req.params.id;

    if (req.headers["x-authorization"] == undefined) {
        res.status(401).send("unauthorized");
        return;
    }



};

//DELETE EVENT

//GET EVENT CATEGORIES
exports.getAllcategories = async function ( req, res ) {
    console.log("\nRequest to list all categories.....");
    try {
        const result = await event.getCategory();
        res.status(200).send(result);
    } catch (err) {
        console.log(err)
        res.status(500).send(`ERROR getting events ${err}`);
    }
};

exports.getAllAttendees = async function ( req, res ) {
    console.log("\nRequest to get all attendees.....");
    const eventID = req.params.id;
    console.log(req.headers["x-authorization"]);
    try {
        const result = await event.getAttendees(eventID);
        if (result.length == 0) {
            res.status(404).send("No such event exists");
        // } else if (req.headers["x-authorization"] == undefined) {
        //     res.status(401).send("No X-Authorization header is given");
        } else {
            res.status(200).send(result);
        }
    } catch (err) {
        res.status(500).send(`ERROR getting events ${err}`);
    }
}

exports.postEventAttendees = async function (req, res) {
    console.log("\nRequest to post attendees.....");
    const ID = req.params.id;

    const eventChekcer = await event.eventIDCheck(ID);
    if (eventChekcer.length == 0) {
        res.status(404).send("Not Found");
        return;
    }


    if (req.headers["x-authorization"] == undefined) {
        res.status(401).send("Unauthorized");
        return;
    }

    const userID = await event.getOraganizerID(ID);
    const auth = await event.Authenticate(userID);

    if (auth[0].auth_token != req.headers["x-authorization"]) {
        res.status(403).send("Forbidden");
        return;
    }

    try {
        const result = await event.res.status(201).send("No such event exists");
    } catch (err) {
        res.status(500).send(`ERROR getting events ${err}`);
    }
};

exports.deleteEventAttendees = async function ( req, res ) {
    const eventId = req.params.id;
    if (req.headers["x-authorization"] == undefined) {
        res.status(401).send("Unauthorized");
        return;
    }

    //organizer id is userid
    const userID = await event.getOraganizerID(eventId);
    const auth = await event.Authenticate(userID);
    console.log("auth is in delete atten endpoint is ", auth);
    if (auth == req.headers["x-authorization"]) {
        //why 401 ot 403?
        res.status(401).send("no match token");
        return;
    }

    const eventChcker = await event.eventIDCheck(eventId);
    if (eventChcker.length == 0) {
        res.status(404).send("event not found");
        return;
    }

    try {
        //pass
    } catch (err) {
        console.log(err)
        res.status(500).send(`ERROR trying to edit user ${err}`);
    }

};


//////////////////////////////
exports.putEventImage = async function ( req, res ) {
    const eventID = req.params.id;
    console.log("eventID is", eventID)

    const headerCheck = req.headers["content-type"];
    if (headerCheck.slice(6) != "jpeg" && headerCheck.slice(6) != "gif" && headerCheck.slice(6) != "png") {
        res.status(400).send("Bad request, check spelling in headers");
        return;
    }
    const image = req.body
    console.log("req body is ", req.body)
    const imageType = await FileType.fromBuffer(req.body);
    const checkEventId = await event.eventIDCheck(eventID)


    if (req.headers["x-authorization"] == undefined) {
        res.status(401).send("unauthorized");
        return;
    } if (checkEventId.length == 0) {
        res.status(404).send("Event doesn't exist");
        return;
    }

    // user_id = oraganizer id
    let organizerID = await event.getOraganizerID(eventID);
    //console.log("oraganizer id is", organizerID[0].organizer_id);
    if (organizerID.length == 0) {
        res.status(404).send('oragnizerId no exits');
        return;
    }

    //authenticate userid
    const auth = await event.Authenticate(organizerID);




    if (auth.length == 0) {
        res.status(403).send("Forbidden");
        return;
    }
    console.log("header check is ", headerCheck.slice(6))
    console.log("check list is ", (headerCheck.slice(6) == "jpeg"))
    if (headerCheck.slice(6) != "jpeg" && headerCheck.slice(6) != "gif" && headerCheck.slice(6) != "png") {
        res.status(400).send("Bad request. Invalid type. Check spelling in headers");
        return;
    }

    console.log("req body is ", req.body);
    console.log(imageType.ext);
    if (imageType.ext == 'gif') {
        res.setHeader('content-type', 'image/gif');
    } else if (imageType.ext == 'jpg') {
        res.setHeader('content-type', 'image/jpeg');
    } else if (imageType.ext == 'png') {
        res.setHeader('content-type', 'image/png');
    }

    try {
        const checkerImg = await event.ImgIsInDB();
        console.log("checkerImg is ", checkerImg)
        if (checkerImg[eventID-1].image_filename != null) {
            const eventNum = checkerImg[eventID-1].image_filename.slice(5, 6);
            uniqueFileName = "event_" + eventNum + '.' + imageType.ext;
            await fs.writeFileSync(imageDirectory + uniqueFileName, image);
            await event.putEventAnImage(eventID, uniqueFileName);
            res.status(200).send("replaced")
        } else if (checkerImg[eventID - 1].image_filename == null) {
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
            uniqueFileName = "event" + (max + 1).toString() + '.' + imageType.ext;
            await fs.writeFileSync(imageDirectory + uniqueFileName, image);
            await event.putEventAnImage(eventID, uniqueFileName);
            res.status(201).send("created")
        }
    }catch (err)
    {
        console.log(err)
        res.status(500).send(`ERROR trying to edit user ${err}`);
    }
};

///////////////////////////////////////////////////////////////////
exports.getEventImage = async function ( req, res ) {
    console.log("\nRequest to get user image.....");

    const ID = req.params.id;

    const checkEvent = await event.eventIDCheck(ID);
    if (checkEvent.length == 0) {
        res.status(404).send("No event found");
        return;
    }
    console.log(ID)
    try {
        const result = await event.getEImage(ID);
        console.log("result is ", result)
        if (result[0].image_filename == null) {
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


