const { execFile } = require('child_process');

function run(cmd, args) {
  return new Promise((resolve) => {
    execFile(cmd, args, (error, stdout, stderr) => {
      resolve({
        ok: !error,
        stdout: (stdout || '').trim(),
        stderr: (stderr || '').trim(),
      });
    });
  });
}

async function commandExists(cmd) {
  const probe = process.platform === 'win32' ? 'where' : 'which';
  const result = await run(probe, [cmd]);
  return result.ok;
}

module.exports = { run, commandExists };
