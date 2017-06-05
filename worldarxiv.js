

count = 0;
for(paper of papers){
	if(typeof(paper.coords) == 'string'){
		count++;
	} else {
		lng = paper.coords.lng;
		lat = paper.coords.lat;
	}
}
