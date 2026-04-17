import { createWriteStream } from "fs";
import { rm } from "fs/promises";
import path from "path";
import Directory from "../models/directoryModel.js";
import File from "../models/fileModel.js";
import User from "../models/userModel.js";
import {
  createSignedGetUrl,
  createSignedUploadUrl,
  getFileMetaData,
  deleteS3File,
} from "../services/s3Service.js";

async function updateAncestorSizes(startParentId, delta) {
  if (!startParentId || !Number.isFinite(delta) || delta === 0) return;

  let parentId = startParentId;
  while (parentId) {
    const dir = await Directory.findById(parentId);
    if (!dir) break;

    dir.size = Math.max(0, (dir.size || 0) + delta);
    await dir.save();
    parentId = dir.parentDirId;
  }
}

export const uploadFile = async (req, res, next) => {
  const parentDirId = req.params.parentDirId || req.user.rootDirId;

  try {
    const filename = req.headers.filename || "untitled";
    const filesize = req.headers.filesize;
    const fileSizeInBytes = Number(filesize);

    if (!Number.isFinite(fileSizeInBytes) || fileSizeInBytes < 0) {
      return res.status(400).json({ error: "Invalid file size" });
    }

    const parentDirData = await Directory.findOne({
      _id: parentDirId,
      userId: req.user._id,
    });
    // Check if parent directory exists
    if (!parentDirData) {
      return res.status(404).json({ error: "Parent directory not found!" });
    }

    // from user, only get the max storage
    const user = await User.findById(req.user._id, {
      maxStorageInBytes: 1,
    }).lean();
    if (!user) {
      return res.status(404).json({ error: "User not found!" });
    }

    const rootDirectory = await Directory.findOne(
      { _id: req.user.rootDirId, userId: req.user._id },
      { size: 1 },
    ).lean();

    const maxStorage = Number(user.maxStorageInBytes) || 0;
    const usedStorage = Number(rootDirectory?.size) || 0;
    const remainingStorage = Math.max(0, maxStorage - usedStorage);

    if (fileSizeInBytes > remainingStorage) {
      return res.destroy();
    }

    const extension = path.extname(filename);

    const file = await File.insertOne({
      extension,
      name: filename,
      size: fileSizeInBytes,
      parentDirId: parentDirData._id,
      userId: req.user._id,
      isTrashed: false,
      trashedAt: null,
    });

    const fileId = file.id;

    const fullFileName = `${fileId}${extension}`;

    const filepath = `./storage/${fullFileName}`;
    const writeStream = createWriteStream(filepath);
    // req.pipe(writeStream);

    let totalFilesize = 0;
    let requestCompleted = false;

    const cleanupUpload = async () => {
      await file.deleteOne();
      await rm(filepath, { recursive: true }).catch(() => {});
    };

    const failUpload = async (status, message) => {
      if (requestCompleted) return;
      requestCompleted = true;

      if (!writeStream.destroyed) {
        writeStream.destroy();
      }

      await cleanupUpload();

      if (!res.headersSent) {
        return res.status(status).json({ error: message });
      }
    };

    req.on("data", (chunk) => {
      totalFilesize += chunk.length;
      const canContinue = writeStream.write(chunk);

      if (!canContinue) {
        req.pause();
        writeStream.once("drain", () => {
          req.resume();
        });
      }
    });

    req.on("end", () => {
      writeStream.end();
    });

    writeStream.on("finish", async () => {
      if (requestCompleted) return;

      if (fileSizeInBytes !== totalFilesize) {
        return failUpload(400, "Client has tampered file size");
      }

      await updateAncestorSizes(parentDirData._id, totalFilesize);

      requestCompleted = true;
      return res.status(201).json({ message: "File Uploaded" });
    });

    req.on("aborted", async () => {
      return failUpload(400, "File upload cancelled");
    });

    req.on("error", async () => {
      return failUpload(500, "Could not upload the file");
    });

    writeStream.on("error", async () => {
      return failUpload(500, "Could not upload the file");
    });
  } catch (error) {
    next(error);
  }
};

export const getFile = async (req, res) => {
  const { id } = req.params;

  const fileData = await File.findOne({
    _id: id,
    userId: req.user._id,
  });
  // Check if file exists
  if (!fileData) {
    return res.status(404).json({ error: "File not found!" });
  }

  // if download, content-disposition is attachment, else inline
  const fileUrl = await createSignedGetUrl({
    Key: `${id}${fileData.extension}`,
    download: req.query.action === "download", // else undefined
    filename: fileData.name,
  });

  return res.redirect(fileUrl);
};

export const renameFile = async (req, res, next) => {
  const { id } = req.params;
  const file = await File.findOne({
    _id: id,
    userId: req.user._id,
  });

  // Check if file exists
  if (!file) {
    return res.status(404).json({ error: "File not found!" });
  }

  // Perform rename
  try {
    file.name = req.body.newFilename;
    file.updatedAt = new Date(Date.now());
    await file.save();

    return res.status(200).json({ message: "Renamed" });
  } catch (err) {
    err.status = 500;
    next(err);
  }
};

export const trashFile = async (req, res, next) => {
  const { id } = req.params;
  const file = await File.findOne({ _id: id, userId: req.user._id });

  try {
    if (!file) {
      return res.status(404).json({
        error: "File not found :(",
      });
    }

    if (file.isTrashed) {
      return res.status(200).json({ message: "File moved to trash" });
    }

    file.isTrashed = true;
    file.trashedAt = new Date();
    await file.save();
    await updateAncestorSizes(file.parentDirId, -(Number(file.size) || 0));

    return res.status(200).json({ message: "File moved to trash" });
  } catch (err) {
    next(err);
  }
};

export const restoreFile = async (req, res, next) => {
  const { id } = req.params;
  const file = await File.findOne({ _id: id, userId: req.user._id });

  try {
    if (!file) {
      return res.status(404).json({
        error: "File not found :(",
      });
    }

    if (!file.isTrashed) {
      return res.status(200).json({ message: "File restored" });
    }

    file.isTrashed = false;
    file.trashedAt = null;
    await file.save();
    await updateAncestorSizes(file.parentDirId, Number(file.size) || 0);

    return res.status(200).json({ message: "File restored" });
  } catch (err) {
    next(err);
  }
};

export const permanentlyDeleteFile = async (req, res, next) => {
  const { id } = req.params;
  const file = await File.findOne({ _id: id, userId: req.user._id });

  try {
    if (!file) {
      return res.status(404).json({
        error: "File not found :(",
      });
    }

    if (!file.isTrashed) {
      await updateAncestorSizes(file.parentDirId, -(Number(file.size) || 0));
    }

    await File.deleteOne({ _id: file._id });
    // Remove file from s3 bucket
    const response = await deleteS3File(`${file.id}${file.extension}`);
    console.log(response);
    // await rm(`./storage/${id}${file.extension}`, { recursive: true }).catch(
    //   () => {},
    // );

    return res.status(200).json({ message: "File Deleted Permanently" });
  } catch (err) {
    next(err);
  }
};

export const uploadInitiate = async (req, res) => {
  try {
    const parentDirId = req.body.parentDirId || req.user.rootDirId;
    const filename = req.body.name || "untitled";
    const filesize = req.body.size;
    const fileSizeInBytes = Number(filesize);

    if (!Number.isFinite(fileSizeInBytes) || fileSizeInBytes < 0) {
      return res.status(400).json({ error: "Invalid file size" });
    }

    const parentDirData = await Directory.findOne({
      _id: parentDirId,
      userId: req.user._id,
    });
    // Check if parent directory exists
    if (!parentDirData) {
      return res.status(404).json({ error: "Parent directory not found!" });
    }

    // from user, only get the max storage
    const user = await User.findById(req.user._id, {
      maxStorageInBytes: 1,
    }).lean();
    if (!user) {
      return res.status(404).json({ error: "User not found!" });
    }

    // root directory has the *used* size
    const rootDirectory = await Directory.findOne(
      { _id: req.user.rootDirId, userId: req.user._id },
      { size: 1 },
    ).lean();

    const maxStorage = Number(user.maxStorageInBytes) || 0;
    const usedStorage = Number(rootDirectory?.size) || 0;
    const remainingStorage = Math.max(0, maxStorage - usedStorage);

    if (fileSizeInBytes > remainingStorage) {
      console.log("File too large!!");
      return res
        .status(429)
        .json({ error: "File exceeds the maximum upload limit." });
    }

    const extension = path.extname(filename);

    const insertedFile = await File.insertOne({
      extension,
      name: filename,
      size: fileSizeInBytes,
      parentDirId: parentDirData._id,
      userId: req.user._id,
      isTrashed: false,
      trashedAt: null,
    });

    const fileId = insertedFile._id;

    const uploadUrl = await createSignedUploadUrl({
      Key: `${fileId}${extension}`,
      ContentType: req.body.ContentType,
    });

    return res.status(201).json({
      uploadUrl,
      fileId,
    });
  } catch (err) {
    console.log(err);
  }
};

export const uploadComplete = async (req, res, next) => {
  const file = await File.findById(req.body.fileId);
  if (!file) {
    return res.status(404).json({ error: "File not found!" });
  }

  try {
    const fileData = await getFileMetaData(`${file.id}${file.extension}`);
    if (fileData.ContentLength !== file.size) {
      await file.deteleOne();
      return res.status(404).json({ message: "File size does not match" });
    }

    await updateAncestorSizes(file.parentDirId, Number(file.size));
    return res.json({ message: "Upload Complete" });
  } catch (error) {
    return res
      .status(404)
      .message({ error: "File could not be uploaded properly" });
  }
};

export const uploadCancel = async (req, res, next) => {
  const { fileId } = req.body;

  if (!fileId) {
    return res.status(400).json({ error: "fileId is required" });
  }

  try {
    const file = await File.findOne({
      _id: fileId,
      userId: req.user._id,
    });

    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    // Delete the file record
    await File.deleteOne({ _id: fileId });

    // Clean up from filesystem if it exists (for local uploads)
    await rm(`./storage/${fileId}${file.extension}`, { recursive: true }).catch(
      () => {},
    );

    return res.status(200).json({ message: "Upload cancelled" });
  } catch (err) {
    next(err);
  }
};
