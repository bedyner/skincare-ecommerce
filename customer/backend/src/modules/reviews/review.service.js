const { findAll, findOne, create, update } = require('../../config/store');

/**
 * ดึงรีวิวของสินค้า
 */
const getReviewsByProduct = (productId) => {
  return findAll('reviews', (r) => r.productId === Number(productId));
};

/**
 * เขียนรีวิว (ต้องไม่รีวิวซ้ำในออเดอร์เดียวกัน)
 */
const createReview = (customerId, { productId, orderId, rating, comment }) => {
  if (!rating || rating < 1 || rating > 5) {
    const err = new Error('rating ต้องอยู่ระหว่าง 1-5');
    err.statusCode = 400;
    throw err;
  }
  if (!comment?.trim()) {
    const err = new Error('กรุณาเขียนความคิดเห็น');
    err.statusCode = 400;
    throw err;
  }

  // ตรวจสอบว่าเคยรีวิวสินค้านี้ในออเดอร์นี้แล้วหรือยัง
  if (orderId) {
    const duplicate = findOne(
      'reviews',
      (r) => r.productId === Number(productId) && r.customerId === customerId && r.orderId === orderId
    );
    if (duplicate) {
      const err = new Error('คุณได้รีวิวสินค้านี้ในออเดอร์นี้แล้ว');
      err.statusCode = 409;
      throw err;
    }
  }

  const newReview = create('reviews', {
    productId: Number(productId),
    customerId,
    orderId: orderId || null,
    rating: Number(rating),
    comment: comment.trim(),
    createdAt: new Date().toISOString(),
  });

  // อัปเดต averageRating ของสินค้า
  _recalcRating(Number(productId));

  return newReview;
};

/**
 * คำนวณ averageRating ใหม่หลังเพิ่มรีวิว
 */
const _recalcRating = (productId) => {
  const { db, update: updateStore } = require('../../config/store');
  const reviews = db.reviews.filter((r) => r.productId === productId);
  if (reviews.length === 0) return;
  const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  const product = db.products.find((p) => p.id === productId);
  if (product) {
    product.averageRating = Math.round(avg * 10) / 10;
    product.reviewCount = reviews.length;
  }
};

module.exports = { getReviewsByProduct, createReview };
