const event = require("../models/events.model")

exports.sendAllEvents = async function ( req, res ) {
    console.log("\nRequest to list all events.....");
    try {
        const result = await event.getEvents();
        res.status( 200 ).send( result );
    } catch( err ) {
        res.status( 500 ).send( `ERROR getting events ${err}` );
    }
};