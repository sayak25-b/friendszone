export function notFound(req, res) {
  res.status(404).json({ error: "API route not found." });
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  if (error.name === "ValidationError" || error.name === "CastError") {
    return res.status(400).json({ error: error.message });
  }
  if (error.code === 11000) {
    return res.status(409).json({ error: "A record with that value already exists." });
  }
  if (error.name === "MulterError") {
    return res.status(400).json({ error: error.message });
  }
  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Request body contains invalid JSON." });
  }
  if (Number.isInteger(error.status) && error.status < 500) {
    return res.status(error.status).json({ error: error.message });
  }

  console.error("Unhandled API error:", error);
  return res.status(500).json({ error: "An unexpected server error occurred." });
}
