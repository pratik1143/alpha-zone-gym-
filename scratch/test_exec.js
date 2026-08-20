const { exec } = require('child_process');
const path = require('path');

const scriptPath = path.resolve(process.cwd(), 'device-service/auto_map_device_users.py');
console.log('Correct Script Path:', scriptPath);

exec(`python "${scriptPath}"`, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
  console.log('ERR:', err);
  console.log('STDERR:', stderr);
  console.log('STDOUT length:', stdout ? stdout.length : 0);
  if (stdout) {
    try {
      const parsed = JSON.parse(stdout);
      console.log('PARSED count:', parsed.count, 'success:', parsed.success);
    } catch (e) {
      console.log('PARSE ERROR:', e);
    }
  }
});
