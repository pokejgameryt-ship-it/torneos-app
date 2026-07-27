#!/bin/bash
# Fix PATH and create symlinks for global access
echo 'export PATH=/home/ubuntu/.nvm/versions/node/v20.20.2/bin:$PATH' >> ~/.bashrc
# Create symlinks for system-wide access
sudo ln -sf /home/ubuntu/.nvm/versions/node/v20.20.2/bin/node /usr/local/bin/node
sudo ln -sf /home/ubuntu/.nvm/versions/node/v20.20.2/bin/npm /usr/local/bin/npm
sudo ln -sf /home/ubuntu/.nvm/versions/node/v20.20.2/bin/npx /usr/local/bin/npx
sudo ln -sf /home/ubuntu/.nvm/versions/node/v20.20.2/bin/pm2 /usr/local/bin/pm2
echo "Symlinks creados:"
ls -la /usr/local/bin/node /usr/local/bin/npm /usr/local/bin/pm2
