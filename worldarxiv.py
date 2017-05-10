#!/usr/bin/python3

"""
Pull data from arxiv and prepare it to be displayed on a map
Use ADS to get affiliation information.
Use Google Geocode to get coordinates
"""
import ads, googlemaps
import requests
from tqdm import tqdm

ads.config.token = open('ads.key').readline().rstrip()
gmaps = googlemaps.Client(key=open('gmaps.key').readline().rstrip())

options = ["new", "current"] # 'current' needs more work
archives = ["astro-ph", # getting author affiliations only works for astro-ph
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

AFFNOTFOUND    = 'Affiliation Not Found.'
COORDSNOTFOUND = 'Coordinates Not Found.'

def scrapeArxivData(archive='astro-ph', option='new', limit=200):
	"""
	Scrape arxiv.

	Parameters
	----------
	archive : string, one of astro-ph, cond-mat, cs, gr-qc, etc..
	option  : string, one of 'new' or 'current'
	limit   : int, limit the number of papers we get from arxiv

	Returns
	-------
	dictionary: {'ids', 'titles', 'authors'}
	"""

	from bs4 import BeautifulSoup as parse
	res = requests.get("https://arxiv.org/list/" + archive + "/" + option)
	print("arXiv responded with:", res.status_code)
	page = parse(res.content, 'html.parser')
	entries = page.find_all('div', {'class': 'meta'})
	ids = page.find_all('span', {'class': 'list-identifier'})

	arxivids = []
	titles = []
	authorsbypaper = []

	papers = []

	for i, arxivid in enumerate(ids):
		entry = entries[i]
		title = entry.find('div', {'class': 'list-title'})
		title.span.extract()

		authors = entry.find('div', {'class': 'list-authors'})
		authors.span.extract()

		papers.append({
			'id': arxivid.a.text[6:],  # trim the leading 'arxiv:'
			'title': title.text[2:-1], # trim the leading '\n ' and trailing '\n'
			'authors': [a.text for a in authors.findChildren()]
		})

	return papers[:limit]


def queryArxiv(arxivId):
	url = "http://export.arxiv.org/api/query?id_list={}".format(arxivId)

	return AFFNOTFOUND

def getADSQueriesLeft():
	"""
	Stupidly get the number of queries left by making a query.
	The way to get it without making a query doesn't seem to work.
	https://ads.readthedocs.io/en/latest/#rate-limit-usage
	"""
	q = ads.SearchQuery(q='star')
	q.next()
	return q.response.get_ratelimits()['remaining']


def getAuthorAffiliation(arxivAuthor, arxivId):
	"""
	Takes an author and looks them up on ADS to get their affiliation
	`arxivAuthor` is the string of the author's name as arxiv formats it

	0. TODO: Check that arxiv doesn't have the affiliation first
	1. query ADS. filter by field first.
	2. if query gives 0 results, query without filter
		(we filter because some names will return thousands of results)
	3. take the affiliation from the most recent publication and work down the list like that if the data is missing

	"""

	# ADS takes author:"last, first middle"
	# Need to go from arxiv's format to ADS's format.
	# For example 'J. M. Fedrow' needs to become "Fedrow, J M"
	author = list(map(lambda s: s.replace('.', ''), arxivAuthor.split(' ')))
	adsauthor = ', '.join([author[-1]] + [' '.join(author[:len(author)-1])])

	# check with arxiv before wasting an api call to ADS (we get 5000 a day)
	affiliation = queryArxiv(arxivId)
	if affiliation is not AFFNOTFOUND:
		return affiliation

	# check with ADS
	results = ads.SearchQuery(
		q='author:"{}"'.format(adsauthor),
		fl=['aff', 'author', 'title', 'pubdate'],
		sort='pubdate'
	)
	results = list(results)

	for result in results:
		try:
			lastname = author[-1]
			lastnames = [list(map(lambda s: s.replace('.', '').replace(',',''), a.split(' ')))[0] for a in result.author]
			affiliation = result.aff[lastnames.index(lastname)]
			if affiliation is '-': # ADS will return '-' if it has no affiliation for a paper
				affiliation = AFFNOTFOUND
		except (ValueError, IndexError) as e:
			affiliation = AFFNOTFOUND

		if affiliation is not AFFNOTFOUND:
			break

	return affiliation

def getMapCoords(affiliation):
	"""
	Takes an affiliation and shoves it into google's geocode api to get lat/long
	"""
	coords = gmaps.geocode(affiliation)
	if len(coords) is not 0:
		coords = coords[0]['geometry']['location']
		return coords
	return COORDSNOTFOUND

def resolveNewArticles(papers):
	"""
	Find affiliations and coordinates of papers.
	A paper's coordinates is the coordinates of the first author's institution.
	If we can't find the first author's institution, use the second author's, then third, etc.
	"""
	for paper in tqdm(papers):
		for author in paper['authors']:
			affiliation = getAuthorAffiliation(author, paper['id'])
			if affiliation is not AFFNOTFOUND:
				break
		paper['affiliation'] = affiliation
		coords = getMapCoords(affiliation)
		paper['coords'] = coords

	return papers

if __name__ == "__main__":
	papers = scrapeArxivData(limit=10)
	papers = resolveNewArticles(papers)
	for paper in papers:
		print(paper['coords'])