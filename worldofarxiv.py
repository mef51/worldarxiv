#!/usr/bin/python3

"""
Pull data from arxiv and prepare it to be displayed on a map
Use ADS to get affiliation information.
"""
import ads
import requests
from tqdm import tqdm
ads.config.token = open('ads.key').readline().rstrip()

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

AFFNOTFOUND = 'Affiliation Not Found.'

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

	# I'd prefer this data format
	# papers = []
	# 	papers.append({
	# 		'id':,
	# 		'title':,
	# 		'authors':,
	# 	})

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
	pass

def resolveNewArticles(papers):
	"""
	Find affiliations and coordinates of papers.
	A paper's coordinates is the coordinates of the first author's institution.
	If we can't find the first author's institution, use the second author's, then third, etc.
	"""
	papers['affiliations'] = []
	papers['coords'] = []
	for i, paperid in enumerate(tqdm(papers['ids'])):
		for author in papers['authors'][i]:
			affiliation = getAuthorAffiliation(author, paperid)
			if affiliation is not AFFNOTFOUND:
				break
		papers['affiliations'].append(affiliation)
		coords = getMapCoords(affiliation)
		papers['coords'].append(coords)
	return papers


if __name__ == "__main__":
	papers = scrapeArxivData()
	papers = resolveNewArticles(papers)

	# damage check
	for i, paperid in enumerate(papers['ids']):
		print(paperid, papers['affiliations'][i])
