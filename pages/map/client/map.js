Router.map(function() {
	this.route('map', {
		onBeforeAction: function() {
			this.subscribe('users');
			this.subscribe('locations');
		}
	});
});

initted = new ReactiveDict();
initted.set('gmaps', false);
initted.set('richmarker', false);

// if location was added after user [was queued], dequeue
locations.added(function(doc) {
  if (userQueues[doc.reqName]) {
    _.each(userQueues[doc.reqName], function(user) {
      addUserToMap(user);
    });
    delete(userQueues[doc.ReqName]);
  }
});

/*
 * If we have the location already, add the user to the map (create a marker and add
 * it to the markerCluster), otherwise queue the user and wait for the location in
 * the observe added callback
 */
var userQueues = {};
var userMarkers = {};
function addUserToMap(user) {
  // skip users with no location
  if (!user.profile || !user.profile.location)
    return;

  var location = locations.get(user.profile.location);
  if (location) {

    var marker = user.profile.pic ? new RichMarker({
        // if there's a picture, use a RichMarker
        position: new google.maps.LatLng(location.lat + locRnd(), location.lng + locRnd()),
        content: '<div class="faceMarker"><img src="' + user.profile.pic + '" /></div>',
        anchor: new google.maps.Size(-16, 0)
    }) : new google.maps.Marker({
        // otherwise just use a regular marker
       position: new google.maps.LatLng(location.lat + locRnd(), location.lng + locRnd()),
    });

    // keep track of all markers and who they belong to
    marker._user = user;
    userMarkers[user._id] = marker;

    google.maps.event.addListener(marker, 'click', markerInfo);
    markerCluster.addMarker(marker);

  } else {

    if (!userQueues[user.profile.location])
      userQueues[user.profile.location] = [];
    userQueues[user.profile.location].push(user);

  }
}

// Randomize markers around the city center
function locRnd() {
  return (Math.random() - 0.5) / 50;
}

function markerInfo() {
    var node = $('<div style="width: 200px; height: 150px;" class="infowindow">'
      + '<p><b>' + this._user.profile.name + '</b></p>'
      + '<p>' + this._user.profile.location + '</p>'
      + '<p><img src="' + this._user.profile.pic + '" /></p>'
      + '</div>')[0];
    infowindow.setContent(node);
    infowindow.open(map, this);
}

$(document).ready(function() {
	GoogleMaps.init(
	  {
	      'sensor': true, //optional
	//	        'key': 'MY-GOOGLEMAPS-API-KEY', //optional
	//	        'language': 'de' //optional
	  }, 
	  function() {
	  	initted.set('gmaps', true);
	    jQuery.getScript("//google-maps-utility-library-v3.googlecode.com/svn/trunk/richmarker/src/richmarker-compiled.js",
	      function() {
	      	initted.set('richmarker', true);
	      }); /* richmarker init */
	  } /* gmaps init */
	);
});

Template.map.created = function() {
	this.handles = {};
}

Template.map.rendered = function() {
	var self = this;
	self.handles.gmapsInitted = Deps.autorun(function() {
		if (!(initted.get('gmaps') && initted.get('richmarker')))
			return;

	  var mapOptions = {
	      zoom: 9,
	      mapTypeId: google.maps.MapTypeId.MAP
	  };
	  map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions); 
	  map.setCenter(new google.maps.LatLng(32, 35));

		window.markerCluster = new MarkerClusterer(map);
		window.infowindow = new google.maps.InfoWindow();

	  self.handles.observe = Meteor.users.find().observe({
	    'added': function(user) {
	      addUserToMap(user);
	    },

	    'changed': function(user) {
	      if (userMarkers[user._id]) {
	        markerCluster.removeMarker(userMarkers[user._id]);
	        delete(userMarkers[user._id]);
	      }
	      _.defer(function() {
	        // Can't do method calls inside observes??
	        Meteor.call('checkLocation', user.profile.location);
	      });
	      addUserToMap(user);
	    },

	    'removed': function(user) {
	      if (userMarkers[user._id]) {
	        markerCluster.removeMarker(userMarkers[user._id]);
	        delete(userMarkers[user._id]);
	      }
	    }
	  }); /* observe */

	});
}

Template.map.destroyed = function() {
	for (key in this.handles)
		if (this.handles[key])
			this.handles[key].stop();
}
