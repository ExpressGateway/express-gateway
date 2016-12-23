#!/bin/bash

kubectl create secret generic lunchbadger-tls \
  --from-file=lunchbadger.io.key.pem \
  --from-file=lunchbadger.io.cert.pem \
  --from-file=lunchbadger.com.key.pem \
  --from-file=lunchbadger.com.cert.pem
