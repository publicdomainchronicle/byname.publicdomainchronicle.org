PARTIALS=$(wildcard static/partials/*.mustache)
TEMPLATES=$(wildcard static/*.mustache)

all: $(TEMPLATES:.mustache=.html)

%.html: %.mustache $(PARTIALS) static/mustache-view.json
	node_modules/.bin/mustache $(addprefix -p ,$(PARTIALS)) static/mustache-view.json $< $@

.PHONY: clean

clean:
	rm -f $(TEMPLATES:.mustache=.html)
