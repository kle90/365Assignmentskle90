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
                    newArr.push(result);
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
    // check if date is in past.

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

    const organID = await event.getUserIDViaAuth(req.headers["x-authorization"])
    console.log("oraganID is ", organID);
    if (organID.length == 0) {
        res.status(401).send("no matching auth")
    }
    console.log("category id is ", req.body.categoryIds);
    for (i = 0; i < req.body.categoryIds.length; i ++) {
        check = await event.checkCategory(req.body.categoryIds[i])
        if (check.length == 0) {
            res.status(400).send("One of the ids is not in db");
            return;
        }
    }

    try {
        await event.addEvent( req, organID );
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
exports.patchAevent = async function ( req, res ) {
    const eventID = req.params.id;
    console.log("eventID is , ", eventID);

    const currentDate = new Date();

    if (req.headers["x-authorization"] == undefined) {
        res.status.send("Unauthorized");
        return;
    }

    // check if userid is same as organizer id
    const userID = await event.getUserIDViaAuth(req.headers["x-authorization"]);
    const organizerID = await event.getOrganizerID(eventID);

    console.log("userID is , ", userID);
    console.log("organizerID is , ", organizerID)

    if (organizerID.length == 0) {
        res.status(404).send("event no exist");
        return;
    }

    if (userID.length == 0) {
        res.status(404).send("can't find user");
        return;
    }

    if (userID[0].id != organizerID) {
        res.status(403).send("Forbidden");
        return;
    }

    //check if event exists
    const checkEvent = await event.eventIDCheck(eventID);
    if (checkEvent.length == 0) {
        res.status(404).send("event not found");
        return;
    }

    console.log("currentDate is ", currentDate);
    console.log("paramsDate is ", Date(req.body.date));
    console.log(Date(currentDate) > (req.body.date));

    if (req.body.date != undefined) {
        if (Date(currentDate) > req.body.date) {
            res.status(400).send("date must not be in past");
            return;
        }
    }

    const allCategories = await event.getCategory(req, res);
    let categoryList = [];

    for (i = 0; i < allCategories.length; i++) {
        categoryList.push(allCategories[i].categoryId)
    }

    console.log("allCategories is ", categoryList);
    console.log("req.body.categoryIds is ", req.body.categoryIds)
    if (req.body.categoryIds != undefined) {
        for (i = 0; i < req.body.categoryIds.length; i++) {
            if (categoryList.includes(req.body.categoryIds[i]) == false) {
                res.status(404).send("no category found");
                return;
            }
        }
    }

    try {
        await event.patchAevent(req, res, eventID)
        res.status(200).send("edit successful");
    } catch (err) {
        console.log(err)
        res.status(500).send(`ERROR getting events ${err}`);
    }
};

//DELETE EVENT
exports.deleteOneEvent = async function ( req, res ) {
    const eventID = req.params.id;
    //check x auth exists
    if (req.headers["x-authorization"] == undefined) {
        res.status(401).send("Unauthorized");
        return;
    }

    //check user id equal to oraganizer id via x auth
    const userID = await event.getUserIDViaAuth(req.headers["x-authorization"]);
    const organizerID = await event.getOrganizerID(eventID);
    console.log("userID is ", userID);
    console.log("organizerID is ", organizerID);

    if (organizerID.length == 0) {
        res.status(404).send("event no exist");
        return;
    }

    if (userID.length == 0) {
        res.status(404).send("can't find user");
        return;
    }

    if (userID[0].id != organizerID) {
        res.status(403).send("Forbidden");
        return;
    }

    // check if event exists
    const eventCheck = await event.eventIDCheck(eventID);
    if (eventCheck.length == 0) {
        res.status(404).send("event not found");
        return;
    }

    try {
        await event.deleteEvent(eventID);
        res.status(200).send("ok");
    } catch (err) {
        console.log(err)
        res.status(500).send(`ERROR getting events ${err}`);
    }
}


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

//GET attendees
exports.getAllAttendees = async function ( req, res ) {
    console.log("\nRequest to get all attendees.....");
    const eventID = req.params.id;
    console.log(req.headers["x-authorization"]);
    let userID = ""
    // get user id via auth
    // get organizer id via event
    //check if userid equals organizer id
    if (req.headers["x-authorization"] != undefined) {
        console.log("I went in here ");
        const userID = await event.getUserIDViaAuth["x-authorization"];
    }
    const organizerID = await event.getOrganizerID(eventID);


    try {
        const result = await event.getAttendees(eventID, userID, organizerID);
        if (result.length == 0) {
            res.status(404).send("No such event exists");
        // } else if (req.headers["x-authorization"] == undefined) {
        //     res.status(401).send("No X-Authorization header is given");
        } else {
            res.status(200).send(result);
        }
    } catch (err) {
        console.log(err)
        res.status(500).send(`ERROR getting events ${err}`);
    }
}

//POST event attendees
exports.postEventAttendees = async function (req, res) {
    // console.log("\nRequest to post attendees.....");
    const eventID = req.params.id;
    const eventChekcer = await event.eventIDCheck(eventID);
    const userID = await event.getUserIDViaAuth(req.headers["x-authorization"]);
    // console.log("user id is ", userID[0].id);

    if (eventChekcer.length == 0) {
        res.status(404).send("Not Found");
        return;
    } if (req.headers["x-authorization"] == undefined) {
        res.status(401).send("Unauthorized");
        return;
    }

    // const auth = await event.Authenticate(userID);
    // console.log("auth token is ", auth)

    // check if row exists then send 403

    const checkUserinAttendee = await event.checkAttendees(eventID, userID[0].id);
    // console.log("checkUserinAttendee is ", checkUserinAttendee);

    if (checkUserinAttendee.length != 0) {
        res.status(403).send("You already in");
        return;
    }

    const currentDate = new Date();
    const eventDate = await event.checkDate(eventID)
    if (currentDate < eventDate) {
        res.status(403).send("date already past");
        return;
    }

    try {
        await event.postAttendees(eventID, userID, eventDate);
        res.status(201).send("added")
    } catch (err) {
        console.log(err)
        res.status(500).send(`ERROR getting events ${err}`);
    }
};

// DELETE event attendees
exports.deleteEventAttendees = async function ( req, res ) {
    const eventId = req.params.id;
    console.log(req.headers["x-authorization"])
    if (req.headers["x-authorization"] == undefined) {
        res.status(401).send("Unauthorized")
        return;
    }
    const userID = await event.getUserIDViaAuth(req.headers["x-authorization"]);
    if (userID.length == 0) {
        res.status(401).send("User token does not match")
        return;
    }
    //REMEMBER TO CHECK DATE
    console.log("userID in deleteeventateendees is ", userID[0])
    const checkEvent = await event.eventIDCheck(eventId);
    const organizerID = await event.getOrganizerID(eventId);
    const currentDate = new Date();
    const eventDate = await event.checkDate(eventId);
    console.log("userID in delete atten is ", userID)
    console.log("userID in delete atten is ", userID[0])
    const auth = await event.Authenticate(userID[0].id);

    console.log("auth is ", auth);

   if (auth[0].auth_token != req.headers["x-authorization"]) {
        res.status(401).send("xauth does not match token")
        return;
   } if (currentDate > eventDate) {
        res.status(403).send("event has already past");
        return;
   }

    console.log("userID is ", userID[0].id);
    console.log("organizerID is ", organizerID);
    if (checkEvent.length == 0) {
        res.status(404).send("Not found");
        return;
    }
    // } if (userID[0].id != organizerID) {
    //     res.status(403).send("Forbidden");
    //     return;
    // }

    const checkAttendeeStatus = await event.getAttendeeStatus(eventId, userID[0].id);
    console.log("eventId is ", eventId);
    console.log("userID[0].id is ", userID[0].id);
    console.log("checkAttendeeStatus is ", checkAttendeeStatus)
    if (checkAttendeeStatus.length == 0) {
        res.status(403).send("attendence does not exist");
        return;
    } if (checkAttendeeStatus[0].attendance_status_id == 3) {
        res.status(403).send("You have been rejected to this event");
        return;
    }

    try {
        await event.deleteAttendee(eventId, userID[0].id);
        res.status(200).send("ok");
    } catch (err) {
        console.log(err)
        res.status(500).send(`ERROR trying to edit user ${err}`);
    }

};

//PATCH EVENT ATTENDEES
exports.patchEventAttendees = async function (req, res) {
    //check if x auth exists
    const eventID = req.params.id1;
    const userID = req.params.id2;
    if (req.headers["x-authorization"]) {
        res.status(401).send("x auth no exists");
        return;
    }

    //check if event exists
    const checkEvent = await event.eventIDCheck(eventID);
    if (checkEvent.length == 0) {
        res.status(404).send("can't find event");
        return;
    }

    //get organizer id
    const organizerID = await event.getOrganizerID(eventID);
    //check user id = oraganizer id
    console.log("organizerID is ", organizerID);
    if (userID != organizerID) {
        res.status(403).send("Forbidden");
        return;
    } if (req.body.status == undefined) {
        res.status(400).send("please enter a status.");
        return;
    } if (req.body.status != "accepted" && req.body.status != "pending" && req.body.status != "rejected") {
        res.status(400).send("Bad request");
        return;
    }

    try {

        res.status(200).send("ok");
    } catch (err) {
        console.log(err)
        res.status(500).send(`ERROR trying to edit user ${err}`);
    }
}

//PUT EVENT IMAGE
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
    let organizerID = await event.getOrganizerID(eventID);
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

//GET EVENT IMAGE
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



