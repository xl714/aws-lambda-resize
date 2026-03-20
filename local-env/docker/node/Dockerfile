FROM node:24-bookworm

WORKDIR /tmp

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        tree \
        curl \
        vim \
        procps \
        net-tools \
        htop \
    && rm -rf /var/lib/apt/lists/*

RUN echo 'alias ll="ls -lah"' >> ~/.bashrc

WORKDIR /workspace/aws-lambda-resize/local-env/express-app

RUN npm install --global npm@11 nodemon

ADD start.sh /root/start.sh

CMD [ "npm", "start" ]
