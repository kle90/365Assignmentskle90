const user = require('../controllers/users.controller');

module.exports = function (app) {
    app.route(app.rootUrl + '/users/register')
        .post(user.createUser);

    app.route(app.rootUrl + '/users/:id')
        .get(user.getUserInfo);

    // app.route(app.rootUrl + '/users/login')
    //     .post(user.registerUser);
    //
    // app.route(app.rootUrl + '/users/logout')
    //     .post(user.registerUser);

};
