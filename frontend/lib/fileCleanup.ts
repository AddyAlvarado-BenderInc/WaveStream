import { getGridFSBucket } from "./gridFSBucket";

export const cleanOrphanedFiles = async (
  currentFileNames: string[],
  productId: string
) => {
  try {
    const bucket = await getGridFSBucket();
    const orphanQuery = {
      "metadata.productId": productId,
      filename: { $nin: currentFileNames },
    };

    const orphans = await bucket.find(orphanQuery).toArray();

    for (const file of orphans) {
      console.log("Deleting orphaned file:", file.filename);
      await bucket.delete(file._id);
    }

    return orphans.length;
  } catch (error) {
    console.error("Error during cleanup:", error);
    return 0;
  }
};
