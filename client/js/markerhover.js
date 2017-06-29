// courtesy of http://jsfiddle.net/sowelie/3JbNY/
var MyCustomMarker = L.Marker.extend({

    bindPopup: function(htmlContent, options) {

		if (options && options.showOnMouseOver) {

			// call the super method
			L.Marker.prototype.bindPopup.apply(this, [htmlContent, options]);

			// unbind the click event
			this.off("click", this.openPopup, this);

			// bind to mouse over
			this.on("mouseover", function(e) {

				// get the element that the mouse hovered onto
				var target = e.originalEvent.fromElement || e.originalEvent.relatedTarget;
				var parent = this._getParent(target, "leaflet-popup");

				// check to see if the element is a popup, and if it is this marker's popup
				if (parent == this._popup._container)
					return true;

				// show the popup
				this.openPopup();

			}, this);

			// and mouse out
			this.on("mouseout", function(e) {

				// get the element that the mouse hovered onto
				var target = e.originalEvent.toElement || e.originalEvent.relatedTarget;

				// check to see if the element is a popup
				if (this._getParent(target, "leaflet-popup")) {

					L.DomEvent.on(this._popup._container, "mouseout", this._popupMouseOut, this);
					return true;

				}

				// hide the popup
				this.closePopup();

			}, this);

		}

	},

	_popupMouseOut: function(e) {

		// detach the event
		L.DomEvent.off(this._popup, "mouseout", this._popupMouseOut, this);

		// get the element that the mouse hovered onto
		var target = e.toElement || e.relatedTarget;

		// check to see if the element is a popup
		if (this._getParent(target, "leaflet-popup"))
			return true;

		// check to see if the marker was hovered back onto
		if (target == this._icon)
			return true;

		// hide the popup
		this.closePopup();

	},

	_getParent: function(element, className) {

		var parent = element.parentNode;

		while (parent != null) {

			if (parent.className && L.DomUtil.hasClass(parent, className))
				return parent;

			parent = parent.parentNode;

		}

		return false;

	}

});

var cloudmade = L.tileLayer('http://{s}.tile.cloudmade.com/{key}/997/256/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: 'Map data &copy; 2011 OpenStreetMap contributors, Imagery &copy; 2011 CloudMade',
    key: 'BC9A493B41014CAABB98F0471D759707'
});

var map = L.map('map')
    .setView([50.5, 30.51], 15)
    .addLayer(cloudmade);

var markers = new L.FeatureGroup();

function getRandomLatLng(map) {
    var bounds = map.getBounds(),
        southWest = bounds.getSouthWest(),
        northEast = bounds.getNorthEast(),
        lngSpan = northEast.lng - southWest.lng,
        latSpan = northEast.lat - southWest.lat;

    return new L.LatLng(
    southWest.lat + latSpan * Math.random(),
    southWest.lng + lngSpan * Math.random());
}

function populate() {
    for (var i = 0; i < 10; i++) {
        var marker = new MyCustomMarker(getRandomLatLng(map));
        marker.bindPopup("<p>Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Donec odio. Quisque volutpat mattis eros. Nullam malesuada erat ut turpis. Suspendisse urna nibh, viverra non, semper suscipit, posuere a, pede.</p><p>Donec nec justo eget felis facilisis fermentum. Aliquam porttitor mauris sit amet orci. Aenean dignissim pellentesque.</p>", {
            showOnMouseOver: true
        });
        markers.addLayer(marker);
    }
    return false;
}

map.addLayer(markers);

populate();
