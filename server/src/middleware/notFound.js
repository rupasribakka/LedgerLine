/**
 * 404 Not Found Middleware
 * 
 * Intercepts requests that do not match any defined route.
 */

const notFound = (req, res, next) => {
  const error = new Error(`Resource not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    error: {
      message: error.message,
      statusCode: 404,
    },
  });
};

module.exports = notFound;
