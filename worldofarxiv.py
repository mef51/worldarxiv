#!/usr/bin/python3

"""
Pull data from arxiv and prepare it to be displayed on a map
"""

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

def scrapeArxivData(archive='astro-ph', option='new')
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
