#!/bin/bash

# This script is used to start the server for the WaveKey application.
cd javascriptBackend
node server.js &
NODE_PID=$!

cd ../backend
dotnet run &
C_SHARP_PID=$!

cd ../frontend
npm run dev &
FRONTEND_PID=$!

wait $NODE_PID $C_SHARP_PID $FRONTEND_PID