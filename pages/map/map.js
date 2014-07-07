if (Meteor.isClient) {

	Router.map(function() {
		this.route('map');
	});

	gmapInitted = new ReactiveDict();
	gmapInitted.set('initted', false);

	GoogleMaps.init(
    {
        'sensor': true, //optional
//	        'key': 'MY-GOOGLEMAPS-API-KEY', //optional
//	        'language': 'de' //optional
    }, 
    function(){
    	gmapInitted.set('initted', true);
    }
	);

	Template.map.rendered = function() {
		this.initHandle = Deps.autorun(function() {
			if (!gmapInitted.get('initted'))
				return;

			console.log('go!', document.getElementById('map-canvas'));

		  var mapOptions = {
		      zoom: 9,
		      mapTypeId: google.maps.MapTypeId.MAP
		  };
		  map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions); 
		  map.setCenter(new google.maps.LatLng(32, 35));		
		});
	}

	Template.map.destroyed = function() {
		this.initHandle.stop();
	}
}