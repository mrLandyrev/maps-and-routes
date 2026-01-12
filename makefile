download-pbf:
	curl -L https://download.geofabrik.de/russia/south-fed-district-latest.osm.pbf -o world.pbf
osrm-prepare:
	docker run -it --rm -v "${PWD}/osm:/data" -v "${PWD}/world.pbf:/data/world.pbf" ghcr.io/project-osrm/osrm-backend osrm-extract -p /opt/car.lua /data/world.pbf
	docker run -it --rm -v "${PWD}/osm:/data" ghcr.io/project-osrm/osrm-backend osrm-contract /data/world.osrm
tailer-prepare:
	docker run -it --rm -v "${PWD}/pmtiles:/data" -v "${PWD}/world.pbf:/data/world.pbf" ghcr.io/systemed/tilemaker:master /data/world.pbf --output /data/world.mbtiles