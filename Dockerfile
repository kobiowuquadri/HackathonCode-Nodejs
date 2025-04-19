FROM node:slim AS builder
ENV WORKDIR=/usr/src/app/
WORKDIR $WORKDIR
COPY package*.json $WORKDIR
RUN npm install --production --no-cache

FROM node:slim
ENV USER=node
ENV WORKDIR=/home/$USER/app
WORKDIR $WORKDIR
COPY --from=builder /usr/src/app/node_modules node_modules
RUN chown $USER:$USER $WORKDIR

# Install netcat for health checks in docker-compose
RUN apt-get update && apt-get install -y --no-install-recommends netcat-openbsd

COPY --chown=node . $WORKDIR
RUN chown -R $USER:$USER /home/$USER && chmod -R g-s,o-rx /home/$USER && chmod -R o-wrx $WORKDIR
# Then all further actions including running the containers should be done under non-root user.
USER $USER
EXPOSE 4000