const user = require('../controllers/users.controller');

module.exports = function (app) {
    app.route(app.rootUrl + '/users/register')
        .post(user.createUser);

    app.route(app.rootUrl + '/users/:id')
        .get(user.getUserInfo);

    app.route(app.rootUrl + '/users/login')
        .post(user.login);

    app.route(app.rootUrl + '/users/logout')
        .post(user.logout);

    app.route(app.rootUrl + '/users/:id')
        .patch(user.editUserInfo);

    app.route(app.rootUrl + '/users/:id/image')
        .get(user.getUserImage);

    app.route(app.rootUrl + '/users/:id/image')
        .put(user.putUserImage);

    app.route(app.rootUrl + '/users/:id/image')
        .delete(user.deleteUserImage);

    // app.route(app.rootUrl + '/users/login')
    //     .post(user.registerUser);
    //
    // app.route(app.rootUrl + '/users/logout')
    //     .post(user.registerUser);

};
