/**
 * Full Court Shots is a shot viewer using data from the Dribbble api <http://dribbble.com/api>
 * Data is retrieved using the jQuery plugin Jribbble <http://tylergaw.com/lab/jribbble>
 *
 * Author: Tyler Gaw <http://tylergaw.com>
 * copyright: Fuck if I know, I'm a web designer not a lawyer.
 *
 */

// I use cookies to remember the list and player that the user was last viewing. 
// I'm thoughtful. I love Unicorns.
var CookieMonster = {};

// This is where the shit goes down like the Titanic.
var FCS = function ()
{
	var internal = {
		
		// The available list types
		listTypes: ['popular', 'everyone', 'debuts', 'players', 'followed'],
		
		// The current list being shown
		list: 'everyone',
		
		// What player we are currently working with
		player: 'tylergaw',
		
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
			'autoDimensions': false,
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
		$.fancybox.close();
		internal.container.html('');
		internal.checkHash();
		internal.requestShots();
	};
	
	// Check for a hash to see if the list was set externally
	internal.checkHash = function ()
	{
		if (window.location.hash)
		{
			var hash   = window.location.hash.replace('#', ''),
				parts  = [],
				list   = null,
				player = null;
			
			// We need to check for any "/" chars in the hash.
			// Those indicate that we are looking for shots that
			// require a piece of user inputted data
			if (hash.indexOf('/') !== -1)
			{
				parts = hash.split('/');
				list = parts[0];
				
				switch (parts.length)
				{
				case 2:
					internal.player = parts[1];
					break;
				case 3:
					internal.player = parts[2];
				}
								
				internal.createInput(list, internal.player);
			}
			else
			{
				list = hash;
				
				// Remove any leftover input
				$('#list-control form').remove();
			}
			
			// Now check that that list is valid
			if ($.inArray(list, internal.listTypes) !== -1)
			{
				internal.list = internal.listTypes[$.inArray(list, internal.listTypes)];
				
				// Select the correct item in the list
				$('#list-select option[value="' + list + '"]').attr('selected', 'selected');
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
		var list,
			player;
		
		if (CookieMonster.get('fcs.list'))
		{
			list = CookieMonster.get('fcs.list');
			if ($.inArray(list, internal.listTypes) !== -1)
			{
				internal.list = internal.listTypes[$.inArray(list, internal.listTypes)];
				
				// Select the correct item in the list
				$('#list-select option[value="' + list + '"]').attr('selected', 'selected');
			}
			
			// Retrieve any stored player ID
			if (CookieMonster.get('fcs.player'))
			{
				player = CookieMonster.get('fcs.player');
				internal.player = player;
			}
			
			// If the stored list is one that requires an input, create it now
			if (list === 'followed' || list === 'players')
			{
				internal.createInput(list, player);
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
			function (e)
			{
				var value  = $(this).val(),
					option = $(this).find('option[value=' + value + ']');
				
				if (option.hasClass('needs-input'))
				{
					internal.createInput(value);
				}
				else
				{
					$('#list-control form').remove();
					window.location.hash = value;
					CookieMonster.set('fcs.list', value, 30);
				}
			}
		);
		
		// for any user-inputted data we'll grab it during a form submission
		$('#list-control form').live('submit', internal.submitHandler);
		
		$(document).scroll(function ()
		{
			$('#controls li').removeClass('active');
		});
	};
	
	// Create a text input for the provided type
	// @param STRING list - The 
	// @param OPTIONAL STRING value - The value of the created input
	internal.createInput = function (list, value)
	{
		var input = null,
			html  = [],
			qualifier = '';
		
		$('#list-control form').remove();
		
		if (list === 'followed')
		{
			qualifier = ' by ';
		}
		
		html.push('<form action="#" method="GET">');
		html.push(qualifier + '<input type="text" name="player" value="' + internal.player + '">');
		html.push('<input type="hidden" name="list" value="' + list + '"></form>');
		
		$('#list-select').after(html.join(''));
		
		input = $('#list-control input:first');
		
		// Check for a sent value and set it
		if (value)
		{
			input.val(value);
		}
		else if (internal.player)
		{
			input.val(internal.player);
			input.closest('form').submit();
		}
	};
	
	// Handle the submission of any inputs that are needed for lists
	internal.submitHandler = function ()
	{
		var player = $(this).find('input[name=player]').val(),
			list   = $(this).find('input[name=list]').val();
		
		// NOTE: This is not so elegant. Hard-coded condition.
		if (list === 'followed')
		{
			window.location.hash = list + '/by/' + player;
		}
		else
		{
			window.location.hash = list + '/' + player;
		}
		
		CookieMonster.set('fcs.list', list, 30);
		CookieMonster.set('fcs.player', player, 30);
		return false;
	};
	
	// Make a new request to the Dribbble API to retrieve the next page of shots
	internal.requestShots = function ()
	{
		var method       = null,
			identifier   = null,
			requestCount = 0,
			currentShots = [],
		
			makeRequest = function ()
			{
				var canMakeRequest = true,
					requestTimeout = null;
				
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
					
					// Determine which Jribbble method to used based off the list
					// and what identifier will be sent with the request
					switch (internal.list)
					{
					case 'followed':
						method     = 'getShotsThatPlayerFollows';
						identifier = internal.player; 
						break;
					case 'players':
						method     = 'getShotsByPlayerId';
						identifier = internal.player;
						break;
					default:
						method     = 'getShotsByList';
						identifier = internal.list;
					}
					
					$.jribbble[method](identifier, 
						function (data)
						{
							var pagesAtATime = internal.pagesAtATime;
							clearTimeout(requestTimeout);

							// If we haven't set a total number of pages yet, do so
							if (internal.totalPages === null)
							{
								internal.totalPages = data.pages;
							}
							
							// We need to determine if the number of pages of data
							// is greater than the pagesAtATime default we've set
							// If it isn't we need to update the pagesAtATime to
							// reflect the lower number
							if (internal.totalPages < pagesAtATime)
							{
								pagesAtATime = internal.totalPages;
							}

							// Add the requested shots to our shots ARRAY
							internal.shots = internal.shots.concat(data.shots);
							currentShots   = currentShots.concat(data.shots);

							// If we've made the number of requests we need to make
							// at a time, continue on. If not, make another request
							if (requestCount === pagesAtATime)
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
					
					// Create a timeout in case the request fails
					requestTimeout = setTimeout(internal.requestTimeout, 10000);
				}
				else
				{
					// No more to show.
					internal.loader.hide();
				}
			};
		
		makeRequest();
	};
	
	// If a request hangs, kill it! kill it with fire!!
	internal.requestTimeout = function ()
	{
		internal.loader.hide();
		window.stop();
		alert('This Boss Hog just timed out.\nTry refreshing, or check any player name you might have put in.');
	};
	
	// Build the html for each shot and append the set to the DOM
	internal.parseShots = function (shots)
	{	
		var items = [];
		
		$.each(shots, 
			function (i, shot)
			{
				var playerUrlParts = shot.player.url.split('/'),
					fcsPlayerUrl   = '#players/' + playerUrlParts[playerUrlParts.length - 1],
					alt            = [],
					item           = null;
				
				// Create the alt tag for use within fancy box
				alt.push('<a href=' + shot.url + '>' + shot.title + '</a>');
				alt.push('<br> by <strong>' + shot.player.name  + '</strong>:');
				alt.push(' <a href=' + fcsPlayerUrl + '>Shots</a> | <a href=' + shot.player.url + '>Profile</a>');
				
				item = $('<li />', {
					'id': 'shot-' + shot.id,
					html: $('<a />', {
						'href': shot.image_url,
						'rel': 'shot',
						html: $('<img />', {
							'src': shot.image_teaser_url,
							'alt': alt.join('')
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
	
	// Mick Jagger says, "Start me up!"
	this.init();
};

// Remember that thoughtfullness from above? Here's where I make it happen.
// I remember because I actually listen to you. I'll even remember our anniversary AND your mother's birthday.
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
