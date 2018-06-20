(function() {
	var datadir = 'data';
	var currentDate = getAnnouncementDate();
	var datafile = currentDate + '.json';
	var currentPopup = null; // so we can close it whenever we want
	var popuptimers = []; // so we can keep it open whenever we want
	var list = 'astro-ph';
	var lists = ['astro-ph', 'cond-mat', 'cs', 'math', 'physics']
	var day = 0;
	var maxDays = 7;

	var katexoptions = {
		delimiters: [
			{left: "$", right: "$", display: false},
			{left: "$$", right: "$$", display: true},
			{left: "\\[", right: "\\]", display: true},
			{left: "\\(", right: "\\)", display: false}
		]
	};

	loadData(datafile); // load several day's data and display today's asap

	// scheme:
	// data = [{'file': '2012.json', 'papers': papers}];

	// pre load the last `maxDays` days of data
	function loadData(datafile){
		worldarxiv.data = {}
		var dayshift = 0;

		function requestFile(i, datafile){
			request(datadir + '/' + list + '/' + datafile).then(function(response){
				var papers = JSON.parse(response);
				worldarxiv.data[i] = {'file': datafile, 'papers': papers};
				if(i == 0){
					setDay(0); // display today's data asap
				}

				dayshift--;

				if(i+1 < maxDays){
					requestFile(i+1, getAnnouncementDate(dayshift) + '.json');
				}
			}, function(reason){
				dayshift--;
				requestFile(i, getAnnouncementDate(dayshift) + '.json');
			});
		}

		requestFile(0, datafile);
	}

	/**
	* Set the day's data to be displayed.
	* day = 0 is today, 1 is the day before, etc.
	*/
	function setDay(day){
		var papers = worldarxiv.data[day]['papers'];
		initializeFilters();
		initializeMap(papers);
	}

	function changeDay(dayshift){
		if(day+dayshift >= 0 && day+dayshift < maxDays) {
			day += dayshift;
		} else {
			// disable the corresponding date arrow
		}
		setDay(day);
	}

	function initializeMap(papers){
		var worldmap = null;
		if(!worldarxiv.worldmap){
			worldmap = L.map('worldmap', {zoomControl: false}).setView([30, 10], 3);
			L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
				attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a>',
				minZoom: 3
			}).addTo(worldmap);
			worldarxiv.worldmap = worldmap;

			// setup layer group
			worldmap.markers = L.layerGroup().addTo(worldmap);

			var sidebar = L.control.sidebar('sidebar', {
				position: 'left',
				closeButton: true
			});
			worldarxiv.sidebar = sidebar;
			worldmap.addControl(sidebar);
			worldmap.on('click', function () {
				sidebar.hide();
			});
			worldmap.on('popupopen', function(popupEvent){
				currentPopup = popupEvent.popup;
				for(popuptimer of popuptimers){
					window.clearTimeout(popuptimer);
				}
			});
			worldmap.on('mousemove', function(moveEvent){
				var elements = moveEvent.originalEvent.path;
				var mouseOnPopup = false; // is the mouse on the popup or not?
				for(var e of elements){
					if(e.classList && e.classList.length != 0){
						for(var domclass of e.classList){
							if(domclass.indexOf('popup') > -1 || domclass.indexOf('marker') > -1){
								mouseOnPopup = true;
							}
						}
					}
				}
				// if the mouse moves fast enough then multiple timeouts get scheduled
				// so we have to keep a list of timers so that we can cancel all of them
				if(!mouseOnPopup && currentPopup && currentPopup.isOpen()){
					popuptimers.push(setTimeout(function(){
						worldmap.closePopup(currentPopup);
					}, 200));
				} else if(mouseOnPopup){
					for(popuptimer of popuptimers){
						window.clearTimeout(popuptimer);
					}
				}
			});
		} else {
			worldmap = worldarxiv.worldmap;
			worldmap.markers.clearLayers();
			currentPopup = null
		}

		// load title
		request('../title.html').then(function(titleRes){
			var date = prettyDate(day);
			$('#titleContainer').remove();
			L.control.custom({
				id: 'titleContainer',
				position: 'topleft',
				content : eval('`' + titleRes + '`'),
			}).addTo(worldmap);
			$('#titleContainer').insertBefore($('.leaflet-top.leaflet-left').children()[0]);

			$('.datecntrl').click(function(e){
				if(e.target.id == 'dateprev'){
					changeDay(1);
				} else if (e.target.id == 'datenext'){
					changeDay(-1);
				}
			});
		}, function(reason){
			console.log("Title Template load failed:", reason);
		});

		// plot the unresolved papers in a square like pattern in the middle of the atlantic ocean
		var unresolvedCount = 0;
		var unresolvedPos = [35, -50];
		var posIncrement = 2;
		var numRow = 10;

		var pinnedLocations = []; // temporarily track where markers are to overlaps
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

				// if this position has already been marked, shift the longitude slightly
				var failsafe = 0; // i don't know what toString does to some floats
				while(pinnedLocations.indexOf([lat,lng].toString()) > -1 && failsafe < 100){
					lng += 0.2;
					failsafe++;
				}
				pinnedLocations.push([lat,lng].toString());
			} else {
				// lay unresolved papers out in rows of `numRow`
				var rowbumper = Math.floor((unresolvedCount%(numRow+unresolvedCount))/numRow);
				lat = unresolvedPos[0] - posIncrement*rowbumper;
				lng = unresolvedPos[1] + posIncrement*(unresolvedCount%numRow);
				unresolvedCount++;
			}

			var marker = L.marker([lat, lng]);//.addTo(worldmap);
			worldmap.markers.addLayer(marker);
			paper.marker = marker;
			request('../popup.html').then(function(popupRes){
				var popupTemplate = eval('`' + popupRes + '`');
				marker.bindPopup(popupTemplate, {
					autoPanPaddingTopLeft: [175,130],
					maxWidth: 500
				});

				marker.on('mouseover', function(e) {
					this.openPopup();
					renderMathInElement(document.body, katexoptions);
				});
				marker.on('click', function(e) {
					sidebar.setContent('');
					request('../sidebar.html').then(function(sidebarRes){
						request(getArxivAPIUrl(paper.id)).then(function(arxivRes){
							var abstract = parseArxivAbstract(arxivRes);
							var sidebarTemplate = eval('`' + sidebarRes + '`');
							sidebar.setContent(sidebarTemplate);
							renderMathInElement(document.body, katexoptions);
						}, function(arxivReason){
							console.log("arXiv API GET failed:", reason);
						});
					}, function(reason){
						console.log("Sidebar Template load failed:", reason);
					});
					sidebar.show();
				});
			}, function(reason){
				console.log("Popup Template load failed:", reason);
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
		var form = document.getElementsByClassName('filter-form')[0];

		if(!form){
			request('../filterform.html').then(function(filterRes){
				L.control.custom({
					position: 'topleft',
					content : eval('`' + filterRes + '`'),
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
			}, function(reason){
					console.log("Filter Form Template load failed:", reason);
			});
		}
		applyFilters(map);
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
				var matchingPapers = result.papers;
				L.control.custom({
					position: 'topleft',
					content : eval('`' + filterRes + '`'),
					events: {
						click: function(e){
							e.preventDefault();
							var source = e.target.id;
							if(source == 'nummatch' || source == 'filter'){
								// close any open popups
								map.closePopup(currentPopup);

								var sidebar = worldarxiv.sidebar;
								sidebar.setContent('');
								request('../filterresults.html').then(function(filterResultsRes){
									var templates = filterResultsRes.split(/<!--:[^>]*-->/gi);
									var sidebarContent = eval('`' + templates[0] + '`');

									matchingPapers.forEach(function(paper){
										var title       = clean(paper.title);
										var affiliation = paper.affiliation;
										var authors     = paper.authors;
										var url         = getArxivUrl(paper.id);
										var abstract    = '';
										sidebarContent += eval('`' + templates[1] + '`');
									});
									sidebar.setContent(sidebarContent);
									sidebar.show();
									renderMathInElement(document.body, katexoptions);

									$('.filterresult').click(function(e) {
										// fly to marker and load that result's abstract into the sidebar
										var i = $('.filterresult').index(this);
										var paper = matchingPapers[i];
										var duration = 400; // ms
										map.flyTo(paper.coords, 7, {duration: 2});

										if (!$('.abstract').eq(i).is(':visible')){
											if(paper.abstract){
												$('.abstract').slideUp(duration);
												$('.abstract').eq(i).html(paper.abstract).slideDown(duration);
												renderMathInElement(document.body, katexoptions);
											} else {
												// load the abstract
												var loadIcon = `
													<i style="width:100%;" class="fa fa-cog fa-spin fa-lg fa-fw"></i>`;
												$('.abstract').slideUp(duration);
												$('.abstract').eq(i).html(loadIcon).slideDown('fast');

												request(getArxivAPIUrl(paper.id)).then(function(arxivRes){
													var abstract = parseArxivAbstract(arxivRes);
													paper.abstract = abstract; // cache the result
													$('.abstract').eq(i).fadeOut('fast', function(){
														$('.abstract').eq(i).html(abstract).slideDown(duration);
														renderMathInElement(document.body, katexoptions);
													});
												}, function(arxivReason){
													console.log("arXiv API GET failed:", reason);
												});
											}
										} else {
											$('.abstract').slideUp(duration);
										}
									});

								}, function(reason){
									console.log("Filter Results Template load faield:", reason);
								});
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
			console.log("Filter Template load failed:", reason);
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
		worldarxiv.data[day]['papers'].forEach(function(paper){
			var title         = clean(paper.title);
			var affiliation   = paper.affiliation;
			var authors       = paper.authors;
			var url           = getArxivUrl(paper.id);
			var markerElement = paper.marker._icon;

			var flag = 'gi'; // global, ignore case
			if(numUpperCase(filter) > 1){
				flag = 'g';
			}

			var re = new RegExp(filter, flag);
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

	/**
	* Gets the date of the last announcement
	*/
	function getAnnouncementDate(day){
		var d = new Date();
		if(day)
			d.setDate(d.getDate() + day);

		var year  = d.getFullYear() + '';
		var month = (d.getMonth() + 1) + ''; // getMonth() returns 0 - 11
		var day   = d.getDate() + '';

		// padding
		if (month.length == 1) { month = '0' + month }
		if (day.length == 1) { day = '0' + day }

		return year + month + day;
	}

	function prettyDate(day){
		var dstr = worldarxiv.data[day]['file'];
		var d = new Date(dstr.slice(0,4), dstr.slice(4,6)-1, dstr.slice(6,8));

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

	function numUpperCase(s){
		return s.length - s.replace(/[A-Z]/g, '').length
	}

	function parseArxivAbstract(arxivRes){
		var parser = new DOMParser();
		var arxivDoc = parser.parseFromString(arxivRes, "text/xml");
		var summary = arxivDoc.getElementsByTagName('summary')[0].innerHTML;
		return summary;
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
