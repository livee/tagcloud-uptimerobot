FROM node:13.7.0-alpine3.10

RUN apk update && \
    apk upgrade && \
    apk add --no-cache openssh-client git && \
    apk add bash && \
    apk add curl && \
    apk add jq && \
    apk add postgresql

# Install dependencies
ARG SSH_PRIVATE_KEY
RUN mkdir /root/.ssh/ && \
  echo "${SSH_PRIVATE_KEY}" > /root/.ssh/id_rsa && \
  chmod 400 /root/.ssh/id_rsa && \
  touch /root/.ssh/known_hosts && \
  ssh-keyscan github.com >> /root/.ssh/known_hosts

RUN npm install pm2 -g
RUN npm install redis-cli -g

# install probe server
WORKDIR /srv/ProbeServer
COPY ./probe-server .
RUN npm install && \
    pm2-runtime start pm2.json --env production

RUN cd /srv && \
  git clone git@github.com:livee/LiveeMonitor.git && \
  cd LiveeMonitor && \
  npm install
WORKDIR /srv/LiveeMonitor
COPY ./config ./config

WORKDIR /root
COPY ./pm2.json .

# Remove the private key
RUN rm -rf /root/.ssh

# The port must be a string
ENV PORT="80"
EXPOSE 80
# CMD [ "pm2-runtime", "start", "pm2.json", "--name=\"LiveeMonitor\"", "--env", "production" ]
CMD [ "pm2-runtime", "start", "pm2.json", "--env", "production" ]
