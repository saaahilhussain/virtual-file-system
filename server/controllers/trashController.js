import Directory from "../models/directoryModel.js";
import File from "../models/fileModel.js";
import { deleteS3Files } from "../services/s3Service.js";

export const getTrash = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const trashedDirs = await Directory.find({
      userId,
      isTrashed: true,
    }).lean();
    const trashedFiles = await File.find({ userId, isTrashed: true }).lean();

    const trashedDirIds = new Set(trashedDirs.map((d) => d._id.toString()));

    const topLevelDirs = trashedDirs.filter(
      (d) => !trashedDirIds.has(d.parentDirId?.toString()),
    );
    const topLevelFiles = trashedFiles.filter(
      (f) => !trashedDirIds.has(f.parentDirId?.toString()),
    );

    return res.status(200).json({
      directories: topLevelDirs.map((d) => ({ ...d, id: d._id })),
      files: topLevelFiles.map((f) => ({ ...f, id: f._id })),
    });
  } catch (err) {
    next(err);
  }
};

export const emptyTrash = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const trashedFiles = await File.find({ userId, isTrashed: true }).lean();

    if (trashedFiles.length > 0) {
      await deleteS3Files(
        trashedFiles.map(({ _id, extension }) => ({
          Key: `${_id.toString()}${extension}`,
        })),
      );
    }

    await File.deleteMany({ userId, isTrashed: true });
    await Directory.deleteMany({ userId, isTrashed: true });

    return res.status(200).json({ message: "Trash emptied successfully" });
  } catch (err) {
    next(err);
  }
};
