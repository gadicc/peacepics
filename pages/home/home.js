Pics = new Meteor.Collection('pics');
var PICS_INIT_LIMIT = 1000;

if (Meteor.isClient) {

	Router.map(function() {
		this.route('home', {
			path: '/'
		});
	});

	Template.home.events({
		'click #add': function(event, tpl) {
			Session.set('picsLimit', Session.get('picsLimit') + 1);
			Pics.insert({
				createdAt: new Date()
			});
			/*
			Deps.afterFlush(function() {
				Meteor.setTimeout(function() {
					var x = $('.masonry_container');
					x.masonry();
					x.masonry('reloadItems');
					x.masonry('layout');
				}, 500);
			});
			*/
		}
	});

	Stats = new Meteor.Collection('stats');
	Meteor.subscribe('stats');

	Template.home.helpers({
		'pics': function() {
			return Pics.find({}, {
				limit: Session.get('picsLimit'),
				sort: { createdAt: -1 }
			});
		},
		'count': function() {
			var doc = Stats.findOne('pics');
			return doc ? doc.count : 0;
		},
		bg: function() {
			return 'background: rgb('
				+ Math.round(Math.random() * 255) + ','
				+ Math.round(Math.random() * 255) + ','
				+ Math.round(Math.random() * 255) + ');'
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
	Session.setDefault('picsLimit', PICS_INIT_LIMIT);
	Deps.autorun(function() {
		subs.pics = Meteor.subscribe('pics', Session.get('picsLimit'));
	});

	Session.set('windowWidth', $(window).width());
	$(document).ready(function() {
		Deps.autorun(function() {
			var IDEAL_WIDTH = 150;
			var sheet = document.getElementById('picStyle').sheet;
			var windowWidth = Session.get('windowWidth');
			var cols = Math.round(windowWidth / IDEAL_WIDTH);
			var width = windowWidth / cols;
			if (sheet.rules.length) sheet.deleteRule(0);
			sheet.insertRule('div.pic { width: ' + width + 'px; height: ' + width + 'px;', 0);
		});
	});
	window.onresize = function() {
		Session.set('windowWidth', $(window).width());
	}
	Meteor.setInterval(function() {
		// detect if scrollbar added
		var width = $(window).width();
		if (Session.get('windowWidth') !== width)
			Session.set('windowWidth', width);
	}, 100);
}

if (Meteor.isServer) {

	Meteor.publish('pics', function(limit) {
		//return Pics.find();
		var self = this;
		var handle = Meteor.users.find().observeChanges({
			added: function(id, doc) {
				if (doc.profile.pic)
					self.added('pics', 'u_'+id, {
						createdAt: doc.createdAt,
						url: doc.profile.pic
					});
			}
		});
	});

	Meteor.publish('stats', function() {
		var self = this;

		var picsCount = 0;
		var picsInitted = true;
		var picsHandle = Pics.find().observeChanges({
	    added: function (id) {
	      picsCount++;
	      if (!picsInitted)
	        self.changed("stats", 'pics', {count: picsCount});
	    },
	    removed: function (id) {
	      picsCount--;
	      self.changed("stats", 'pics', {count: picsCount});
	    }
	  });

	  var usersCount = 0;
	  var usersInitted = true;
		var usersHandle = Meteor.users.find().observeChanges({
	    added: function (id) {
	      usersCount++;
	      if (!usersInitted)
	        self.changed("stats", 'users', {count: usersCount});
	    },
	    removed: function (id) {
	      usersCount--;
	      self.changed("stats", 'users', {count: usersCount});
	    }
	  });

		picsInitted = false;
	  self.added("stats", 'pics', {count: picsCount});
		usersInitted = false;
	  self.added("stats", 'users', {count: usersCount});

	  self.ready();

	  self.onStop(function () {
	    picsHandle.stop();
	    usersHandle.stop();
	  });

	});
}
