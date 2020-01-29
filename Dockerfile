FROM node:13.7.0-alpine3.10

RUN apk update && \
    apk upgrade && \
    apk add --no-cache openssh-client git && \
    apk add bash && \
    apk add curl && \
    apk add jq

RUN apk add postgresql

# Install dependencies
ARG SSH_PRIVATE_KEY
RUN mkdir /root/.ssh/ && \
  echo "${SSH_PRIVATE_KEY}" > /root/.ssh/id_rsa && \
  chmod 400 /root/.ssh/id_rsa && \
  touch /root/.ssh/known_hosts && \
  ssh-keyscan github.com >> /root/.ssh/known_hosts

RUN npm install pm2 -g
RUN npm install redis-cli -g

RUN cd /srv && \
  git clone git@github.com:livee/LiveeMonitor.git && \
  cd LiveeMonitor && \
  npm install

WORKDIR /srv/LiveeMonitor

# Remove the private key
RUN rm -rf /root/.ssh

# Install config
COPY ./config ./config
# The port must be a string
ENV PORT="80"
EXPOSE 80
CMD [ "pm2-runtime", "start", "pm2.json", "--name=\"LiveeMonitor\"", "--env", "production" ]
