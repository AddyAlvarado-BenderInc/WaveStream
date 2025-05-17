import connectToDatabase from "./mongodb";

export const getGridFSBucket = async () => {
  const mongooseInstance = await connectToDatabase();

  if (!mongooseInstance.connection?.db) {
    throw new Error("Database connection not established");
  }

  const db = mongooseInstance.connection.db;

  return new mongooseInstance.mongo.GridFSBucket(db, {
    bucketName: "uploads",
  });
};
