# Soundstage — zero-dependency Node server. Build from the music-hub folder:
#   docker build -t soundstage .
#   docker run --net=host -e SPOTIFY_CLIENT_ID=... -v soundstage-data:/app/.data soundstage
#
# --net=host matters: Sonos discovery uses SSDP multicast on the LAN, which
# doesn't cross Docker's default bridge network. DEMO=1 works on any network.

FROM node:22-alpine
WORKDIR /app
COPY server ./server
COPY public ./public
COPY package.json ./
ENV PORT=5599 DATA_DIR=/app/.data
EXPOSE 5599
CMD ["node", "server/index.js"]
