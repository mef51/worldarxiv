#!/usr/bin/python3

"""
Pull data from arxiv and prepare it to be displayed on a map
Use ADS to get affiliation information.
Use Google Geocode to get coordinates
"""
import ads, googlemaps
import requests, json, os, time
from bs4 import BeautifulSoup as parse
from tqdm import tqdm

ads.config.token = open('ads.key').readline().rstrip()
gmaps = googlemaps.Client(key=open('gmaps.key').readline().rstrip())

options = ["new", "current"] # 'current' needs more work
archives = ["astro-ph", # getting author affiliations only works for astro-ph
	"cond-mat",
	"cs",
	# "gr-qc",
	# "hep-ex",
	# "hep-lat",
	# "hep-ph",
	# "hep-th",
	"math",
	# "math-ph",
	# "nlin",
	# "nucl-ex",
	# "nucl-th",
	"physics",
	# "q-bio",
	# "q-fin",
	# "quant-ph",
	# "stat"
	]

AFFNOTFOUND    = 'Affiliation Not Found.'
COORDSNOTFOUND = 'Coordinates Not Found.'

def scrapeArxivData(archive='astro-ph', option='new', limit=500):
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

	res = requests.get("https://arxiv.org/list/" + archive + "/" + option)
	print("arXiv responded with:", res.status_code)
	page = parse(res.content, 'html.parser')
	entries = page.find_all('div', {'class': 'meta'})
	ids = page.find_all('span', {'class': 'list-identifier'})

	# get date information from the arxiv announcement to correctly name the file
	dateline = page.find_all('div', {'class': 'list-dateline'})[0].text
	date = dateline.split(', ')[-1].split(' ') # ['d', 'monthstring', 'yy']
	months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

	filedate = '20{:02d}{:02d}{:02d}'.format(int(date[2]), months.index(date[1])+1, int(date[0])) # for 'YYYYMMDD.json'

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

	return papers[:limit], filedate


def queryArxiv(arxivId):
	"""
	Try to resolve the affiliation of an individual paper by checking arXiv
	TODO: arxiv lets you query a bunch of ids at once.. That would be better than querying one by one
	"""
	url = "http://export.arxiv.org/api/query?id_list={}".format(arxivId)
	res = requests.get(url)
	if res.status_code > 299:
		print("arxiv API says", res.status_code)
		return AFFNOTFOUND
	data = parse(res.content, 'xml').find('entry')

	title = data.find('title').text.replace('\n', '').rstrip()
	authors = list(map(lambda s: s.find('name').text, data.find_all('author')))
	if data.find('author').find('affiliation') is not None:
		affiliation = data.find('author').find('affiliation').text
	else:
		affiliation = AFFNOTFOUND

	return affiliation

def getAuthorAffiliation(arxivAuthor, maxtries=10):
	"""
	Takes an author and looks them up on ADS to get their affiliation
	`arxivAuthor` is the string of the author's name as arxiv formats it

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

	# check with ADS
	results = ads.SearchQuery(
		q='author:"{}"'.format(adsauthor),
		fl=['aff', 'author', 'title', 'pubdate'],
		sort='pubdate'
	)

	# ADS is extremely unreliable.
	attempt = 0
	while attempt < maxtries:
		try:
			results = list(results)
			break
		except ads.exceptions.APIResponseError as e:
			attempt = attempt + 1
			if attempt >= maxtries:
				raise e

	affiliation = AFFNOTFOUND
	for result in results:
		try:
			lastname = author[-1]
			lastnames = [list(map(lambda s: s.replace('.', '').replace(',',''), a.split(' ')))[0] for a in result.author]
			affiliation = result.aff[lastnames.index(lastname)]
			affiliation = affiliation.split(';')[0].rstrip() # handle authors with multiple affiliations
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
	if affiliation is AFFNOTFOUND:
		return COORDSNOTFOUND

	pieces = affiliation.split(', ')
	for i, _ in enumerate(pieces):
		try:
			coords = gmaps.geocode(', '.join(pieces[i:]))
		except googlemaps.exceptions.HTTPError as e:
			coords = []
			print(e)
			print("Bad Request with:", ', '.join(pieces[i:]))


		if len(coords) is not 0:
			coords = coords[0]['geometry']['location']
			return coords

	return COORDSNOTFOUND

def resolvePapers(papers, arxivOnly=False):
	"""
	Find affiliations and coordinates of papers.
	A paper's coordinates is the coordinates of the first author's institution.
	If we can't find the first author's institution, use the second author's, then third, etc.

	arxivOnly: set to true to just look up affiliation on arxiv. No ADS.
	"""
	for paper in tqdm(papers):
		# check with arxiv before wasting an api call to ADS (we get 5000 a day)
		affiliation = queryArxiv(paper['id'])
		if affiliation is not AFFNOTFOUND:
			paper['affiliation'] = affiliation
			coords = getMapCoords(affiliation)
			paper['coords'] = coords
			continue

		if not arxivOnly:
			for author in paper['authors']:
				affiliation = getAuthorAffiliation(author)
				if affiliation is not AFFNOTFOUND:
					break
			paper['affiliation'] = affiliation
			coords = getMapCoords(affiliation)
			paper['coords'] = coords

	return papers

def getADSQueriesLeft():
	"""
	Stupidly get the number of queries left by making a query.
	The way to get it without making a query doesn't seem to work.
	https://ads.readthedocs.io/en/latest/#rate-limit-usage
	"""
	q = ads.SearchQuery(q='star')
	q.next()
	return q.response.get_ratelimits()['remaining']

if __name__ == "__main__":
	archives = ['astro-ph', 'cond-mat', 'physics', 'cs', 'math']

	for archive in archives:
		datadir = os.path.join('client', 'data', archive)
		print('{}: Saving arxiv data...'.format(archive))

		# Scrape arXiv's announcement page and generate a filename.
		# If `filename` already exists then arxiv hasn't updated yet.
		# We know this because the filename generated here is based on the date on the arxiv page.
		# arxiv says it updates at 20:00EDT, however it is frequently late by anywhere from 10-60 minutes.
		# Wait five minutes and check the page for an update again, up to 21 times (100 minutes).
		# Note that a cron task starts this script around 20:00EDT
		waittime = 5*60 # seconds to wait between checks
		checks, maxchecks = 0, 21
		while checks < maxchecks:
			papers, filedate = scrapeArxivData(archive=archive)
			filename = os.path.join(datadir, filedate + '.json')
			if os.path.exists(filename):
				checks = checks+1
				if checks >= maxchecks:
					print("Still no update. Quitting.")
					exit()
				else:
					print("arXiv doesn't seem to have updated... waiting 5 minutes")
					time.sleep(waittime)
					print("Checking for update...")
			else:
				break

		print(filename)

		try:
			papers = resolvePapers(papers)
		except ads.exceptions.APIResponseError as e:
			print("ADS Failed", attempt, "times. Stopping", archive, "scrape.")
			continue

		# save today's data
		if not os.path.exists(datadir):
			os.mkdir(datadir)
		datafile = open(filename, 'w')
		json.dump(papers, datafile)
		datafile.close()
