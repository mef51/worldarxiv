(function() {

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

	function wrap(content, tag){
		return '<' + tag + '>' + content + '</' + tag + '>';
	}

	function getArxivUrl(id){
		return 'https://arxiv.org/abs/' + id
	}

	var datadir = 'data';
	var datafile = getDate() + '.json';
	request(datadir + '/' + datafile).then(function(response){
		var papers = JSON.parse(response);
		displayPapers(papers);
	}, function(reason){
		console.log(reason);
		displayPapers({});
	});

	function displayPapers(papers){
		var worldmap = L.map('worldmap').setView([30, 10], 3);
		L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
			attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a>'
		}).addTo(worldmap);

		// plot the unresolved papers in a square like pattern in the middle of the atlantic ocean
		var unresolvedCount = 0;
		var unresolvedPos = [35, -50];
		var posIncrement = 2;
		var numRow = 10;

		for(var paper of papers){
			var id          = wrap(paper.id, 'b');
			var title       = wrap(paper.title, 'i');
			var affiliation = paper.affiliation;
			var authors     = paper.authors;
			var url         = getArxivUrl(paper.id);
			id = '<a href="' + url + '" target=0>' + id + '</a>'

			var popuptext = [id, title, affiliation].join('<br />');
			var lat = lng = 0;

			if(typeof(paper.coords) != 'string'){
				lat = paper.coords.lat;
				lng = paper.coords.lng;
			} else {
				var rowbumper = Math.floor((unresolvedCount%(numRow+unresolvedCount))/numRow);
				lat = unresolvedPos[0] - posIncrement*rowbumper;
				lng = unresolvedPos[1] + posIncrement*(unresolvedCount%numRow);
				unresolvedCount++;
			}

			var marker = new worldarxiv.HoverMarker([lat, lng]).addTo(worldmap).bindPopup(popuptext, {
				showOnMouseOver: true
			});
		}
		console.log(unresolvedCount + '', 'unresolved papers out of', papers.length + '')
	}

}).call(this)
