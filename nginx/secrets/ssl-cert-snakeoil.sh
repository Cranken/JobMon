#!/usr/bin/bash

openssl req \
    -subj '/CN=my-monitor-db.example.org' \
    -new \
    -x509 \
    -days 3650 \
    -nodes \
    -sha256 \
    -out ssl-cert-snakeoil.pem \
    -keyout ssl-cert-snakeoil.key
