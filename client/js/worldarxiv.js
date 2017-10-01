(function() {
	var datadir = 'data';
	var datafile = getDate() + '.json';

	// load data then display the page
	request(datadir + '/' + datafile).then(function(response){
		var papers = JSON.parse(response);
		worldarxiv.papers = papers;
		initializeFilters();
		initializeMap(papers);
	}, function(reason){
		console.log(reason);
		initializeMap({});
	});

	function initializeMap(papers){
		var worldmap = L.map('worldmap', {zoomControl: false}).setView([30, 10], 3);
		L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
			attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a>'
		}).addTo(worldmap);

		var sidebar = L.control.sidebar('sidebar', {
			position: 'left',
			closeButton: true
		});
		worldmap.addControl(sidebar);
		worldmap.on('click', function () {
			sidebar.hide();
		});

		request('../title.html').then(function(titleRes){
			var list = 'astro-ph';
			var date = prettyDate();
			L.control.custom({
				position: 'topleft',
				content : eval('`' + titleRes + '`'),
			}).addTo(worldmap);
		}, function(reason){
			console.log("Title Template load failed:");
			console.log(reason);
		});

		// plot the unresolved papers in a square like pattern in the middle of the atlantic ocean
		var unresolvedCount = 0;
		var unresolvedPos = [35, -50];
		var posIncrement = 2;
		var numRow = 10;

		papers.forEach(function(paper){
			var id          = paper.id;
			var title       = clean(paper.title);
			var affiliation = paper.affiliation;
			var authors     = paper.authors;
			var url         = getArxivUrl(paper.id);
			var lat = 0; var lng = 0;

			if(typeof(paper.coords) != 'string'){
				lat = paper.coords.lat;
				lng = paper.coords.lng;
			} else {
				var rowbumper = Math.floor((unresolvedCount%(numRow+unresolvedCount))/numRow);
				lat = unresolvedPos[0] - posIncrement*rowbumper;
				lng = unresolvedPos[1] + posIncrement*(unresolvedCount%numRow);
				unresolvedCount++;
			}

			var marker = L.marker([lat, lng]).addTo(worldmap);
			paper.marker = marker;
			request('../popup.html').then(function(popupRes){
				var popupTemplate = eval('`' + popupRes + '`');
				marker.bindPopup(popupTemplate, {
					maxWidth: 500
				});

				marker.on('mouseover', function(e) {
					this.openPopup();
				});
				marker.on('click', function(e) {
					sidebar.setContent('');
					request('../sidebar.html').then(function(sidebarRes){
						request(getArxivAPIUrl(paper.id)).then(function(arxivRes){
							var parser = new DOMParser();
							var arxivDoc = parser.parseFromString(arxivRes, "text/xml");
							var summary = arxivDoc.getElementsByTagName('summary')[0].innerHTML;
							var sidebarTemplate = eval('`' + sidebarRes + '`');
							sidebar.setContent(sidebarTemplate);
						}, function(arxivReason){
							console.log("arXiv API GET failed:");
							console.log(reason);
						});
					}, function(reason){
						console.log("Sidebar Template load failed:");
						console.log(reason);
					});
					sidebar.show();
				});
			}, function(reason){
				console.log("Popup Template load failed:");
				console.log(reason);
			});
		});
		createFilterInterface(worldmap);
		console.log(unresolvedCount + '', 'unresolved papers out of', papers.length + '')
	}

	function initializeFilters(){
		if(!localStorage.getItem('filters')) {
			var filters = {keywords: [], authors: [], affiliations: []};
			localStorage.setItem('filters', JSON.stringify(filters));
		}
		worldarxiv.filters = JSON.parse(localStorage.getItem('filters'));
	}

	function createFilterInterface(map){
		request('../filterform.html').then(function(filterRes){
			L.control.custom({
				position: 'topleft',
				content : eval('`' + filterRes + '`'),
				style   : {},
				events: {
					submit: function(e){
						e.preventDefault();
						var input = document.getElementById('newfilter');
						var newFilter = input.value;
						input.value = '';

						// save the filter
						worldarxiv.filters['keywords'].push(newFilter);
						localStorage.setItem('filters', JSON.stringify(worldarxiv.filters));

						// add the filter to the page and mark papers that match
						applyFilters(map);
					}
				}
			}).addTo(map);
			applyFilters(map);
		}, function(reason){
				console.log("Filter Form Template load failed:");
				console.log(reason);
		});
	}

	/**
	* Add the filter to the page and match it against the papers.
	* This does not save the filter to localStorage.
	*/
	function applyFilters(map){
		// remove filters
		var oldfilters = document.getElementsByClassName('filter-group');
		var n = oldfilters.length;
		for(var i = 0; i < n; i++){
			oldfilters[0].parentElement.remove();
		}

		// todo: distinguish between different kinds of filters
		var filters = worldarxiv.filters;
		var filters = filters['keywords'].concat(filters['authors'], filters['affiliations']);
		var filterResults = []; // list of {filter: 'blah', 'matches': 4, papers: []}

		// sort by most number of matches
		for(filter of filters){
			filterResults.push(testFilter(filter));
		}
		filterResults.sort(function(a, b){
			return b.matches - a.matches;
		});

		request('../filter.html').then(function(filterRes){
			filterResults.forEach(function(result){
				var filter = result.filter;
				var matches = result.matches;
				L.control.custom({
					position: 'topleft',
					content : eval('`' + filterRes + '`'),
					events: {
						click: function(e){
							e.preventDefault();
							var source = e.target.id;
							if(source == 'nummatch'){
								console.log('nummatch');
							} else if(source == 'filter'){
								// console.log('filter');
							} else if(source == 'delete'){
								var filterTypes = ['keywords', 'authors', 'affiliations'];
								testFilter(filter, true);
								filterTypes.forEach(function(type){
									var index = worldarxiv.filters[type].indexOf(filter);
									if(index > -1){
										worldarxiv.filters[type].splice(index, 1);
									}
								});
								localStorage.setItem('filters', JSON.stringify(worldarxiv.filters));

								// traverse up the tree until we find the right div then remove it
								var target = e.target;
								while(!target.parentElement.classList.contains('leaflet-control')){
									target = target.parentElement;
								}
								target.parentElement.remove();
							}
						}
					}
				}).addTo(map);
			});
		}, function(reason){
			console.log("Filter Template load failed:");
			console.log(reason);
		});
	}

	/**
	* Applies the filter to all papers and
	* Returns an object of the form:
	*	{filter: filter, matches: count, papers: papers}
	*/
	function testFilter(filter, remove=false){
		var count = 0;
		var papers = [];
		worldarxiv.papers.forEach(function(paper){
			var title         = clean(paper.title);
			var affiliation   = paper.affiliation;
			var authors       = paper.authors;
			var url           = getArxivUrl(paper.id);
			var markerElement = paper.marker._icon;

			var re = new RegExp(filter, 'gi');
			var matched = false;
			var matchClass = 'blinking'; // the css class to add if a match is found
			var fields = [title, authors.join(', '), affiliation];
			window.markerElement = markerElement;
			fields.forEach(function(field){
				if(re.test(field)){
					if(remove){
						markerElement.classList.remove(matchClass);
					} else {
						markerElement.classList.add(matchClass);
					}
					matched = true;
				}
			});
			if(matched){
				papers.push(paper);
				count++;
			}
		});
		return {filter: filter, matches: count, papers: papers};
	}

	function getDate(){
		var d = new Date();
		var year  = d.getFullYear() + '';
		var month = (d.getMonth() + 1) + ''; // getMonth() returns 0 - 11
		var day   = d.getDate() + '';

		// padding
		if (month.length == 1) { month = '0' + month }
		if (day.length == 1) { day = '0' + day }

		return year + month + day;
	}

	function prettyDate(){
		var d = new Date();
		// set the date to the nearest friday if it's the weekend
		if(d.getDay() == 0){ // sunday
			d.setDate(d.getDate() - 2);
		} else if (d.getDay() == 6){ // saturday
			d.setDate(d.getDate() - 1);
		}
		var months = ['January','February','March','April','May','June','July',
			'August','September','October','November','December'];
		var days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

		return `${days[d.getDay()-1]} ${months[d.getMonth()]}  ${d.getDate()}, ${d.getFullYear()}`;
	}

	function wrap(content, tag, style){
		if(style == undefined){
			style = '';
		}
		return `<${tag} class="${style}">${content}</${tag}>`;
	}

	function clean(string){
		fixes = { // replace key with val
			'<': '&lt',
			'>': '&gt'
		}
		for(var fix in fixes){
			string = string.replace(fix, fixes[fix]);
		}
		return string
	}

	function getArxivUrl(id){
		return `https://arxiv.org/abs/${id}`
	}

	function getArxivAPIUrl(id){
		return `http://export.arxiv.org/api/query?id_list=${id}`
	}

	function getArxivPDF(id){
		return `https://arxiv.org/pdf/${id}.pdf`;
	}

}).call(this)
