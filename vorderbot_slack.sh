#!/bin/sh

cd `dirname "$0"`
SLACK_TOKEN="xoxp-SLACK-TOKEN-HERE" export SLACK_TOKEN
#Uncomment and set the proxy if you need it
#http_proxy="http://cache.example.com:8080" export http_proxy
#https_proxy="$http_proxy" export https_proxy
#noproxy= export noproxy
exec /usr/bin/nodejs vorderbot.js
