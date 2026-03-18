FROM amazonlinux:2

WORKDIR /tmp

RUN yum -y update && yum clean all

RUN yum -y install \
    wget \
    tar.x86_64 \
    apt-utils \
    tree \
	curl \
	vim \
	procps \
	# pour check netstat -lntp (on ecoute sur quoi) arp, ifconfig, netstat, rarp, nameif and route
	net-tools \
	htop \
	zip \
    unzip \
    # pour envsubst 
    gettext \
    aws-cli

RUN yum -y install gcc-c++ make findutils

RUN curl -sL https://rpm.nodesource.com/setup_12.x | /bin/bash

RUN yum -y install nodejs

RUN npm config set prefix /usr/local && npm i --global serverless

RUN yum clean all

RUN touch ~/.bashrc && chmod +x ~/.bashrc

RUN echo 'alias ll="ls -lah"' >> ~/.bashrc
RUN echo 'export PS1="\n\t \u@amazonlinux-node:\w\n"' >> ~/.bashrc

WORKDIR /projects

ADD start.sh /root/start.sh

