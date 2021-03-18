const user = require("../models/users.model")

exports.createUser = async function ( req, res ) {
    console.log("\nRequest to register a user.....");
    const Fname = req.body.firstName;
    const Lname = req.body.lastName;
    const UserEmail = req.body.email;
    const Pword = req.body.password;
    try {
        const result = await user.registerUser( Fname, Lname, UserEmail, Pword );
        res.status( 201 ).send( {userID: result.insertid} );
    } catch( err ) {
        res.status( 500 ).send( `ERROR getting events ${err}` );
    }
};

exports.getUserInfo = async function ( req, res ) {
    console.log("\nRequest to register a user.....");
    const ID = req.params.id;
    //const token = req.body.token;
    try {
        const result = await user.getAUser( ID );
        if ( result.length == 0 ) {
            res.status( 404 ).send( "User not found!" )
        } else {
            res.status( 200 ).send( result );
        }
    } catch ( err ) {
        res.status( 500 ).send( `ERROR getting user ${ID}: ${err}` );
    }
};

exports.getUserImage = async function ( req, res ) {

}