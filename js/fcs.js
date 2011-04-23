var CookieMonster = {};

// namespace
var FCS = function ()
{
	var internal = {
		
		// The available list types
		listTypes: ['popular', 'everyone', 'debuts'],
		
		// The current list being shown
		list: 'everyone',
		
		// The page of shots that has been loaded
		page: 0,
		
		// The number of pages to load each time a request is made
		pagesAtATime: 3,
		
		// The total number of pages for the current set of shots
		totalPages: null,
		
		// Storage for all the shot objects
		shots: [],
		
		// @member OBJ container - jQuery object
		container: null,
		
		// @member OBJ loader - jQuery object
		loader: null,
		
		// Options that will be passed to the fancybox plugin
		fancyboxOpts: {
			'titleShow': true,
			'titlePosition': 'inside',
			'centerOnScroll': true,
			'overlayOpacity': 0.85,
			'overlayColor': '#000',
			'transitionIn': 'none',
			'transitionOut': 'none',
			'showCloseButton': false,
			'speedIn': 100,
			'speedOut': 100,
			'changeSpeed': 100,
			'changeFade': 100
		}
	};
	
	// Create the shot container and append it to the DOM,
	// kick off the initial request
	this.init = function ()
	{
		internal.container = $('<ul />', {'id': 'shots'});
		$('body').append(internal.container);
		
		internal.loader = $('#loader');
		
		if ("onhashchange" in window)
		{
			window.onhashchange = internal.newListSetup;
		}
		
		$(document).endlessScroll(
			{
				bottomPixels: 450,
				fireOnce: true,
				fireDelay: 600,
				callback: internal.requestShots
			}
		);
		
		internal.prepareControls();
		internal.newListSetup();
	};
	
	// Each time a new list is selected, either through a hash change
	// or if a new list is selected in the picker thingymabob
	internal.newListSetup = function ()
	{
		internal.page = 0;
		internal.totalPages = null;
		internal.shots = [];
		internal.container.html('');
		internal.checkHash();
		internal.requestShots();
	};
	
	// Check for a hash to see if the list was set externally
	internal.checkHash = function ()
	{
		if (window.location.hash)
		{
			var hash = window.location.hash.replace('#', '');
			if ($.inArray(hash, internal.listTypes) !== -1)
			{
				internal.list = internal.listTypes[$.inArray(hash, internal.listTypes)];
				
				// Select the correct item in the list
				$('#list-select option[value="' + hash + '"]').attr('selected', 'selected');
			}
		}
		else
		{
			internal.checkCookie();
		}
	};
	
	// See if they've been here before and changed the list
	internal.checkCookie = function ()
	{
		var list;
		
		if (CookieMonster.get('fcs.list'))
		{
			list = CookieMonster.get('fcs.list');
			if ($.inArray(list, internal.listTypes) !== -1)
			{
				internal.list = internal.listTypes[$.inArray(list, internal.listTypes)];
				
				// Select the correct item in the list
				$('#list-select option[value="' + list + '"]').attr('selected', 'selected');
			}
		}
	};
	
	// Bind events for showing/hiding the view and info controls
	internal.prepareControls = function ()
	{
		$('#controls li > a').click(
			function ()
			{
				var parent = $(this).parent();
				parent.toggleClass('active').siblings().removeClass('active');
			}
		);
		
		$('#list-select').change(
			function ()
			{
				window.location.hash = $(this).val();
				CookieMonster.set('fcs.list', $(this).val(), 30);
			}
		);
		
		$(document).scroll(function ()
		{
			$('#controls li').removeClass('active');
		});
	};
	
	// Make a new request to the Dribbble API to retrieve the next page of shots
	internal.requestShots = function ()
	{
		var requestCount = 0,
			currentShots = [],
		
			makeRequest = function ()
			{
				var canMakeRequest = true;
				
				internal.page = internal.page += 1;
				requestCount  = requestCount += 1;
				
				if (internal.totalPages !== null)
				{
					canMakeRequest = (internal.page <= internal.totalPages);
				}
				
				if (canMakeRequest)
				{
					// display loader
					internal.loader.show();
					
					$.jribbble.getShotsByList(internal.list, 
						function (data)
						{
							// If we haven't set a total number of pages yet, do so
							if (internal.totalPages === null)
							{
								internal.totalPages = data.pages;
							}

							// Add the requested shots to our shots ARRAY
							internal.shots = internal.shots.concat(data.shots);
							currentShots   = currentShots.concat(data.shots);

							// If we've made the number of requests we need to make
							// at a time, continue on. If not, make another request
							if (requestCount === internal.pagesAtATime)
							{
								internal.parseShots(currentShots);
							}
							else
							{
								makeRequest();
							}
						}, 
						{page: internal.page, per_page: 30}
					);
				}
				else
				{
					// No more to show.
					internal.loader.hide();
				}
			};
		
		makeRequest();
	};
	
	// Build the html for each shot and append the set to the DOM
	internal.parseShots = function (shots)
	{	
		var items = [];
		
		$.each(shots, 
			function (i, shot)
			{
				var imgLoader = new Image(),
					
					alt = '<a href=' + shot.url + '>' + shot.title + '</a> by <a href=' + shot.player.url + '>' + shot.player.name + '</a>',
					
					item = $('<li />', {
						'id': 'shot-' + shot.id,
						html: $('<a />', {
							'href': shot.image_url,
							'rel': 'shot',
							html: $('<img />', {
								'src': shot.image_teaser_url,
								'alt': alt
							})
						})
					}
				);
				
				items.push(item);
			}
		);

		// We call the append method with apply() which allows us
		// to append an ARRAY of elements to the DOM.
		internal.container.append.apply(internal.container, items);
		$('a[rel=shot]').fancybox(internal.fancyboxOpts);
		
		internal.loader.hide();
	};
	
	// Returning this allows.. some technical term I don't know
	this.init();
};

CookieMonster = {
	
	// Create a new or update a current cookie
	// @param STRING name - The name of the cookie
	// @param STRING value - The value of the cookie
	// @param STRING days - The number of days the cookie should last
	set: function (name, value, days)
	{
		var date,
			expires;
			
		if (days)
		{
			date = new Date();
			date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
			expires = '; expires=' + date.toGMTString();
		}
		else
		{
			expires = '';
		}
		
		document.cookie = name + '=' + value + expires + '; path=/';
	},
	
	// Read a cookie by its name
	// @param STRING name - The name of the cookie to read
	get: function (name)
	{
		var nameEQ = name + '=',
			cookies = document.cookie.split(';'),
			cookie,
			i;
						
		for (i = 0; i < cookies.length; i += 1)
		{
			cookie = cookies[i];
			
			// If the first character is a space, remove it
			while (cookie.charAt(0) === ' ')
			{
				cookie = cookie.substring(1, cookie.length);
			}
			
			if (cookie.indexOf(nameEQ) === 0)
			{
				return cookie.substring(nameEQ.length, cookie.length);
			}			
		}
		
		return null;
	},
	
	// Erase a cookie by setting its expiration date to a time in the past
	// @param STRING name - The name of the cookie
	unset: function (name)
	{
		this.set(name, '', -1);
	}
};

$(document).ready(function ()
{
	FCS();
});
