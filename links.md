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
