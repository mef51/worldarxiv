feb. 2017:
==========
http://www.unm.edu/~jagross/2016/09/06/predicting_arxiv_submissions.html
http://nbviewer.jupyter.org/github/jarthurgross/arxiv-submission-modeling/blob/master/arxiv-modeling.ipynb
http://paperscape.org/
https://arxiv.org/help/robots
https://github.com/karpathy/arxiv-sanity-preserver

getting affiliations:
https://orcid.org/0000-0002-7970-7855
https://arxiv.org/a/0000-0002-7970-7855.html
https://arxiv.org/help/author_identifiers

google group ask:
https://groups.google.com/forum/#!topic/arxiv-api/MSlbzNMlbNM


Hi everyone,

I'm trying to build a visualisation that displays new submissions on a world map.
When I made my arxiv account my affiliation was a required field, so I assumed that this information would be accessible for all authors.
However I've been reading through the API docs and previous topics here, and in several locations it is stated that the affiliation is optional.

Perhaps arxiv has the affiliation of authors from the registration field stored and does not display them. But I'm not sure why this is the case.
It cannot be for privacy, because for any arbitrary paper I can just look at the PDF and the author's affiliation is always there.
Since this data is easily human-readable why not make it machine-readable?

This is a little frustrating, I can't come up with a different way to get author's affiliations reliably. There are packages that let you parse pdfs (https://github.com/metachris/pdfx)
but then I will have to resort to downloading ~100 pdfs a day and parsing them, which arxiv doesn't seem to like and I don't want to pay for that bandwidth.

Will the folks developing the arxiv API expose the affiliation fields we are required to fill when we register?

Best,
Mohammed
=============================

april 1 2017:

ADS has this author service called astroperson.lis. example:
http://ads.harvard.edu/cgi-bin/search_persons.sh?cases=ignore&words=substring&fuzzy=exact&name=Elias,%20N

actually seems to have decent coverage. this could be enough to get started

==========================
april 3 2017:

ADS is not exactly fullproof. it worked once out of the four times.
What if instead I just google the author's full name + the field they are publishing in and then
always take the first link

==========================
april 25 2017:

ADSBeta might be the answer. Their API exposes affiliations
https://github.com/adsabs/adsabs-dev-api#access
https://github.com/adsabs/adsabs-dev-api/blob/master/search.md#query-parameters

For common names (like G. Yang), filtering on field (astronomy) could help.
Also, ADS isnt perfect either.

Need a robust way to get affiliations. Check for affiliations like this:
	1. Check affiliaction on arxiv
	2. Check ADS Beta
	3. Check old ADS?
	4. Check ORCID (in an ideal world this would be first but ORCID has terrible coverage)
	5. Google "author name astronomy" and scrape the first or so links lol

==============
may 4 2017:

I'd like for people to be able to add filters on the world map that persist over sessions.
ex:
	* filtering on author or institution makes a paper's symbol change to a star, and brighter color
	* filtering on a keyword adds a pulsing animation to the paper's symbol
	* paper's that don't match any filters can just be a slowly rotating diamond or something

also I bought worldarxiv.org today, to mirror arxiv.org. 17 bucks

======
may 8 2017:

* when you hover over an item the title should show up
* gonna rewrite how the papers are stored
* geocoding is what getting coordinates from addresses is called apparently
	* http://stackoverflow.com/questions/10008949/is-it-possible-to-get-an-address-from-coordinates-using-google-maps
	* https://en.wikipedia.org/wiki/Geocoding
	* http://stackoverflow.com/questions/3652951/google-maps-api-get-coordinates-of-address
	* 2500 free requests a day from Google. i'll be making ~100 a day. unless i add other mailing lists.
		* astro: ~50-100 new papers a day
		* physics: ~100 new papers/day
		* math: ~200 papers/day
		* cs: ~150/day
		* cond-mat: ~150/day
		* worst case: 600/day

======
may 10 2017:

* the `datamaps` (https://github.com/markmarkoh/datamaps) looks like a good map plugin to use

======
may 23 2017:

* data is stored in the data/ folder with format yyyymmdd.json
* this article is interesting
	* http://www.nature.com/news/data-visualization-science-on-the-map-1.17024#mapping
* also the word for 'sexy map backdrop' is 'basemap' apparently
	* you can use TileMill (maps + css as far as I can tell) to make a good looking basemap then use that in other tools
* Leaflet js http://leafletjs.com/, mobile friendly interactive maps.
* I think it's come down to leaflet and datamaps. CartoDB looks nice but its proprietary

======
june 29 2017:
* Thunderforest has some styled maps https://www.thunderforest.com/
* holy cow so many maps http://leaflet-extras.github.io/leaflet-providers/preview/
* they have a zoomable night map:
	* http://leaflet-extras.github.io/leaflet-providers/preview/#filter=NASAGIBS.ViirsEarthAtNight2012
* I might need to add katex or something for latex in paper titles
* popup on mouse hover
	* https://gis.stackexchange.com/questions/31951/how-to-show-a-popup-on-mouse-over-not-on-click
	* this is the exact behaviour i want http://jsfiddle.net/sowelie/3JbNY/

========
july 4 2017

* there are a lot of plugins that do things I wanna do: http://leafletjs.com/plugins.html
	* For example "Search & Popups" for the filtering I want to do and "Overlay animations" for the
	animating of markers I want to do
* ADS sometimes returns several affiliations separated by semicolons:
	* for example: "Astrophysics Group, Blackett Laboratory, Imperial College London, London, SW7 2AZ, UK; Department of Mathematics, Imperial College London, London, SW7 2AZ, UK; Department of Astronomy, Stockholm University, Albanova, 10691, Stockholm, Sweden"
	* this causes geocoding to fail. Fix should be to just split on semicolons

===========
july 20 2017

* it'd be nice to have the json file incrementally get updated for those times when ADS randomly gives me a 500.
	* right now if I get a 500 I have to start from the beginning

============
august 20 2017

* notes on styling the popups (use css):
	* https://stackoverflow.com/questions/12606141/how-would-i-customise-the-look-and-feel-of-the-leaflet-popup
	* https://www.mapbox.com/mapbox.js/example/v1.0.0/custom-popup-style/

* animations:
	* https://stackoverflow.com/questions/41884070/how-to-make-markers-in-leaflet-blinking
	* this could be used to make the icons fade in: http://naturalatlas.github.io/leaflet-transitionedicon/
* interface:
	* all these plugins are amazing http://leafletjs.com/plugins.html#user-interface
	* these ones in particular:
		* define custom interfaces: https://github.com/yigityuce/Leaflet.Control.Custom
		* simply add a button: https://github.com/CliffCloud/Leaflet.EasyButton
		* open a sidebar and show an abstract for example: https://github.com/turbo87/leaflet-sidebar/
			* there's a v2 that could be used for all the site's metal: https://github.com/turbo87/sidebar-v2/
		* right-click menu: https://github.com/aratcliffe/Leaflet.contextmenu
		* zoom to country: https://github.com/ahalota/Leaflet.CountrySelect/
	* this toolbar plugin could be used to define region filters:
		* http://leaflet.github.io/Leaflet.toolbar/examples/popup.html

=============
august 22 2017

* you can hit the arxiv API from the browser! This saves me a lot of bandwidth for when I want to load abstracts for example. CORS usually stops me from doing this

==============
august 30 2017
* i need to virtualenv for the nfs host
	https://stackoverflow.com/questions/7143077/how-can-i-install-packages-in-my-home-folder-with-pip

=============
sept 22 2017
* might want to implement the filter interface like this: http://odoe.net/blog/custom-leaflet-control/
