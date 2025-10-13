// Test Global Socket - Demo & Validation
// Run this in browser console after logging in

console.log("🧪 Starting Global Socket Test...\n");

// Test 1: Check if GlobalSocket is connected
console.log("📍 Test 1: Socket Connection Status");
const checkConnection = () => {
  // Access the global socket context from window (if exposed)
  const isConnected = document.querySelector("[data-socket-status]");
  if (isConnected) {
    console.log("✅ Socket connection indicator found");
  } else {
    console.log("⚠️ Socket connection indicator not found (this is OK if not implemented in UI)");
  }

  // Check network tab for socket.io connection
  console.log("💡 TIP: Check Network tab → WS/WebSocket for socket.io connection");
};
checkConnection();

// Test 2: Simulate appointment event (from backend)
console.log("\n📍 Test 2: Simulating Socket Events");
console.log(`
To test socket events, open 2 browser windows:

Window 1 (Doctor):
1. Login as doctor
2. Go to ANY page (e.g., Dashboard, Profile, etc.)
3. Keep browser console open

Window 2 (Patient):
1. Login as patient
2. Go to /patient/appointments
3. Create new appointment

Expected Result in Window 1:
✅ Toast notification appears: "Lịch hẹn mới"
✅ Console log: "📅 New appointment received"
✅ If doctor is on Schedule page → Calendar auto-refreshes

Expected Result in Window 2:
✅ Toast notification: "Đặt lịch thành công"
✅ Redirect to My Appointments
`);

// Test 3: Check for multiple socket connections (should only be 1)
console.log("\n📍 Test 3: Checking for Duplicate Connections");
console.log(`
Open Network tab → Filter by "socket.io"
Expected: Only 1 active WebSocket connection
If you see multiple connections, this is a BUG ❌

Troubleshooting:
- Check React StrictMode is handled correctly
- Check socketRef prevents double connection
- Check no manual socket.connect() in components
`);

// Test 4: Validate toast notifications on different pages
console.log("\n📍 Test 4: Toast Notifications Across Pages");
console.log(`
Scenario: Bác sĩ nhận toast ở mọi trang

Steps:
1. Login as doctor
2. Navigate through different pages:
   - Dashboard (/doctor/dashboard)
   - Schedule (/doctor/schedule)
   - Profile (/doctor/profile)
3. While on each page, have a patient create appointment

Expected:
✅ Toast appears on EVERY page (not just Schedule)
✅ Toast message: "Lịch hẹn mới"
✅ Toast has description with patient info

If toast only shows on Schedule page:
❌ BUG: GlobalSocketProvider not working correctly
`);

// Test 5: Auto-refresh validation
console.log("\n📍 Test 5: Auto-Refresh on Active Page");
console.log(`
Scenario: Calendar auto-updates when appointment created

Steps:
1. Doctor opens Schedule page → View calendar
2. Patient creates appointment with this doctor
3. Watch doctor's calendar (DO NOT manually refresh)

Expected:
✅ Toast appears: "Lịch hẹn mới"
✅ Calendar automatically refreshes (fetchAppointments called)
✅ New appointment appears on calendar
✅ Stats cards update (Total count increases)

Check Console:
- Should see: "🔄 Triggering appointment refresh callback"
- Should see: "✅ Doctor schedule registered with global socket"
`);

// Test 6: Bidirectional updates
console.log("\n📍 Test 6: Bidirectional Updates (Doctor → Patient)");
console.log(`
Scenario: Bác sĩ xác nhận → Bệnh nhân nhận toast

Steps:
1. Patient creates appointment
2. Patient navigates to Home page (/patient/home) - NOT My Appointments
3. Doctor confirms the appointment
4. Watch patient screen

Expected:
✅ Patient sees toast: "Lịch hẹn đã được xác nhận"
✅ Toast appears on Home page (not just My Appointments)
✅ If patient then goes to My Appointments → Status is "confirmed"

Check Console (Patient side):
- Should see: "📅 Appointment confirmed"
- Should see toast notification with action button
`);

// Test 7: Cancel flow
console.log("\n📍 Test 7: Cancel Appointment Flow");
console.log(`
Scenario A: Patient cancels → Doctor receives notification

Steps:
1. Patient goes to My Appointments → Click "Hủy lịch"
2. Doctor is on ANY page
3. Watch doctor screen

Expected:
✅ Doctor sees toast: "Lịch hẹn đã bị hủy"
✅ Toast shows canceller = "Bệnh nhân"
✅ If doctor on Schedule page → Calendar refreshes

Scenario B: Doctor cancels → Patient receives notification

Steps:
1. Doctor on Schedule → Click appointment → "Hủy lịch"
2. Patient is on ANY page
3. Watch patient screen

Expected:
✅ Patient sees toast: "Lịch hẹn đã bị hủy"
✅ Toast shows canceller = "Bác sĩ"
✅ If patient on My Appointments → List refreshes
`);

// Test 8: Performance & Memory
console.log("\n📍 Test 8: Performance & Memory Validation");
console.log(`
Steps:
1. Login → Navigate through 10+ different pages
2. Open Chrome DevTools → Memory tab
3. Take heap snapshot
4. Logout → Login again
5. Take another heap snapshot
6. Compare snapshots

Expected:
✅ No memory leaks (detached DOM nodes)
✅ Socket properly disconnects on logout
✅ Socket reconnects on login
✅ Only 1 socket connection at any time

Check Network tab:
- Should see single ws://localhost:3001/socket.io/...
- Connection status: "101 Switching Protocols"
- Frames tab shows heartbeat (ping/pong)
`);

// Test 9: Error handling
console.log("\n📍 Test 9: Error Handling & Reconnection");
console.log(`
Scenario: Network interruption

Steps:
1. Login and open Schedule page
2. Open DevTools → Network tab
3. Enable "Offline" mode
4. Wait 5 seconds
5. Disable "Offline" mode

Expected:
✅ Socket disconnects when offline
✅ Console shows: "❌ Global socket disconnected"
✅ Socket reconnects when back online
✅ Console shows: "✅ Global socket connected"
✅ Auto-fetch appointments after reconnection

Check Console:
- Should see disconnect reason: "transport close"
- Should see reconnection attempts
- Should see successful reconnection
`);

// Test 10: Multiple users simultaneously
console.log("\n📍 Test 10: Multiple Users Stress Test");
console.log(`
Scenario: 3 doctors, 5 patients

Steps:
1. Open 8 browser windows (incognito for different sessions)
2. Login 3 as doctors, 5 as patients
3. Patients create appointments randomly
4. Doctors confirm/cancel randomly
5. Monitor all screens

Expected:
✅ Each user receives only relevant notifications
✅ No duplicate toasts
✅ No cross-user data leaks
✅ All sockets connected independently
✅ Server handles load without errors

Performance Expectations:
- Page load time: < 2s
- Toast delay: < 500ms after event
- Data refresh: < 1s
- No browser freezing
`);

// Summary
console.log("\n" + "=".repeat(60));
console.log("📊 TEST SUMMARY");
console.log("=".repeat(60));
console.log(`
✅ MUST PASS:
- Socket connects on login
- Toast appears on ANY page (not just appointments pages)
- Data auto-refreshes when on active page
- No duplicate socket connections
- Proper cleanup on logout

⚠️ NICE TO HAVE:
- Fast notification delivery (< 500ms)
- Smooth animations
- Sound/vibration (future enhancement)
- Notification center (future enhancement)

🐛 COMMON BUGS TO CHECK:
- Toast only shows on specific pages → GlobalSocket not working
- Multiple socket connections → StrictMode issue
- Memory leaks → Missing cleanup in useEffect
- Stale data → Callback closure issue
- Events not received → Backend not emitting correctly

📝 DEBUGGING TIPS:
- Check browser console for socket logs
- Check Network tab → WebSocket frames
- Check backend logs for socket events
- Use React DevTools to inspect context values
- Add console.logs in GlobalSocketContext handlers
`);

console.log("\n✅ Test guide loaded! Follow the scenarios above.\n");
