import { getGridFSBucket } from "./gridFSBucket";

export const cleanOrphanedFiles = async (currentFileNames: string[]) => {
    try {
      const bucket = await getGridFSBucket();
      const allFiles = await bucket.find({}).toArray();
      
      for (const file of allFiles) {
        if (!currentFileNames.includes(file.filename)) {
          console.log('Deleting orphaned file:', file.filename);
          await bucket.delete(file._id);
        }
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  };