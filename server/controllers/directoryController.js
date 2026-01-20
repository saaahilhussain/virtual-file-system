import { ObjectId } from "mongodb";
import { rm } from "fs/promises";

export const getDirectory = async (req, res) => {
  const user = req.user;
  const db = req.db;
  const id = req.params.id || user.rootDirId;

  const dirCollection = db.collection("directories");
  const filesCollection = db.collection("files");

  // Find the directory and verify ownership
  const directoryData = await dirCollection.findOne({ _id: new ObjectId(id) });

  if (!directoryData) {
    return res
      .status(404)
      .json({ error: "Directory not found or you do not have access to it!" });
  }

  const files = await filesCollection
    .find({ parentDirId: new ObjectId(id) })
    .toArray();
  const directories = await dirCollection
    .find({
      parentDirId: new ObjectId(id),
    })
    .toArray();

  return res.status(200).json({
    ...directoryData,
    files: files.map((file) => ({ ...file, id: file._id })),
    directories: directories.map((dir) => ({ ...dir, id: dir._id })),
  });
};

export const createDirectory = async (req, res, next) => {
  const user = req.user;
  const db = req.db;
  const dirCollection = db.collection("directories");
  const parentDirId = req.params.parentDirId || user.rootDirId;
  const dirname = req.headers.dirname || "New Folder";

  try {
    const parentDir = await dirCollection.findOne({
      _id: new ObjectId(parentDirId),
    });

    if (!parentDir)
      return res
        .status(404)
        .json({ message: "Parent Directory Does not exist!" });

    await dirCollection.insertOne({
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
  const db = req.db;
  const dirCollection = db.collection("directories");
  const { id } = req.params;
  const { newDirName } = req.body;

  try {
    await dirCollection.updateOne(
      {
        _id: new ObjectId(id),
        userId: user._id,
      },
      {
        $set: {
          name: newDirName,
        },
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

  const db = req.db;
  const filesCollection = db.collection("files");
  const dirCollection = db.collection("directories");

  const directoryData = await dirCollection.findOne(
    {
      _id: new ObjectId(id),
      userId: user._id,
    },
    { projection: { _id: 1 } },
  );

  if (!directoryData)
    return res.status(404).json({ error: "Directory not found" });

  async function getDirContent(idx) {
    let files = await filesCollection
      .find(
        { parentDirId: new ObjectId(idx) },
        { projection: { extension: 1 } },
      )
      .toArray();
    let directories = await dirCollection
      .find({ parentDirId: new ObjectId(idx) }, { projection: { _id: 1 } })
      .toArray();

    for (const { _id, name } of directories) {
      const { files: childFiles, directories: childDirectories } =
        await getDirContent(_id);

      files = [...files, ...childFiles];
      directories = [...directories, ...childDirectories];
    }

    return { files, directories };
  }

  const { files, directories } = await getDirContent(id);
  console.log(files, "\n", directories);

  for (const { _id, extension } of files) {
    await rm(`./storage/${_id.toString()}${extension}`);
  }

  await filesCollection.deleteMany({
    _id: { $in: files.map(({ _id }) => _id) },
  });
  await dirCollection.deleteMany({
    _id: { $in: [...directories.map(({ _id }) => _id), new ObjectId(id)] },
  });

  return res.json({ message: "Files deleted successfully" });
};
