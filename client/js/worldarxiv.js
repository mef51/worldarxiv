(function() {
	var datadir = 'data';
	var datafile = getDate() + '.json';
	request(datadir + '/' + datafile).then(function(response){
		var papers = JSON.parse(response);
		displayPapers(papers);
	}, function(reason){
		console.log(reason);
		displayPapers({});
	});

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

	function addFilterInterface(map){
		L.control.custom({
			position: 'topleft',
			content: '<button type="button">Wahazzaaa</button>'
		}).addTo(map);
	}

	function displayPapers(papers){
		var worldmap = L.map('worldmap').setView([30, 10], 3);
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

		addFilterInterface(worldmap);

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

			request('../popup.html').then(function(popupRes){
				var popupTemplate = eval('`' + popupRes + '`');
				console.log([lat, lng]);
				var marker = L.marker([lat, lng]).addTo(worldmap).bindPopup(popupTemplate, {
					maxWidth: 500
				});

				// apply filters
				filters = ['interf*', 'circular', 'polari*', 'orion*'];
				var markerElement = marker._icon;
				for(filter of filters){
					var re = new RegExp(filter, 'gi');
					if(re.test(title)){
						markerElement.classList.add('blinking')
					}
				}

				marker.on('mouseover', function (e) {
					this.openPopup();
				});
				marker.on('click', function (e) {
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
		console.log(unresolvedCount + '', 'unresolved papers out of', papers.length + '')
	}

}).call(this)
