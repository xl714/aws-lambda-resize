#!/bin/bash

cd /workspace/aws-lambda-resize/local-env/express-app

# remplacer dans package.json ex redis : "*" avec la derniere version
# npm update --save


#npm install;
#nohup npm start &

source ~/.bashrc

touch /tmp/running.txt;
tail -f /tmp/running.txt;
