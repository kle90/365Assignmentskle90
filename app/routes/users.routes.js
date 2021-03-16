const events = require('../controllers/users.controller');

module.exports = function (app) {
    app.route(app.rootUrl + '/events')
        .get(events.sendAllEvents);

};
