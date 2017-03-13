#!/usr/bin/python3

import requests
from bs4 import BeautifulSoup as parse

res = requests.get("https://arxiv.org/list/astro-ph/new")
page = parse(res.content, 'html.parser')
entries = page.find_all('div', {'class': 'meta'})
ids = page.find_all('span', {'class': 'list-identifier'})

for arxivid in ids:
	idthing = arxivid.a.text[6:] # trim the leading 'arxiv:'

for entry in entries:
	title = entry.find('div', {'class': 'list-title'})
	title.span.extract()
	title = title.text[2:-1] # trim the leading '\n ' and trailing '\n'

	authors = entry.find('div', {'class': 'list-authors'})
	authors.span.extract()
	authors = [a.text for a in authors.findChildren()]
