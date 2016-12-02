#!/bin/bash

kubectl create secret generic gateway-lunchbadger-dev-tls \
  --from-file=key.pem --from-file=cert.pem
