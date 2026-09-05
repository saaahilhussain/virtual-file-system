import Directory from "../models/directoryModel.js";
import File from "../models/fileModel.js";
import Share from "../models/shareModel.js";
import {
  withStorageTransaction,
  collectSubtree,
  removeFiles,
  reconcileSizes,
} from "../services/storageService.js";

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
    await withStorageTransaction(req.user._id, async ({ user, session }) => {
      const trashedDirs = await Directory.find({
        userId: user._id,
        isTrashed: true,
      })
        .session(session)
        .lean();
      const ids = new Set();
      for (const dir of trashedDirs) {
        if (!ids.has(String(dir._id))) {
          const subtree = await collectSubtree(dir._id, user._id, session);
          for (const id of subtree) ids.add(String(id));
        }
      }
      const directoryIds = [...ids];
      const files = await File.find({
        userId: user._id,
        $or: [{ isTrashed: true }, { parentDirId: { $in: directoryIds } }],
      }).session(session);
      await removeFiles(files, user._id, session);
      await Directory.deleteMany({
        _id: { $in: directoryIds },
        userId: user._id,
      }).session(session);
      await Share.deleteMany({ directoryId: { $in: directoryIds } }).session(
        session,
      );
      await reconcileSizes(user._id, session);
    });
    return res.json({
      message: "Trash emptied successfully",
      cleanupPending: true,
    });
  } catch (error) {
    next(error);
  }
};
