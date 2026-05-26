const os = require('os');
const fs = require('fs');
const path = require('path');

function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Skip internal (loopback) and non-IPv4 addresses
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

const currentIP = getLocalIP();
console.log(`Current Local IP detected: ${currentIP}`);

// 1. Update backend/.env
const backendEnvPath = path.join(__dirname, 'backend', '.env');
if (fs.existsSync(backendEnvPath)) {
    let content = fs.readFileSync(backendEnvPath, 'utf8');
    // More flexible regex to match variations
    content = content.replace(/CLIENT_URL=http:\/\/[^:\s\n]+:\d+/g, `CLIENT_URL=http://${currentIP}:5173`);
    fs.writeFileSync(backendEnvPath, content);
    console.log(`Updated backend/.env: CLIENT_URL=http://${currentIP}:5173`);
}

// 2. Update frontend/.env
const frontendEnvPath = path.join(__dirname, 'frontend', '.env');
if (fs.existsSync(frontendEnvPath)) {
    let content = fs.readFileSync(frontendEnvPath, 'utf8');
    content = content.replace(/VITE_API_URL=http:\/\/[^:\s\n/]+:\d+\/api/g, `VITE_API_URL=http://${currentIP}:5000/api`);
    fs.writeFileSync(frontendEnvPath, content);
    console.log(`Updated frontend/.env: VITE_API_URL=http://${currentIP}:5000/api`);
}

// 3. Update run-app.bat
const batPath = path.join(__dirname, 'run-app.bat');
if (fs.existsSync(batPath)) {
    let content = fs.readFileSync(batPath, 'utf8');
    content = content.replace(/start chrome http:\/\/[^:\s\n/]+:\d+\//g, `start chrome http://${currentIP}:5173/`);
    fs.writeFileSync(batPath, content);
    console.log(`Updated run-app.bat: start chrome http://${currentIP}:5173/`);
}

console.log('IP Update Complete!');
