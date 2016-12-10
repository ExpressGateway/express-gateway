#!/bin/bash

kubectl create secret generic lunchbadger-io-tls \
  --from-file=lunchbadger.io.key.pem --from-file=lunchbadger.io.cert.pem
kubectl create secret generic lunchbadger-com-tls \
  --from-file=lunchbadger.com.key.pem --from-file=lunchbadger.com.cert.pem
