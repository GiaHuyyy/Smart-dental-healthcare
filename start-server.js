const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Smart Dental Healthcare Server...');
console.log('📁 Working directory:', process.cwd());

const serverPath = path.join(__dirname, 'server');
console.log('📁 Server path:', serverPath);

const serverProcess = spawn('npm', ['run', 'dev'], {
  cwd: serverPath,
  stdio: 'inherit',
  shell: true
});

serverProcess.on('error', (error) => {
  console.error('❌ Failed to start server:', error.message);
  console.log('\n💡 Please make sure you have:');
  console.log('   1. Node.js installed');
  console.log('   2. Dependencies installed (npm install)');
  console.log('   3. MongoDB running');
  console.log('   4. Environment variables set');
});

serverProcess.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping server...');
  serverProcess.kill('SIGINT');
  process.exit(0);
});

console.log('✅ Server startup initiated');
console.log('📝 Check the output above for any errors');
console.log('🔄 Server should be available at http://localhost:8081');
