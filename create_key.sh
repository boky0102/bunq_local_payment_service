#!/usr/bin/env bash
openssl genrsa -out installation.key && openssl rsa -in installation.key -outform PEM -pubout -out installation.pub
