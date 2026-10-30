const mongoose = require("mongoose");

const connectToDb = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB Atlas Connected Successfully");
    console.log("Database:", conn.connection.name);
  } catch (error) {
    console.error("MongoDB Connection Failed:",error.mesaage);
  }
};

module.exports = connectToDb;
