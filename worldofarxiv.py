#!/usr/bin/python3

"""
Pull data from arxiv and prepare it to be displayed on a map
Use ADS to get affiliation information.
"""
import ads
ads.config.token = open('ads.key').readline().rstrip()

options = ["new", "current"] # current needs more work
archives = ["astro-ph",
	"cond-mat",
	"cs",
	"gr-qc",
	"hep-ex",
	"hep-lat",
	"hep-ph",
	"hep-th",
	"math",
	"math-ph",
	"nlin",
	"nucl-ex",
	"nucl-th",
	"physics",
	"q-bio",
	"q-fin",
	"quant-ph",
	"stat"]

def scrapeArxivData(archive='astro-ph', option='new'):
	import requests
	from bs4 import BeautifulSoup as parse
	"""
	Scrape arxiv.

	`archive` : string, one of astro-ph, cond-mat, cs, gr-qc, etc..
	`option` : string, one of 'new' or 'current'
	"""
	res = requests.get("https://arxiv.org/list/" + archive + "/" + option)
	print(res.status_code)
	page = parse(res.content, 'html.parser')
	entries = page.find_all('div', {'class': 'meta'})
	ids = page.find_all('span', {'class': 'list-identifier'})

	arxivids = []
	titles = []
	authorsbypaper = []

	for arxivid in ids:
		arxivids.append(arxivid.a.text[6:]) # trim the leading 'arxiv:'

	for entry in entries:
		title = entry.find('div', {'class': 'list-title'})
		title.span.extract()
		titles.append(title.text[2:-1]) # trim the leading '\n ' and trailing '\n'

		authors = entry.find('div', {'class': 'list-authors'})
		authors.span.extract()
		authorsbypaper.append([a.text for a in authors.findChildren()])

	return {"ids": arxivids, "titles": titles, "authors": authorsbypaper}

def getAffiliation(arxivAuthor):
	"""
	Takes an author and looks them up on ADS to get their affiliation
	`arxivAuthor` is the string of the author's name as arxiv formats it

	1. query ADS. filter by field first.
	2. if query gives 0 results, query without filter
		(we filter because some names will return thousands of results)
	3. take the affiliation from the most recent publication and work down the list like that if the data is missing

	"""

	results = ads.SearchQuery(q='author:"lancaster, lachlan"',
		fl=['aff', 'author', 'year', 'title'],
		sort="year")

	affiliation = results[0].aff[results[0].author.index('Lancaster, Lachlan')]
	return affiliation


import numpy as np
print(np.array(scrapeArxivData()['authors']))
