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

	var datadir = 'data';
	var datafile = getDate() + '.json';
	request(datadir + '/' + datafile).then(function(response){
		var papers = JSON.parse(response);
		var unresolvedCount = 0;
		for(var paper of papers){
			if(typeof(paper.coords) == 'string'){
				unresolvedCount++;
			} else {
				lng = paper.coords.lng;
				lat = paper.coords.lat;
			}
		}
		console.log(unresolvedCount + '', 'unresolved papers out of', papers.length + '')
	});
}).call(this)
