# WebRTC Call Debug Guide

## Cách test và debug call trên web

### Bước 1: Mở 2 browser tabs
1. Tab 1: Login bác sĩ (Dr. A)
2. Tab 2: Login bệnh nhân (Patient B)

### Bước 2: Mở Developer Console (F12) ở cả 2 tabs

### Bước 3: Test call flow và kiểm tra logs

## Expected Logs - CALLER (Tab 1)

```
🔌 [WebRTC] Connecting to http://localhost:8000/webrtc
✅ [WebRTC] Connected with ID: socket-123
📤 [WebRTC] Joining WebRTC room with user: userId123 Dr. A doctor
✅ [WebRTC] Successfully joined WebRTC room: { success: true }
🎧 [WebRTC] Setting up event listeners

[Click Call Button]

📞 [WebRTC] Initiating video call to: Patient B userId456
✅ [WebRTC] Socket is connected, ID: socket-123
✅ [WebRTC] Got user media: stream-id-789
📝 [WebRTC] Creating offer...
📝 [WebRTC] Setting local description (offer)...
✅ [WebRTC] Local description set: offer
🧊 [WebRTC] New ICE candidate: host udp
🧊 [WebRTC] New ICE candidate: srflx udp
🧊 [WebRTC] ICE gathering completed
📤 [WebRTC] Emitting call-user event with data: {...}
✅ [WebRTC] Call request sent
✅ [WebRTC] Call initiated successfully: { receiverId: userId456, messageId: msg123 }

[Wait for answer]

✅ [WebRTC] Call answered by: userId456
📝 [WebRTC] Handling call answered, signal type: answer
📝 [WebRTC] Setting remote description (answer)...
✅ [WebRTC] Remote description set: answer

[Receiving ICE candidates]

🧊 [WebRTC] ===== RECEIVED ICE CANDIDATE =====
🧊 [WebRTC] From: userId456 To: userId123
➕ [WebRTC] Adding ICE candidate to peer connection
✅ [WebRTC] ICE candidate added successfully

[Connection establishing]

🔗 [WebRTC] ===== CONNECTION STATE CHANGE =====
🔗 [WebRTC] Connection state: connecting
🔗 [WebRTC] ICE connection state: checking
🧊 [WebRTC] ICE connection state changed: checking

🔗 [WebRTC] ===== CONNECTION STATE CHANGE =====
🔗 [WebRTC] Connection state: connected
🔗 [WebRTC] ICE connection state: connected
🧊 [WebRTC] ICE connection state changed: connected

📺 [WebRTC] Received remote track
✅ [CallContext] Call connected, starting timer
```

## Expected Logs - RECEIVER (Tab 2)

```
🔌 [WebRTC] Connecting to http://localhost:8000/webrtc
✅ [WebRTC] Connected with ID: socket-456
📤 [WebRTC] Joining WebRTC room with user: userId456 Patient B patient
✅ [WebRTC] Successfully joined WebRTC room: { success: true }
🎧 [WebRTC] Setting up event listeners

[Receiving call]

📞 [WebRTC] ===== INCOMING CALL RECEIVED =====
📞 [WebRTC] Caller: Dr. A userId123
📞 [WebRTC] Video call: true
📞 [WebRTC] Message ID: msg123

[Click Answer]

✅ [WebRTC] Answering call from: Dr. A
✅ [WebRTC] Got user media: stream-id-abc
📝 [WebRTC] Setting remote description (offer)...
✅ [WebRTC] Remote description set: offer
📝 [WebRTC] Creating answer...
📝 [WebRTC] Setting local description (answer)...
✅ [WebRTC] Local description set: answer
🧊 [WebRTC] New ICE candidate: host udp
🧊 [WebRTC] New ICE candidate: srflx udp
🧊 [WebRTC] ICE gathering completed
📤 [WebRTC] Emitting answer-call event
✅ [WebRTC] Answer sent

[Receiving ICE candidates]

🧊 [WebRTC] ===== RECEIVED ICE CANDIDATE =====
🧊 [WebRTC] From: userId123 To: userId456
➕ [WebRTC] Adding ICE candidate to peer connection
✅ [WebRTC] ICE candidate added successfully

[Connection establishing]

🔗 [WebRTC] ===== CONNECTION STATE CHANGE =====
🔗 [WebRTC] Connection state: connecting
🧊 [WebRTC] ICE connection state changed: checking

🔗 [WebRTC] ===== CONNECTION STATE CHANGE =====
🔗 [WebRTC] Connection state: connected
🧊 [WebRTC] ICE connection state changed: connected

📺 [WebRTC] Received remote track
```

## Common Issues & Solutions

### Issue 1: "Socket not connected"
**Symptom:**
```
❌ [WebRTC] Socket not connected!
```
**Solution:**
- Check if API_BASE_URL is correct (should be `http://localhost:8000`)
- Check if server is running
- Check if user is logged in (session exists)

### Issue 2: "No incoming call received"
**Symptom:** Caller sees "Call initiated successfully" but receiver sees nothing
**Check:**
- Receiver console: Should see "Successfully joined WebRTC room"
- Server logs: Check if user is in connectedUsers map
- Network tab: Check WebSocket connection status

### Issue 3: "ICE connection failed"
**Symptom:**
```
🧊 [WebRTC] ICE connection state changed: failed
```
**Solutions:**
- Check STUN server connectivity
- Check firewall/network settings
- Try on same network/localhost first
- Check if both peers are sending ICE candidates

### Issue 4: "No remote stream"
**Symptom:** Connection state is "connected" but no video
**Check:**
- Both sides: "Received remote track" log should appear
- Check camera/microphone permissions in browser
- Check if `ontrack` event is firing
- Verify `RTCView` component is rendering

### Issue 5: "Connection stuck at 'connecting'"
**Symptom:**
```
🔗 [WebRTC] Connection state: connecting
(stays forever)
```
**Check:**
- ICE candidates are being exchanged (both directions)
- Remote description is set on both sides
- Check ICE connection state logs
- May need TURN server for certain network configurations

## Debug Checklist

### Before Call:
- [ ] Both users see "Successfully joined WebRTC room"
- [ ] Socket IDs are different
- [ ] User IDs are correct

### During Call Initiation:
- [ ] Caller: "Got user media" appears
- [ ] Caller: "Local description set: offer"
- [ ] Caller: "Call request sent"
- [ ] Receiver: "INCOMING CALL RECEIVED" appears
- [ ] Receiver: Modal shows with caller name

### During Call Answer:
- [ ] Receiver: "Got user media" appears
- [ ] Receiver: "Remote description set: offer"
- [ ] Receiver: "Local description set: answer"
- [ ] Caller: "Call answered by: userId"
- [ ] Caller: "Remote description set: answer"

### During ICE Exchange:
- [ ] Both sides: Multiple "New ICE candidate" logs
- [ ] Both sides: "RECEIVED ICE CANDIDATE" logs
- [ ] Both sides: "ICE candidate added successfully"
- [ ] ICE gathering completes on both sides

### Connection Established:
- [ ] Both sides: "Connection state: connected"
- [ ] Both sides: "ICE connection state: connected"
- [ ] Both sides: "Received remote track"
- [ ] CallContext: "Call connected, starting timer"
- [ ] UI: Video streams visible

### During Call End:
- [ ] Initiator: "Emitting end-call event"
- [ ] Other side: "CALL ENDED EVENT"
- [ ] Both sides: "Cleaning up"
- [ ] Both sides: "Cleanup complete"

## Network Tab Checks

### WebSocket Messages (Filter: WS)

**Should see these messages:**

1. **join-webrtc** (both sides)
   ```json
   { "userId": "...", "userRole": "...", "userName": "..." }
   ```

2. **call-user** (caller → server)
   ```json
   {
     "callerId": "...",
     "receiverId": "...",
     "isVideoCall": true,
     "signal": { "type": "offer", "sdp": "..." }
   }
   ```

3. **incoming-call** (server → receiver)
   ```json
   {
     "callerId": "...",
     "callerName": "...",
     "isVideoCall": true,
     "signal": { "type": "offer", "sdp": "..." },
     "messageId": "..."
   }
   ```

4. **answer-call** (receiver → server)
   ```json
   {
     "callerId": "...",
     "signal": { "type": "answer", "sdp": "..." },
     "messageId": "..."
   }
   ```

5. **call-answered** (server → caller)
   ```json
   {
     "signal": { "type": "answer", "sdp": "..." },
     "answererId": "..."
   }
   ```

6. **ice-candidate** (both directions, multiple times)
   ```json
   {
     "callerId": "...",
     "receiverId": "...",
     "candidate": { ... }
   }
   ```

## Quick Fix Commands

### If stuck, try:
1. Reload both tabs
2. Clear browser cache
3. Check browser console for errors
4. Restart server
5. Check server logs for errors
