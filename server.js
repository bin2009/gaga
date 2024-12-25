const express = require("express");
const multer = require("multer");
const AWS = require("aws-sdk");
const multerS3 = require("multer-s3");
require("dotenv").config();

const app = express();

// Cấu hình AWS SDK
const spacesEndpoint = new AWS.Endpoint(
  `${process.env.DO_SPACES_REGION}.digitaloceanspaces.com`
);

const s3 = new AWS.S3({
  endpoint: spacesEndpoint,
  accessKeyId: process.env.DO_SPACES_KEY,
  secretAccessKey: process.env.DO_SPACES_SECRET,
  region: process.env.DO_SPACES_REGION,
  signatureVersion: "v4",
});

// Log để kiểm tra cấu hình
console.log("Configuration:", {
  endpoint: `${process.env.DO_SPACES_REGION}.digitaloceanspaces.com`,
  region: process.env.DO_SPACES_REGION,
  bucket: process.env.DO_SPACES_BUCKET,
  hasCredentials: !!(process.env.DO_SPACES_KEY && process.env.DO_SPACES_SECRET),
});

// Cấu hình Multer với storage là S3
// const upload = multer({
//   storage: multerS3({
//     s3: s3,
//     bucket: process.env.DO_SPACES_BUCKET,
//     acl: 'public-read',
//     key: function (request, file, cb) {
//       console.log('Processing file:', file);
//       cb(null, 'uploads/' + Date.now().toString() + '-' + file.originalname);
//     },
//     contentType: multerS3.AUTO_CONTENT_TYPE
//   }),
//   limits: {
//     fileSize: 10 * 1024 * 1024 // 10MB limit
//   }
// });

// Cấu hình multer để lưu tệp vào bộ nhớ tạm thời
const upload = multer({ storage: multer.memoryStorage() }); // Sử dụng bộ nhớ tạm thời

app.use(express.static("public"));

// Route xử lý upload
app.post("/upload", upload.single("upload"), async (req, res) => {
  try {
    if (!req.file) {
      throw new Error("No file uploaded");
    }

    console.log("Upload successful:", {
      location: req.file,
      //   key: req.file.key,
      //   size: req.file.size,
    });

    const params = {
      Bucket: process.env.DO_SPACES_BUCKET,
      Key: `uploads/${Date.now().toString()}-${req.file.originalname}`,
      Body: req.file.buffer,
      ACL: "public-read",
      ContentType: req.file.mimetype,
    };
    // Tải lên tệp
    const data = await s3.upload(params).promise();
    console.log("Upload successful:", data);

    res.json({
      success: true,
      file: {
        url: data.Location,
        key: data.Key,
        size: req.file.size,
      },
    });
  } catch (err) {
    console.error("Processing error:", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({
    success: false,
    error: err.message,
  });
});

const port = 3001;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
