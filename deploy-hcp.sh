#!/bin/bash
rsync -avs --progress --delete www/* 192.168.102.250:www/shipping-scanner/update
