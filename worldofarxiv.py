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
	"""
	Scrape arxiv.

	Parameters
	----------
	archive : string, one of astro-ph, cond-mat, cs, gr-qc, etc..
	option  : string, one of 'new' or 'current'

	Returns
	-------
	dictionary: {'ids', 'titles', 'authors'}
	"""

	import requests
	from bs4 import BeautifulSoup as parse
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

def getAuthorAffiliation(arxivAuthor, arxivId):
	"""
	Takes an author and looks them up on ADS to get their affiliation
	`arxivAuthor` is the string of the author's name as arxiv formats it

	0. Check that arxiv doesn't have the affiliation first
	1. query ADS. filter by field first.
	2. if query gives 0 results, query without filter
		(we filter because some names will return thousands of results)
	3. take the affiliation from the most recent publication and work down the list like that if the data is missing

	"""

	# ADS takes author:"last, first middle"
	# Need to go from arxiv's format to ADS's format.
	# For example 'J. M. Fedrow' needs to become "Fedrow, J M"
	author = list(map(lambda s: s.replace('.', ''), arxivAuthor.split(' ')))
	adsauthor = ', '.join([author[-1]] + [' '.join(author[:len(author)-1])]) # fuck yeah lmao

	results = ads.SearchQuery(
		q='author:"{}"'.format(adsauthor),
		fl=['aff', 'author', 'year', 'title'],
		sort="year"
	)
	results = list(results)

	affiliation = results[0].aff[results[0].author.index(adsauthor)]
	return affiliation

def getMapCoords(affiliation):
	pass


def resolveNewArticles(papers):
	"""
	Find affiliations and coordinates of papers.
	A paper's coordinates is the coordinates of the first author's institution.
	If we can't find the first author's institution, use the second author's, then third, etc.
	"""
	papers['affiliation'] = []
	papers['coords'] = []
	for i, paperid in enumerate(papers['ids']):
		for author in papers['authors'][i]:
			affiliation = getAuthorAffiliation(author, paperid)
			if affiliation is not '':
				print(affiliation)
				break
		papers['affiliation'].append(affiliation)
		coords = getMapCoords(affiliation)
	return papers


if __name__ == "__main__":
	papers = scrapeArxivData()
	papers = resolveNewArticles(papers)
