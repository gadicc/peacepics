Pics = new Meteor.Collection('pics');
var fbPages = {
	"AniBoherBaShalom": "663130193756030",
	"ArabsAndJews": "417366255018379"
};
var PICS_INIT_ROWS = 4;
PICS_INIT_ROWS = 50;  // TODO infinite scroll

if (Meteor.isClient) {

	Router.map(function() {
		this.route('home', {
			path: '/',
			onBeforeAction: function() {
				Router.go('/AniBoherBaShalom');
			}
		});

		this.route('*', {
			path: '/:pageName',
			template: 'fbPage',
			onBeforeAction: function() {
				if (!fbPages[this.params.pageName])
					return false;
				Session.set('fbPageName', this.params.pageName);
				Session.set('fbPageId', fbPages[this.params.pageName]);
			}
		});
	});

	Template.fbPage.events({
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

	// http://www.mredkj.com/javascript/numberFormat.html#addcommas
	function addCommas(nStr) {
		nStr += '';
		x = nStr.split('.');
		x1 = x[0];
		x2 = x.length > 1 ? '.' + x[1] : '';
		var rgx = /(\d+)(\d{3})/;
		while (rgx.test(x1)) {
			x1 = x1.replace(rgx, '$1' + ',' + '$2');
		}
		return x1 + x2;
	}

	Template.fbPage.helpers({
		'page': function(name) {
			var current = Session.get('fbPageName');
			return name ? current == name : current;
		},
		'pics': function() {
			return Pics.find({ pageId: Session.get('fbPageId') }, {
				limit: Session.get('picsLimit'),
				sort: { createdAt: -1 }
			});
		},
		'tagline': function() {
			var doc = facebook.collections.pages.findOne(Session.get('fbPageId'));
			var count = doc ? addCommas(doc.likes) : 0;
			var page = Session.get('fbPageName');

			switch(page) {
				case 'AniBoherBaShalom':
					return mf('tagline_AniBoherBaShalom', { count: count },
						'{count} people chose peace.');
				case 'ArabsAndJews':
					return mf('tagline_ArabsAndJews', { count: count },
						'{count} people refused to be enemies');
			}
		},
		'fbLink': function() {
			var page = facebook.collections.pages.findOne(Session.get('fbPageId'));
			if (!page) return '';

			return '<a href="'+page.link+'" target="_TOP">'
				+ mf('fblink',
				{ pageLink: '<span>' + page.name + '</span>'},
				'Visit "{pageLink}" on Facebook.  Like us.  Share us.' );
		},
		'count': function() {
			//var doc = Stats.findOne('pics');
			var doc = facebook.collections.pages.findOne(Session.get('fbPageId'));
			return doc ? addCommas(doc.likes) : 0;
		},
		bg: function() {
			return 'background: rgb('
				+ Math.round(Math.random() * 255) + ','
				+ Math.round(Math.random() * 255) + ','
				+ Math.round(Math.random() * 255) + ');'
		}
	});

	Template.fbPage.rendered = function() {
		var parent = this.$('#gallery')[0];
		parent._uihooks = {
			insertElement: function(node, next) {
				var $node = $(node);
				$node.addClass('zeroWidth');
				parent.insertBefore(node, next);
				window.setTimeout(function() {
					$node.removeClass('zeroWidth');
				}, 0);
			}
		}
	}

	subs = {};
	Deps.autorun(function() {
		subs.pics = Meteor.subscribe('pics', Session.get('picsLimit'));
	});

	Session.set('windowWidth', $(window).width());
	$(document).ready(function() {
		Deps.autorun(function() {
			var IDEAL_WIDTH = 180;
			var sheet = document.getElementById('picStyle').sheet;
			var windowWidth = Session.get('windowWidth');
			var cols = Math.round(windowWidth / IDEAL_WIDTH);
			var width = windowWidth / cols;
			var height = width * 0.75;

			if (!Session.get('picsLimit'))
				Session.set('picsLimit', cols * PICS_INIT_ROWS);

			if (sheet.rules.length)
					sheet.deleteRule(0);
			sheet.insertRule('div.pic { width: ' + width + 'px; height: ' + height + 'px;', 0);
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

	Meteor.subscribe('pages');
}

if (Meteor.isServer) {

	Meteor.publish('pics', function(limit) {
		var options = {
			sort: { createdAt: -1 },
			limit: limit
		};
		return Pics.find({}, options);
	});

	Meteor.publish('pages', function() {
		return facebook.collections.pages.find({}, {
			fields: { likes: 1, name: 1, link: 1 }
		});
	});

	Meteor.publish('stats', function() {
		var self = this;

		/*
		var picsCount = 0;
		var picsInitted = true;
		var picsHandle = facebook.collections.feeds.find().observeChanges({
	    added: function (id, doc) {
	      picsCount++;
	      if (!picsInitted && doc.picture)
	        self.changed("stats", 'pics', {count: picsCount});
	    },
	    removed: function (id, doc) {
	    	if (doc.picture) {
		      picsCount--;
		      self.changed("stats", 'pics', {count: picsCount});
		    }
	    }
	  });
		*/

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

//		picsInitted = false;
//	  self.added("stats", 'pics', {count: picsCount});
		usersInitted = false;
	  self.added("stats", 'users', {count: usersCount});

	  self.ready();

	  self.onStop(function () {
//	    picsHandle.stop();
	    usersHandle.stop();
	  });

	});

	facebook.on('feed', function(doc) {
		console.log('onFeed');
		console.log(doc);
		if (doc.type == 'photo' && (doc.to || !(doc.status_type && doc.status_type == 'shared_story'))) {
			Pics.upsert(doc.object_id, {
				_id: doc.object_id,
				pageId: doc.id.split('_')[0],
				createdAt: new Date(doc.created_time),
				//url: doc.picture
				url: 'https://graph.facebook.com/' + doc.object_id + '/picture?type=album'
			});
		}
	});

	if (process.env.NODE_ENV && process.env.NODE_ENV == "production")
	Meteor.setTimeout(function() {
		console.log('go');
		for (page in fbPages) {
			facebook.feed.get(fbPages[page]);
			facebook.page.get(fbPages[page], null, true);
		}
	}, 30000);

	/*
	var count = Pics.find({pageId: "417366255018379"}).count();
	if (!count) {
		facebook.collections.feeds.find({_id: /^417366255018379/}).forEach(facebook.hooks.feed[0]);
	}
	*/

}
