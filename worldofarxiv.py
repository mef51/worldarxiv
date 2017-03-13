#!/usr/bin/python3

"""
Pull data from arxiv and prepare it to be displayed on a map
"""
import requests
from lxml import html

rooturl = 'https://arxiv.org/list/'
options = ["new", "current"] # current needs more work
arxivlists = ["astro-ph",
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

astrophlist = arxivlists[0]
url = rooturl + astrophlist + '/' + options[0]
print(url)
response = requests.get(url)
data = html.fromstring(response.content)

print(data)
