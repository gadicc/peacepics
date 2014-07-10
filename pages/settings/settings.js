if (Meteor.isClient) {

	Router.map(function() {
		this.route('settings');
	});

	Template.settings.helpers({
		'user': function() {
			return Meteor.user();
		}
	});

	saveUserPic = function(f) {
		console.log(f);
		console.log(f.csFile);
		var pic = mink.url(f.csFile);
		Meteor.users.update(Meteor.userId(), {
			$set: { 'profile.pic': pic }
		});
	}
}