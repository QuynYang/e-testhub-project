const mongoose = require("mongoose");
require("dotenv").config();

const removeUsernameIndex = async () => {
  try {
    // Kết nối với MongoDB
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Đã kết nối với MongoDB");

    // Lấy collection users
    const db = mongoose.connection.db;
    const usersCollection = db.collection("users");

    // Kiểm tra xem index có tồn tại không
    const indexes = await usersCollection.indexes();
    const usernameIndex = indexes.find(
      (idx) => idx.name === "username_1" || idx.key?.username === 1
    );

    if (usernameIndex) {
      console.log("Đã tìm thấy index username_1, đang xóa...");
      await usersCollection.dropIndex("username_1");
      console.log("✅ Đã xóa index username_1 thành công!");
    } else {
      console.log("⚠️  Không tìm thấy index username_1 trong database");
    }

    // Hiển thị các index còn lại
    const remainingIndexes = await usersCollection.indexes();
    console.log("\nCác index còn lại trong collection users:");
    remainingIndexes.forEach((idx) => {
      console.log(`  - ${idx.name}:`, idx.key);
    });

    await mongoose.connection.close();
    console.log("\nĐã đóng kết nối MongoDB");
    process.exit(0);
  } catch (error) {
    console.error("❌ Lỗi khi xóa index:", error.message);
    if (error.code === 27) {
      console.log("   (Index không tồn tại)");
    }
    await mongoose.connection.close();
    process.exit(1);
  }
};

removeUsernameIndex();
