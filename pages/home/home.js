Pics = new Meteor.Collection('pics');
var PICS_INIT_LIMIT = 10;

if (Meteor.isClient) {

	Router.map(function() {
		this.route('home', {
			path: '/'
		});
	});

	Template.home.events({
		'click #add': function(event, tpl) {
			Pics.insert({
				createdAt: new Date()
			});
		}
	});

	Template.home.helpers({
		'pics': function() {
			return Pics.find({}, {
				limit: PICS_INIT_LIMIT,
				sort: { createdAt: -1 }
			});
		}
	});

	Template.home.rendered = function() {
		var parent = this.$('#gallery')[0];
		parent._uihooks = {
			insertElement: function(node, next) {
				var $node = $(node);
				$node.addClass('zeroWidth');
				parent.insertBefore(node, next);
				window.setTimeout(function() {
					$node.removeClass('zeroWidth');
					console.log('remove');
				}, 0);
			}
		}
	}

	subs = {};
	subs.pics = Meteor.subscribe('pics', PICS_INIT_LIMIT);

}

if (Meteor.isServer) {

	Meteor.publish('pics', function(limit) {
		return Pics.find();
	});

}