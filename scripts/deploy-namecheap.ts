import SftpClient from 'ssh2-sftp-client';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

async function deployToNamecheap() {
  const host = process.env.NAMECHEAP_HOST;
  const port = Number(process.env.NAMECHEAP_PORT || 21098);
  const username = process.env.NAMECHEAP_USER;
  const password = process.env.NAMECHEAP_PASSWORD;
  const privateKeyEnv = process.env.NAMECHEAP_SSH_KEY;
  const remoteDir = process.env.NAMECHEAP_REMOTE_DIR || `/home/${username}/public_html`;

  if (!host || !username || (!password && !privateKeyEnv)) {
    console.error(
      'Missing Namecheap SFTP/SSH credentials. Set NAMECHEAP_HOST, NAMECHEAP_USER, and NAMECHEAP_PASSWORD or NAMECHEAP_SSH_KEY.'
    );
    process.exit(1);
  }

  const distDir = path.join(rootDir, 'dist');
  if (!fs.existsSync(distDir)) {
    console.error('dist/ folder not found. Run `npm run build` before deploying.');
    process.exit(1);
  }

  const sftp = new SftpClient();
  const connectConfig: Record<string, unknown> = {
    host,
    port,
    username,
    readyTimeout: 15000,
  };

  if (privateKeyEnv) {
    connectConfig.privateKey = fs.existsSync(privateKeyEnv)
      ? fs.readFileSync(privateKeyEnv, 'utf8')
      : privateKeyEnv.replace(/\\n/g, '\n');
  } else {
    connectConfig.password = password;
  }

  try {
    console.log(`Connecting via SSH2/SFTP to ${username}@${host}:${port}...`);
    await sftp.connect(connectConfig);

    console.log(`Uploading production SPA bundle (dist/) to ${remoteDir}...`);
    await sftp.uploadDir(distDir, remoteDir);

    const phpApiPath = path.join(rootDir, 'api.php');
    if (fs.existsSync(phpApiPath)) {
      console.log(`Uploading PHP REST backend to ${remoteDir}/api.php...`);
      await sftp.put(phpApiPath, `${remoteDir.replace(/\/$/, '')}/api.php`);
    }

    console.log('Deployment to Namecheap live server completed successfully.');
  } finally {
    await sftp.end().catch(() => {});
  }
}

deployToNamecheap().catch((err) => {
  console.error('Namecheap SFTP deployment failed:', err?.message || err);
  process.exit(1);
});
