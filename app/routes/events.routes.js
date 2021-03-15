const events = require('../controllers/events.controller');

module.exports = function (app) {
    app.route(app.rootUrl + '/events')
        .get(events.sendAllEvents);

};
