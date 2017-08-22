//
// request.js
//
// Dead Simple XHR Request Library
//
// @author Collin Glass <collinglass@gmx.com>
// @copyright 2014 Collin Glass
// @license BSD-3 <https://raw.github.com/collinglass/request/master/LICENSE>
// @version 0.0.3
//
function request(route, method, data, json) {
	return new Promise(function(resolve, reject){
		var xmlhttp = new XMLHttpRequest();
		if(method == null){
			method = "GET";
		}
		xmlhttp.open(method, route, true);

		if (method == "POST"){
			//Send the appropriate headers
			xmlhttp.setRequestHeader("Content-type", "application/json");
		}

		xmlhttp.onreadystatechange = function() {
			if ( xmlhttp.readyState == 4 ) {
				if (xmlhttp.status == 200) {
					if (json == true) {
						resolve(JSON.parse(xmlhttp.responseText))
					} else {
						resolve(xmlhttp.responseText)
					}
				} else if (xmlhttp.status == 400) {
					if (json == true) {
						reject(JSON.parse(xmlhttp.responseText))
					} else {
						reject(xmlhttp.responseText)
					}
				} else {
					if (json == true) {
						reject(JSON.parse(xmlhttp.responseText))
					} else {
						reject(xmlhttp.responseText)
					}
				}
			}
		}
		xmlhttp.send(data);
	});
}
