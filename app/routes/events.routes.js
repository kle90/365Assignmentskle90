const events = require('../controllers/events.controller');

module.exports = function (app) {
    app.route(app.rootUrl + '/events')
        .get(events.sendAllEvents);

    app.route(app.rootUrl + '/events/categories')
        .get(events.getAllcategories);

    app.route(app.rootUrl + '/events/:id')
        .get(events.getAevent);

    app.route(app.rootUrl + '/events')
        .post(events.postEvents);

    app.route(app.rootUrl + '/events/:id/attendees')
        .post(events.postEventAttendees);

    app.route(app.rootUrl + '/events/:id/attendees')
        .delete(events.deleteEventAttendees);

    app.route(app.rootUrl + '/events/:id/attendees')
        .get(events.getAllAttendees);

    app.route(app.rootUrl + '/events/:id/image')
        .put(events.putEventImage);

    app.route(app.rootUrl + '/events/:id/image')
        .get(events.getEventImage);

    app.route(app.rootUrl + '/events/:id')
        .patch(events.patchAevent);

    app.route(app.rootUrl + '/events/:id')
        .delete(events.deleteOneEvent);

    app.route(app.rootUrl + '/events/:id1/attendees/id2')
        .patch(events.patchEventAttendees);

};
