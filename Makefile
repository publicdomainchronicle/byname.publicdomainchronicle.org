PARTIALS=$(wildcard static/partials/*.mustache)
TEMPLATES=$(wildcard static/*.mustache)

all: $(TEMPLATES:.mustache=.html) catchwords.json

catchwords.json: data/EN_ipc_catchwordindex_20170101.xml
	./node_modules/.bin/parse-ipc-catchwords $< > $@

%.html: %.mustache $(PARTIALS) static/mustache-view.json
	node_modules/.bin/mustache $(addprefix -p ,$(PARTIALS)) static/mustache-view.json $< $@

.PHONY: clean

clean:
	rm -f $(TEMPLATES:.mustache=.html)
