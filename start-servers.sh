#!/bin/bash

# This script is used to start the server for the WaveKey application.
# It starts both the backend (.NET) and frontend (Node.js) servers.
# Feel free to modify the script as needed for your environment.

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

echo "Attempting to start backend server from: $SCRIPT_DIR/backend"
(cd "$SCRIPT_DIR/backend" && dotnet run) &
C_SHARP_PID=$!

echo "Attempting to start frontend server from: $SCRIPT_DIR/frontend"
(cd "$SCRIPT_DIR/frontend" && npm run dev) &
FRONTEND_PID=$!

echo "Backend server PID: $C_SHARP_PID"
echo "Frontend server PID: $FRONTEND_PID"
echo "Waiting for servers to complete... Press Ctrl+C to stop."

wait $C_SHARP_PID $FRONTEND_PID

echo "Servers have shut down."