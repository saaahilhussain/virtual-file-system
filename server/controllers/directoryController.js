import { ObjectId } from "mongodb";
import { rm } from "fs/promises";
import Directory from "../models/directoryModel.js";
import File from "../models/fileModel.js";

export const getDirectory = async (req, res) => {
  const user = req.user;
  const id = req.params.id || user.rootDirId.toString();

  // Find the directory and verify ownership
  const directoryData = await Directory.findOne({
    _id: new ObjectId(id),
  }).lean();

  if (!directoryData) {
    return res
      .status(404)
      .json({ error: "Directory not found or you do not have access to it!" });
  }

  const files = await File.find({
    parentDirId: new ObjectId(id),
    isTrashed: false,
  }).lean();
  const directories = await Directory.find({
    parentDirId: new ObjectId(id),
    isTrashed: false,
  }).lean();

  return res.status(200).json({
    ...directoryData,
    files: files.map((file) => ({ ...file, id: file._id })),
    directories: directories.map((dir) => ({ ...dir, id: dir._id })),
  });
};

export const createDirectory = async (req, res, next) => {
  const user = req.user;
  const parentDirId = req.params.parentDirId || user.rootDirId.toString();
  const dirname = req.headers.dirname || "New Folder";

  try {
    const parentDir = await Directory.findOne({
      _id: new ObjectId(parentDirId),
    }).lean();

    if (!parentDir)
      return res
        .status(404)
        .json({ message: "Parent Directory Does not exist!" });

    await Directory.insertOne({
      name: dirname,
      parentDirId: new ObjectId(parentDirId),
      userId: user._id,
    });

    return res.status(200).json({ message: "Directory Created!" });
  } catch (err) {
    next(err);
  }
};

export const renameDirectory = async (req, res, next) => {
  const user = req.user;
  const { id } = req.params;
  const { newDirName } = req.body;

  try {
    await Directory.findOneAndUpdate(
      {
        _id: id,
        userId: user._id,
      },
      {
        name: newDirName,
      },
    );
    res.status(200).json({ message: "Directory Renamed!" });
  } catch (err) {
    next(err);
  }
};

export const trashDirectory = async (req, res, next) => {
  console.log("--> [DEBUG] trashDirectory called for id:", req.params.id);
  const { id } = req.params;
  const user = req.user;

  const directoryData = await Directory.findOne(
    {
      _id: new ObjectId(id),
      userId: user._id,
    },
    { projection: { _id: 1 } },
  );

  if (!directoryData)
    return res.status(404).json({ error: "Directory not found" });

  const trashedAt = new Date();

  async function trashDirContent(idx) {
    let files = await File.find(
      { parentDirId: new ObjectId(idx) },
      { _id: 1 },
    ).lean();
    let directories = await Directory.find(
      { parentDirId: new ObjectId(idx) },
      { _id: 1 },
    ).lean();

    for (const { _id } of directories) {
      const { files: childFiles, directories: childDirectories } =
        await trashDirContent(_id);

      files = [...files, ...childFiles];
      directories = [...directories, ...childDirectories];
    }

    return { files, directories };
  }

  const { files, directories } = await trashDirContent(id);

  if (files.length > 0) {
    await File.updateMany(
      { _id: { $in: files.map(({ _id }) => _id) } },
      { $set: { isTrashed: true, trashedAt } },
    );
  }

  await Directory.updateMany(
    { _id: { $in: [...directories.map(({ _id }) => _id), new ObjectId(id)] } },
    { $set: { isTrashed: true, trashedAt } },
  );

  return res.json({ message: "Directory moved to trash" });
};

export const restoreDirectory = async (req, res, next) => {
  const { id } = req.params;
  const user = req.user;

  const directoryData = await Directory.findOne(
    {
      _id: new ObjectId(id),
      userId: user._id,
    },
    { projection: { _id: 1 } },
  );

  if (!directoryData)
    return res.status(404).json({ error: "Directory not found" });

  async function restoreDirContent(idx) {
    let files = await File.find(
      { parentDirId: new ObjectId(idx) },
      { _id: 1 },
    ).lean();
    let directories = await Directory.find(
      { parentDirId: new ObjectId(idx) },
      { _id: 1 },
    ).lean();

    for (const { _id } of directories) {
      const { files: childFiles, directories: childDirectories } =
        await restoreDirContent(_id);

      files = [...files, ...childFiles];
      directories = [...directories, ...childDirectories];
    }

    return { files, directories };
  }

  const { files, directories } = await restoreDirContent(id);

  if (files.length > 0) {
    await File.updateMany(
      { _id: { $in: files.map(({ _id }) => _id) } },
      { $set: { isTrashed: false, trashedAt: null } },
    );
  }

  await Directory.updateMany(
    { _id: { $in: [...directories.map(({ _id }) => _id), new ObjectId(id)] } },
    { $set: { isTrashed: false, trashedAt: null } },
  );

  return res.json({ message: "Directory restored" });
};

export const permanentlyDeleteDirectory = async (req, res, next) => {
  console.log(
    "--> [DEBUG] permanentlyDeleteDirectory called for id:",
    req.params.id,
  );
  const { id } = req.params;
  const user = req.user;

  const directoryData = await Directory.findOne(
    {
      _id: new ObjectId(id),
      userId: user._id,
    },
    { projection: { _id: 1 } },
  );

  if (!directoryData)
    return res.status(404).json({ error: "Directory not found" });

  async function getDirContent(idx) {
    let files = await File.find(
      { parentDirId: new ObjectId(idx) },
      { extension: 1 },
    ).lean();
    let directories = await Directory.find(
      { parentDirId: new ObjectId(idx) },
      { _id: 1 },
    ).lean();

    for (const { _id } of directories) {
      const { files: childFiles, directories: childDirectories } =
        await getDirContent(_id);

      files = [...files, ...childFiles];
      directories = [...directories, ...childDirectories];
    }

    return { files, directories };
  }

  const { files, directories } = await getDirContent(id);

  for (const { _id, extension } of files) {
    await rm(`./storage/${_id.toString()}${extension}`).catch(() => {});
  }

  if (files.length > 0) {
    await File.deleteMany({
      _id: { $in: files.map(({ _id }) => _id) },
    });
  }
  await Directory.deleteMany({
    _id: { $in: [...directories.map(({ _id }) => _id), new ObjectId(id)] },
  });

  return res.json({ message: "Directory permanently deleted" });
};
