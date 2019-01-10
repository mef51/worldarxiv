worldarxiv.org
=============

In `worldarxiv.py` you can find the script that is responsible for scraping new papers from the "new" page of arxiv.org (e.g. for astro-ph this is at https://arxiv.org/list/astro-ph/new ) and packaging it into a dumb json file for the client to use.

In `client/` is the code for displaying the page at worldarxiv.org.

In order to run `worldarxiv.py` you will need API keys for google maps and the Harvard ADS service (https://ui.adsabs.harvard.edu/)

All the affiliation info from worldarxiv.org is at best a reasonable guess and shouldn't be considered always correct. The "correct" affiliation is almost always in the PDF of the actual paper. See [this issue](https://github.com/mef51/worldarxiv/issues/5) for more info.
