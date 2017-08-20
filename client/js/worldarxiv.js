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
			var id          = wrap(paper.id, 'span', 'arxivlink');
			var title       = wrap(clean(paper.title), 'span', 'title');
			var affiliation = paper.affiliation;
			var authors     = paper.authors;
			var url         = getArxivUrl(paper.id);
			id = `<a href="${url}" target=0>${id}</a>`

			var popuptext = [title, id, authors, affiliation].join('<br />');
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

			var marker = L.marker([lat, lng]).addTo(worldmap).bindPopup(popuptext, {
				maxWidth: 500
			});
			marker.on('mouseover', function (e) {
				this.openPopup();
			});
		}
		console.log(unresolvedCount + '', 'unresolved papers out of', papers.length + '')
	}

}).call(this)
