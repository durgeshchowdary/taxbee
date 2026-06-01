import fs from "fs";
import path from "path";

const localStorageRoot = path.join(process.cwd(), "uploads");

export const uploadObject = async ({
  buffer,
  key,
  contentType = "application/octet-stream",
}) => {
  const targetPath = path.join(localStorageRoot, key);

  fs.mkdirSync(path.dirname(targetPath), {
    recursive: true,
  });

  fs.writeFileSync(targetPath, buffer);

  return {
    provider: "local",
    key,
    contentType,
    url: `/uploads/${key}`,
    path: targetPath,
  };
};

export const getSignedDownloadUrl = async ({
  key,
}) => {
  return {
    provider: "local",
    key,
    url: `/uploads/${key}`,
    expiresInSeconds: 900,
  };
};

export const deleteObject = async ({ key }) => {
  const targetPath = path.join(localStorageRoot, key);

  if (fs.existsSync(targetPath)) {
    fs.unlinkSync(targetPath);
  }

  return true;
};

export default {
  uploadObject,
  getSignedDownloadUrl,
  deleteObject,
};