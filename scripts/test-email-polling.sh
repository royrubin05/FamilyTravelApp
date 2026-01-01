#!/bin/bash
echo "Testing Email Polling..."
echo "Endpoint: http://localhost:3000/api/cron/email-polling"

curl -v http://localhost:3000/api/cron/email-polling

echo ""
echo "Done."
