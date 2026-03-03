#!/bin/bash

# 1. Start MongoDB in background
echo "Starting MongoDB..."
mongod --fork --logpath /var/log/mongodb.log --dbpath /data/db --bind_ip_all

# 2. Wait for MongoDB to be ready
until mongosh --eval "db.adminCommand('ping')" --quiet; do
  echo "Waiting for MongoDB to start..."
  sleep 2
done
echo "MongoDB is up!"

# 3. Start Backend Engine (Render) with auto-restart
echo "Starting Backend Engine..."
while true; do
  npm run server
  echo "Backend Engine crashed or exited. Restarting in 2 seconds..."
  sleep 2
done &

# 4. Start Frontend (Vercel) with auto-restart
echo "Starting Frontend..."
while true; do
  npm start
  echo "Frontend crashed. Restarting in 5 seconds..."
  sleep 5
done &

# 5. Keep container alive and stream all relevant logs
echo "All services started. Monitoring logs..."
# Wait for some time to let logs accumulate
sleep 2
tail -f /var/log/mongodb.log
