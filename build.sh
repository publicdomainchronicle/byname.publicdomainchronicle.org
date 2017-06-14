#!/bin/bash
partials=$(find static/partials)

for template in static/*.mustache; do
  node_modules/.bin/mustache static/mustache-view.json "$template" "${template%.mustache}.html"
done
