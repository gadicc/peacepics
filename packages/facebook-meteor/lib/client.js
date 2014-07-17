facebook = {
	collections: {
		meta: new Meteor.Collection('facebook_meta'),
		feeds: new Meteor.Collection('facebook_feeds'),
		pages: new Meteor.Collection('facebook_pages'),
	}
}

var injected = Injected.obj('facebook-meteor');
facebook.appCredentials = {
	appId: injected.appId
}
