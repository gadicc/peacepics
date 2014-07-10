if (Meteor.isClient) {

	Router.map(function() {
		this.route('settings');
	});

	Template.settings.helpers({
		'user': function() {
			return Meteor.user();
		}
	});

	Template.settings.events({
		'change #inputLocation': function(event, tpl) {
			var location = $(event.target).val();
			Meteor.users.update(Meteor.userId(), {
				$set: { 'profile.location': location }
			});
      Meteor.call('checkLocation', location);
		}
	})

	saveUserPic = function(f) {
		console.log(f);
		console.log(f.csFile);
		var pic = mink.url(f.csFile);
		Meteor.users.update(Meteor.userId(), {
			$set: { 'profile.pic': pic }
		});
	}
}