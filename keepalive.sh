#!/bin/bash
cd /home/z/my-project
while true; do
  bun run dev >> dev.log 2>&1 &
  BUN_PID=$!
  for i in $(seq 1 300); do
    sleep 2
    if ! kill -0 $BUN_PID 2>/dev/null; then break; fi
    curl -s http://localhost:3000/api/formats > /dev/null 2>&1
  done
  kill $BUN_PID 2>/dev/null
  sleep 1
done
