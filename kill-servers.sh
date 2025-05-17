#!/bin/bash

# This script is used to kill the server for the WaveKey application.
# It kills the backend server (C#) and frontend server (Node.js) processes.
# Feel free to modify the script as needed for your environment.

BACKEND_PORT=5000 
FRONTEND_PORT=3000 

echo "Attempting to kill server on port $BACKEND_PORT (.NET backend)..."

BACKEND_PID=$(lsof -ti tcp:${BACKEND_PORT})

if [ -n "$BACKEND_PID" ]; then
    echo "Found .NET backend process(es) with PID(s): $BACKEND_PID. Killing..."
    kill -9 $BACKEND_PID 
    sleep 1 
else
    echo "No process found listening on port $BACKEND_PORT."
fi

echo "Attempting to kill server on port $FRONTEND_PORT (Node.js frontend)..."
FRONTEND_PID=$(lsof -ti tcp:${FRONTEND_PORT})

if [ -n "$FRONTEND_PID" ]; then
    echo "Found Node.js frontend process(es) with PID(s): $FRONTEND_PID. Killing..."
    kill -9 $FRONTEND_PID
    sleep 1
else
    echo "No process found listening on port $FRONTEND_PORT."
fi

echo "Server kill attempt finished."
echo "You can verify by running 'lsof -i tcp:$BACKEND_PORT' and 'lsof -i tcp:$FRONTEND_PORT'."
echo "Or check 'ps aux | grep dotnet' and 'ps aux | grep node'."