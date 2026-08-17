import path from "path";
import Directory from "../models/directoryModel.js";
import File from "../models/fileModel.js";
import User from "../models/userModel.js";
import {
  createSignedUploadUrl,
  getFileMetaData,
  deleteS3File,
} from "../services/s3Service.js";
import { createCloudFrontGetUrl } from "../services/cloudFrontService.js";

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

async function getUploadContext({ userId, rootDirId, parentDirId, fileSizeInBytes }) {
  if (!Number.isFinite(fileSizeInBytes) || fileSizeInBytes < 0) {
    return { error: { status: 400, body: { error: "Invalid file size" } } };
  }

  const parentDirData = await Directory.findOne({
    _id: parentDirId,
    userId,
  });
  if (!parentDirData) {
    return {
      error: { status: 404, body: { error: "Parent directory not found!" } },
    };
  }

  const user = await User.findById(userId, { maxStorageInBytes: 1 }).lean();
  if (!user) {
    return { error: { status: 404, body: { error: "User not found!" } } };
  }

  const rootDirectory = await Directory.findOne(
    { _id: rootDirId, userId },
    { size: 1 },
  ).lean();

  const maxStorage = Number(user.maxStorageInBytes) || 0;
  const usedStorage = Number(rootDirectory?.size) || 0;
  const remainingStorage = Math.max(0, maxStorage - usedStorage);

  if (fileSizeInBytes > remainingStorage) {
    return {
      error: {
        status: 429,
        body: { error: "File exceeds the maximum upload limit." },
      },
    };
  }

  return { parentDirData };
}

export const getFile = async (req, res, next) => {
  try {
    const { id } = req.params;

    const fileData = await File.findOne({
      _id: id,
      userId: req.user._id,
    });

    if (!fileData) {
      return res.status(404).json({ error: "File not found!" });
    }

    if (!fileData.uploadCompletedAt) {
      return res.status(409).json({ error: "File upload is not complete yet" });
    }

    const fileUrl = createCloudFrontGetUrl({
      Key: `${id}${fileData.extension}`,
      download: req.query.action === "download",
      filename: fileData.name,
    });

    return res.redirect(fileUrl);
  } catch (err) {
    return next(err);
  }
};

export const renameFile = async (req, res, next) => {
  const { id } = req.params;
  const file = await File.findOne({
    _id: id,
    userId: req.user._id,
  });

  if (!file) {
    return res.status(404).json({ error: "File not found!" });
  }

  try {
    file.name = req.body.newFilename;
    file.updatedAt = new Date();
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

    if (file.uploadCompletedAt) {
      await updateAncestorSizes(file.parentDirId, -(Number(file.size) || 0));
    }

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

    if (file.uploadCompletedAt) {
      await updateAncestorSizes(file.parentDirId, Number(file.size) || 0);
    }

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

    if (!file.isTrashed && file.uploadCompletedAt) {
      await updateAncestorSizes(file.parentDirId, -(Number(file.size) || 0));
    }

    await File.deleteOne({ _id: file._id });
    await deleteS3File(`${file.id}${file.extension}`);
    return res.status(200).json({ message: "File Deleted Permanently" });
  } catch (err) {
    next(err);
  }
};

export const uploadInitiate = async (req, res, next) => {
  try {
    const parentDirId = req.body.parentDirId || req.user.rootDirId;
    const filename = req.body.name || "untitled";
    const fileSizeInBytes = Number(req.body.size);

    const uploadContext = await getUploadContext({
      userId: req.user._id,
      rootDirId: req.user.rootDirId,
      parentDirId,
      fileSizeInBytes,
    });
    if (uploadContext.error) {
      return res
        .status(uploadContext.error.status)
        .json(uploadContext.error.body);
    }

    const extension = path.extname(filename);
    const insertedFile = await File.create({
      extension,
      name: filename,
      size: fileSizeInBytes,
      parentDirId: uploadContext.parentDirData._id,
      userId: req.user._id,
      isTrashed: false,
      trashedAt: null,
      uploadCompletedAt: null,
    });

    const uploadUrl = await createSignedUploadUrl({
      Key: `${insertedFile._id}${extension}`,
      ContentType: req.body.contentType,
    });

    return res.status(201).json({
      uploadUrl,
      fileId: insertedFile._id,
    });
  } catch (err) {
    next(err);
  }
};

export const uploadComplete = async (req, res, next) => {
  try {
    const { fileId } = req.body;

    if (!fileId) {
      return res.status(400).json({ error: "fileId is required" });
    }

    const file = await File.findOne({
      _id: fileId,
      userId: req.user._id,
    });
    if (!file) {
      return res.status(404).json({ error: "File not found!" });
    }

    if (file.uploadCompletedAt) {
      return res.json({ message: "Upload Complete" });
    }

    let fileData;
    try {
      fileData = await getFileMetaData(`${file.id}${file.extension}`);
    } catch (error) {
      await File.deleteOne({ _id: file._id, userId: req.user._id });
      return res
        .status(400)
        .json({ error: "File could not be uploaded properly" });
    }

    if (Number(fileData.ContentLength) !== Number(file.size)) {
      await deleteS3File(`${file.id}${file.extension}`).catch(() => {});
      await File.deleteOne({ _id: file._id, userId: req.user._id });
      return res.status(400).json({ error: "File size does not match" });
    }

    file.uploadCompletedAt = new Date();
    await file.save();
    await updateAncestorSizes(file.parentDirId, Number(file.size));

    return res.json({ message: "Upload Complete" });
  } catch (error) {
    next(error);
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

    if (file.uploadCompletedAt) {
      return res
        .status(409)
        .json({ error: "Completed uploads cannot be cancelled" });
    }

    await File.deleteOne({ _id: fileId, userId: req.user._id });
    await deleteS3File(`${fileId}${file.extension}`).catch(() => {});

    return res.status(200).json({ message: "Upload cancelled" });
  } catch (err) {
    next(err);
  }
};
