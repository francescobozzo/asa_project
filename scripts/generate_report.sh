#!/bin/sh
cd report
files=$(find . -name '0*.md' | sort)
pandoc $files \
    -o ../report.pdf \
    -V fontsize=10pt \
    --from markdown \
    --template ./pandoc-template/eisvogel.latex \
    --metadata-file ./pandoc-template/eisvogel-metadata.yaml \
    --bibliography=./pandoc-template/bibliography.bib \
    --csl=./pandoc-template/bibliography.csl \
    --filter pandoc-fignos \
    --filter pandoc-eqnos \
    --filter pandoc-secnos \
    --citeproc \
    --listings \
    --number-sections \
    --highlight-style pygments
