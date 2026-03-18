FROM alpine:3.8

########## Start common tools ##########
RUN apk add --update \
    bash \
    gawk \
    sed \
    grep \
    bc \
    coreutils \
    wget \
    make \
    curl \
    vim \
    # diffutils \
    # mariadb-client \
    sudo \
    tree \
    net-tools && \
    echo 'alias ll="ls -lah"' >> ~/.bashrc
########## End ##########

RUN apk add --update nginx
RUN rm -rf /var/cache/apk/* && rm -rf /tmp/*

ADD nginx.conf /etc/nginx/

RUN adduser -D -g '' -G www-data www-data

WORKDIR /etc/nginx

CMD ["nginx"]

#EXPOSE 80
#EXPOSE 443
