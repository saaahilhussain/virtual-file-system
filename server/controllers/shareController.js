import crypto from "crypto";
import Directory from "../models/directoryModel.js";
import File from "../models/fileModel.js";
import Share from "../models/shareModel.js";
import {
  createShareSchema,
  updateShareSchema,
} from "../validators/shareValidators.js";
import * as z from "zod";

const SHARE_TOKEN_BYTES = 32;

function activeShareFilter(resourceType, resourceId) {
  return resourceType === "file"
    ? { fileId: resourceId }
    : { directoryId: resourceId };
}

function toShareResponse(share) {
  return {
    id: share._id,
    token: share.token,
    resourceType: share.resourceType,
    resourceId:
      share.resourceType === "file" ? share.fileId : share.directoryId,
    accessType: share.accessType,
    allowedEmails: share.allowedEmails,
    expiresAt: share.expiresAt,
    createdAt: share.createdAt,
    updatedAt: share.updatedAt,
  };
}

async function findOwnedShareableResource({ resourceType, resourceId, userId }) {
  if (resourceType === "file") {
    const file = await File.findOne(
      { _id: resourceId, userId },
      { isTrashed: 1, uploadCompletedAt: 1 },
    ).lean();
    if (!file) {
      return { error: { status: 404, body: { error: "File not found!" } } };
    }
    if (!file.uploadCompletedAt) {
      return {
        error: {
          status: 409,
          body: { error: "File upload is not complete yet" },
        },
      };
    }
    if (file.isTrashed) {
      return {
        error: {
          status: 409,
          body: { error: "Restore the file from trash before sharing it" },
        },
      };
    }
    return { resource: file };
  }

  const directory = await Directory.findOne(
    { _id: resourceId, userId },
    { isTrashed: 1 },
  ).lean();
  if (!directory) {
    return { error: { status: 404, body: { error: "Directory not found!" } } };
  }
  if (directory.isTrashed) {
    return {
      error: {
        status: 409,
        body: { error: "Restore the folder from trash before sharing it" },
      },
    };
  }
  return { resource: directory };
}

export const createShare = async (req, res, next) => {
  try {
    const { success, data, error } = createShareSchema.safeParse(req.body);
    if (!success) {
      return res.status(400).json({ error: z.flattenError(error).fieldErrors });
    }

    const userId = req.user._id;
    const { resourceType, resourceId } = data;

    // Get-or-create: sharing the same item twice must return the same link.
    const existing = await Share.findOne({
      ownerId: userId,
      isActive: true,
      ...activeShareFilter(resourceType, resourceId),
    }).lean();
    if (existing) {
      return res.status(200).json({ share: toShareResponse(existing) });
    }

    const owned = await findOwnedShareableResource({
      resourceType,
      resourceId,
      userId,
    });
    if (owned.error) {
      return res.status(owned.error.status).json(owned.error.body);
    }

    try {
      const share = await Share.create({
        token: crypto.randomBytes(SHARE_TOKEN_BYTES).toString("base64url"),
        resourceType,
        fileId: resourceType === "file" ? resourceId : null,
        directoryId: resourceType === "directory" ? resourceId : null,
        ownerId: userId,
      });
      return res.status(201).json({ share: toShareResponse(share.toObject()) });
    } catch (err) {
      if (err.code === 11000) {
        // Lost a create race against a concurrent request for the same item.
        const share = await Share.findOne({
          ownerId: userId,
          isActive: true,
          ...activeShareFilter(resourceType, resourceId),
        }).lean();
        if (share) {
          return res.status(200).json({ share: toShareResponse(share) });
        }
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
};

export const updateShare = async (req, res, next) => {
  try {
    const { success, data, error } = updateShareSchema.safeParse(req.body);
    if (!success) {
      return res.status(400).json({ error: z.flattenError(error).fieldErrors });
    }

    const share = await Share.findOne({
      _id: req.params.id,
      ownerId: req.user._id,
      isActive: true,
    });
    if (!share) {
      return res.status(404).json({ error: "Share not found!" });
    }

    if (data.accessType !== undefined) share.accessType = data.accessType;
    if (data.allowedEmails !== undefined) share.allowedEmails = data.allowedEmails;
    if (data.expiresAt !== undefined) share.expiresAt = data.expiresAt;

    if (
      share.accessType === "restricted" &&
      (!share.allowedEmails || share.allowedEmails.length === 0)
    ) {
      return res.status(400).json({
        error: "Add at least one email address for a restricted link.",
      });
    }

    share.updatedAt = new Date();
    await share.save();

    return res
      .status(200)
      .json({ share: toShareResponse(share.toObject()) });
  } catch (err) {
    next(err);
  }
};

export const revokeShare = async (req, res, next) => {
  try {
    const share = await Share.findOneAndUpdate(
      {
        _id: req.params.id,
        ownerId: req.user._id,
        isActive: true,
      },
      { $set: { isActive: false, updatedAt: new Date() } },
    ).lean();

    if (!share) {
      return res.status(404).json({ error: "Share not found!" });
    }

    return res.status(200).json({ message: "Share link revoked" });
  } catch (err) {
    next(err);
  }
};
