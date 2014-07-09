/* Mapping related server-side code */

// google maps
var gm = Meteor.require('googlemaps');
gm.geocode = Async.wrap(gm.geocode);

// if the location doesn't exist, add it
locations.check = function(name) {
	if (!this.get(name)) {
	  var res = gm.geocode(name);
	  var data = res.results[0];
	  data.reqName = name;
	  Locations.insert(data);
	}
}

Meteor.methods({

	// force a locations.check() call from the client
  'checkLocation': function(location) {
    if (this.userId) {
      locations.check(location);
    }
  }

});

AccountsExtra.hooks.onCreateUser.checkLocation = function(user, serviceArgs) {
  locations.check(user.profile.location);
}

// Publish profile (name, location, pic) of all users
Meteor.publish('users', function() {
  return Meteor.users.find({}, { fields: { profile: 1 }} );
});

// Publish required data for each location
Meteor.publish('locations', function() {
  return Locations.find({}, { fields: {
    reqName: 1, formatted_address: 1,
    'geometry.location.lat': 1, 'geometry.location.lng': 1
  } });
});
