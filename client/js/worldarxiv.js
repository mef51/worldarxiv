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

	var datadir = 'data';
	var datafile = getDate() + '.json';
	request(datadir + '/' + datafile).then(function(response){
		var papers = JSON.parse(response);
		displayPapers(papers);
	});

	function displayPapers(papers){
		var worldmap = L.map('worldmap').setView([30, -20], 3);
		L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
			attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
		}).addTo(worldmap);

		// plot the unresolved papers in a square like pattern in the middle of the atlantic ocean
		var unresolvedCount = 0;
		var unresolvedPos = [10.1, -41.2];
		var posIncrement = 2;
		var numRow = 5;

		for(var paper of papers){
			var id          = wrap(paper.id, 'b');
			var title       = wrap(paper.title, 'i');
			var affiliation = paper.affiliation;
			var authors     = paper.authors;

			var popuptext = [id, title, affiliation].join('<br>');

			if(typeof(paper.coords) != 'string'){
				var lat = paper.coords.lat;
				var lng = paper.coords.lng;

				L.marker([lat, lng]).addTo(worldmap).bindPopup(popuptext);
			} else {
				unresolvedCount++;
				console.log(  Math.floor(((unresolvedCount%numRow)+unresolvedCount) / numRow)   );
				var lat = unresolvedPos[0] + posIncrement * Math.floor(((unresolvedCount%numRow)+unresolvedCount) / numRow);
				var lng = unresolvedPos[1] + posIncrement*(unresolvedCount%numRow);

				L.marker([lat, lng]).addTo(worldmap).bindPopup(popuptext);
			}
		}
		console.log(unresolvedCount + '', 'unresolved papers out of', papers.length + '')
	}

}).call(this)
