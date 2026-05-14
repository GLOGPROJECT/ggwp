/**
 * 게시글 이미지 업로드 (multer-s3, S3 저장).
 * 버킷: glogs3bucketforimage / 경로: feedimage/
 */

const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client } = require('@aws-sdk/client-s3');
const crypto = require('crypto');
const path = require('path');
const { MulterError } = multer;

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_FILES = 4;
const FIELD_NAME = 'images';

const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

function extFromMimetype(mimetype) {
  if (mimetype === 'image/jpeg') return '.jpg';
  if (mimetype === 'image/png') return '.png';
  if (mimetype === 'image/gif') return '.gif';
  if (mimetype === 'image/webp') return '.webp';
  return '';
}

const s3 = new S3Client({ region: process.env.AWS_REGION });

const storage = multerS3({
  s3,
  bucket: process.env.S3_BUCKET_NAME,
  contentType: multerS3.AUTO_CONTENT_TYPE,
  metadata(req, file, cb) {
    cb(null, { fieldName: file.fieldname });
  },
  key(req, file, cb) {
    const ext = extFromMimetype(file.mimetype) || path.extname(file.originalname || '').toLowerCase();
    const safe = /^\.(jpe?g|png|gif|webp)$/i.test(ext) ? ext : '.bin';
    const name = `feedimage/${Date.now()}-${crypto.randomBytes(8).toString('hex')}${safe}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_BYTES,
    files: MAX_FILES,
  },
  defParamCharset: 'utf8',
  fileFilter(req, file, cb) {
    if (!ALLOWED_MIMES.has(file.mimetype)) {
      const err = new Error('INVALID_FILE_TYPE');
      err.code = 'INVALID_FILE_TYPE';
      return cb(err);
    }
    cb(null, true);
  },
});

const parser = upload.array(FIELD_NAME, MAX_FILES);

function sendInvalidType(res) {
  res.status(400).json({ error: '허용되지 않는 파일 형식입니다', code: 'INVALID_FILE_TYPE' });
}
function sendTooLarge(res) {
  res.status(400).json({ error: '파일 크기는 5MB를 초과할 수 없습니다', code: 'FILE_TOO_LARGE' });
}
function sendTooMany(res) {
  res.status(400).json({ error: '이미지는 최대 4장까지 첨부 가능합니다', code: 'TOO_MANY_FILES' });
}

/**
 * 게시글 작성/수정용 multipart 처리.
 * 업로드 후 req.files[i].location 에 S3 public URL이 담김.
 */
function uploadImages(req, res, next) {
  parser(req, res, (err) => {
    if (!err) return next();

    if (err instanceof MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') return sendTooLarge(res);
      if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') return sendTooMany(res);
    }
    if (err?.code === 'INVALID_FILE_TYPE') return sendInvalidType(res);

    return next(err);
  });
}

module.exports = {
  uploadImages,
  MAX_FILE_BYTES,
  MAX_FILES,
  FIELD_NAME,
};
