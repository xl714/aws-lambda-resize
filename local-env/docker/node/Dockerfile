FROM amazonlinux:1

MAINTAINER Xavier Langlois

WORKDIR /tmp

RUN yum -y update && yum clean all

RUN yum -y install \
    apt-utils \
    tree \
	curl \
	vim \
	procps \
	# pour check netstat -lntp (on ecoute sur quoi) arp, ifconfig, netstat, rarp, nameif and route
	net-tools \
	htop


#install the dependencies
RUN yum -y install gcc-c++ && yum -y install findutils

RUN touch ~/.bashrc && chmod +x ~/.bashrc

# RUN curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.5/install.sh | bash
# or :
ADD creationix-nvm-v0.33.5-install.sh /root/creationix-nvm-v0.33.5-install.sh
RUN bash /root/creationix-nvm-v0.33.5-install.sh

#RUN source ~/.bashrc && nvm install 8.10
RUN source ~/.bashrc && nvm install 10

RUN echo 'alias ll="ls -lah"' >> ~/.bashrc


WORKDIR /projects/mfimg-aws-lambda-s3/local-env/express-app

RUN source ~/.bashrc && npm install --global npm

RUN source ~/.bashrc && npm install --global nodemon

RUN yum clean all

ADD start.sh /root/start.sh

CMD [ "npm", "start" ]
