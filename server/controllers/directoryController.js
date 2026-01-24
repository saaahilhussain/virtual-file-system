import { ObjectId } from "mongodb";
import { rm } from "fs/promises";
import Directory from "../models/directoryModel.js";
import File from "../models/fileModel.js";

export const getDirectory = async (req, res) => {
  const user = req.user;
  const db = req.db;
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

  const files = await File.find({ parentDirId: new ObjectId(id) }).lean();
  const directories = await Directory.find({
    parentDirId: new ObjectId(id),
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

export const deleteDirectory = async (req, res, next) => {
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
    await rm(`./storage/${_id.toString()}${extension}`);
  }

  await File.deleteMany({
    _id: { $in: files.map(({ _id }) => _id) },
  });
  await Directory.deleteMany({
    _id: { $in: [...directories.map(({ _id }) => _id), new ObjectId(id)] },
  });

  return res.json({ message: "Files deleted successfully" });
};
